/**
 * Cookie-Based Authentication Utilities
 *
 * SECURITY FIX: Replaces localStorage JWT with httpOnly cookies
 *
 * Why this is more secure:
 * - httpOnly cookies cannot be accessed by JavaScript (XSS protection)
 * - Cookies are automatically sent by browser (no manual storage needed)
 * - SameSite protection prevents CSRF attacks
 */

import { Response } from 'express';
import { logger } from './logger';

// Cookie configuration
export const AUTH_COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Set authentication cookie with JWT token
 *
 * @param res Express response object
 * @param token JWT token to store
 */
export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,              // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction,        // Only sent over HTTPS in production
    sameSite: 'lax',             // CSRF protection while allowing same-site navigation
    maxAge: COOKIE_MAX_AGE,      // 24 hours
    path: '/',                   // Available on all routes
  });

  logger.debug('Auth cookie set', { secure: isProduction, sameSite: 'lax' });
}

/**
 * Clear authentication cookie (for logout)
 *
 * @param res Express response object
 */
export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });

  logger.debug('Auth cookie cleared');
}

/**
 * Get cookie options for consistent configuration
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}
