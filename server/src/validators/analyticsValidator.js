import ApiError from '../utils/ApiError.js';

const validDate = (v) => v && !Number.isNaN(new Date(v).getTime());

export const validateAnalyticsQuery = (req, res, next) => {
  const { months, startDate, endDate } = req.query;
  const errors = [];

  const m = parseInt(months, 10);
  if (months !== undefined && (!Number.isInteger(m) || m < 1 || m > 24)) {
    errors.push('months must be an integer between 1 and 24');
  }
  if (startDate !== undefined && startDate !== '' && !validDate(startDate)) {
    errors.push('Invalid startDate');
  }
  if (endDate !== undefined && endDate !== '' && !validDate(endDate)) {
    errors.push('Invalid endDate');
  }
  if (validDate(startDate) && validDate(endDate) && new Date(startDate) > new Date(endDate)) {
    errors.push('startDate must be before endDate');
  }

  if (errors.length) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.analyticsQuery = {
    months: m || 6,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  next();
};
