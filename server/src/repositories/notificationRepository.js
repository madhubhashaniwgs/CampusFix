import Notification from '../models/Notification.js';

class NotificationRepository {
  async create(data) {
    return Notification.create(data);
  }

  async findByUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const filter = { userId };
    if (unreadOnly) filter.read = false;

    const [items, totalItems, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return { items, totalItems, unreadCount };
  }

  async markRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    ).lean();
  }

  async markAllRead(userId) {
    return Notification.updateMany({ userId, read: false }, { read: true });
  }
}

export default new NotificationRepository();
