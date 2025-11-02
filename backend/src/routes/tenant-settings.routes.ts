/**
 * Tenant Settings Routes
 *
 * Manage tenant-specific configuration settings
 */

import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * @route GET /api/tenants/:tenantId/settings
 * @desc Get all settings for a tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/settings',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching tenant settings', { tenantId });

    const result = await queryOne<{ settings: any }>(
      'SELECT settings FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (!result) {
      throw new NotFoundError('Tenant not found');
    }

    // Return settings with defaults if not set
    const settings = result.settings || {};
    const defaultSettings = {
      routeOptimization: {
        enabled: true,
        useGoogleMaps: false,
        maxDetourMinutes: 15,
        maxDetourMiles: 5
      }
    };

    res.json({
      ...defaultSettings,
      ...settings
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/settings/route-optimization
 * @desc Get route optimization settings specifically
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/settings/route-optimization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching route optimization settings', { tenantId });

    const result = await queryOne<{ route_optimization: any }>(
      "SELECT settings->'routeOptimization' as route_optimization FROM tenants WHERE tenant_id = $1",
      [tenantId]
    );

    if (!result) {
      throw new NotFoundError('Tenant not found');
    }

    const defaultSettings = {
      enabled: true,
      useGoogleMaps: false,
      maxDetourMinutes: 15,
      maxDetourMiles: 5
    };

    res.json(result.route_optimization || defaultSettings);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/settings/route-optimization
 * @desc Update route optimization settings
 * @access Protected (Admin only)
 */
router.put(
  '/tenants/:tenantId/settings/route-optimization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { enabled, useGoogleMaps, maxDetourMinutes, maxDetourMiles } = req.body;

    logger.info('Updating route optimization settings', {
      tenantId,
      enabled,
      useGoogleMaps
    });

    // Validate inputs
    if (maxDetourMinutes !== undefined && (maxDetourMinutes < 1 || maxDetourMinutes > 60)) {
      throw new ValidationError('maxDetourMinutes must be between 1 and 60');
    }

    if (maxDetourMiles !== undefined && (maxDetourMiles < 1 || maxDetourMiles > 50)) {
      throw new ValidationError('maxDetourMiles must be between 1 and 50');
    }

    // Build update object
    const routeOptimizationSettings: any = {};
    if (enabled !== undefined) routeOptimizationSettings.enabled = Boolean(enabled);
    if (useGoogleMaps !== undefined) routeOptimizationSettings.useGoogleMaps = Boolean(useGoogleMaps);
    if (maxDetourMinutes !== undefined) routeOptimizationSettings.maxDetourMinutes = Number(maxDetourMinutes);
    if (maxDetourMiles !== undefined) routeOptimizationSettings.maxDetourMiles = Number(maxDetourMiles);

    // Update tenant settings
    const result = await queryOne(
      `UPDATE tenants
       SET settings = jsonb_set(
         COALESCE(settings, '{}'::jsonb),
         '{routeOptimization}',
         $2::jsonb
       )
       WHERE tenant_id = $1
       RETURNING settings->'routeOptimization' as route_optimization`,
      [
        tenantId,
        JSON.stringify(routeOptimizationSettings)
      ]
    );

    if (!result) {
      throw new NotFoundError('Tenant not found');
    }

    logger.info('Route optimization settings updated', {
      tenantId,
      settings: result.route_optimization
    });

    res.json({
      message: 'Route optimization settings updated successfully',
      settings: result.route_optimization
    });
  })
);

/**
 * @route PATCH /api/tenants/:tenantId/settings/route-optimization
 * @desc Partially update route optimization settings
 * @access Protected (Admin only)
 */
router.patch(
  '/tenants/:tenantId/settings/route-optimization',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const updates = req.body;

    logger.info('Partially updating route optimization settings', { tenantId, updates });

    // Get current settings
    const current = await queryOne<{ route_optimization: any }>(
      "SELECT settings->'routeOptimization' as route_optimization FROM tenants WHERE tenant_id = $1",
      [tenantId]
    );

    if (!current) {
      throw new NotFoundError('Tenant not found');
    }

    const currentSettings = current.route_optimization || {
      enabled: true,
      useGoogleMaps: false,
      maxDetourMinutes: 15,
      maxDetourMiles: 5
    };

    // Merge with updates
    const newSettings = { ...currentSettings, ...updates };

    // Validate
    if (newSettings.maxDetourMinutes < 1 || newSettings.maxDetourMinutes > 60) {
      throw new ValidationError('maxDetourMinutes must be between 1 and 60');
    }
    if (newSettings.maxDetourMiles < 1 || newSettings.maxDetourMiles > 50) {
      throw new ValidationError('maxDetourMiles must be between 1 and 50');
    }

    // Update
    const result = await queryOne(
      `UPDATE tenants
       SET settings = jsonb_set(
         COALESCE(settings, '{}'::jsonb),
         '{routeOptimization}',
         $2::jsonb
       )
       WHERE tenant_id = $1
       RETURNING settings->'routeOptimization' as route_optimization`,
      [tenantId, JSON.stringify(newSettings)]
    );

    logger.info('Route optimization settings updated', {
      tenantId,
      settings: result?.route_optimization
    });

    res.json({
      message: 'Route optimization settings updated successfully',
      settings: result?.route_optimization
    });
  })
);

export default router;
