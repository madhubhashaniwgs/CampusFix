import ApiError from '../utils/ApiError.js';

const isPosInt = (v, max) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && (!max || n <= max);
};

export const validateNotificationQuery = (req, res, next) => {
  const { page, limit, unreadOnly } = req.query;
  const errors = [];

  if (page !== undefined && !isPosInt(page)) {
    errors.push('Page must be a positive integer');
  }
  if (limit !== undefined && !isPosInt(limit, 100)) {
    errors.push('Limit must be between 1 and 100');
  }
  if (unreadOnly !== undefined && !['true', 'false', '1', '0'].includes(String(unreadOnly))) {
    errors.push('unreadOnly must be true or false');
  }

  if (errors.length) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.notificationQuery = {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 100),
    unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
  };
  next();
};
