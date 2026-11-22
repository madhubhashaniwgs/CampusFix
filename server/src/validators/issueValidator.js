import ApiError from '../utils/ApiError.js';

export const validCategories = [
  'electrical',
  'plumbing',
  'it',
  'furniture',
  'other',
];

export const validPriorities = [
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

export const filterableStatuses = [
  'reported',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
];

const MAX_SEARCH_LENGTH = 100;
const MAX_LIMIT = 100;

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


export const validateIssueListQuery = (req, res, next) => {
  const {
    page,
    limit,
    status,
    priority,
    category,
    assignee,
    dateFrom,
    dateTo,
    search,
  } = req.query;

  const errors = [];
  const listQuery = {};

  if (page !== undefined) {
    const parsed = Number(page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.push('Page must be a positive integer');
    } else {
      listQuery.page = parsed;
    }
  }

  if (limit !== undefined) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      errors.push(`Limit must be an integer between 1 and ${MAX_LIMIT}`);
    } else {
      listQuery.limit = parsed;
    }
  }

  if (status !== undefined) {
    const statuses = String(status).split(',').map((s) => s.trim());
    const invalid = statuses.filter((s) => !filterableStatuses.includes(s));
    if (statuses.length === 0 || invalid.length > 0) {
      errors.push('Please provide valid issue statuses');
    } else {
      listQuery.status = statuses;
    }
  }

  if (priority !== undefined) {
    if (!validPriorities.includes(priority)) {
      errors.push('Please provide a valid priority');
    } else {
      listQuery.priority = priority;
    }
  }

  if (category !== undefined) {
    if (!validCategories.includes(category)) {
      errors.push('Please provide a valid category');
    } else {
      listQuery.category = category;
    }
  }

  if (assignee !== undefined) {
    if (assignee !== 'unassigned') {
      errors.push('Assignee filter must be "unassigned"');
    } else {
      listQuery.assignee = assignee;
    }
  }

  if (dateFrom !== undefined) {
    if (Number.isNaN(Date.parse(dateFrom))) {
      errors.push('dateFrom must be a valid date');
    } else {
      listQuery.dateFrom = dateFrom;
    }
  }

  if (dateTo !== undefined) {
    if (Number.isNaN(Date.parse(dateTo))) {
      errors.push('dateTo must be a valid date');
    } else {
      listQuery.dateTo = dateTo;
    }
  }

  if (
    listQuery.dateFrom &&
    listQuery.dateTo &&
    new Date(listQuery.dateFrom) > new Date(listQuery.dateTo)
  ) {
    errors.push('dateFrom must be before or equal to dateTo');
  }

  if (search !== undefined) {
    if (
      typeof search !== 'string' ||
      search.trim().length > MAX_SEARCH_LENGTH
    ) {
      errors.push(
        `Search must be a string of at most ${MAX_SEARCH_LENGTH} characters`
      );
    } else {
      listQuery.search = search.trim();
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.issueListQuery = listQuery;

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