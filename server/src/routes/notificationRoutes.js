import { Router } from 'express';

import notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateNotificationQuery } from '../validators/notificationValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateNotificationQuery, notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/:id/read', notificationController.markRead);
router.patch('/read-all', notificationController.markAllRead);

export default router;
