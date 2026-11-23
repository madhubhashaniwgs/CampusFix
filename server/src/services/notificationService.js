import notificationRepository from '../repositories/notificationRepository.js';
import { emitToUser } from '../socket/socketServer.js';
import ApiError from '../utils/ApiError.js';

class NotificationService {
  // Create a persistent notification and push it in real time.
  // Best-effort: socket emit failure never affects persistence.
  async create(data) {
    const notification = await notificationRepository.create(data);
    emitToUser(data.userId.toString(), 'notification:new', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      issueId: notification.issueId || null,
      read: false,
      createdAt: notification.createdAt,
    });
    return notification;
  }

  async list(userId, query = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const { items, totalItems, unreadCount } = await notificationRepository.findByUser(userId, {
      page,
      limit,
      unreadOnly,
    });

    return {
      notifications: items.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        issueId: n.issueId || null,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
      pagination: {
        page,
        pageSize: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async unreadCount(userId) {
    const { unreadCount } = await notificationRepository.findByUser(userId, {
      page: 1,
      limit: 1,
    });
    return unreadCount;
  }

  async markRead(notificationId, userId) {
    const updated = await notificationRepository.markRead(notificationId, userId);
    if (!updated) {
      throw new ApiError(404, 'Notification not found');
    }
    emitToUser(userId.toString(), 'notification:read', {
      id: updated._id,
    });
    return { id: updated._id, read: true };
  }

  async markAllRead(userId) {
    await notificationRepository.markAllRead(userId);
    emitToUser(userId.toString(), 'notification:read_all', {});
    return { success: true };
  }
}

export default new NotificationService();
