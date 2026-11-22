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

  async findAll(filter = {}, { page = 1, limit = 10, search } = {}) {
    const queryFilter = { ...filter };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escapedSearch, $options: 'i' };

      queryFilter.$or = [
        { ticketId: regex },
        { title: regex },
        { description: regex },
        { location: regex },
      ];
    }

    const [issues, totalItems] = await Promise.all([
      Issue.find(queryFilter)
        .populate('reportedBy', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Issue.countDocuments(queryFilter),
    ]);

    return { issues, totalItems };
  }

  async findByIdAndUpdate(issueId, updateData) {
    return Issue.findByIdAndUpdate(issueId, updateData, { new: true, runValidators: true })
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('statusHistory.updatedBy', 'fullName');
  }

  async findStaffMembers({ page = 1, limit = 10 } = {}) {
    const filter = {
      role: 'staff',
      isActive: true,
      // Treat missing status (pre-migration docs) as active.
      $or: [{ status: 'active' }, { status: { $exists: false } }],
    };

    const skip = (page - 1) * limit;

    const [staff, totalItems] = await Promise.all([
      User.find(filter)
        .select('fullName email staffId department createdAt')
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return { staff, totalItems };
  }

  async assignStaff(issueId, staffId, adminId, note) {
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
            note: note || 'Issue assigned to staff member',
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
