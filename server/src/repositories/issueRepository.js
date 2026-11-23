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

// --- Analytics aggregations (admin dashboard) ---------------------

// Date-only strings ('YYYY-MM-DD') must include the whole day;
// expand endDate to end-of-day UTC so $lte doesn't drop records.
const endOfDay = (value) => {
  const d = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
};

const monthKeyExpr = {
  $dateToString: { format: '%Y-%m', date: '$createdAt' },
};

export const analyticsAggregations = {
  // Group counts by a field, restricted to createdAt range.
  async groupBy(field, { startDate, endDate } = {}) {
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = endOfDay(endDate);
    }
    const rows = await Issue.aggregate([
      { $match: match },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return rows.map((r) => ({ name: r._id ?? 'unknown', count: r.count }));
  },

  // Monthly reported counts (createdAt) and resolved counts
  // (latest statusHistory entry with status 'resolved').
  async monthlyTrends({ months = 6, startDate, endDate } = {}) {
    const since = startDate ? new Date(startDate) : new Date(Date.now() - months * 30 * 864e5);

    const [reported, resolved] = await Promise.all([
      Issue.aggregate([
        { $match: { createdAt: { $gte: since, ...(endDate ? { $lte: endOfDay(endDate) } : {}) } } },
        { $group: { _id: monthKeyExpr, count: { $sum: 1 } } },
      ]),
      Issue.aggregate([
        { $unwind: '$statusHistory' },
        {
          $match: {
            'statusHistory.status': 'resolved',
            'statusHistory.updatedAt': {
              $gte: since,
              ...(endDate ? { $lte: endOfDay(endDate) } : {}),
            },
          },
        },
        // Keep only the latest resolved entry per issue to avoid
        // double-counting repeated resolutions.
        { $sort: { 'statusHistory.updatedAt': -1 } },
        {
          $group: {
            _id: '$_id',
            month: {
              $first: { $dateToString: { format: '%Y-%m', date: '$statusHistory.updatedAt' } },
            },
          },
        },
        { $group: { _id: '$month', count: { $sum: 1 } } },
      ]),
    ]);

    const repMap = Object.fromEntries(reported.map((r) => [r._id, r.count]));
    const resMap = Object.fromEntries(resolved.map((r) => [r._id, r.count]));

    // Build contiguous month buckets ending at current month.
    const buckets = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push(d.toISOString().slice(0, 7));
    }

    return buckets.map((m) => ({
      month: m,
      reported: repMap[m] || 0,
      resolved: resMap[m] || 0,
    }));
  },

  // Staff workload: total + active (non-terminal) assigned issues.
  async staffWorkload() {
    const rows = await Issue.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['resolved', 'rejected']] }, 0, 1],
            },
          },
        },
      },
      // Deterministic: total desc, then staff id asc for ties.
      { $sort: { total: -1, _id: 1 } },
      { $limit: 20 },
    ]);

    const userIds = rows.map((r) => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('fullName staffId role status')
      .lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    return rows.map((r) => {
      const u = userMap[r._id.toString()];
      return {
        staffId: u?._id?.toString() ?? r._id.toString(),
        name: u?.fullName || 'Unknown staff',
        staffCode: u?.staffId || null,
        status: u?.status || 'active',
        total: r.total,
        active: r.active,
      };
    });
  },
};
