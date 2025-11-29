/**
 * Cookie-Based Authentication Middleware
 *
 * SECURITY FIX: Replaces localStorage JWT with httpOnly cookies
 *
 * Why this is more secure:
 * - httpOnly cookies cannot be accessed by JavaScript (XSS protection)
 * - Cookies are automatically sent by browser (no manual storage needed)
 * - SameSite protection prevents CSRF attacks
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const COOKIE_NAME = 'auth_token';

/**
 * Extended Request interface with user data
 */
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
    username?: string;
    email?: string;
  };
}

/**
 * Set authentication cookie
 *
 * Usage in login route:
 *   setAuthCookie(res, token);
 */
export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,              // ✅ Cannot be accessed by JavaScript
    secure: isProduction,        // ✅ Only sent over HTTPS in production
    sameSite: 'strict',          // ✅ CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',                   // Available on all routes
  });

  logger.debug('Auth cookie set', { secure: isProduction });
}

/**
 * Clear authentication cookie (logout)
 *
 * Usage in logout route:
 *   clearAuthCookie(res);
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  logger.debug('Auth cookie cleared');
}

/**
 * Verify JWT token from cookie
 *
 * This middleware replaces the old Authorization header check.
 * It reads the token from httpOnly cookie instead of header.
 */
export function verifyCookieAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from cookie
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      logger.warn('No auth cookie found', {
        path: req.path,
        cookies: Object.keys(req.cookies)
      });
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      username: decoded.username,
      email: decoded.email,
    };

    logger.debug('Cookie auth successful', {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      role: req.user.role,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT in cookie', { error: error.message });
      clearAuthCookie(res);
      return next(new AuthenticationError('Invalid authentication token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT in cookie');
      clearAuthCookie(res);
      return next(new AuthenticationError('Authentication token expired'));
    }

    logger.error('Cookie auth error', { error });
    next(error);
  }
}

/**
 * LEGACY SUPPORT: Dual-mode authentication
 *
 * Checks both cookie AND Authorization header for graceful migration.
 * Use this during transition period, then switch to verifyCookieAuth only.
 *
 * Migration timeline:
 * 1. Deploy with dualModeAuth (supports both cookie and header)
 * 2. Wait 24 hours for users to re-login
 * 3. Switch to verifyCookieAuth only (remove header support)
 */
export function dualModeAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    let token: string | undefined;

    // Try cookie first (new method)
    if (req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
      logger.debug('Auth via cookie (new method)');
    }
    // Fallback to Authorization header (old method)
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
      logger.debug('Auth via header (legacy method) - user needs to re-login');
    }

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT', { error: error.message });
      clearAuthCookie(res);
      return next(new AuthenticationError('Invalid authentication token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT');
      clearAuthCookie(res);
      return next(new AuthenticationError('Authentication token expired'));
    }

    logger.error('Dual-mode auth error', { error });
    next(error);
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 *
 * Use for public endpoints that behave differently when authenticated.
 */
export function optionalCookieAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return next(); // No token, but that's okay
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      username: decoded.username,
      email: decoded.email,
    };
    next();
  } catch (error) {
    // Invalid token, but don't fail - just continue without user
    logger.debug('Optional auth failed, continuing without user');
    next();
  }
}
