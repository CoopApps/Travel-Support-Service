import express, { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne, queryWithTenant } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errorTypes';

const router: Router = express.Router();

/**
 * Settings Routes for Home Care Co-operative System
 *
 * Handles tenant configuration, user management, and system settings.
 */

/**
 * @route GET /api/tenants/:tenantId/settings
 * @desc Get tenant settings
 */
router.get(
  '/tenants/:tenantId/settings',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Get tenant info
    const tenant = await queryOne<any>(
      `SELECT * FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    // Get settings (could be stored as JSON or in a separate table)
    const settingsResult = await queryOne<any>(
      `SELECT settings FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    // Merge tenant info with settings
    const settings = {
      organisation: {
        company_name: tenant.company_name,
        trading_name: tenant.trading_name,
        cqc_provider_id: tenant.cqc_provider_id,
        company_number: tenant.company_number,
        vat_number: tenant.vat_number,
        address_line1: tenant.address_line1,
        address_line2: tenant.address_line2,
        city: tenant.city,
        postcode: tenant.postcode,
        phone: tenant.phone,
        email: tenant.email,
        website: tenant.website,
      },
      ...(settingsResult?.settings || {}),
    };

    res.json({ settings });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/settings
 * @desc Update tenant settings
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
      throw new ForbiddenError('Only administrators can update settings');
    }

    // Update tenant table for organisation details
    if (settings.organisation) {
      const org = settings.organisation;
      await query(
        `UPDATE tenants SET
          company_name = COALESCE($2, company_name),
          trading_name = COALESCE($3, trading_name),
          cqc_provider_id = COALESCE($4, cqc_provider_id),
          company_number = COALESCE($5, company_number),
          vat_number = COALESCE($6, vat_number),
          address_line1 = COALESCE($7, address_line1),
          address_line2 = COALESCE($8, address_line2),
          city = COALESCE($9, city),
          postcode = COALESCE($10, postcode),
          phone = COALESCE($11, phone),
          email = COALESCE($12, email),
          website = COALESCE($13, website),
          updated_at = NOW()
        WHERE id = $1`,
        [
          tenantId,
          org.company_name,
          org.trading_name,
          org.cqc_provider_id,
          org.company_number,
          org.vat_number,
          org.address_line1,
          org.address_line2,
          org.city,
          org.postcode,
          org.phone,
          org.email,
          org.website,
        ]
      );
    }

    // Store other settings in tenant_settings table
    const otherSettings = { ...settings };
    delete otherSettings.organisation;

    await query(
      `INSERT INTO tenant_settings (tenant_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET settings = $2, updated_at = NOW()`,
      [tenantId, JSON.stringify(otherSettings)]
    );

    logger.info('Settings updated', { tenantId, userId: user.userId });

    res.json({ message: 'Settings updated successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/users
 * @desc Get tenant users
 */
router.get(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const users = await query(
      `SELECT
        user_id, first_name, last_name, email, phone, role,
        is_active, last_login, created_at
       FROM tenant_users
       WHERE tenant_id = $1
       ORDER BY last_name, first_name`,
      [tenantId]
    );

    res.json({ users: users.rows });
  })
);

/**
 * @route POST /api/tenants/:tenantId/users
 * @desc Create a new user
 */
router.post(
  '/tenants/:tenantId/users',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const currentUser = req.user!;
    const { first_name, last_name, email, phone, role, send_invite } = req.body;

    // Only admins can create users
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can create users');
    }

    // Check if email already exists
    const existing = await queryOne<any>(
      `SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, email]
    );

    if (existing) {
      throw new ValidationError('A user with this email already exists');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user
    const result = await query(
      `INSERT INTO tenant_users (
        tenant_id, first_name, last_name, email, phone, role,
        password_hash, is_active, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW())
      RETURNING user_id, first_name, last_name, email, phone, role, is_active, created_at`,
      [tenantId, first_name, last_name, email, phone || null, role, passwordHash]
    );

    const user = result.rows[0];

    // TODO: If send_invite is true, send invitation email with temporary password

    logger.info('User created', {
      tenantId,
      newUserId: user.user_id,
      email,
      role,
      createdBy: currentUser.userId,
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
      ...(send_invite ? {} : { temporaryPassword: tempPassword }),
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/users/:userId
 * @desc Update a user
 */
router.put(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const currentUser = req.user!;
    const updates = req.body;

    // Only admins can update other users
    if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
      throw new ForbiddenError('You can only update your own profile');
    }

    // Build update query
    const allowedFields = ['first_name', 'last_name', 'phone', 'is_active'];
    if (currentUser.role === 'admin') {
      allowedFields.push('role');
    }

    const setClause: string[] = [];
    const params: any[] = [tenantId, userId];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`);
        params.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    setClause.push('updated_at = NOW()');

    await query(
      `UPDATE tenant_users
       SET ${setClause.join(', ')}
       WHERE tenant_id = $1 AND user_id = $2`,
      params
    );

    logger.info('User updated', {
      tenantId,
      userId,
      updatedBy: currentUser.userId,
      updates: Object.keys(updates),
    });

    res.json({ message: 'User updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/users/:userId
 * @desc Deactivate a user
 */
router.delete(
  '/tenants/:tenantId/users/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, userId } = req.params;
    const currentUser = req.user!;

    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can delete users');
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

    logger.info('User deactivated', {
      tenantId,
      userId,
      deletedBy: currentUser.userId,
    });

    res.json({ message: 'User deactivated successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/export/:type
 * @desc Export data as CSV
 */
router.get(
  '/tenants/:tenantId/export/:type',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, type } = req.params;
    const user = req.user!;

    // Only admins and managers can export
    if (!['admin', 'manager'].includes(user.role)) {
      throw new ForbiddenError('You do not have permission to export data');
    }

    let data: any[];
    let filename: string;

    switch (type) {
      case 'clients':
        const clients = await query(
          `SELECT
            client_id, first_name, last_name, date_of_birth, gender,
            phone, email, address, city, postcode,
            nhs_number, gp_name, gp_phone, funding_source, status,
            created_at
           FROM tenant_clients
           WHERE tenant_id = $1
           ORDER BY last_name, first_name`,
          [tenantId]
        );
        data = clients.rows;
        filename = 'clients-export.csv';
        break;

      case 'carers':
        const carers = await query(
          `SELECT
            carer_id, first_name, last_name, email, phone,
            address, city, postcode, ni_number,
            employment_type, hourly_rate, start_date,
            dbs_check_date, dbs_certificate_number,
            status, created_at
           FROM tenant_carers
           WHERE tenant_id = $1
           ORDER BY last_name, first_name`,
          [tenantId]
        );
        data = carers.rows;
        filename = 'carers-export.csv';
        break;

      case 'visits':
        const visits = await query(
          `SELECT
            v.visit_id, v.scheduled_date, v.scheduled_start_time, v.scheduled_end_time,
            v.actual_start_time, v.actual_end_time, v.status, v.visit_type,
            v.notes, v.miles_claimed,
            c.first_name as client_first_name, c.last_name as client_last_name,
            cr.first_name as carer_first_name, cr.last_name as carer_last_name
           FROM tenant_visits v
           LEFT JOIN tenant_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
           LEFT JOIN tenant_carers cr ON v.carer_id = cr.carer_id AND v.tenant_id = cr.tenant_id
           WHERE v.tenant_id = $1
           ORDER BY v.scheduled_date DESC, v.scheduled_start_time`,
          [tenantId]
        );
        data = visits.rows;
        filename = 'visits-export.csv';
        break;

      case 'invoices':
        const invoices = await query(
          `SELECT
            i.invoice_number, i.issue_date, i.due_date,
            i.period_start, i.period_end,
            i.billing_name, i.subtotal, i.tax_amount, i.total_amount,
            i.paid_amount, i.outstanding_amount, i.status,
            i.funding_source
           FROM tenant_invoices i
           WHERE i.tenant_id = $1
           ORDER BY i.issue_date DESC`,
          [tenantId]
        );
        data = invoices.rows;
        filename = 'invoices-export.csv';
        break;

      case 'full':
        // For full backup, return all data as JSON
        const [allClients, allCarers, allVisits, allInvoices, allMembers] = await Promise.all([
          query(`SELECT * FROM tenant_clients WHERE tenant_id = $1`, [tenantId]),
          query(`SELECT * FROM tenant_carers WHERE tenant_id = $1`, [tenantId]),
          query(`SELECT * FROM tenant_visits WHERE tenant_id = $1`, [tenantId]),
          query(`SELECT * FROM tenant_invoices WHERE tenant_id = $1`, [tenantId]),
          query(`SELECT * FROM tenant_members WHERE tenant_id = $1`, [tenantId]),
        ]);

        res.json({
          exportDate: new Date().toISOString(),
          clients: allClients.rows,
          carers: allCarers.rows,
          visits: allVisits.rows,
          invoices: allInvoices.rows,
          members: allMembers.rows,
        });
        return;

      default:
        throw new ValidationError('Invalid export type');
    }

    // Convert to CSV
    if (data.length === 0) {
      res.json({ data: '', filename });
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
      ),
    ];

    logger.info('Data exported', { tenantId, type, userId: user.userId, recordCount: data.length });

    res.json({ data: csvRows.join('\n'), filename });
  })
);

/**
 * @route POST /api/tenants/:tenantId/reset-demo
 * @desc Reset demo data (development only)
 */
router.post(
  '/tenants/:tenantId/reset-demo',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    // Only admins can reset
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only administrators can reset data');
    }

    // In production, this should be disabled
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Data reset is not available in production');
    }

    // Delete all tenant data (order matters due to foreign keys)
    await query('DELETE FROM tenant_vote_records WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_votes WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_payments WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_invoice_lines WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_invoices WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_care_plan_tasks WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_care_plans WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_visits WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_training_records WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_share_transactions WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_members WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_carers WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_clients WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenant_documents WHERE tenant_id = $1', [tenantId]);

    logger.warn('Demo data reset', { tenantId, userId: user.userId });

    res.json({ message: 'All data has been reset' });
  })
);

export default router;
