/**
 * Copyright (c) 2025 CoopApps. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

import Joi from 'joi';
import { commonSchemas } from '../middleware/validation';

/**
 * Driver Validation Schemas
 */

/**
 * Create Driver Schema
 */
export const createDriverSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Driver name is required',
    'string.max': 'Driver name must not exceed 255 characters',
  }),

  email: commonSchemas.optionalEmail,

  phone: Joi.string().min(10).max(20).required().messages({
    'string.empty': 'Phone number is required',
    'string.min': 'Phone number must be at least 10 characters',
    'string.max': 'Phone number must not exceed 20 characters',
  }),

  license_number: Joi.string().min(5).max(50).required().messages({
    'string.empty': 'License number is required',
    'string.min': 'License number must be at least 5 characters',
    'string.max': 'License number must not exceed 50 characters',
  }),

  license_expiry: commonSchemas.date.messages({
    'date.base': 'License expiry must be a valid date',
  }),

  license_class: Joi.string().max(20).optional().allow('', null),

  dbs_check_date: commonSchemas.optionalDate,

  dbs_expiry: commonSchemas.optionalDate,

  safeguarding_training_date: commonSchemas.optionalDate,

  employment_type: Joi.string()
    .valid('employed', 'self-employed', 'agency', 'cooperative_member', 'volunteer')
    .required()
    .messages({
      'any.only': 'Employment type must be one of: employed, self-employed, agency, cooperative_member, volunteer',
    }),

  hourly_rate: commonSchemas.optionalCurrency,

  address: Joi.string().max(500).optional().allow('', null),

  postcode: Joi.string().max(20).optional().allow('', null),

  emergency_contact_name: Joi.string().max(255).optional().allow('', null),

  emergency_contact_phone: Joi.string().max(20).optional().allow('', null),

  notes: Joi.string().max(2000).optional().allow('', null),

  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
});

/**
 * Update Driver Schema
 */
export const updateDriverSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: commonSchemas.optionalEmail,
  phone: Joi.string().min(10).max(20).optional(),
  license_number: Joi.string().min(5).max(50).optional(),
  license_expiry: commonSchemas.optionalDate,
  license_class: Joi.string().max(20).optional().allow('', null),
  dbs_check_date: commonSchemas.optionalDate,
  dbs_expiry: commonSchemas.optionalDate,
  safeguarding_training_date: commonSchemas.optionalDate,
  employment_type: Joi.string()
    .valid('employed', 'self-employed', 'agency', 'cooperative_member', 'volunteer')
    .optional(),
  hourly_rate: commonSchemas.optionalCurrency,
  address: Joi.string().max(500).optional().allow('', null),
  postcode: Joi.string().max(20).optional().allow('', null),
  emergency_contact_name: Joi.string().max(255).optional().allow('', null),
  emergency_contact_phone: Joi.string().max(20).optional().allow('', null),
  notes: Joi.string().max(2000).optional().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Driver ID Param Schema
 */
export const driverIdParamSchema = Joi.object({
  tenantId: commonSchemas.tenantId,
  driverId: commonSchemas.id.messages({
    'number.base': 'Driver ID must be a number',
    'number.positive': 'Driver ID must be positive',
  }),
});

/**
 * List Drivers Query Schema
 */
export const listDriversQuerySchema = Joi.object({
  limit: commonSchemas.limit,
  offset: commonSchemas.offset,
  search: commonSchemas.search,
  status: Joi.string().valid('active', 'inactive', 'suspended', 'all').optional(),
  employment_type: Joi.string()
    .valid('employed', 'self-employed', 'agency', 'cooperative_member', 'volunteer')
    .optional(),
  sortBy: Joi.string()
    .valid('name', 'email', 'license_expiry', 'created_at', 'updated_at')
    .optional(),
  sortOrder: commonSchemas.sortOrder,
});
