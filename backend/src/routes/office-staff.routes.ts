import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  OfficeStaff,
  CreateOfficeStaffDto,
  UpdateOfficeStaffDto,
  OfficeStaffWithManager,
  OfficeStaffSummary,
  EmploymentType,
} from '../types/office-staff.types';

const router: Router = express.Router();

/**
 * Office Staff Routes
 *
 * Manages non-driver employees including office staff, managers, and administrators.
 *
 * Database Tables:
 * - tenant_office_staff: Office employee records
 * - view_office_staff_with_managers: View with manager names
 */

// ============================================================================
// OFFICE STAFF ENDPOINTS
// ============================================================================

/**
 * GET /api/tenants/:tenantId/office-staff
 * Get all office staff for a tenant
 */
router.get(
  '/tenants/:tenantId/office-staff',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { department, employment_type, is_active } = req.query;

    logger.info('Fetching office staff', { tenantId, department, employment_type, is_active });

    let sql = `
      SELECT
        s.*,
        m.first_name || ' ' || m.last_name AS manager_name
      FROM tenant_office_staff s
      LEFT JOIN tenant_office_staff m ON s.manager_id = m.id
      WHERE s.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (department) {
      sql += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (employment_type) {
      sql += ` AND s.employment_type = $${paramIndex}`;
      params.push(employment_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      sql += ` AND s.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    sql += ' ORDER BY s.first_name, s.last_name';

    const staff = await query<OfficeStaffWithManager>(sql, params);

    res.json(staff);
  })
);

/**
 * GET /api/tenants/:tenantId/office-staff/summary
 * Get summary statistics for office staff
 */
router.get(
  '/tenants/:tenantId/office-staff/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching office staff summary', { tenantId });

    // Get total and active counts
    const counts = await queryOne<{ total_staff: number; active_staff: number }>(`
      SELECT
        COUNT(*)::int as total_staff,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int as active_staff
      FROM tenant_office_staff
      WHERE tenant_id = $1
    `, [tenantId]);

    // Get by department
    const byDepartment = await query<{ department: string; count: number }>(`
      SELECT
        COALESCE(department, 'Unassigned') as department,
        COUNT(*)::int as count
      FROM tenant_office_staff
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY department
      ORDER BY count DESC
    `, [tenantId]);

    // Get by employment type
    const byEmploymentType = await query<{ employment_type: string; count: number }>(`
      SELECT
        employment_type,
        COUNT(*)::int as count
      FROM tenant_office_staff
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY employment_type
      ORDER BY count DESC
    `, [tenantId]);

    const summary: OfficeStaffSummary = {
      total_staff: counts?.total_staff || 0,
      active_staff: counts?.active_staff || 0,
      by_department: byDepartment,
      by_employment_type: byEmploymentType.map(item => ({
        employment_type: item.employment_type as EmploymentType,
        count: item.count,
      })),
    };

    res.json(summary);
  })
);

/**
 * GET /api/tenants/:tenantId/office-staff/:staffId
 * Get a specific office staff member
 */
router.get(
  '/tenants/:tenantId/office-staff/:staffId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, staffId } = req.params;

    logger.info('Fetching office staff member', { tenantId, staffId });

    const staff = await queryOne<OfficeStaffWithManager>(`
      SELECT
        s.*,
        m.first_name || ' ' || m.last_name AS manager_name
      FROM tenant_office_staff s
      LEFT JOIN tenant_office_staff m ON s.manager_id = m.id
      WHERE s.id = $1 AND s.tenant_id = $2
    `, [staffId, tenantId]);

    if (!staff) {
      throw new NotFoundError('Office staff member not found');
    }

    res.json(staff);
  })
);

/**
 * POST /api/tenants/:tenantId/office-staff
 * Create a new office staff member
 */
