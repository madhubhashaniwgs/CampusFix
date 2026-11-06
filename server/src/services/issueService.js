import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

import issueRepository from '../repositories/issueRepository.js';
import ApiError from '../utils/ApiError.js';

class IssueService {
  async createIssue(issueData, userId) {
    const ticketId = `CF-${randomBytes(4).toString('hex').toUpperCase()}`;

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

    const updatedIssue = await issueRepository.findByIdAndUpdate(
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

    return issueRepository.findById(updatedIssue._id);
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

    const staff = await issueRepository.findStaffMembers();

    const selectedStaff = staff.find(
        (member) => member._id.toString() === staffId
    );

    if (!selectedStaff) {
        throw new ApiError(404, 'Active staff member not found');
    }

    if (['resolved', 'rejected'].includes(issue.status)) {
        throw new ApiError(
        400,
        'Cannot assign a resolved or rejected issue'
        );
    }

    return issueRepository.assignStaff(
        issueId,
        staffId,
        adminId
    );
    }
}

export default new IssueService();