import jwt from 'jsonwebtoken';

import ApiError from '../utils/ApiError.js';
import userRepository from '../repositories/userRepository.js';
import { AUTH_COOKIE_NAME } from '../utils/cookieConfig.js';

const extractToken = (req) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, 'Authentication token is required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid or inactive user account');
    }

    // Reject tokens issued before the user's most recent logout.
    if ((decoded.ver ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new ApiError(401, 'Session has been invalidated');
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

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
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
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }

    next();
  };
};
