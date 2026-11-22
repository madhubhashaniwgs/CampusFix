import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

import issueRepository from '../repositories/issueRepository.js';
import userRepository from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';

class IssueService {
  async createIssue(issueData, userId) {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const ticketId = `CF-${randomBytes(4).toString('hex').toUpperCase()}`;

      try {
        const issue = await issueRepository.create({
          title: issueData.title,
          description: issueData.description,
          category: issueData.category,
          location: issueData.location,
          priority: issueData.priority || 'medium',
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

        return issueRepository.findById(issue._id);
      } catch (error) {
        const isTicketIdConflict =
          error.code === 11000 &&
          error.keyPattern &&
          Object.prototype.hasOwnProperty.call(
            error.keyPattern,
            'ticketId'
          );

        if (!isTicketIdConflict || attempt === maxAttempts - 1) {
          if (isTicketIdConflict) {
            throw new ApiError(
              500,
              'Unable to generate a unique ticket ID. Please try again.'
            );
          }
          throw error;
        }
      }
    }
  }

  async getIssues(user) {
    let filter = {};

    if (user.role === 'student') {
      filter.reportedBy = user.id;
    } else if (user.role === 'staff') {
      filter.assignedTo = user.id;
    }

    return issueRepository.findAll(filter);
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
    const isReporter =
      issue.reportedBy?._id.toString() === user.id;
    const isAssignedStaff =
      issue.assignedTo?._id.toString() === user.id;

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
    const isAssignedStaff =
      issue.assignedTo?._id.toString() === user.id;

    if (!isAdmin && !isAssignedStaff) {
      throw new ApiError(
        403,
        'Only the assigned staff member or an admin can update this issue'
      );
    }

    const allowedTransitions = {
      reported: ['assigned', 'rejected'],
      assigned: ['in_progress', 'rejected'],
      in_progress: ['resolved', 'rejected'],
      resolved: [],
      rejected: [],
    };

    if (!allowedTransitions[issue.status]?.includes(status)) {
      throw new ApiError(
        400,
        `Cannot change issue status from ${issue.status} to ${status}`
      );
    }

    return issueRepository.findByIdAndUpdate(
      issueId,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            updatedBy: user.id,
            note: note || '',
            updatedAt: new Date(),
          },
        },
      }
    );
  }

    async getStaffMembers() {
    return issueRepository.findStaffMembers();
    }

    async assignIssue(issueId, staffId, adminId) {
    if (
        !mongoose.isValidObjectId(issueId) ||
        !mongoose.isValidObjectId(staffId)
    ) {
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
        throw new ApiError(
        400,
        `Cannot assign an issue with status "${issue.status}"`
        );
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

    return issueRepository.assignStaff(
        issueId,
        staffId,
        adminId,
        isReassignment
            ? 'Issue reassigned to staff member'
            : 'Issue assigned to staff member'
    );
    }
}

export default new IssueService();