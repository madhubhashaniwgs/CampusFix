import AuditLog from '../models/AuditLog.js';

class AuditLogRepository {
  // Append-only: create and read are the only supported operations.
  async create(data) {
    return AuditLog.create(data);
  }

  async findPaginated({
    page = 1,
    limit = 20,
    action,
    actorUserId,
    targetType,
    startDate,
    endDate,
  } = {}) {
    const filter = {};

    if (action) filter.action = action;
    if (actorUserId) filter['actor.userId'] = actorUserId;
    if (targetType) filter['target.type'] = targetType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, totalItems] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, totalItems };
  }
}

export default new AuditLogRepository();
