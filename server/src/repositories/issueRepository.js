import Issue from '../models/Issue.js';
import User from '../models/User.js';

class IssueRepository {
  async create(issueData) {
    return Issue.create(issueData);
  }

  async findById(issueId) {
    return Issue.findById(issueId)
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('statusHistory.updatedBy', 'fullName');
  }

  async findAll(filter = {}) {
    return Issue.find(filter)
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async updateById(issueId, updateData) {
    return Issue.findByIdAndUpdate(
      issueId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email');
  }

  async findByIdAndUpdate(issueId, updateData) {
    return Issue.findByIdAndUpdate(
      issueId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async findStaffMembers() {
    return User.find({
        role: 'staff',
        isActive: true,
    }).select('fullName email');
 }

    async assignStaff(issueId, staffId, adminId) {
    return Issue.findByIdAndUpdate(
        issueId,
        {
        $set: {
            assignedTo: staffId,
            status: 'assigned',
        },
        $push: {
            statusHistory: {
            status: 'assigned',
            updatedBy: adminId,
            note: 'Issue assigned to staff member',
            updatedAt: new Date(),
            },
        },
        },
        {
        new: true,
        runValidators: true,
        }
    )
        .populate('reportedBy', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .populate('statusHistory.updatedBy', 'fullName');
    }
}

export default new IssueRepository();