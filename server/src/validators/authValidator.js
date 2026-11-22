import ApiError from '../utils/ApiError.js';

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'qwerty123',
  'letmein123',
  'welcome123',
  'admin1234',
  'campusfix1',
  '12345678',
  '123456789',
  '1234567890',
]);

// Shared password policy for all newly created credentials.
// Login intentionally does NOT apply this policy so existing
// users with older passwords can still sign in.
const validatePasswordPolicy = (password) => {
  const errors = [];

  if (password.length < 6) {
    errors.push('Password must contain at least 6 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain a number');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger one');
  }

  return errors;
};

const validateUserFields = ({ fullName, email, password }) => {
  const errors = [];

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    errors.push('Full name is required');
  }

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Please provide a valid email address');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    errors.push(...validatePasswordPolicy(password));
  }

  return errors;
};

export const validateRegister = (req, res, next) => {
  const errors = validateUserFields(req.body);

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};

export const validateCreateStaff = (req, res, next) => {
  const errors = validateUserFields(req.body);

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};

export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword || typeof currentPassword !== 'string') {
    errors.push('Current password is required');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    errors.push('New password is required');
  } else {
    errors.push(...validatePasswordPolicy(newPassword));
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string' || !password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  next();
};