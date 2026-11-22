import rateLimit from 'express-rate-limit';

import ApiError from '../utils/ApiError.js';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const createRateLimiter = (message) =>
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, message)),
  });

export const loginRateLimiter = createRateLimiter(
  'Too many login attempts. Please try again in 15 minutes.'
);

export const registerRateLimiter = createRateLimiter(
  'Too many registration attempts. Please try again in 15 minutes.'
);
