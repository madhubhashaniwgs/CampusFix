import express from 'express';

import userController from '../controllers/userController.js';
import analyticsController from '../controllers/analyticsController.js';
import { validateAnalyticsQuery } from '../validators/analyticsValidator.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/analytics', validateAnalyticsQuery, analyticsController.getDashboardAnalytics);
router.get('/users', userController.listUsers);
router.patch('/staff/:id/approve', userController.approveStaff);
router.patch('/staff/:id/reject', userController.rejectStaff);

export default router;
