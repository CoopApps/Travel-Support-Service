import { Response } from 'express';

/**
 * Standard API Response Format
 *
 * All API responses should follow this structure for consistency
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Success response wrapper
 */
export function successResponse<T>(
  res: Response,
  data: T,
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  },
  statusCode: number = 200
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = {
      ...meta,
      totalPages: meta.total && meta.limit ? Math.ceil(meta.total / meta.limit) : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  return res.status(statusCode).json(response);
}

/**
 * Error response wrapper
 */
export function errorResponse(
  res: Response,
  code: string,
  message: string,
  details?: any,
  statusCode: number = 500
): Response {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Common error response helpers
 */
export const ErrorResponses = {
  badRequest: (res: Response, message: string, details?: any) =>
    errorResponse(res, 'BAD_REQUEST', message, details, 400),

  unauthorized: (res: Response, message: string = 'Unauthorized') =>
    errorResponse(res, 'UNAUTHORIZED', message, undefined, 401),

  forbidden: (res: Response, message: string = 'Forbidden') =>
    errorResponse(res, 'FORBIDDEN', message, undefined, 403),

  notFound: (res: Response, message: string, details?: any) =>
    errorResponse(res, 'NOT_FOUND', message, details, 404),

  conflict: (res: Response, message: string, details?: any) =>
    errorResponse(res, 'CONFLICT', message, details, 409),

  validationError: (res: Response, details: any) =>
    errorResponse(res, 'VALIDATION_ERROR', 'Validation failed', details, 400),

  internalError: (res: Response, message: string = 'Internal server error') =>
    errorResponse(res, 'INTERNAL_ERROR', message, undefined, 500),

  serviceUnavailable: (res: Response, message: string = 'Service temporarily unavailable') =>
    errorResponse(res, 'SERVICE_UNAVAILABLE', message, undefined, 503),
};

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationParams(query: any): Required<PaginationParams> {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit };
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
