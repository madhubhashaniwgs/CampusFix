import express from 'express';

import issueController from '../controllers/issueController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

import {
  validateCreateIssue,
  validateUpdateStatus,
} from '../validators/issueValidator.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize('student'),
  validateCreateIssue,
  issueController.createIssue
);

router.get(
  '/',
  issueController.getIssues
);

router.get(
  '/:id',
  issueController.getIssueById
);

router.patch(
  '/:id/status',
  authorize('staff', 'admin'),
  validateUpdateStatus,
  issueController.updateIssueStatus
);

export default router;