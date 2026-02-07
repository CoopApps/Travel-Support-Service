import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger, auditLog } from '../utils/logger';
import { sanitizeInput, sanitizePhone, sanitizeEmail, sanitizePostcode } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Carer (Care Worker) Routes for Home Care Co-operative System
 */

/**
 * @route GET /api/tenants/:tenantId/carers
 * @desc Get all carers for a tenant with pagination and filtering
 */
router.get(
  '/tenants/:tenantId/carers',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      contractType,
      canDrive,
      sortBy = 'last_name',
      sortOrder = 'asc'
    } = req.query;

    logger.info('Fetching carers', { tenantId, page, limit, search });

    const conditions: string[] = ['c.tenant_id = $1', 'c.is_active = true'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (search) {
      conditions.push(`(
        c.first_name ILIKE $${paramCount} OR
        c.last_name ILIKE $${paramCount} OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramCount} OR
        c.phone ILIKE $${paramCount} OR
        c.email ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`c.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (contractType) {
      conditions.push(`c.contract_type = $${paramCount}`);
      params.push(contractType);
      paramCount++;
    }

    if (canDrive !== undefined) {
      conditions.push(`c.can_drive = $${paramCount}`);
      params.push(canDrive === 'true');
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_carers c WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    const validSortColumns: Record<string, string> = {
      first_name: 'c.first_name',
      last_name: 'c.last_name',
      created_at: 'c.created_at',
      status: 'c.status',
    };
    const sortColumn = validSortColumns[sortBy as string] || 'c.last_name';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const offset = (Number(page) - 1) * Number(limit);

    const carers = await query(
      `SELECT
        c.carer_id as id, c.tenant_id, c.user_id, c.member_id,
        c.first_name, c.last_name, c.preferred_name,
        c.phone, c.email, c.postcode,
        c.contract_type, c.weekly_hours, c.start_date,
        c.can_drive, c.has_own_vehicle,
        c.status, c.dbs_check_status, c.dbs_check_date,
        c.skills, c.languages,
        m.member_status
      FROM tenant_carers c
      LEFT JOIN tenant_members m ON c.member_id = m.member_id AND c.tenant_id = m.tenant_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({
      carers,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/carers/:carerId
 * @desc Get a specific carer by ID
 */
router.get(
  '/tenants/:tenantId/carers/:carerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;

    const carer = await queryOne(
      `SELECT
        c.carer_id as id, c.tenant_id, c.user_id, c.member_id,
        c.first_name, c.last_name, c.preferred_name,
        c.date_of_birth, c.gender,
        c.phone, c.email, c.address, c.address_line_2, c.city, c.county, c.postcode,
        c.employee_id, c.contract_type, c.weekly_hours,
        c.start_date, c.end_date, c.probation_end_date,
        c.qualifications, c.dbs_check_date, c.dbs_check_number, c.dbs_check_status,
        c.right_to_work_verified, c.right_to_work_expiry,
        c.skills, c.languages,
        c.can_drive, c.has_own_vehicle, c.vehicle_registration, c.max_travel_distance,
        c.availability, c.preferred_areas, c.max_clients_per_day,
        c.emergency_contact_name, c.emergency_contact_phone, c.emergency_contact_relationship,
        c.status,
        c.created_at, c.updated_at,
        m.member_status, m.share_capital, m.join_date as member_join_date
      FROM tenant_carers c
      LEFT JOIN tenant_members m ON c.member_id = m.member_id AND c.tenant_id = m.tenant_id
      WHERE c.tenant_id = $1 AND c.carer_id = $2 AND c.is_active = true`,
      [tenantId, carerId]
    );

    if (!carer) {
      throw new NotFoundError('Carer not found');
    }

    res.json(carer);
  })
);

/**
 * @route POST /api/tenants/:tenantId/carers
 * @desc Create a new carer
 */
router.post(
  '/tenants/:tenantId/carers',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const carerData = req.body;

    const firstName = sanitizeInput(carerData.firstName, { maxLength: 100 });
    const lastName = sanitizeInput(carerData.lastName, { maxLength: 100 });
    const phone = sanitizePhone(carerData.phone);
    const email = sanitizeEmail(carerData.email);

    if (!firstName || !lastName) {
      throw new ValidationError('First name and last name are required');
    }

    if (!phone && !email) {
      throw new ValidationError('Either phone or email is required');
    }

    logger.info('Creating carer', { tenantId, firstName, lastName });

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_carers (
        tenant_id, first_name, last_name, preferred_name,
        date_of_birth, gender, phone, email,
        address, address_line_2, city, county, postcode,
        contract_type, weekly_hours, start_date,
        can_drive, has_own_vehicle, vehicle_registration, max_travel_distance,
        skills, languages,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        status, is_active, dbs_check_status,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, 'active', true, 'pending',
        NOW(), NOW(), $26
      ) RETURNING carer_id as id`,
      [
        tenantId, firstName, lastName,
        sanitizeInput(carerData.preferredName, { maxLength: 100 }),
        carerData.dateOfBirth,
        carerData.gender || 'prefer_not_to_say',
        phone, email,
        sanitizeInput(carerData.address, { maxLength: 500 }),
        sanitizeInput(carerData.addressLine2, { maxLength: 200 }),
        sanitizeInput(carerData.city, { maxLength: 100 }),
        sanitizeInput(carerData.county, { maxLength: 100 }),
        sanitizePostcode(carerData.postcode),
        carerData.contractType || 'part_time',
        carerData.weeklyHours || null,
        carerData.startDate || new Date(),
        carerData.canDrive || false,
        carerData.hasOwnVehicle || false,
        sanitizeInput(carerData.vehicleRegistration, { maxLength: 20 }),
        carerData.maxTravelDistance || null,
        JSON.stringify(carerData.skills || []),
        JSON.stringify(carerData.languages || ['English']),
        sanitizeInput(carerData.emergencyContactName, { maxLength: 200 }),
        sanitizePhone(carerData.emergencyContactPhone),
        sanitizeInput(carerData.emergencyContactRelationship, { maxLength: 100 }),
        user.userId,
      ]
    );

    auditLog('CARER_CREATED', {
      tenantId,
      carerId: result?.id,
      carerName: `${firstName} ${lastName}`,
      createdBy: user.userId,
    });

    res.status(201).json({
      id: result?.id,
      message: 'Carer created successfully',
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/carers/:carerId
 * @desc Update a carer
 */
router.put(
  '/tenants/:tenantId/carers/:carerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const user = req.user!;
    const carerData = req.body;

    const existing = await queryOne(
      'SELECT carer_id FROM tenant_carers WHERE tenant_id = $1 AND carer_id = $2 AND is_active = true',
      [tenantId, carerId]
    );

    if (!existing) {
      throw new NotFoundError('Carer not found');
    }

    logger.info('Updating carer', { tenantId, carerId });

    await query(
      `UPDATE tenant_carers SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        contract_type = COALESCE($7, contract_type),
        weekly_hours = COALESCE($8, weekly_hours),
        can_drive = COALESCE($9, can_drive),
        has_own_vehicle = COALESCE($10, has_own_vehicle),
        skills = COALESCE($11, skills),
        availability = COALESCE($12, availability),
        status = COALESCE($13, status),
        updated_at = NOW(),
        updated_by = $14
      WHERE tenant_id = $1 AND carer_id = $2`,
      [
        tenantId, carerId,
        carerData.firstName ? sanitizeInput(carerData.firstName, { maxLength: 100 }) : null,
        carerData.lastName ? sanitizeInput(carerData.lastName, { maxLength: 100 }) : null,
        carerData.phone ? sanitizePhone(carerData.phone) : null,
        carerData.email ? sanitizeEmail(carerData.email) : null,
        carerData.contractType,
        carerData.weeklyHours,
        carerData.canDrive,
        carerData.hasOwnVehicle,
        carerData.skills ? JSON.stringify(carerData.skills) : null,
        carerData.availability ? JSON.stringify(carerData.availability) : null,
        carerData.status,
        user.userId,
      ]
    );

    auditLog('CARER_UPDATED', {
      tenantId,
      carerId,
      updatedBy: user.userId,
    });

    res.json({ message: 'Carer updated successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/carers/:carerId/schedule
 * @desc Get carer's schedule for a date range
 */
router.get(
  '/tenants/:tenantId/carers/:carerId/schedule',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      throw new ValidationError('dateFrom and dateTo are required');
    }

    const visits = await query(
      `SELECT
        v.visit_id as id, v.scheduled_date, v.scheduled_start_time, v.scheduled_end_time,
        v.status, v.visit_type,
        cl.client_id, cl.first_name as client_first_name, cl.last_name as client_last_name,
        cl.address as client_address, cl.postcode as client_postcode
      FROM tenant_visits v
      JOIN tenant_clients cl ON v.client_id = cl.client_id AND v.tenant_id = cl.tenant_id
      WHERE v.tenant_id = $1 AND v.carer_id = $2
        AND v.scheduled_date >= $3 AND v.scheduled_date <= $4
      ORDER BY v.scheduled_date, v.scheduled_start_time`,
      [tenantId, carerId, dateFrom, dateTo]
    );

    res.json({ visits });
  })
);

/**
 * @route GET /api/tenants/:tenantId/carers/:carerId/training
 * @desc Get carer's training records
 */
router.get(
  '/tenants/:tenantId/carers/:carerId/training',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;

    const training = await query(
      `SELECT
        training_id as id, course_name, provider,
        completed_date, expiry_date, certificate_url,
        status, is_mandatory
      FROM tenant_training_records
      WHERE tenant_id = $1 AND carer_id = $2
      ORDER BY expiry_date ASC NULLS LAST, course_name`,
      [tenantId, carerId]
    );

    res.json({ training });
  })
);

/**
 * @route GET /api/tenants/:tenantId/carers/available
 * @desc Get available carers for a specific date/time
 */
router.get(
  '/tenants/:tenantId/carers/available',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { date, startTime, endTime, clientId, requiredSkills } = req.query;

    if (!date || !startTime || !endTime) {
      throw new ValidationError('date, startTime, and endTime are required');
    }

    // Find carers who don't have visits at this time
    const availableCarers = await query(
      `SELECT
        c.carer_id as id, c.first_name, c.last_name,
        c.skills, c.can_drive, c.max_travel_distance
      FROM tenant_carers c
      WHERE c.tenant_id = $1
        AND c.is_active = true
        AND c.status = 'active'
        AND c.carer_id NOT IN (
          SELECT DISTINCT carer_id FROM tenant_visits
          WHERE tenant_id = $1
            AND scheduled_date = $2
            AND status NOT IN ('cancelled')
            AND (
              (scheduled_start_time <= $3 AND scheduled_end_time > $3) OR
              (scheduled_start_time < $4 AND scheduled_end_time >= $4) OR
              (scheduled_start_time >= $3 AND scheduled_end_time <= $4)
            )
        )
      ORDER BY c.last_name, c.first_name`,
      [tenantId, date, startTime, endTime]
    );

    res.json({ carers: availableCarers });
  })
);

export default router;
