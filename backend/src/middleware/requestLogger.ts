import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import morgan from 'morgan';

/**
 * Request Logging Middleware
 *
 * Logs all HTTP requests with:
 * - Request method, URL, status code
 * - Response time
 * - User info (if authenticated)
 * - Tenant ID (if available)
 * - IP address
 */

/**
 * Custom Morgan token for tenant ID
 */
morgan.token('tenant-id', (req: Request) => {
  return req.params.tenantId || '-';
});

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req: Request) => {
  const user = (req as any).user;
  return user?.userId?.toString() || '-';
});

/**
 * Custom Morgan token for request ID (if you add request ID middleware)
 */
morgan.token('request-id', (req: Request) => {
  return (req as any).requestId || '-';
});

/**
 * Morgan format for development
 */
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

/**
 * Morgan format for production with more details
 */
const prodFormat = ':remote-addr :method :url :status :response-time ms - :res[content-length] - tenant::tenant-id - user::user-id';

/**
 * Custom Morgan stream that writes to Winston logger
 */
const morganStream = {
  write: (message: string) => {
    // Remove trailing newline
    logger.info(message.trim());
  },
};

/**
 * Morgan middleware for HTTP request logging
 */
export const httpLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    stream: morganStream,
    // Skip logging for health check endpoints (too noisy)
    skip: (req: Request) => req.path.startsWith('/health'),
  }
);

/**
 * Detailed request logger middleware
 * Logs request/response details including body (in development only)
 */
export function detailedRequestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Incoming request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
    });
  }

  // Capture original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const duration = Date.now() - startTime;

    // Log response
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      tenantId: req.params.tenantId,
      userId: (req as any).user?.userId,
      ip: req.ip,
    });

    // In development, also log response body
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Response body', {
        status: res.statusCode,
        body: body,
      });
    }

    return originalJson(body);
  };

  next();
}

/**
 * Error request logger
 * Logs failed requests with error details
 */
export function errorRequestLogger(
  error: Error,
  req: Request,
  _res: Response,
  next: NextFunction
) {
  logger.error('Request failed', {
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
    tenantId: req.params.tenantId,
    userId: (req as any).user?.userId,
    ip: req.ip,
    body: req.body,
  });

  next(error);
}

/**
 * Request ID middleware
 * Adds unique ID to each request for tracing
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Slow request logger
 * Warns about requests that take longer than threshold
 */
export function slowRequestLogger(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > thresholdMs) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
          status: res.statusCode,
          tenantId: req.params.tenantId,
          userId: (req as any).user?.userId,
        });
      }
    });

    next();
  };
}
