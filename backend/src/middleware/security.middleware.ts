import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 1000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many authentication attempts', code: 'RATE_LIMITED' } },
});

export const signingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many signing requests', code: 'RATE_LIMITED' } },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.isProduction ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Upload rate limit exceeded', code: 'RATE_LIMITED' } },
});
