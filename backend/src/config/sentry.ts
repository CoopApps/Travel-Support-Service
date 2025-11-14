import * as Sentry from '@sentry/node';
import { Application } from 'express';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * Setup:
 * 1. Create account at https://sentry.io (free tier: 5,000 errors/month)
 * 2. Create new project for "Node.js/Express"
 * 3. Copy DSN to .env file as SENTRY_DSN
 * 4. Set SENTRY_ENVIRONMENT (development, staging, production)
 *
 * Features enabled:
 * - Error tracking
 * - Performance monitoring (slow requests)
 * - Release tracking
 * - User context (which user hit the error)
 * - Request data
 */

export function initializeSentry(app: Application): boolean {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  // Only initialize if DSN is configured
  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    console.warn('   Set SENTRY_DSN in .env to enable error monitoring.');
    return false;
  }

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // Sample 10% in prod, 100% in dev

    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
    ],

    // Release tracking (optional - useful for knowing which version has issues)
    release: process.env.npm_package_version,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive query params
      if (event.request?.query_string && typeof event.request.query_string === 'string') {
        // Remove password, token, etc. from query strings
        event.request.query_string = event.request.query_string
          .replace(/password=[^&]*/gi, 'password=[REDACTED]')
          .replace(/token=[^&]*/gi, 'token=[REDACTED]');
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser errors that shouldn't happen on backend
      'Non-Error promise rejection captured',
      // Expected errors
      'ValidationError',
      'Not found',
      // Rate limiting (expected behavior)
      'Too many requests',
    ],
  });

  console.log(`✅ Sentry initialized (${environment})`);
  return true;
}

/**
 * Capture exception manually
 * Use this for errors you catch but want to track
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional_context', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message (non-error)
 * Use for warnings or important events
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 * Call this after authentication to track which user hit errors
 */
export function setUserContext(userId: number, email?: string, tenantId?: number) {
  Sentry.setUser({
    id: userId.toString(),
    email,
    tenant_id: tenantId?.toString(),
  });
}

/**
 * Clear user context
 * Call this on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

export default Sentry;
