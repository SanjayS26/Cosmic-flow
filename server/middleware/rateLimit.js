import { rateLimit } from 'express-rate-limit';
import AppError from '../utils/AppError.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_AUTH_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_MAX_REQUESTS = 5;

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAiRateLimitConfig(environment = process.env) {
  return {
    windowMs: parsePositiveInteger(
      environment.AI_RATE_LIMIT_WINDOW_MS,
      DEFAULT_WINDOW_MS,
    ),
    max: parsePositiveInteger(
      environment.AI_RATE_LIMIT_MAX,
      DEFAULT_MAX_REQUESTS,
    ),
  };
}

export function createAiRateLimiter(config = getAiRateLimitConfig()) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new AppError(
        'RATE_LIMIT_EXCEEDED',
        'Too many task-generation requests. Please try again later.',
        429,
      ));
    },
  });
}

export function getAuthRateLimitConfig(environment = process.env) {
  return {
    windowMs: parsePositiveInteger(
      environment.AUTH_RATE_LIMIT_WINDOW_MS,
      DEFAULT_AUTH_WINDOW_MS,
    ),
    max: parsePositiveInteger(
      environment.AUTH_RATE_LIMIT_MAX,
      DEFAULT_AUTH_MAX_REQUESTS,
    ),
  };
}

export function createAuthRateLimiter(config = getAuthRateLimitConfig()) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res, next) => {
      next(new AppError(
        'RATE_LIMIT_EXCEEDED',
        'Too many authentication attempts. Please try again later.',
        429,
      ));
    },
  });
}
