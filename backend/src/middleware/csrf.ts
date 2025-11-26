/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * Implements the Synchronizer Token Pattern:
 * 1. Server generates a unique CSRF token per session
 * 2. Token is sent to client via a dedicated endpoint
 * 3. Client includes token in X-CSRF-Token header for state-changing requests
 * 4. Server validates token before processing request
 *
 * SECURITY: Required because we use httpOnly cookies for authentication,
 * which are automatically sent by the browser, making CSRF attacks possible.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Store CSRF tokens in memory (in production, use Redis for multi-instance deployments)
// Token format: { token: string, userId?: number, tenantId?: number, expiresAt: number }
interface CSRFTokenData {
  token: string;
  userId?: number;
  tenantId?: number;
  createdAt: number;
  expiresAt: number;
}

const tokenStore = new Map<string, CSRFTokenData>();

// Configuration
const CSRF_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_COOKIE_NAME = 'csrf_token_id';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Clean up expired tokens periodically (every hour)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [tokenId, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(tokenId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`CSRF: Cleaned up ${cleaned} expired tokens`);
  }
}, 60 * 60 * 1000);

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(userId?: number, tenantId?: number): { tokenId: string; token: string } {
  const tokenId = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');

  const now = Date.now();
  tokenStore.set(tokenId, {
    token,
    userId,
    tenantId,
    createdAt: now,
    expiresAt: now + CSRF_TOKEN_EXPIRY_MS,
  });

  return { tokenId, token };
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(tokenId: string, token: string, userId?: number, tenantId?: number): boolean {
  const stored = tokenStore.get(tokenId);

  if (!stored) {
    logger.warn('CSRF: Token ID not found', { tokenId: tokenId.substring(0, 8) + '...' });
    return false;
  }

  if (stored.expiresAt < Date.now()) {
    logger.warn('CSRF: Token expired', { tokenId: tokenId.substring(0, 8) + '...' });
    tokenStore.delete(tokenId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const storedBuffer = Buffer.from(stored.token);

  if (tokenBuffer.length !== storedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(tokenBuffer, storedBuffer)) {
    logger.warn('CSRF: Token mismatch', { tokenId: tokenId.substring(0, 8) + '...' });
    return false;
  }

  // Optionally verify user/tenant binding (stricter security)
  if (userId !== undefined && stored.userId !== undefined && stored.userId !== userId) {
    logger.warn('CSRF: User ID mismatch', { expected: stored.userId, received: userId });
    return false;
  }

  if (tenantId !== undefined && stored.tenantId !== undefined && stored.tenantId !== tenantId) {
    logger.warn('CSRF: Tenant ID mismatch', { expected: stored.tenantId, received: tenantId });
    return false;
  }

  return true;
}

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
 * Skips validation for:
 * - GET, HEAD, OPTIONS requests (safe methods)
 * - API endpoints that use API keys instead of cookies
 * - Webhook endpoints
 * - Public routes that don't require authentication
 */
export function csrfProtection(options: {
  excludePaths?: string[];
  excludePatterns?: RegExp[];
} = {}) {
  const {
    excludePaths = [],
    excludePatterns = []
  } = options;

  // Default excluded patterns
  const defaultExcludedPatterns = [
    /^\/api\/webhooks\//,           // Webhook endpoints
    /^\/api\/public\//,             // Public endpoints
    /^\/health/,                    // Health checks
    /^\/api-docs/,                  // Swagger docs
  ];

  const allExcludedPatterns = [...defaultExcludedPatterns, ...excludePatterns];

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for safe HTTP methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip for excluded paths
    if (excludePaths.includes(req.path)) {
      return next();
    }

    // Skip for excluded patterns
    for (const pattern of allExcludedPatterns) {
      if (pattern.test(req.path)) {
        return next();
      }
    }

    // Skip if no authentication cookie (not using cookie auth for this request)
    if (!req.cookies || !req.cookies['auth_token']) {
      // Check if using Authorization header instead (API key/token auth)
      if (req.headers.authorization) {
        // API key/Bearer token auth doesn't need CSRF protection
        // because the token isn't automatically sent by browser
        return next();
      }
    }

    // Get CSRF token from header
    const csrfToken = req.headers[CSRF_HEADER_NAME] as string;
    const csrfTokenId = req.cookies?.[CSRF_COOKIE_NAME];

    if (!csrfToken || !csrfTokenId) {
      logger.warn('CSRF: Missing token or token ID', {
        path: req.path,
        method: req.method,
        hasToken: !!csrfToken,
        hasTokenId: !!csrfTokenId,
      });

      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
        message: 'Request must include a valid CSRF token. Refresh the page and try again.',
      });
    }

    // Get user info if available
    const user = (req as any).user;
    const userId = user?.userId;
    const tenantId = parseInt(req.params.tenantId, 10) || user?.tenantId;

    // Validate token
    if (!validateCSRFToken(csrfTokenId, csrfToken, userId, tenantId)) {
      logger.warn('CSRF: Invalid token', {
        path: req.path,
        method: req.method,
        userId,
        tenantId,
      });

      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID',
        message: 'Your session may have expired. Please refresh the page and try again.',
      });
    }

    next();
  };
}

/**
 * Route handler to get a new CSRF token
 * Call this after login or page load
 */
export function getCSRFTokenHandler(req: Request, res: Response): void {
  const user = (req as any).user;
  const userId = user?.userId;
  const tenantId = parseInt(req.params.tenantId, 10) || user?.tenantId;

  const { tokenId, token } = generateCSRFToken(userId, tenantId);

  // Set token ID in httpOnly cookie (not accessible via JS)
  res.cookie(CSRF_COOKIE_NAME, tokenId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY_MS,
    path: '/',
  });

  // Send token in response body (frontend stores this and sends in header)
  res.json({
    success: true,
    data: {
      csrfToken: token,
      expiresIn: CSRF_TOKEN_EXPIRY_MS / 1000, // seconds
    },
  });
}

/**
 * Get stats about CSRF token store (for monitoring)
 */
export function getCSRFStats(): { totalTokens: number; activeTokens: number } {
  const now = Date.now();
  let activeTokens = 0;

  for (const data of tokenStore.values()) {
    if (data.expiresAt >= now) {
      activeTokens++;
    }
  }

  return {
    totalTokens: tokenStore.size,
    activeTokens,
  };
}
