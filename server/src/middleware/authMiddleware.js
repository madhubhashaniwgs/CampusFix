import jwt from 'jsonwebtoken';

import ApiError from '../utils/ApiError.js';
import userRepository from '../repositories/userRepository.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token is required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Authentication token is required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid or inactive user account');
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return next(new ApiError(401, 'Invalid or expired token'));
    }

    next(error);
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action')
      );
    }

    next();
  };
};