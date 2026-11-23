import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

import issueRepository from '../repositories/issueRepository.js';
import userRepository from '../repositories/userRepository.js';
import cloudinaryService from './cloudinaryService.js';
import auditService from './auditService.js';
import emailService from './emailService.js';
import notificationService from './notificationService.js';
import { emitTo, emitToRole } from '../socket/socketServer.js';
import ApiError from '../utils/ApiError.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const isCloudinaryUrl = (photo) => {
  if (typeof photo !== 'string' || !photo.startsWith('https://')) {
    return false;
  }
  try {
    return new URL(photo).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
};

const updatedIssueRooms = (issue, staffId) => {
  const rooms = [];
  if (issue.reportedBy?._id) rooms.push(`user:${issue.reportedBy._id}`);
  if (issue.assignedTo?._id) rooms.push(`user:${issue.assignedTo._id}`);
  rooms.push(`user:${staffId}`);
  return rooms;
};

class IssueService {
  async createIssue(issueData, user) {
    const userId = user.id ?? user._id;
    const maxAttempts = 3;

    // Cloudinary photos must carry a valid upload token proving the
    // authenticated user uploaded this exact image. The public ID is
    // derived server-side from the token — never trusted from the
    // client. Legacy base64 photos need no token.
    let photoPublicId = null;
    if (isCloudinaryUrl(issueData.photo)) {
      photoPublicId = cloudinaryService.verifyUploadToken(
        issueData.photoToken,
        userId,
        issueData.photo
      );

      if (!photoPublicId) {
        throw new ApiError(400, 'A valid photo upload token is required for Cloudinary images');
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const ticketId = `CF-${randomBytes(4).toString('hex').toUpperCase()}`;

      try {
        const issue = await issueRepository.create({
          title: issueData.title,
          description: issueData.description,
          category: issueData.category,
          location: issueData.location,
          priority: issueData.priority || 'medium',
          photo: issueData.photo || null,
          photoPublicId,
          ticketId,
          reportedBy: userId,
          status: 'reported',
          statusHistory: [
            {
              status: 'reported',
              updatedBy: userId,
              note: 'Issue reported',
            },
          ],
        });

        const created = await issueRepository.findById(issue._id);

        await auditService.record({
          action: 'issue.created',
          actor: { userId, role: user.role },
          target: { type: 'issue', id: created._id },
          metadata: {
            ticketId: created.ticketId,
            category: created.category,
            priority: created.priority,
            hasPhoto: Boolean(created.photo),
          },
        });

        // Photo upload is only audited once the image is actually
        // attached to a successfully created issue — a bare Cloudinary
        // upload or a failed creation produces no event.
        if (photoPublicId) {
          await auditService.record({
            action: 'issue.photo_uploaded',
            actor: { userId, role: user.role },
            target: { type: 'issue', id: created._id },
            metadata: { publicId: photoPublicId },
          });
        }

        emitToRole('admin', 'issue:created', {
          issueId: created._id.toString(),
          ticketId: created.ticketId,
          status: created.status,
        });
        emitToRole('admin', 'dashboard:stats_updated', { reason: 'issue_created' });
        emitToRole('student', 'dashboard:stats_updated', { reason: 'issue_created' });
        await notificationService.create({
          userId: created.reportedBy?._id || userId,
          type: 'issue_created',
          title: 'Issue reported',
          message: `Your issue ${created.ticketId} was submitted successfully.`,
          issueId: created._id,
        });

        // Notify all admins about the new issue (best-effort).
        try {
          const { users: admins } = await userRepository.findUsers({
            role: 'admin',
            limit: 100,
          });
          await Promise.allSettled(
            admins.map((admin) =>
              notificationService.create({
                userId: admin._id,
                type: 'issue_created',
                title: 'New issue reported',
                message: `${created.reportedBy?.fullName || 'A student'} reported ${created.ticketId}: ${created.title}`,
                issueId: created._id,
              })
            )
          );
        } catch {
          // Admin notification failure must not break issue creation.
        }

        // Notify the reporting student. Email failure must never
        // break issue creation.
        const reporterEmail = created.reportedBy?.email;
        if (reporterEmail) {
          const tpl = emailService.issueReported({
            ticketId: created.ticketId,
            title: created.title,
            category: created.category,
            priority: created.priority,
            issueUrl: `${CLIENT_URL}/student/my-issues`,
          });
          await emailService.send({ to: reporterEmail, ...tpl });
        }

        return created;
      } catch (error) {
        const isTicketIdConflict =
          error.code === 11000 &&
          error.keyPattern &&
          Object.prototype.hasOwnProperty.call(error.keyPattern, 'ticketId');

        // On final failure, remove the orphaned Cloudinary image so
        // storage does not accumulate unused uploads. Cleanup errors
        // are logged safely and never mask the original error.
        if (!isTicketIdConflict || attempt === maxAttempts - 1) {
          if (photoPublicId) {
            try {
              await cloudinaryService.deleteImage(photoPublicId);
            } catch (cleanupError) {
              console.error(
                `[${new Date().toISOString()}] Failed to clean up orphaned Cloudinary image ${photoPublicId}: ${cleanupError.message}`
              );
            }
          }

          if (isTicketIdConflict) {
            throw new ApiError(500, 'Unable to generate a unique ticket ID. Please try again.');
          }
          throw error;
        }
      }
    }
  }

  async getIssues(user, query = {}) {
    const conditions = [];

    // Role scoping is always applied first so query parameters can
    // never widen a student's or staff member's visible issues.
    if (user.role === 'student') {
      conditions.push({ reportedBy: user.id });
    } else if (user.role === 'staff') {
      conditions.push({ assignedTo: user.id });
    }

    if (query.status?.length) {
      conditions.push({ status: { $in: query.status } });
    }

    if (query.priority) {
      conditions.push({ priority: query.priority });
    }

    if (query.category) {
      conditions.push({ category: query.category });
    }

    if (query.assignee === 'unassigned') {
      conditions.push({ assignedTo: null });
    }

    if (query.dateFrom || query.dateTo) {
      const createdAt = {};
      if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) createdAt.$lte = new Date(query.dateTo);
      conditions.push({ createdAt });
    }

    const filter =
      conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions };

