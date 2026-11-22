import express from 'express';

import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
} from '../validators/authValidator.js';
import {
  loginRateLimiter,
  registerRateLimiter,
} from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post(
  '/register',
  registerRateLimiter,
  validateRegister,
  authController.register
);

router.post(
  '/login',
  loginRateLimiter,
  validateLogin,
  authController.login
);

router.get('/me', authenticate, authController.getMe);

router.get('/csrf', authController.getCsrfToken);

router.post(
  '/change-password',
  authenticate,
  validateChangePassword,
  authController.changePassword
);

router.post('/logout', authenticate, authController.logout);

export default router;