router.post(
  '/tenants/:tenantId/office-staff',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const dto: CreateOfficeStaffDto = req.body;

    logger.info('Creating office staff member', { tenantId, dto });

    // Validation
    if (!dto.first_name || !dto.last_name || !dto.email || !dto.job_title || !dto.employment_type || !dto.start_date) {
      throw new ValidationError('Missing required fields: first_name, last_name, email, job_title, employment_type, start_date');
    }

    // Check for duplicate employee number if provided
    if (dto.employee_number) {
      const existing = await queryOne<{ id: number }>(`
        SELECT id FROM tenant_office_staff
        WHERE tenant_id = $1 AND employee_number = $2
      `, [tenantId, dto.employee_number]);

      if (existing) {
        throw new ValidationError('Employee number already exists');
      }
    }

    const newStaff = await queryOne<OfficeStaff>(`
      INSERT INTO tenant_office_staff (
        tenant_id, first_name, last_name, email, phone, employee_number,
        job_title, department, employment_type, start_date, end_date,
        salary_annual, hourly_rate, manager_id, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `, [
      tenantId,
      dto.first_name,
      dto.last_name,
      dto.email,
      dto.phone || null,
      dto.employee_number || null,
      dto.job_title,
      dto.department || null,
      dto.employment_type,
      dto.start_date,
      dto.end_date || null,
      dto.salary_annual || null,
      dto.hourly_rate || null,
      dto.manager_id || null,
      dto.is_active !== undefined ? dto.is_active : true,
    ]);

    logger.info('Office staff member created', { tenantId, staffId: newStaff?.id });

    res.status(201).json(newStaff);
  })
);

/**
 * PUT /api/tenants/:tenantId/office-staff/:staffId
 * Update an office staff member
 */
router.put(
  '/tenants/:tenantId/office-staff/:staffId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, staffId } = req.params;
    const dto: UpdateOfficeStaffDto = req.body;

    logger.info('Updating office staff member', { tenantId, staffId, dto });

    // Check if staff exists
    const existing = await queryOne<{ id: number }>(`
      SELECT id FROM tenant_office_staff
      WHERE id = $1 AND tenant_id = $2
    `, [staffId, tenantId]);

    if (!existing) {
      throw new NotFoundError('Office staff member not found');
    }

    // Check for duplicate employee number if being updated
    if (dto.employee_number) {
      const duplicate = await queryOne<{ id: number }>(`
        SELECT id FROM tenant_office_staff
        WHERE tenant_id = $1 AND employee_number = $2 AND id != $3
      `, [tenantId, dto.employee_number, staffId]);

      if (duplicate) {
        throw new ValidationError('Employee number already exists');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(dto.first_name);
    }
    if (dto.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(dto.last_name);
    }
    if (dto.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(dto.email);
    }
    if (dto.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(dto.phone);
    }
    if (dto.employee_number !== undefined) {
      updates.push(`employee_number = $${paramIndex++}`);
      values.push(dto.employee_number);
    }
    if (dto.job_title !== undefined) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(dto.job_title);
    }
    if (dto.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(dto.department);
    }
    if (dto.employment_type !== undefined) {
      updates.push(`employment_type = $${paramIndex++}`);
      values.push(dto.employment_type);
    }
    if (dto.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(dto.start_date);
    }
    if (dto.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(dto.end_date);
    }
    if (dto.salary_annual !== undefined) {
      updates.push(`salary_annual = $${paramIndex++}`);
      values.push(dto.salary_annual);
    }
    if (dto.hourly_rate !== undefined) {
      updates.push(`hourly_rate = $${paramIndex++}`);
      values.push(dto.hourly_rate);
    }
    if (dto.manager_id !== undefined) {
      updates.push(`manager_id = $${paramIndex++}`);
      values.push(dto.manager_id);
    }
    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(staffId, tenantId);

    const updatedStaff = await queryOne<OfficeStaff>(`
      UPDATE tenant_office_staff
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *
    `, values);

    logger.info('Office staff member updated', { tenantId, staffId });

    res.json(updatedStaff);
  })
);

/**
 * DELETE /api/tenants/:tenantId/office-staff/:staffId
 * Delete an office staff member
 */
router.delete(
  '/tenants/:tenantId/office-staff/:staffId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, staffId } = req.params;

    logger.info('Deleting office staff member', { tenantId, staffId });

    const result = await queryOne<{ id: number }>(`
      DELETE FROM tenant_office_staff
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [staffId, tenantId]);

    if (!result) {
      throw new NotFoundError('Office staff member not found');
    }

    logger.info('Office staff member deleted', { tenantId, staffId });

    res.status(204).send();
  })
);

export default router;
