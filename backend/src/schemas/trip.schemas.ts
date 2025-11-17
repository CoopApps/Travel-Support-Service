/**
 * Copyright (c) 2025 CoopApps. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL
 */

import Joi from 'joi';
import { commonSchemas } from '../middleware/validation';

/**
 * Trip Validation Schemas
 */

/**
 * Create Trip Schema
 */
export const createTripSchema = Joi.object({
  customer_id: commonSchemas.id.messages({
    'number.base': 'Customer ID must be a number',
    'any.required': 'Customer ID is required',
  }),

  driver_id: commonSchemas.optionalId.messages({
    'number.base': 'Driver ID must be a number',
  }),

  vehicle_id: commonSchemas.optionalId.messages({
    'number.base': 'Vehicle ID must be a number',
  }),

  trip_date: commonSchemas.date.messages({
    'date.base': 'Trip date must be a valid date',
    'any.required': 'Trip date is required',
  }),

  pickup_time: commonSchemas.time,

  pickup_location: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Pickup location is required',
    'string.max': 'Pickup location must not exceed 500 characters',
  }),

  destination: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Destination is required',
    'string.max': 'Destination must not exceed 500 characters',
  }),

  distance_miles: Joi.number().min(0).max(9999).optional().allow(null).messages({
    'number.min': 'Distance cannot be negative',
    'number.max': 'Distance must not exceed 9999 miles',
  }),

  estimated_duration_minutes: Joi.number()
    .integer()
    .min(0)
    .max(1440)
    .optional()
    .allow(null)
    .messages({
      'number.min': 'Duration cannot be negative',
      'number.max': 'Duration must not exceed 1440 minutes (24 hours)',
    }),

  price: commonSchemas.optionalCurrency.messages({
    'number.min': 'Price cannot be negative',
  }),

  passenger_count: Joi.number().integer().min(1).max(50).default(1).messages({
    'number.min': 'Passenger count must be at least 1',
    'number.max': 'Passenger count must not exceed 50',
  }),

  special_requirements: Joi.string().max(1000).optional().allow('', null).messages({
    'string.max': 'Special requirements must not exceed 1000 characters',
  }),

  notes: Joi.string().max(2000).optional().allow('', null).messages({
    'string.max': 'Notes must not exceed 2000 characters',
  }),

  status: Joi.string()
    .valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    .default('scheduled')
    .messages({
      'any.only':
        'Status must be one of: scheduled, confirmed, in_progress, completed, cancelled, no_show',
    }),

  return_trip: commonSchemas.boolean.default(false),

  return_time: commonSchemas.optionalTime,
});

/**
 * Update Trip Schema
 */
export const updateTripSchema = Joi.object({
  customer_id: commonSchemas.optionalId,
  driver_id: commonSchemas.optionalId,
  vehicle_id: commonSchemas.optionalId,
  trip_date: commonSchemas.optionalDate,
  pickup_time: commonSchemas.optionalTime,
  pickup_location: Joi.string().min(1).max(500).optional(),
  destination: Joi.string().min(1).max(500).optional(),
  distance_miles: Joi.number().min(0).max(9999).optional().allow(null),
  estimated_duration_minutes: Joi.number().integer().min(0).max(1440).optional().allow(null),
  price: commonSchemas.optionalCurrency,
  passenger_count: Joi.number().integer().min(1).max(50).optional(),
  special_requirements: Joi.string().max(1000).optional().allow('', null),
  notes: Joi.string().max(2000).optional().allow('', null),
  status: Joi.string()
    .valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    .optional(),
  return_trip: commonSchemas.boolean.optional(),
  return_time: commonSchemas.optionalTime,
  actual_start_time: commonSchemas.optionalTime,
  actual_end_time: commonSchemas.optionalTime,
  actual_distance_miles: Joi.number().min(0).max(9999).optional().allow(null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Trip ID Param Schema
 */
export const tripIdParamSchema = Joi.object({
  tenantId: commonSchemas.tenantId,
  tripId: commonSchemas.id.messages({
    'number.base': 'Trip ID must be a number',
    'number.positive': 'Trip ID must be positive',
  }),
});

/**
 * List Trips Query Schema
 */
export const listTripsQuerySchema = Joi.object({
  limit: commonSchemas.limit,
  offset: commonSchemas.offset,
  search: commonSchemas.search,

  // Filters
  customer_id: commonSchemas.optionalId,
  driver_id: commonSchemas.optionalId,
  vehicle_id: commonSchemas.optionalId,

  status: Joi.string()
    .valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'all')
    .optional(),

  trip_date: commonSchemas.optionalDate,
  start_date: commonSchemas.optionalDate.messages({
    'date.base': 'Start date must be a valid date',
  }),
  end_date: commonSchemas.optionalDate.messages({
    'date.base': 'End date must be a valid date',
  }),

  // Sorting
  sortBy: Joi.string()
    .valid('trip_date', 'pickup_time', 'price', 'distance_miles', 'created_at', 'updated_at')
    .optional(),
  sortOrder: commonSchemas.sortOrder,
});

/**
 * Assign Driver Schema
 */
export const assignDriverSchema = Joi.object({
  driver_id: commonSchemas.id.messages({
    'number.base': 'Driver ID must be a number',
    'any.required': 'Driver ID is required',
  }),

  vehicle_id: commonSchemas.optionalId.messages({
    'number.base': 'Vehicle ID must be a number',
  }),
});

/**
 * Update Trip Status Schema
 */
export const updateTripStatusSchema = Joi.object({
  status: Joi.string()
    .valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only':
        'Status must be one of: scheduled, confirmed, in_progress, completed, cancelled, no_show',
    }),

  notes: Joi.string().max(1000).optional().allow('', null),

  actual_start_time: commonSchemas.optionalTime,
  actual_end_time: commonSchemas.optionalTime,
  actual_distance_miles: Joi.number().min(0).max(9999).optional().allow(null),
});
