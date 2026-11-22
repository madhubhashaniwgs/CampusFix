import express from 'express';

import userController from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateCreateStaff } from '../validators/authValidator.js';

const router = express.Router();

router.post(
  '/staff',
  authenticate,
  authorize('admin'),
  validateCreateStaff,
  userController.createStaff
);

export default router;
