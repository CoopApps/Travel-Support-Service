import express, { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput, sanitizeEmail } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Settings Routes
 * Configuration, user management, and travel integration settings
 * (Homecare-specific settings, separate from travel support)
 */

/**
 * GET /api/homecare/tenants/:tenantId/settings
 * Get homecare-specific settings
 */
router.get(
  '/tenants/:tenantId/settings',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get homecare settings from dedicated table
    const settingsResult = await queryOne(
      `SELECT * FROM tenant_homecare_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    const settings = settingsResult || {
      tenant_id: tenantId,
      travel_integration_enabled: false,
      travel_partnership_type: null,
      carer_travel_discount: 0,
      client_travel_enabled: false,
      auto_sync_enabled: false
    };

    res.json({ settings });
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/settings
 * Update homecare settings
 */
router.put(
  '/tenants/:tenantId/settings',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const settings = req.body;

    // Only admins and managers can update settings
    if (!['admin', 'manager'].includes(user.role)) {
      throw new ValidationError('Only administrators and managers can update settings');
    }

    // Upsert settings
    await query(
      `INSERT INTO tenant_homecare_settings (
        tenant_id,
        travel_integration_enabled,
        travel_partnership_type,
        carer_travel_discount,
        client_travel_enabled,
        auto_sync_enabled,
        cqc_provider_id,
        billing_settings,
        notification_settings,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        travel_integration_enabled = COALESCE($2, tenant_homecare_settings.travel_integration_enabled),
        travel_partnership_type = COALESCE($3, tenant_homecare_settings.travel_partnership_type),
        carer_travel_discount = COALESCE($4, tenant_homecare_settings.carer_travel_discount),
        client_travel_enabled = COALESCE($5, tenant_homecare_settings.client_travel_enabled),
        auto_sync_enabled = COALESCE($6, tenant_homecare_settings.auto_sync_enabled),
        cqc_provider_id = COALESCE($7, tenant_homecare_settings.cqc_provider_id),
        billing_settings = COALESCE($8, tenant_homecare_settings.billing_settings),
        notification_settings = COALESCE($9, tenant_homecare_settings.notification_settings),
        updated_at = NOW()`,
      [
        tenantId,
        settings.travel_integration_enabled,
        settings.travel_partnership_type,
        settings.carer_travel_discount,
        settings.client_travel_enabled,
        settings.auto_sync_enabled,
        settings.cqc_provider_id,
        settings.billing_settings ? JSON.stringify(settings.billing_settings) : null,
        settings.notification_settings ? JSON.stringify(settings.notification_settings) : null
      ]
    );

    logger.info(`Homecare settings updated for tenant ${tenantId} by user ${user.userId}`);
    res.json({ message: 'Settings updated successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/users
 * Get homecare-specific users (uses tenant_users table)
 */
router.get(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const users = await query(
      `SELECT
        user_id,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active,
        last_login,
        created_at
      FROM tenant_users
      WHERE tenant_id = $1
      ORDER BY last_name, first_name`,
      [tenantId]
    );

    res.json({ users });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/users
 * Create a new homecare user
 */
router.post(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const currentUser = req.user!;
    const { first_name, last_name, email, phone, role } = req.body;

    // Only admins can create users
    if (currentUser.role !== 'admin') {
      throw new ValidationError('Only administrators can create users');
    }

    // Validate required fields
    if (!first_name || !last_name || !email || !role) {
      throw new ValidationError('First name, last name, email, and role are required');
    }

    // Check if email already exists
    const existing = await queryOne(
      `SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, sanitizeEmail(email)]
    );

    if (existing) {
      throw new ValidationError('A user with this email already exists');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = await queryOne(
      `INSERT INTO tenant_users (
        tenant_id, first_name, last_name, email, phone, role,
        password_hash, is_active, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW())
      RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at`,
      [
        tenantId,
        sanitizeInput(first_name),
        sanitizeInput(last_name),
        sanitizeEmail(email),
        phone || null,
        role,
        passwordHash
      ]
    );

    logger.info(`Created homecare user ${user.user_id} for tenant ${tenantId}`);

    res.status(201).json({
      message: 'User created successfully',
      user,
      temporaryPassword: tempPassword
    });
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/users/:userId
 * Update a homecare user
 */
router.put(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const currentUser = req.user!;
    const updates = req.body;

    // Only admins can update other users, users can update themselves
    if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
      throw new ValidationError('You can only update your own profile');
    }

    // Check if user exists
    const existing = await queryOne(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    // Build update query
    const allowedFields = ['first_name', 'last_name', 'phone'];
    if (currentUser.role === 'admin') {
      allowedFields.push('role', 'is_active');
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [tenantId, userId];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'first_name' || field === 'last_name') {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(sanitizeInput(updates[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updates[field]);
        }
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');

    await query(
      `UPDATE tenant_users
       SET ${updateFields.join(', ')}
       WHERE tenant_id = $1 AND user_id = $2`,
      updateValues
    );

    logger.info(`Updated homecare user ${userId} for tenant ${tenantId}`);
    res.json({ message: 'User updated successfully' });
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/users/:userId
 * Deactivate a homecare user
 */
router.delete(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const currentUser = req.user!;

    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      throw new ValidationError('Only administrators can delete users');
    }

    // Cannot delete yourself
    if (currentUser.userId === parseInt(userId)) {
      throw new ValidationError('You cannot delete your own account');
    }

    await query(
      `UPDATE tenant_users
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );

    logger.info(`Deactivated homecare user ${userId} for tenant ${tenantId}`);
    res.json({ message: 'User deactivated successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/export/:type
 * Export homecare data as CSV
 */
router.get(
  '/tenants/:tenantId/export/:type',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, type } = req.params;
    const user = req.user!;

    // Only admins and managers can export
    if (!['admin', 'manager'].includes(user.role)) {
      throw new ValidationError('You do not have permission to export data');
    }

    let data: any[];
    let filename: string;

    switch (type) {
      case 'clients':
        data = await query(
          `SELECT
            client_id, first_name, last_name, date_of_birth, gender,
            phone, email, address, city, postcode,
            nhs_number, funding_source, status,
            created_at
          FROM tenant_care_clients
          WHERE tenant_id = $1
          ORDER BY last_name, first_name`,
          [tenantId]
        );
        filename = 'homecare-clients-export.csv';
        break;

      case 'carers':
        data = await query(
          `SELECT
            carer_id, first_name, last_name, email, phone,
            address, postcode,
            dbs_check_date, dbs_expiry_date,
            hourly_rate, employment_type, status,
            created_at
          FROM tenant_carers
          WHERE tenant_id = $1
          ORDER BY last_name, first_name`,
          [tenantId]
        );
        filename = 'homecare-carers-export.csv';
        break;

      case 'visits':
        data = await query(
          `SELECT
            v.visit_id, v.scheduled_start, v.scheduled_end,
            v.actual_start, v.actual_end, v.status, v.visit_type,
            v.mileage_claimed,
            c.first_name as client_first_name, c.last_name as client_last_name,
            cr.first_name as carer_first_name, cr.last_name as carer_last_name
          FROM tenant_care_visits v
          LEFT JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
          LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
          WHERE v.tenant_id = $1
          ORDER BY v.scheduled_start DESC
          LIMIT 5000`,
          [tenantId]
        );
        filename = 'homecare-visits-export.csv';
        break;

      case 'invoices':
        data = await query(
          `SELECT
            i.invoice_number, i.issue_date, i.due_date,
            i.period_start, i.period_end,
            i.billing_name, i.subtotal, i.total_amount,
            i.paid_amount, i.outstanding_amount, i.status,
            i.funding_source
          FROM tenant_homecare_invoices i
          WHERE i.tenant_id = $1
          ORDER BY i.issue_date DESC`,
          [tenantId]
        );
        filename = 'homecare-invoices-export.csv';
        break;

      case 'documents':
        data = await query(
          `SELECT
            d.document_id, d.title, d.category, d.status,
            d.expiry_date, d.created_at,
            c.first_name as client_first_name, c.last_name as client_last_name
          FROM tenant_homecare_documents d
          LEFT JOIN tenant_care_clients c ON d.client_id = c.client_id AND d.tenant_id = c.tenant_id
          WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
          ORDER BY d.created_at DESC`,
          [tenantId]
        );
        filename = 'homecare-documents-export.csv';
        break;

      default:
        throw new ValidationError('Invalid export type');
    }

    // Convert to CSV
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const str = String(value);
          // Escape quotes and wrap in quotes if contains comma or newline
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ];

    logger.info(`Exported homecare ${type} data for tenant ${tenantId}: ${data.length} records`);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvRows.join('\n'));
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/integration/status
 * Get travel integration status
 */
router.get(
  '/tenants/:tenantId/integration/status',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get settings
    const settings = await queryOne(
      `SELECT * FROM tenant_homecare_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    // Count synced clients
    const syncedClients = await queryOne(
      `SELECT COUNT(*) as count FROM tenant_care_clients
       WHERE tenant_id = $1 AND travel_customer_id IS NOT NULL`,
      [tenantId]
    );

    // Count synced carers
    const syncedCarers = await queryOne(
      `SELECT COUNT(*) as count FROM tenant_carers
       WHERE tenant_id = $1 AND (travel_driver_id IS NOT NULL OR travel_customer_id IS NOT NULL)`,
      [tenantId]
    );

    res.json({
      integration: {
        enabled: settings?.travel_integration_enabled || false,
        partnershipType: settings?.travel_partnership_type || null,
        carerDiscount: settings?.carer_travel_discount || 0,
        clientTravelEnabled: settings?.client_travel_enabled || false,
        autoSyncEnabled: settings?.auto_sync_enabled || false
      },
      syncStatus: {
        clientsSynced: parseInt(syncedClients.count || '0', 10),
        carersSynced: parseInt(syncedCarers.count || '0', 10)
      }
    });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/integration/enable
 * Enable travel integration
 */
router.post(
  '/tenants/:tenantId/integration/enable',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const { partnership_type, carer_discount, client_travel_enabled } = req.body;

    // Only admins can enable integration
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can enable travel integration');
    }

    await query(
      `INSERT INTO tenant_homecare_settings (
        tenant_id,
        travel_integration_enabled,
        travel_partnership_type,
        carer_travel_discount,
        client_travel_enabled,
        updated_at
      ) VALUES ($1, true, $2, $3, $4, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        travel_integration_enabled = true,
        travel_partnership_type = $2,
        carer_travel_discount = $3,
        client_travel_enabled = $4,
        updated_at = NOW()`,
      [
        tenantId,
        partnership_type || 'partner',
        carer_discount || 0,
        client_travel_enabled || false
      ]
    );

    logger.info(`Travel integration enabled for homecare tenant ${tenantId}`);
    res.json({ message: 'Travel integration enabled successfully' });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/integration/disable
 * Disable travel integration
 */
router.post(
  '/tenants/:tenantId/integration/disable',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    // Only admins can disable integration
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can disable travel integration');
    }

    await query(
      `UPDATE tenant_homecare_settings
       SET travel_integration_enabled = false, updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId]
    );

    logger.info(`Travel integration disabled for homecare tenant ${tenantId}`);
    res.json({ message: 'Travel integration disabled successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/stats
 * Get overall statistics for homecare service
 */
router.get(
  '/tenants/:tenantId/stats',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get various counts
    const [clients, carers, visits, documents, invoices] = await Promise.all([
      queryOne('SELECT COUNT(*) as count FROM tenant_care_clients WHERE tenant_id = $1', [tenantId]),
      queryOne('SELECT COUNT(*) as count FROM tenant_carers WHERE tenant_id = $1', [tenantId]),
      queryOne('SELECT COUNT(*) as count FROM tenant_care_visits WHERE tenant_id = $1', [tenantId]),
      queryOne('SELECT COUNT(*) as count FROM tenant_homecare_documents WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]),
      queryOne('SELECT COUNT(*) as count FROM tenant_homecare_invoices WHERE tenant_id = $1', [tenantId])
    ]);

    res.json({
      stats: {
        totalClients: parseInt(clients.count || '0', 10),
        totalCarers: parseInt(carers.count || '0', 10),
        totalVisits: parseInt(visits.count || '0', 10),
        totalDocuments: parseInt(documents.count || '0', 10),
        totalInvoices: parseInt(invoices.count || '0', 10)
      }
    });
  })
);

export default router;
