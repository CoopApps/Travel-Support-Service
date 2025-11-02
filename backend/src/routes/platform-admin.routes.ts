import express, { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { AuthenticationError, ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  Tenant,
  CreateTenantDto,
  UpdateTenantDto,
  TenantListQuery,
  TenantListResponse,
  PlatformAdminLoginDto,
  PlatformAdminTokenPayload
} from '../types/tenant.types';

const router: Router = express.Router();

/**
 * Platform Admin Middleware
 * Verifies JWT token for platform admin users
 */
function verifyPlatformAdmin(req: any, _res: Response, next: any): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as PlatformAdminTokenPayload;

    // Verify this is a platform admin token (not a tenant user token)
    if (!decoded.adminId) {
      throw new AuthenticationError('Invalid admin token');
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * @route POST /api/platform-admin/login
 * @desc Platform admin login
 * @access Public
 */
router.post(
  '/platform-admin/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password }: PlatformAdminLoginDto = req.body;

    logger.info('Platform admin login attempt', { username });

    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Find admin (try commonwealth_admins first, fallback to platform_admins for backward compatibility)
    let admin = await queryOne<any>(
      'SELECT * FROM commonwealth_admins WHERE username = $1 AND is_active = true',
      [username]
    );

    let tableName = 'commonwealth_admins';
    let idColumn = 'commonwealth_admin_id';

    // Fallback to platform_admins if table not renamed yet
    if (!admin) {
      admin = await queryOne<any>(
        'SELECT * FROM platform_admins WHERE username = $1 AND is_active = true',
        [username]
      );
      tableName = 'platform_admins';
      idColumn = 'admin_id';
    }

    if (!admin) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Get admin ID (handle both old and new schema)
    const adminId = admin.commonwealth_admin_id || admin.admin_id;

    // Update last login
    await query(
      `UPDATE ${tableName} SET last_login = CURRENT_TIMESTAMP WHERE ${idColumn} = $1`,
      [adminId]
    );

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload: PlatformAdminTokenPayload = {
      adminId: adminId,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      commonwealthRole: admin.commonwealth_role || 'super_admin',
      appPermissions: admin.app_permissions || { all_apps: true },
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

    logger.info('Platform admin login successful', {
      adminId: adminId,
      username: admin.username,
    });

    res.json({
      token,
      admin: {
        id: adminId,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  })
);

/**
 * @route GET /api/platform-admin/tenants
 * @desc Get all tenants with pagination and filtering
 * @access Protected (Platform Admin)
 */
router.get(
  '/platform-admin/tenants',
  verifyPlatformAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search = '',
      organization_type,
      is_active,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query as TenantListQuery;

    logger.info('Fetching tenants', { page, limit, search });

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (search && search.trim()) {
      conditions.push(`(
        company_name ILIKE $${paramCount} OR
        subdomain ILIKE $${paramCount} OR
        contact_email ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (organization_type) {
      conditions.push(`organization_type = $${paramCount}`);
      params.push(organization_type);
      paramCount++;
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenants ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get tenants
    const validSortColumns = ['company_name', 'created_at', 'subdomain', 'organization_type'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const tenants = await query<Tenant>(
      `SELECT
        tenant_id,
        company_name,
        subdomain,
        domain,
        is_active,
        contact_name,
        contact_email,
        contact_phone,
        address,
        features,
        theme,
        organization_type,
        cooperative_model,
        discount_percentage,
        base_price,
        currency,
        billing_cycle,
        app_id,
        governance_requirements,
        enabled_modules,
        created_at,
        updated_at
      FROM tenants
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const response: TenantListResponse = {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    res.json(response);
  })
);

/**
 * @route POST /api/platform-admin/tenants
 * @desc Create a new tenant
 * @access Protected (Platform Admin)
 */
router.post(
  '/platform-admin/tenants',
  verifyPlatformAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantData: CreateTenantDto = req.body;

    logger.info('Creating tenant', { companyName: tenantData.company_name, subdomain: tenantData.subdomain });

    // Validate required fields
    if (!tenantData.company_name || !tenantData.subdomain) {
      throw new ValidationError('Company name and subdomain are required');
    }

    if (!tenantData.admin_username || !tenantData.admin_email || !tenantData.admin_password) {
      throw new ValidationError('Admin user credentials are required');
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(tenantData.subdomain)) {
      throw new ValidationError('Subdomain must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if subdomain already exists
    const existing = await queryOne<{ tenant_id: number }>(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [tenantData.subdomain]
    );

    if (existing) {
      throw new ValidationError('Subdomain already exists');
    }

    // Get default app_id (Travel Support)
    const appResult = await queryOne<{ app_id: number }>(
      'SELECT app_id FROM commonwealth_apps WHERE app_code = $1',
      ['travel_support']
    );
    const defaultAppId = appResult?.app_id || 1;

    // Create tenant
    const result = await queryOne<{ tenant_id: number }>(
      `INSERT INTO tenants (
        company_name, subdomain, domain,
        contact_name, contact_email, contact_phone, address,
        features, theme,
        organization_type, cooperative_model,
        base_price, currency, billing_cycle, app_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING tenant_id`,
      [
        tenantData.company_name,
        tenantData.subdomain,
        tenantData.domain || null,
        tenantData.contact_name || null,
        tenantData.contact_email || null,
        tenantData.contact_phone || null,
        tenantData.address || null,
        JSON.stringify(tenantData.features || {}),
        JSON.stringify(tenantData.theme || {}),
        tenantData.organization_type || 'charity',
        tenantData.cooperative_model || null,
        tenantData.base_price || 100.00,
        tenantData.currency || 'GBP',
        tenantData.billing_cycle || 'monthly',
        tenantData.app_id || defaultAppId,
      ]
    );

    const tenantId = result!.tenant_id;

    // Create admin user for this tenant
    const hashedPassword = await bcrypt.hash(tenantData.admin_password, 10);
    const adminFullName = (tenantData as any).admin_full_name || tenantData.contact_name || 'Administrator';

    await query(
      `INSERT INTO tenant_users (
        tenant_id, username, email, full_name, password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, 'admin', true)`,
      [tenantId, tenantData.admin_username, tenantData.admin_email, adminFullName, hashedPassword]
    );

    logger.info('Tenant created successfully', {
      tenantId,
      companyName: tenantData.company_name,
      subdomain: tenantData.subdomain,
    });

    res.status(201).json({
      tenant_id: tenantId,
      company_name: tenantData.company_name,
      subdomain: tenantData.subdomain,
      message: 'Tenant created successfully',
    });
  })
);

/**
 * @route PUT /api/platform-admin/tenants/:tenantId
 * @desc Update a tenant
 * @access Protected (Platform Admin)
 */
router.put(
  '/platform-admin/tenants/:tenantId',
  verifyPlatformAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const tenantData: UpdateTenantDto = req.body;

    logger.info('Updating tenant', { tenantId });

    // Check if tenant exists
    const existing = await queryOne<{ tenant_id: number }>(
      'SELECT tenant_id FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Tenant not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (tenantData.company_name !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      params.push(tenantData.company_name);
    }
    if (tenantData.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(tenantData.is_active);
    }
    if (tenantData.contact_name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      params.push(tenantData.contact_name);
    }
    if (tenantData.contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount++}`);
      params.push(tenantData.contact_email);
    }
    if (tenantData.contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramCount++}`);
      params.push(tenantData.contact_phone);
    }
    if (tenantData.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      params.push(tenantData.address);
    }
    if (tenantData.features !== undefined) {
      updates.push(`features = $${paramCount++}`);
      params.push(JSON.stringify(tenantData.features));
    }
    if (tenantData.theme !== undefined) {
      updates.push(`theme = $${paramCount++}`);
      params.push(JSON.stringify(tenantData.theme));
    }
    if (tenantData.organization_type !== undefined) {
      updates.push(`organization_type = $${paramCount++}`);
      params.push(tenantData.organization_type);
    }
    if (tenantData.cooperative_model !== undefined) {
      updates.push(`cooperative_model = $${paramCount++}`);
      params.push(tenantData.cooperative_model);
    }
    if (tenantData.base_price !== undefined) {
      updates.push(`base_price = $${paramCount++}`);
      params.push(tenantData.base_price);
    }
    if (tenantData.currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      params.push(tenantData.currency);
    }
    if (tenantData.billing_cycle !== undefined) {
      updates.push(`billing_cycle = $${paramCount++}`);
      params.push(tenantData.billing_cycle);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE tenant_id = $${paramCount}`,
      [...params, tenantId]
    );

    logger.info('Tenant updated successfully', { tenantId });

    res.json({ message: 'Tenant updated successfully' });
  })
);

/**
 * @route DELETE /api/platform-admin/tenants/:tenantId
 * @desc Delete a tenant (soft delete)
 * @access Protected (Platform Admin)
 */
router.delete(
  '/platform-admin/tenants/:tenantId',
  verifyPlatformAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Deleting tenant', { tenantId });

    // Check if tenant exists
    const existing = await queryOne<{ tenant_id: number; company_name: string }>(
      'SELECT tenant_id, company_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Tenant not found');
    }

    // Soft delete
    await query(
      'UPDATE tenants SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1',
      [tenantId]
    );

    logger.info('Tenant deleted successfully', { tenantId, companyName: existing.company_name });

    res.json({
      message: 'Tenant deactivated successfully',
      tenantId,
      companyName: existing.company_name,
    });
  })
);

/**
 * @route GET /api/platform-admin/stats
 * @desc Get platform statistics with organization type breakdown
 * @access Protected (Platform Admin)
 */
router.get(
  '/platform-admin/stats',
  verifyPlatformAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('Fetching platform stats');

    // Total tenants
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenants'
    );
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // Active tenants
    const activeResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenants WHERE is_active = true'
    );
    const active = parseInt(activeResult[0]?.count || '0', 10);

    // By organization type with revenue calculation
    const orgTypeResult = await query<{
      organization_type: string;
      count: string;
      total_revenue: string;
      avg_discount: string;
    }>(
      `SELECT
        organization_type,
        COUNT(*) as count,
        SUM(ROUND(base_price * (1 - discount_percentage / 100.0), 2)) as total_revenue,
        AVG(discount_percentage) as avg_discount
      FROM tenants
      WHERE is_active = true
      GROUP BY organization_type`
    );

    const byOrgType = orgTypeResult.reduce((acc, row) => {
      acc[row.organization_type] = {
        count: parseInt(row.count, 10),
        revenue: parseFloat(row.total_revenue || '0'),
        avgDiscount: parseFloat(row.avg_discount || '0'),
      };
      return acc;
    }, {} as Record<string, { count: number; revenue: number; avgDiscount: number }>);

    // Calculate total monthly revenue
    const totalRevenue = Object.values(byOrgType).reduce((sum, org) => sum + org.revenue, 0);

    res.json({
      total,
      active,
      inactive: total - active,
      byOrgType,
      totalRevenue,
    });
  })
);

export default router;
