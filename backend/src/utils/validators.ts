import Joi from 'joi';
import { ValidationError } from './errorTypes';

/**
 * Validation Schemas
 *
 * Centralized validation schemas for request data.
 * Uses Joi for declarative validation.
 */

// Authentication Schemas
export const loginSchema = Joi.object({
  username: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
});

/**
 * Validation Middleware Factory
 *
 * Creates middleware that validates request body against a schema
 *
 * Usage:
 *   router.post('/login',
 *     validate(loginSchema),
 *     asyncHandler(login)
 *   );
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: any, _res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new ValidationError(errors.join(', '));
    }

    // Replace request body with validated/sanitized value
    req.body = value;
    next();
  };
}

/**
 * Query Parameter Validation
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: any, _res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new ValidationError(errors.join(', '));
    }

    req.query = value;
    next();
  };
}

/**
 * Customer Validation Schemas
 */
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  address: Joi.string().max(500).optional().allow(''),
  address_line_2: Joi.string().max(255).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  county: Joi.string().max(100).optional().allow(''),
  postcode: Joi.string().max(20).optional().allow(''),
  phone: Joi.string().max(50).optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  paying_org: Joi.string().max(255).optional().allow(''),
  has_split_payment: Joi.boolean().optional(),
  provider_split: Joi.object().optional(),
  payment_split: Joi.object().optional(),
  schedule: Joi.object().optional(),
  emergency_contact_name: Joi.string().max(255).optional().allow(''),
  emergency_contact_phone: Joi.string().max(50).optional().allow(''),
  medical_notes: Joi.string().optional().allow(''),
  medication_notes: Joi.string().optional().allow(''),
  driver_notes: Joi.string().optional().allow(''),
  mobility_requirements: Joi.string().optional().allow(''),
  reminder_opt_in: Joi.boolean().optional(),
  reminder_preference: Joi.string().valid('sms', 'email', 'both', 'none').optional(),
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  address: Joi.string().max(500).optional().allow(''),
  address_line_2: Joi.string().max(255).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  county: Joi.string().max(100).optional().allow(''),
  postcode: Joi.string().max(20).optional().allow(''),
  phone: Joi.string().max(50).optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  paying_org: Joi.string().max(255).optional().allow(''),
  has_split_payment: Joi.boolean().optional(),
  provider_split: Joi.object().optional(),
  payment_split: Joi.object().optional(),
  schedule: Joi.object().optional(),
  emergency_contact_name: Joi.string().max(255).optional().allow(''),
  emergency_contact_phone: Joi.string().max(50).optional().allow(''),
  medical_notes: Joi.string().optional().allow(''),
  medication_notes: Joi.string().optional().allow(''),
  driver_notes: Joi.string().optional().allow(''),
  mobility_requirements: Joi.string().optional().allow(''),
  reminder_opt_in: Joi.boolean().optional(),
  reminder_preference: Joi.string().valid('sms', 'email', 'both', 'none').optional(),
});

export const customerListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional().allow(''),
  paying_org: Joi.string().optional().allow(''),
  is_login_enabled: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'created_at', 'updated_at').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});
