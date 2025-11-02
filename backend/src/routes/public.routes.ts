import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { queryOne } from '../config/database';
import { NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { Tenant } from '../types/tenant.types';

const router: Router = express.Router();

/**
 * Public Routes
 *
 * Endpoints that don't require authentication
 */

/**
 * @route GET /api/public/tenant/:subdomain
 * @desc Get tenant by subdomain (public endpoint for frontend tenant detection)
 * @access Public
 */
router.get(
  '/public/tenant/:subdomain',
  asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;

    logger.info('Fetching tenant by subdomain', { subdomain });

    const tenant = await queryOne<Tenant>(
      `SELECT
        tenant_id,
        company_name,
        subdomain,
        domain,
        organization_type,
        cooperative_model,
        discount_percentage,
        base_price,
        currency,
        billing_cycle,
        is_active,
        theme,
        created_at
      FROM tenants
      WHERE subdomain = $1 AND is_active = true`,
      [subdomain]
    );

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Parse theme if it's a string
    const processedTenant = {
      ...tenant,
      theme: typeof tenant.theme === 'string'
        ? JSON.parse(tenant.theme || '{}')
        : tenant.theme || {},
    };

    logger.info('Tenant found', { tenantId: tenant.tenant_id, subdomain });

    res.json(processedTenant);
  })
);

export default router;
