/**
 * Copyright (c) 2025 CoopApps. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

import { Application, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Production Security Middleware
 *
 * Applies production-specific security settings
 */

/**
 * Force HTTPS in production
 */
export function forceHTTPS(req: Request, res: Response, next: NextFunction): void {
  if (process.env.FORCE_HTTPS === 'true') {
    // Trust Railway/Heroku/Vercel proxy headers
    const proto = req.headers['x-forwarded-proto'] as string;

    if (proto && proto !== 'https') {
      logger.info('Redirecting HTTP to HTTPS', {
        originalUrl: req.url,
        host: req.headers.host,
      });

      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }

  next();
}

/**
 * Set secure cookie options in production
 */
export function getSecureCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: process.env.COOKIE_HTTPONLY !== 'false', // Default true
    secure: isProduction && process.env.COOKIE_SECURE !== 'false', // HTTPS only in production
    sameSite: (process.env.COOKIE_SAMESITE || 'strict') as 'strict' | 'lax' | 'none',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}

/**
 * Get database SSL configuration
 */
export function getDatabaseSSLConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const sslEnabled = process.env.DB_SSL === 'true';

  if (!isProduction) {
    return false; // No SSL in development
  }

  if (!sslEnabled) {
    logger.warn('⚠️  Database SSL is DISABLED in production - this is NOT recommended!');
    return false;
  }

  // SSL configuration for production
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', // Default true in production
    ca: process.env.DB_SSL_CA, // Optional: CA certificate
    key: process.env.DB_SSL_KEY, // Optional: Client key
    cert: process.env.DB_SSL_CERT, // Optional: Client certificate
  };
}

/**
 * Initialize production security settings
 *
 * Call this during server startup
 */
export function initializeProductionSecurity(app: Application): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    logger.info('Running in development mode - production security disabled');
    return;
  }

  logger.info('🔒 Initializing production security settings...');

  // 1. Force HTTPS
  if (process.env.FORCE_HTTPS === 'true') {
    app.use(forceHTTPS);
    logger.info('✅ HTTPS enforcement enabled');
  } else {
    logger.warn('⚠️  HTTPS enforcement DISABLED - set FORCE_HTTPS=true');
  }

  // 2. Check critical environment variables
  validateProductionConfig();

  logger.info('🔒 Production security initialized');
}

/**
 * Validate production configuration
 *
 * Ensures all critical settings are configured
 */
function validateProductionConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return; // Skip validation in development
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical: JWT Secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters');
  }

  // Critical: Encryption Key
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
    errors.push('ENCRYPTION_KEY must be set and at least 64 characters');
  }

  // Critical: Database password
  if (
    !process.env.DB_PASSWORD ||
    process.env.DB_PASSWORD === 'your_password_here' ||
    process.env.DB_PASSWORD.length < 8
  ) {
    errors.push('DB_PASSWORD must be set and at least 8 characters');
  }

  // Warning: Database SSL
  if (process.env.DB_SSL !== 'true') {
    warnings.push('DB_SSL should be enabled in production (set DB_SSL=true)');
  }

  // Warning: HTTPS
  if (process.env.FORCE_HTTPS !== 'true') {
    warnings.push('HTTPS should be enforced in production (set FORCE_HTTPS=true)');
  }

  // Warning: Swagger docs
  if (process.env.ENABLE_SWAGGER_DOCS !== 'false') {
    warnings.push(
      'Swagger docs should be disabled in production (set ENABLE_SWAGGER_DOCS=false)'
    );
  }

  // Warning: Sentry
  if (!process.env.SENTRY_DSN) {
    warnings.push('SENTRY_DSN should be configured for error tracking');
  }

  // Log errors and warnings
  if (errors.length > 0) {
    logger.error('❌ PRODUCTION CONFIGURATION ERRORS:');
    errors.forEach((error) => logger.error(`  - ${error}`));
    throw new Error('Production configuration validation failed');
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  PRODUCTION CONFIGURATION WARNINGS:');
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  logger.info('✅ Production configuration validated');
}

/**
 * Get CORS allowed origins
 */
export function getCORSOrigins(): string[] {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (!allowedOrigins) {
    // Default allowed origins
    return [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://travel-supportbackend-production.up.railway.app',
    ];
  }

  return allowedOrigins.split(',').map((origin) => origin.trim());
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = `ENABLE_${feature.toUpperCase()}`;
  return process.env[envVar] !== 'false';
}
