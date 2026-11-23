import notificationService from '../services/notificationService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

class NotificationController {
  list = async (req, res, next) => {
    try {
      const result = await notificationService.list(
        req.user.id,
        req.notificationQuery || req.query
      );
      const response = new ApiResponse(200, 'Notifications retrieved', result.notifications);
      response.pagination = result.pagination;
      response.unreadCount = result.unreadCount;
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  unreadCount = async (req, res, next) => {
    try {
      const count = await notificationService.unreadCount(req.user.id);
      res.status(200).json(new ApiResponse(200, 'Unread count', { count }));
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req, res, next) => {
    try {
      const result = await notificationService.markRead(req.params.id, req.user.id);
      res.status(200).json(new ApiResponse(200, 'Marked as read', result));
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (req, res, next) => {
    try {
      const result = await notificationService.markAllRead(req.user.id);
      res.status(200).json(new ApiResponse(200, 'All marked as read', result));
    } catch (error) {
      next(error);
    }
  };
}

export default new NotificationController();
