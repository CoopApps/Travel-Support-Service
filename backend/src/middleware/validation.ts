/**
 * Copyright (c) 2025 CoopApps. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

/**
 * Validation Error Response
 */
export class ValidationError extends Error {
  public statusCode: number;
  public details: any[];

  constructor(message: string, details: any[]) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Validation middleware factory
 *
 * Creates middleware that validates request data against a Joi schema
 *
 * @param schema - Joi validation schema
 * @param property - Which part of the request to validate ('body', 'query', 'params')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const customerSchema = Joi.object({
 *   name: Joi.string().min(1).max(255).required(),
 *   email: Joi.string().email().required(),
 * });
 *
 * router.post('/customers',
 *   validate(customerSchema, 'body'),
 *   createCustomer
 * );
 * ```
 */
export function validate(
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types (e.g., "123" to 123)
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Validation failed', {
        property,
        errors: details,
        path: req.path,
        method: req.method,
      });

      return next(new ValidationError('Validation failed', details));
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
}

/**
 * Validate multiple parts of the request
 *
 * @example
 * ```typescript
 * router.put('/customers/:customerId',
 *   validateMultiple({
 *     params: Joi.object({ customerId: Joi.number().required() }),
 *     body: customerSchema
 *   }),
 *   updateCustomer
 * );
 * ```
 */
export function validateMultiple(schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: any[] = [];

    // Validate each part of the request
    for (const [property, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const { error, value } = schema.validate(req[property as keyof Request], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        errors.push(
          ...error.details.map((detail) => ({
            property,
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type,
          }))
        );
      } else {
        // Replace with validated value
        (req as any)[property] = value;
      }
    }

    if (errors.length > 0) {
      logger.warn('Multi-part validation failed', {
        errors,
        path: req.path,
        method: req.method,
      });

      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}

/**
 * Common Joi validation schemas
 * Reusable validation patterns
 */
export const commonSchemas = {
  /**
   * Positive integer (for IDs)
   */
  id: Joi.number().integer().positive().required(),

  /**
   * Optional positive integer
   */
  optionalId: Joi.number().integer().positive().optional(),

  /**
   * Email address
   */
  email: Joi.string().email().max(255).required(),

  /**
   * Optional email
   */
  optionalEmail: Joi.string().email().max(255).optional().allow('', null),

  /**
   * Phone number (UK format)
   */
  phone: Joi.string()
    .pattern(/^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/)
    .message('Phone number must be a valid UK mobile number')
    .optional()
    .allow('', null),

  /**
   * Postcode (UK format)
   */
  postcode: Joi.string()
    .pattern(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i)
    .message('Must be a valid UK postcode')
    .optional()
    .allow('', null),

  /**
   * Date (ISO 8601)
   */
  date: Joi.date().iso().required(),

  /**
   * Optional date
   */
  optionalDate: Joi.date().iso().optional().allow('', null),

  /**
   * Time (HH:MM format)
   */
  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .message('Time must be in HH:MM format')
    .required(),

  /**
   * Optional time
   */
  optionalTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .message('Time must be in HH:MM format')
    .optional()
    .allow('', null),

  /**
   * Pagination limit
   */
  limit: Joi.number().integer().min(1).max(1000).default(50),

  /**
   * Pagination offset
   */
  offset: Joi.number().integer().min(0).default(0),

  /**
   * Search query
   */
  search: Joi.string().max(255).optional().allow(''),

  /**
   * Sort field
   */
  sortBy: Joi.string().max(100).optional(),

  /**
   * Sort order
   */
  sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('asc'),

  /**
   * Boolean value
   */
  boolean: Joi.boolean(),

  /**
   * Tenant ID (must match route param)
   */
  tenantId: Joi.number().integer().positive().required(),

  /**
   * Currency amount (GBP, 2 decimal places)
   */
  currency: Joi.number().precision(2).min(0).required(),

  /**
   * Optional currency
   */
  optionalCurrency: Joi.number().precision(2).min(0).optional().allow(null),

  /**
   * Percentage (0-100)
   */
  percentage: Joi.number().min(0).max(100).required(),

  /**
   * URL
   */
  url: Joi.string().uri().max(2048).optional().allow('', null),

  /**
   * Status enum
   */
  status: (validStatuses: string[]) =>
    Joi.string()
      .valid(...validStatuses)
      .required(),

  /**
   * Filename (safe characters only)
   */
  filename: Joi.string()
    .pattern(/^[a-zA-Z0-9_\-\.]+$/)
    .max(255)
    .optional(),
};

/**
 * Pagination query schema (common for list endpoints)
 */
export const paginationSchema = Joi.object({
  limit: commonSchemas.limit,
  offset: commonSchemas.offset,
  search: commonSchemas.search,
  sortBy: commonSchemas.sortBy,
  sortOrder: commonSchemas.sortOrder,
});
