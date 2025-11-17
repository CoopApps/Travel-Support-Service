/**
 * Copyright (c) 2025 CoopApps. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

import Joi from 'joi';
import { commonSchemas } from '../middleware/validation';

/**
 * Customer Validation Schemas
 */

/**
 * Create Customer Schema
 */
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Customer name is required',
    'string.max': 'Customer name must not exceed 255 characters',
  }),

  email: commonSchemas.optionalEmail,

  phone: Joi.string().min(10).max(20).optional().allow('', null).messages({
    'string.min': 'Phone number must be at least 10 characters',
    'string.max': 'Phone number must not exceed 20 characters',
  }),

  address: Joi.string().max(500).optional().allow('', null).messages({
    'string.max': 'Address must not exceed 500 characters',
  }),

  postcode: Joi.string().max(20).optional().allow('', null).messages({
    'string.max': 'Postcode must not exceed 20 characters',
  }),

  notes: Joi.string().max(2000).optional().allow('', null).messages({
    'string.max': 'Notes must not exceed 2000 characters',
  }),

  mobility_requirements: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Mobility requirements must not exceed 500 characters',
    }),

  preferred_contact_method: Joi.string()
    .valid('email', 'phone', 'sms', 'none')
    .optional()
    .allow('', null),

  emergency_contact_name: Joi.string().max(255).optional().allow('', null),

  emergency_contact_phone: Joi.string().max(20).optional().allow('', null),

  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
});

/**
 * Update Customer Schema
 * Same as create but all fields optional
 */
export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: commonSchemas.optionalEmail,
  phone: Joi.string().min(10).max(20).optional().allow('', null),
  address: Joi.string().max(500).optional().allow('', null),
  postcode: Joi.string().max(20).optional().allow('', null),
  notes: Joi.string().max(2000).optional().allow('', null),
  mobility_requirements: Joi.string().max(500).optional().allow('', null),
  preferred_contact_method: Joi.string()
    .valid('email', 'phone', 'sms', 'none')
    .optional()
    .allow('', null),
  emergency_contact_name: Joi.string().max(255).optional().allow('', null),
  emergency_contact_phone: Joi.string().max(20).optional().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Customer ID Param Schema
 */
export const customerIdParamSchema = Joi.object({
  tenantId: commonSchemas.tenantId,
  customerId: commonSchemas.id.messages({
    'number.base': 'Customer ID must be a number',
    'number.positive': 'Customer ID must be positive',
  }),
});

/**
 * List Customers Query Schema
 */
export const listCustomersQuerySchema = Joi.object({
  limit: commonSchemas.limit,
  offset: commonSchemas.offset,
  search: commonSchemas.search,
  status: Joi.string().valid('active', 'inactive', 'suspended', 'all').optional(),
  sortBy: Joi.string().valid('name', 'email', 'created_at', 'updated_at').optional(),
  sortOrder: commonSchemas.sortOrder,
});
