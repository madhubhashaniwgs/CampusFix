import { Router } from 'express';

import auditController from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateAuditLogQuery } from '../validators/auditValidator.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// Read-only: audit logs can never be created, modified or deleted
// through the API.
router.get('/', validateAuditLogQuery, auditController.listAuditLogs);

export default router;
