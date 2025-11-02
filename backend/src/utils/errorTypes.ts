/**
 * Custom Error Types
 *
 * Provides structured error handling with appropriate HTTP status codes
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class TenantAccessError extends AuthorizationError {
  constructor() {
    super('You do not have access to this tenant');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, false);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    details?: any;
  };
}

export function formatErrorResponse(
  error: AppError | Error,
  path?: string,
  details?: any
): ErrorResponse {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : error.message;

  return {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
  };
}
