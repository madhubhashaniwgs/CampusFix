import rateLimit from 'express-rate-limit';

import ApiError from '../utils/ApiError.js';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Factory exported so tests can inject a short window / low max
// without touching the production constants above.
export const createRateLimiter = (message, options = {}) =>
  rateLimit({
    windowMs: options.windowMs ?? RATE_LIMIT_WINDOW_MS,
    max: options.max ?? RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    handler: (req, res, next) => next(new ApiError(429, message)),
  });

const passthrough = (req, res, next) => next();

const isTest = process.env.NODE_ENV === 'test';

export const loginRateLimiter = isTest
  ? passthrough
  : createRateLimiter('Too many login attempts. Please try again in 15 minutes.');

export const registerRateLimiter = isTest
  ? passthrough
  : createRateLimiter('Too many registration attempts. Please try again in 15 minutes.');