    const page = query.page || 1;
    const limit = query.limit || 10;

    const { issues, totalItems } = await issueRepository.findAll(filter, {
      page,
      limit,
      search: query.search || undefined,
    });

    return {
      issues,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        pageSize: limit,
      },
    };
  }

  async getIssueById(issueId, user) {
    if (!mongoose.isValidObjectId(issueId)) {
      throw new ApiError(400, 'Invalid issue ID');
    }

    const issue = await issueRepository.findById(issueId);

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    const isAdmin = user.role === 'admin';
    const isReporter = issue.reportedBy?._id.toString() === user.id;
    const isAssignedStaff = issue.assignedTo?._id.toString() === user.id;

    if (!isAdmin && !isReporter && !isAssignedStaff) {
      throw new ApiError(403, 'You are not allowed to view this issue');
    }

    return issue;
  }

  async updateIssueStatus(issueId, status, note, user) {
    if (!mongoose.isValidObjectId(issueId)) {
      throw new ApiError(400, 'Invalid issue ID');
    }

    const issue = await issueRepository.findById(issueId);

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    const isAdmin = user.role === 'admin';
    const isAssignedStaff = issue.assignedTo?._id.toString() === user.id;

    if (!isAdmin && !isAssignedStaff) {
      throw new ApiError(403, 'Only the assigned staff member or an admin can update this issue');
    }

    const allowedTransitions = {
      reported: ['assigned', 'rejected'],
      assigned: ['in_progress', 'rejected'],
      in_progress: ['resolved', 'rejected'],
      resolved: [],
      rejected: [],
    };

    if (!allowedTransitions[issue.status]?.includes(status)) {
      throw new ApiError(400, `Cannot change issue status from ${issue.status} to ${status}`);
    }

    const updated = await issueRepository.findByIdAndUpdate(issueId, {
      $set: { status },
      $push: {
        statusHistory: {
          status,
          updatedBy: user.id,
          note: note || '',
          updatedAt: new Date(),
        },
      },
    });

    await auditService.record({
      action: 'issue.status_changed',
      actor: { userId: user.id, role: user.role },
      target: { type: 'issue', id: issueId },
      metadata: { from: issue.status, to: status },
    });

    const statusRooms = [
      `user:${issue.reportedBy?._id}`,
      ...(issue.assignedTo?._id ? [`user:${issue.assignedTo._id}`] : []),
      'role:admin',
    ].filter(Boolean);
    emitToRole('admin', 'dashboard:stats_updated', { reason: 'status_changed' });
    emitToRole('staff', 'dashboard:stats_updated', { reason: 'status_changed' });
    emitTo(statusRooms.length ? statusRooms : 'role:admin', 'issue:status_changed', {
      issueId: issueId.toString(),
      status,
      from: issue.status,
    });
    await notificationService.create({
      userId: issue.reportedBy?._id,
      type: 'issue_status_changed',
      title: `Issue ${status === 'resolved' ? 'resolved' : 'updated'}`,
      message: `Issue ${issue.ticketId} is now ${status.replace('_', ' ')}.`,
      issueId,
    });

    // Notify admins (except the actor) about meaningful status changes.
    try {
      const { users: admins } = await userRepository.findUsers({
        role: 'admin',
        limit: 100,
      });
      await Promise.allSettled(
        admins
          .filter((a) => a._id.toString() !== user.id)
          .map((admin) =>
            notificationService.create({
              userId: admin._id,
              type: 'issue_status_changed',
              title: `Issue ${status === 'resolved' ? 'resolved' : status === 'rejected' ? 'rejected' : 'in progress'}`,
              message: `Issue ${issue.ticketId} is now ${status.replace('_', ' ')}.`,
              issueId,
            })
          )
      );
    } catch {
      // Admin notification failure must not break the status update.
    }

    // Notify the reporter on meaningful transitions only.
    if (['in_progress', 'resolved'].includes(status)) {
      const reporterEmail = issue.reportedBy?.email;
      if (reporterEmail) {
        const tpl = emailService.issueStatusChanged({
          ticketId: issue.ticketId,
          title: issue.title,
          status,
          issueUrl: `${CLIENT_URL}/student/my-issues`,
        });
        await emailService.send({ to: reporterEmail, ...tpl });
      }
    }

    return updated;
  }

  async getStaffMembers({ page = 1, limit = 10 } = {}) {
    const { staff, totalItems } = await issueRepository.findStaffMembers({ page, limit });

    return {
      staff: staff.map((s) => ({
        id: s._id,
        fullName: s.fullName,
        email: s.email,
        staffId: s.staffId || null,
        department: s.department || null,
      })),
      pagination: {
        page,
        pageSize: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async assignIssue(issueId, staffId, admin) {
    const adminId = admin.id ?? admin._id;
    if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(staffId)) {
      throw new ApiError(400, 'Invalid issue ID or staff ID');
    }

    const issue = await issueRepository.findById(issueId);

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    // Assignment sets status to 'assigned', so it is only valid from
    // 'reported' (first assignment) or 'assigned' (reassignment).
    // This reuses the same transition rules as updateIssueStatus and
    // prevents in_progress/resolved/rejected issues from being reset.
    if (!['reported', 'assigned'].includes(issue.status)) {
      throw new ApiError(400, `Cannot assign an issue with status "${issue.status}"`);
    }

    const staff = await userRepository.findActiveStaffById(staffId);

    if (!staff) {
      throw new ApiError(404, 'Active staff member not found');
    }

    // Re-assigning the same staff member is a no-op: return the
    // already-populated issue without writing a duplicate history entry.
    if (issue.assignedTo?._id.toString() === staffId) {
      return issue;
    }

    const isReassignment = Boolean(issue.assignedTo);
    const previousAssignee = issue.assignedTo?._id?.toString() ?? null;

    const assigned = await issueRepository.assignStaff(
      issueId,
      staffId,
      adminId,
      isReassignment ? 'Issue reassigned to staff member' : 'Issue assigned to staff member'
    );

    await auditService.record({
      action: 'issue.assigned',
      actor: { userId: adminId, role: admin.role },
      target: { type: 'issue', id: issueId },
      metadata: { fromStaffId: previousAssignee, toStaffId: staffId },
    });

    const assignRooms = [...updatedIssueRooms(issue, staffId), 'role:admin'];
    emitTo(assignRooms, 'issue:assigned', {
      issueId: issueId.toString(),
      staffId: staffId.toString(),
      status: 'assigned',
    });
    emitTo('role:staff', 'dashboard:stats_updated', { reason: 'issue_assigned' });

    // Notify reporter + new assignee (previous assignee sees update
    // via the staff room refresh, no notification needed).
    await notificationService.create({
      userId: issue.reportedBy?._id,
      type: 'issue_assigned',
      title: 'Issue assigned',
      message: `Issue ${issue.ticketId} was assigned to a staff member.`,
      issueId,
    });
    await notificationService.create({
      userId: staffId,
      type: 'issue_assigned',
      title: 'New issue assigned to you',
      message: `Issue ${issue.ticketId} — ${issue.title}`,
      issueId,
    });

    // Notify the reporter and the newly assigned staff member.
    const updatedIssue = await issueRepository.findById(issueId);
    const issueUrl = `${CLIENT_URL}/staff/issues`;

    const reporterEmail = updatedIssue?.reportedBy?.email;
    if (reporterEmail) {
      const tpl = emailService.issueStatusChanged({
        ticketId: updatedIssue.ticketId,
        title: updatedIssue.title,
        status: 'assigned',
        issueUrl: `${CLIENT_URL}/student/my-issues`,
      });
      await emailService.send({ to: reporterEmail, ...tpl });
    }

    if (staff.email) {
      const tpl = emailService.issueAssigned({
        ticketId: updatedIssue.ticketId,
        title: updatedIssue.title,
        assigneeName: staff.fullName,
        issueUrl,
      });
      await emailService.send({ to: staff.email, ...tpl });
    }

    return assigned;
  }
}

export default new IssueService();
