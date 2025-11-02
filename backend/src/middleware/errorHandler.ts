import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { errorResponse, ErrorResponses } from '../utils/responseWrapper';

/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown in the application and formats them
 * into consistent JSON responses. Also logs errors for debugging.
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('Application error', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
        tenantId: req.params.tenantId,
      });
    } else {
      logger.warn('Client error', {
        message: error.message,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
        tenantId: req.params.tenantId,
      });
    }
  } else {
    // Unexpected error
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
      tenantId: req.params.tenantId,
    });
  }

  // Format and send error response using standardized format
  if (error instanceof AppError) {
    const code = error.constructor.name.replace('Error', '').toUpperCase() || 'APPLICATION_ERROR';
    errorResponse(
      res,
      code,
      error.message,
      process.env.NODE_ENV === 'development' ? { stack: error.stack, path: req.path } : undefined,
      error.statusCode
    );
  } else {
    // Unexpected error
    errorResponse(
      res,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      process.env.NODE_ENV === 'development' ? { stack: error.stack, path: req.path } : undefined,
      500
    );
  }
}

/**
 * 404 Not Found Handler
 * Should be added after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  });

  ErrorResponses.notFound(res, `Route not found: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
  });
}

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 *
 * Usage:
 *   router.get('/customers', asyncHandler(async (req, res) => {
 *     const customers = await getCustomers();
 *     res.json(customers);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
