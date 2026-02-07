import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger, careEventLog } from '../utils/logger';
import { sanitizeInput, sanitizePhone, sanitizeEmail, sanitizePostcode, sanitizeNHSNumber } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Client (Care Recipient) Routes for Home Care Co-operative System
 */

/**
 * @route GET /api/tenants/:tenantId/clients
 * @desc Get all clients for a tenant with pagination and filtering
 */
router.get(
  '/tenants/:tenantId/clients',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      careLevel,
      fundingSource,
      sortBy = 'last_name',
      sortOrder = 'asc'
    } = req.query;

    logger.info('Fetching clients', { tenantId, page, limit, search, status });

    // Build WHERE clause
    const conditions: string[] = ['tenant_id = $1', 'is_active = true'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (search) {
      conditions.push(`(
        first_name ILIKE $${paramCount} OR
        last_name ILIKE $${paramCount} OR
        CONCAT(first_name, ' ', last_name) ILIKE $${paramCount} OR
        phone ILIKE $${paramCount} OR
        postcode ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (careLevel) {
      conditions.push(`care_level = $${paramCount}`);
      params.push(careLevel);
      paramCount++;
    }

    if (fundingSource) {
      conditions.push(`funding_source = $${paramCount}`);
      params.push(fundingSource);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_clients WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Validate sort column
    const validSortColumns: Record<string, string> = {
      first_name: 'first_name',
      last_name: 'last_name',
      created_at: 'created_at',
      care_level: 'care_level',
      status: 'status',
    };
    const sortColumn = validSortColumns[sortBy as string] || 'last_name';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const offset = (Number(page) - 1) * Number(limit);

    // Get clients
    const clients = await query(
      `SELECT
        client_id as id, tenant_id,
        first_name, last_name, preferred_name,
        date_of_birth, gender,
        phone, email, address, address_line_2, city, county, postcode,
        nhs_number, mobility_level, care_level, mental_capacity,
        funding_source, local_authority_ref,
        status, start_date, end_date,
        emergency_contacts,
        created_at, updated_at
      FROM tenant_clients
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({
      clients,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/clients/:clientId
 * @desc Get a specific client by ID
 */
router.get(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;

    const client = await queryOne(
      `SELECT
        client_id as id, tenant_id,
        first_name, last_name, preferred_name,
        date_of_birth, gender,
        phone, email, address, address_line_2, city, county, postcode,
        nhs_number, gp_name, gp_surgery, gp_phone,
        medical_conditions, allergies, medications,
        mobility_level, care_level, mental_capacity,
        communication_needs, dietary_requirements,
        emergency_contacts, preferred_carers, avoid_carers,
        keyholder_details, access_notes,
        funding_source, local_authority_ref,
        social_worker_name, social_worker_phone,
        status, start_date, end_date,
        created_at, updated_at
      FROM tenant_clients
      WHERE tenant_id = $1 AND client_id = $2 AND is_active = true`,
      [tenantId, clientId]
    );

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    res.json(client);
  })
);

/**
 * @route POST /api/tenants/:tenantId/clients
 * @desc Create a new client
 */
router.post(
  '/tenants/:tenantId/clients',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const clientData = req.body;

    // Sanitize inputs
    const firstName = sanitizeInput(clientData.firstName, { maxLength: 100 });
    const lastName = sanitizeInput(clientData.lastName, { maxLength: 100 });
    const preferredName = sanitizeInput(clientData.preferredName, { maxLength: 100 });
    const phone = sanitizePhone(clientData.phone);
    const email = sanitizeEmail(clientData.email);
    const address = sanitizeInput(clientData.address, { maxLength: 500 });
    const postcode = sanitizePostcode(clientData.postcode);
    const nhsNumber = sanitizeNHSNumber(clientData.nhsNumber);

    if (!firstName || !lastName) {
      throw new ValidationError('First name and last name are required');
    }

    logger.info('Creating client', { tenantId, firstName, lastName });

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_clients (
        tenant_id, first_name, last_name, preferred_name,
        date_of_birth, gender, phone, email,
        address, address_line_2, city, county, postcode,
        nhs_number, gp_name, gp_surgery, gp_phone,
        medical_conditions, allergies, medications,
        mobility_level, care_level, mental_capacity,
        communication_needs, dietary_requirements,
        emergency_contacts, keyholder_details, access_notes,
        funding_source, local_authority_ref,
        social_worker_name, social_worker_phone,
        status, start_date, is_active,
        created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, 'active', COALESCE($33, CURRENT_DATE), true,
        NOW(), NOW(), $34
      ) RETURNING client_id as id`,
      [
        tenantId, firstName, lastName, preferredName,
        clientData.dateOfBirth, clientData.gender || 'prefer_not_to_say',
        phone, email, address,
        sanitizeInput(clientData.addressLine2, { maxLength: 200 }),
        sanitizeInput(clientData.city, { maxLength: 100 }),
        sanitizeInput(clientData.county, { maxLength: 100 }),
        postcode, nhsNumber,
        sanitizeInput(clientData.gpName, { maxLength: 200 }),
        sanitizeInput(clientData.gpSurgery, { maxLength: 200 }),
        sanitizePhone(clientData.gpPhone),
        JSON.stringify(clientData.medicalConditions || []),
        JSON.stringify(clientData.allergies || []),
        JSON.stringify(clientData.medications || []),
        clientData.mobilityLevel || 'fully_mobile',
        clientData.careLevel || 'low',
        clientData.mentalCapacity || 'full',
        sanitizeInput(clientData.communicationNeeds, { maxLength: 1000 }),
        JSON.stringify(clientData.dietaryRequirements || []),
        JSON.stringify(clientData.emergencyContacts || []),
        sanitizeInput(clientData.keyholderDetails, { maxLength: 500 }),
        sanitizeInput(clientData.accessNotes, { maxLength: 1000 }),
        clientData.fundingSource || 'self_funded',
        sanitizeInput(clientData.localAuthorityRef, { maxLength: 100 }),
        sanitizeInput(clientData.socialWorkerName, { maxLength: 200 }),
        sanitizePhone(clientData.socialWorkerPhone),
        clientData.startDate,
        user.userId,
      ]
    );

    careEventLog('CLIENT_CREATED', {
      tenantId,
      clientId: result?.id,
      clientName: `${firstName} ${lastName}`,
      createdBy: user.userId,
    });

    res.status(201).json({
      id: result?.id,
      message: 'Client created successfully',
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/clients/:clientId
 * @desc Update a client
 */
router.put(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const user = req.user!;
    const clientData = req.body;

    // Check if client exists
    const existing = await queryOne(
      'SELECT client_id FROM tenant_clients WHERE tenant_id = $1 AND client_id = $2 AND is_active = true',
      [tenantId, clientId]
    );

    if (!existing) {
      throw new NotFoundError('Client not found');
    }

    logger.info('Updating client', { tenantId, clientId });

    await query(
      `UPDATE tenant_clients SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        preferred_name = COALESCE($5, preferred_name),
        phone = COALESCE($6, phone),
        email = COALESCE($7, email),
        address = COALESCE($8, address),
        postcode = COALESCE($9, postcode),
        mobility_level = COALESCE($10, mobility_level),
        care_level = COALESCE($11, care_level),
        status = COALESCE($12, status),
        emergency_contacts = COALESCE($13, emergency_contacts),
        updated_at = NOW(),
        updated_by = $14
      WHERE tenant_id = $1 AND client_id = $2`,
      [
        tenantId, clientId,
        clientData.firstName ? sanitizeInput(clientData.firstName, { maxLength: 100 }) : null,
        clientData.lastName ? sanitizeInput(clientData.lastName, { maxLength: 100 }) : null,
        clientData.preferredName ? sanitizeInput(clientData.preferredName, { maxLength: 100 }) : null,
        clientData.phone ? sanitizePhone(clientData.phone) : null,
        clientData.email ? sanitizeEmail(clientData.email) : null,
        clientData.address ? sanitizeInput(clientData.address, { maxLength: 500 }) : null,
        clientData.postcode ? sanitizePostcode(clientData.postcode) : null,
        clientData.mobilityLevel,
        clientData.careLevel,
        clientData.status,
        clientData.emergencyContacts ? JSON.stringify(clientData.emergencyContacts) : null,
        user.userId,
      ]
    );

    careEventLog('CLIENT_UPDATED', {
      tenantId,
      clientId,
      updatedBy: user.userId,
    });

    res.json({ message: 'Client updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/clients/:clientId
 * @desc Soft delete a client
 */
router.delete(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const user = req.user!;

    const existing = await queryOne<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM tenant_clients WHERE tenant_id = $1 AND client_id = $2 AND is_active = true',
      [tenantId, clientId]
    );

    if (!existing) {
      throw new NotFoundError('Client not found');
    }

    await query(
      `UPDATE tenant_clients SET
        is_active = false,
        status = 'transferred',
        end_date = CURRENT_DATE,
        updated_at = NOW(),
        updated_by = $3
      WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId, user.userId]
    );

    careEventLog('CLIENT_DELETED', {
      tenantId,
      clientId,
      clientName: `${existing.first_name} ${existing.last_name}`,
      deletedBy: user.userId,
    });

    res.json({ message: 'Client deleted successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/clients/:clientId/care-plan
 * @desc Get client's current care plan
 */
router.get(
  '/tenants/:tenantId/clients/:clientId/care-plan',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;

    const carePlan = await queryOne(
      `SELECT * FROM tenant_care_plans
       WHERE tenant_id = $1 AND client_id = $2 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, clientId]
    );

    if (!carePlan) {
      res.json({ carePlan: null, message: 'No active care plan found' });
      return;
    }

    res.json(carePlan);
  })
);

/**
 * @route GET /api/tenants/:tenantId/clients/:clientId/visits
 * @desc Get client's visit history
 */
router.get(
  '/tenants/:tenantId/clients/:clientId/visits',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const { page = 1, limit = 20, dateFrom, dateTo } = req.query;

    const conditions: string[] = ['v.tenant_id = $1', 'v.client_id = $2'];
    const params: any[] = [tenantId, clientId];
    let paramCount = 3;

    if (dateFrom) {
      conditions.push(`v.scheduled_date >= $${paramCount}`);
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      conditions.push(`v.scheduled_date <= $${paramCount}`);
      params.push(dateTo);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (Number(page) - 1) * Number(limit);

    const visits = await query(
      `SELECT
        v.visit_id as id, v.scheduled_date, v.scheduled_start_time, v.scheduled_end_time,
        v.actual_start_time, v.actual_end_time, v.status, v.visit_type,
        v.visit_notes, v.tasks,
        c.carer_id, c.first_name as carer_first_name, c.last_name as carer_last_name
      FROM tenant_visits v
      LEFT JOIN tenant_carers c ON v.carer_id = c.carer_id AND v.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY v.scheduled_date DESC, v.scheduled_start_time DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({ visits });
  })
);

export default router;
