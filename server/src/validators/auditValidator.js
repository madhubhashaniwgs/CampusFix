import mongoose from 'mongoose';

import ApiError from '../utils/ApiError.js';

const VALID_ACTIONS = new Set([
  'user.registered',
  'user.login',
  'user.logout',
  'user.password_changed',
  'staff.created',
  'admin.created',
  'staff.approved',
  'staff.rejected',
  'issue.created',
  'issue.assigned',
  'issue.status_changed',
  'issue.photo_uploaded',
]);

const VALID_TARGET_TYPES = new Set(['issue', 'user']);

const isValidDate = (value) => {
  if (!value) return true;
  const time = new Date(value).getTime();
  return !Number.isNaN(time);
};

export const validateAuditLogQuery = (req, res, next) => {
  const { page, limit, action, actorId, targetType, startDate, endDate } = req.query;

  const errors = [];

  const pageNum = parseInt(page, 10);
  if (page !== undefined && (!Number.isInteger(pageNum) || pageNum < 1)) {
    errors.push('Page must be a positive integer');
  }

  const limitNum = parseInt(limit, 10);
  if (limit !== undefined && (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100)) {
    errors.push('Limit must be an integer between 1 and 100');
  }

  if (action !== undefined && !VALID_ACTIONS.has(action)) {
    errors.push('Invalid action filter');
  }

  if (actorId !== undefined && actorId !== '' && !mongoose.isValidObjectId(actorId)) {
    errors.push('Invalid actorId');
  }

  if (targetType !== undefined && targetType !== '' && !VALID_TARGET_TYPES.has(targetType)) {
    errors.push('Invalid targetType');
  }

  if (!isValidDate(startDate)) errors.push('Invalid startDate');
  if (!isValidDate(endDate)) errors.push('Invalid endDate');

  if (isValidDate(startDate) && isValidDate(endDate) && new Date(startDate) > new Date(endDate)) {
    errors.push('startDate must be before endDate');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.auditLogQuery = {
    page: pageNum || 1,
    limit: Math.min(limitNum || 20, 100),
    action: action || undefined,
    actorUserId: actorId || undefined,
    targetType: targetType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  next();
};
