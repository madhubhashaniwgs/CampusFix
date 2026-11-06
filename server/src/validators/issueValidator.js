import ApiError from '../utils/ApiError.js';

const validCategories = [
  'electrical',
  'plumbing',
  'it',
  'furniture',
  'other',
];

const validPriorities = [
  'low',
  'medium',
  'high',
  'urgent',
];

const validStatuses = [
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
];

export const validateCreateIssue = (req, res, next) => {
  const { title, description, category, location, priority } = req.body;

  const errors = [];

  if (!title || !title.trim()) {
    errors.push('Issue title is required');
  }

  if (title && title.length > 120) {
    errors.push('Title cannot exceed 120 characters');
  }

  if (!description || !description.trim()) {
    errors.push('Issue description is required');
  }

  if (description && description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }

  if (!category || !validCategories.includes(category)) {
    errors.push('Please select a valid category');
  }

  if (!location || !location.trim()) {
    errors.push('Issue location is required');
  }

  if (priority && !validPriorities.includes(priority)) {
    errors.push('Please select a valid priority');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};

export const validateUpdateStatus = (req, res, next) => {
  const { status, note } = req.body;
  const errors = [];

  if (!status || !validStatuses.includes(status)) {
    errors.push('Please provide a valid issue status');
  }

  if (note && note.length > 500) {
    errors.push('Status note cannot exceed 500 characters');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};


export const validateAssignIssue = (req, res, next) => {
  const { staffId } = req.body;

  if (!staffId) {
    return next(
      new ApiError(400, 'Staff ID is required')
    );
  }

  if (!/^[0-9a-fA-F]{24}$/.test(staffId)) {
    return next(
      new ApiError(400, 'Invalid staff ID')
    );
  }

  next();
};