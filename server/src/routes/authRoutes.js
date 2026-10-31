import express from 'express';

import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validateRegister,
  validateLogin,
} from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', validateRegister, authController.register);

router.post('/login', validateLogin, authController.login);

router.get('/me', authenticate, authController.getMe);

router.post('/logout', authenticate, authController.logout);

export default router;