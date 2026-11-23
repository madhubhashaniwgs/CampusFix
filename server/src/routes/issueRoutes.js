import express from 'express';

import issueController from '../controllers/issueController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { uploadPhoto } from '../middleware/uploadMiddleware.js';
import { uploadRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateAssignIssue } from '../validators/issueValidator.js';

import {
  validateCreateIssue,
  validateUpdateStatus,
  validateIssueListQuery,
} from '../validators/issueValidator.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('student'), validateCreateIssue, issueController.createIssue);

// Authenticated users of any role may upload issue photos.
// Folder is fixed server-side; multer + magic-byte checks run first.
router.post('/upload', uploadRateLimiter, uploadPhoto, issueController.uploadImage);

router.get('/', validateIssueListQuery, issueController.getIssues);

router.get('/staff', authorize('admin'), issueController.getStaffMembers);

router.patch('/:id/assign', authorize('admin'), validateAssignIssue, issueController.assignIssue);

router.get('/:id', issueController.getIssueById);

router.patch(
  '/:id/status',
  authorize('staff', 'admin'),
  validateUpdateStatus,
  issueController.updateIssueStatus
);

export default router;
