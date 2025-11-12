import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { errorResponse } from '../utils/responseWrapper';

/**
 * Rate Limiting Middleware
 *
 * Protects against:
 * - Brute force attacks
 * - DoS/DDoS attacks
 * - API abuse
 *
 * Different limits are applied to different endpoint types.
 */

/**
 * Custom rate limit error handler
 */
function rateLimitHandler(_req: Request, res: Response) {
  errorResponse(
    res,
    'RATE_LIMIT_EXCEEDED',
    'Too many requests, please try again later',
    {
      retryAfter: res.getHeader('Retry-After'),
      limit: res.getHeader('X-RateLimit-Limit'),
    },
    429
  );
}

/**
 * General API rate limiter
 * Applied to all /api/* routes
 *
 * Allows 100 requests per 15 minutes per IP
 */
export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  // Skip health check endpoints
  skip: (req) => req.path.startsWith('/health'),
  // For Railway/production: validate proxy headers
  validate: { trustProxy: false }, // Disable IP validation warning in production
});

/**
 * Strict rate limiter for authentication endpoints
 * Applied to login, register, password reset, etc.
 *
 * Allows only 5 requests per 15 minutes per IP
 * Prevents brute force password attacks
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // More aggressive lockout for failed attempts
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Moderate rate limiter for write operations
 * Applied to POST, PUT, DELETE routes
 *
 * Allows 30 requests per 15 minutes per IP
 */
export const writeRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit write operations
  message: 'Too many write requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // Only apply to write methods
  skip: (req) => !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method),
});

/**
 * Lenient rate limiter for read operations
 * Applied to GET routes
 *
 * Allows 200 requests per 15 minutes per IP
 */
export const readRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for read operations
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // Only apply to GET requests
  skip: (req) => req.method !== 'GET',
});

/**
 * Very strict rate limiter for expensive operations
 * Applied to report generation, exports, bulk operations
 *
 * Allows only 3 requests per hour per IP
 */
export const expensiveOperationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Very limited
  message: 'This operation is rate limited. Please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Custom rate limiter by tenant
 * Limits requests per tenant rather than per IP
 *
 * Useful for multi-tenant apps where multiple users from same organization
 * might share an IP (corporate NAT, proxy, etc.)
 */
export function createTenantRateLimiter(
  windowMinutes: number = 15,
  maxRequests: number = 100
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: 'Tenant rate limit exceeded, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    // Key by tenant ID instead of IP
    keyGenerator: (req) => {
      const tenantId = req.params.tenantId || 'unknown';
      return `tenant:${tenantId}`;
    },
  });
}

/**
 * Custom rate limiter by user
 * Limits requests per authenticated user
 */
export function createUserRateLimiter(
  windowMinutes: number = 15,
  maxRequests: number = 100
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: 'User rate limit exceeded, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    // Key by user ID from JWT token
    keyGenerator: (req) => {
      const user = (req as any).user;
      const userId = user?.userId || 'anonymous';
      return `user:${userId}`;
    },
  });
}
