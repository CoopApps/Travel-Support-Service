import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/database';
import { logger } from '../utils/logger';
import { Tenant } from '../types/tenant.types';

/**
 * Extended Request with tenant information
 */
export interface TenantRequest extends Request {
  tenant?: Tenant;
  subdomain?: string;
  isPlatformAdmin?: boolean;
}

/**
 * Subdomain Detection Middleware
 *
 * Extracts subdomain from hostname and attaches tenant information to request
 * Supports:
 * - localhost:3001 (root domain - platform admin)
 * - demo.localhost:3001 (tenant subdomain)
 * - sheffieldtransport.travelapp.com (production tenant)
 */
export async function detectSubdomain(
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hostname = req.hostname || req.get('host') || '';

    logger.debug('Subdomain detection', { hostname, url: req.url });

    // Parse hostname to extract subdomain
    const parts = hostname.split('.');

    let subdomain: string | null = null;

    // Check for localhost pattern (e.g., demo.localhost or localhost)
    if (hostname.includes('localhost')) {
      const localParts = hostname.split('.');
      if (localParts.length > 1 && localParts[0] !== 'localhost') {
        subdomain = localParts[0];
      }
    }
    // Production domain pattern (e.g., demo.travelapp.com)
    else if (parts.length >= 3) {
      subdomain = parts[0];
    }

    // If no subdomain, this is platform admin access
    if (!subdomain) {
      req.isPlatformAdmin = true;
      logger.debug('Platform admin access detected', { hostname });
      return next();
    }

    // Lookup tenant by subdomain
    const tenant = await queryOne<Tenant>(
      `SELECT * FROM tenants WHERE subdomain = $1 AND is_active = true`,
      [subdomain]
    );

    if (!tenant) {
      logger.warn('Tenant not found for subdomain', { subdomain, hostname });
      // Don't throw error - let route handlers decide what to do
      req.subdomain = subdomain;
      return next();
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.subdomain = subdomain;

    logger.debug('Tenant detected', {
      tenantId: tenant.tenant_id,
      companyName: tenant.company_name,
      subdomain,
    });

    next();
  } catch (error) {
    logger.error('Error in subdomain detection', { error });
    next(error);
  }
}

/**
 * Require tenant middleware
 * Use on routes that must have a valid tenant
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    logger.warn('Tenant required but not found', {
      subdomain: req.subdomain,
      hostname: req.hostname,
    });
    res.status(404).json({
      error: {
        message: 'Tenant not found. Please check the subdomain.',
        code: 'TENANT_NOT_FOUND',
        subdomain: req.subdomain,
      },
    });
    return;
  }

  next();
}
