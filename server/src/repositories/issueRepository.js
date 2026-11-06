import Issue from '../models/Issue.js';

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
}

export default new IssueRepository();