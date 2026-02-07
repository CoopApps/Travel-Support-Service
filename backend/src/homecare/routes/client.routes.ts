import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Client Routes
 * Manages care recipients (clients receiving home care services)
 */

/**
 * GET /api/homecare/tenants/:tenantId/clients
 * List all clients for a tenant
 */
router.get(
  '/tenants/:tenantId/clients',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status = 'active', search } = req.query;

    let sql = `
      SELECT
        client_id,
        first_name,
        last_name,
        date_of_birth,
        phone,
        email,
        address,
        postcode,
        emergency_contact_name,
        emergency_contact_phone,
        medical_conditions,
        mobility_needs,
        status,
        created_at
      FROM tenant_care_clients
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];

    if (status && status !== 'all') {
      sql += ' AND status = $2';
      params.push(status);
    }

    if (search) {
      const searchTerm = `%${sanitizeInput(search as string)}%`;
      sql += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1})`;
      params.push(searchTerm);
    }

    sql += ' ORDER BY last_name, first_name';

    const clients = await query(sql, params);

    logger.info(`Listed ${clients.length} clients for tenant ${tenantId}`);
    res.json(clients);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/clients/:clientId
 * Get a specific client by ID
 */
router.get(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;

    const client = await queryOne(
      `SELECT * FROM tenant_care_clients
       WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId]
    );

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    res.json(client);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/clients
 * Create a new client
 */
router.post(
  '/tenants/:tenantId/clients',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      nhs_number,
      phone,
      email,
      address,
      postcode,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      medical_conditions,
      allergies,
      mobility_needs,
      communication_needs,
      dietary_requirements,
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name) {
      throw new ValidationError('First name and last name are required');
    }

    // Sanitize inputs
    const sanitizedEmail = email ? sanitizeEmail(email) : null;
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;

    const result = await queryOne(
      `INSERT INTO tenant_care_clients (
        tenant_id, first_name, last_name, date_of_birth, nhs_number,
        phone, email, address, postcode,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        medical_conditions, allergies, mobility_needs, communication_needs, dietary_requirements,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active'
      ) RETURNING *`,
      [
        tenantId,
        sanitizeInput(first_name),
        sanitizeInput(last_name),
        date_of_birth || null,
        nhs_number || null,
        sanitizedPhone,
        sanitizedEmail,
        address || null,
        postcode || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relationship || null,
        medical_conditions || null,
        allergies || null,
        mobility_needs || null,
        communication_needs || null,
        dietary_requirements || null,
      ]
    );

    logger.info(`Created client ${result.client_id} for tenant ${tenantId}`);
    res.status(201).json(result);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/clients/:clientId
 * Update an existing client
 */
router.put(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      nhs_number,
      phone,
      email,
      address,
      postcode,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      medical_conditions,
      allergies,
      mobility_needs,
      communication_needs,
      dietary_requirements,
      status,
    } = req.body;

    // Check if client exists
    const existing = await queryOne(
      'SELECT client_id FROM tenant_care_clients WHERE tenant_id = $1 AND client_id = $2',
      [tenantId, clientId]
    );

    if (!existing) {
      throw new NotFoundError('Client not found');
    }

    // Sanitize inputs
    const sanitizedEmail = email ? sanitizeEmail(email) : null;
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;

    const result = await queryOne(
      `UPDATE tenant_care_clients SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        date_of_birth = COALESCE($5, date_of_birth),
        nhs_number = COALESCE($6, nhs_number),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        address = COALESCE($9, address),
        postcode = COALESCE($10, postcode),
        emergency_contact_name = COALESCE($11, emergency_contact_name),
        emergency_contact_phone = COALESCE($12, emergency_contact_phone),
        emergency_contact_relationship = COALESCE($13, emergency_contact_relationship),
        medical_conditions = COALESCE($14, medical_conditions),
        allergies = COALESCE($15, allergies),
        mobility_needs = COALESCE($16, mobility_needs),
        communication_needs = COALESCE($17, communication_needs),
        dietary_requirements = COALESCE($18, dietary_requirements),
        status = COALESCE($19, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND client_id = $2
      RETURNING *`,
      [
        tenantId,
        clientId,
        first_name ? sanitizeInput(first_name) : null,
        last_name ? sanitizeInput(last_name) : null,
        date_of_birth,
        nhs_number,
        sanitizedPhone,
        sanitizedEmail,
        address,
        postcode,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        medical_conditions,
        allergies,
        mobility_needs,
        communication_needs,
        dietary_requirements,
        status,
      ]
    );

    logger.info(`Updated client ${clientId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/clients/:clientId
 * Delete (archive) a client
 */
router.delete(
  '/tenants/:tenantId/clients/:clientId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;

    // Soft delete by setting status to archived
    const result = await queryOne(
      `UPDATE tenant_care_clients
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND client_id = $2
       RETURNING client_id`,
      [tenantId, clientId]
    );

    if (!result) {
      throw new NotFoundError('Client not found');
    }

    logger.info(`Archived client ${clientId} for tenant ${tenantId}`);
    res.json({ message: 'Client archived successfully' });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/clients/:clientId/sync-to-travel
 * Sync homecare client to travel support system
 * Creates a customer record in travel support (NO medical data transferred)
 */
router.post(
  '/tenants/:tenantId/clients/:clientId/sync-to-travel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const user = req.user!;

    // Only admins can sync to travel
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can sync clients to travel support');
    }

    // Check if integration is enabled
    const settings = await queryOne(
      'SELECT travel_integration_enabled, client_travel_enabled FROM tenant_homecare_settings WHERE tenant_id = $1',
      [tenantId]
    );

    if (!settings?.travel_integration_enabled || !settings?.client_travel_enabled) {
      throw new ValidationError('Travel integration is not enabled for clients');
    }

    // Get client details
    const client = await queryOne(
      `SELECT * FROM tenant_care_clients WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId]
    );

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // Check if already synced
    if (client.travel_customer_id) {
      throw new ValidationError('Client is already synced to travel support');
    }

    // Create customer in travel support (NO medical data)
    const travelCustomer = await queryOne(
      `INSERT INTO customers (
        tenant_id,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        postcode,
        notes,
        source,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'homecare', NOW())
      RETURNING customer_id`,
      [
        tenantId,
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        client.address,
        client.city || '',
        client.postcode,
        'Home Healthcare Client - Medical data held separately in homecare system'
      ]
    );

    // Update client with travel_customer_id
    await query(
      `UPDATE tenant_care_clients
       SET travel_customer_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId, travelCustomer.customer_id]
    );

    logger.info(`Synced homecare client ${clientId} to travel customer ${travelCustomer.customer_id}`);

    res.json({
      message: 'Client synced to travel support successfully',
      travelCustomerId: travelCustomer.customer_id
    });
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/clients/:clientId/unsync-from-travel
 * Remove sync between homecare client and travel customer
 */
router.delete(
  '/tenants/:tenantId/clients/:clientId/unsync-from-travel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, clientId } = req.params;
    const user = req.user!;

    // Only admins can unsync
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can unsync clients from travel support');
    }

    // Get client
    const client = await queryOne(
      `SELECT travel_customer_id FROM tenant_care_clients WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId]
    );

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    if (!client.travel_customer_id) {
      throw new ValidationError('Client is not synced to travel support');
    }

    // Remove link (do not delete customer from travel system)
    await query(
      `UPDATE tenant_care_clients
       SET travel_customer_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId]
    );

    logger.info(`Unsynced homecare client ${clientId} from travel customer ${client.travel_customer_id}`);

    res.json({ message: 'Client unsynced from travel support successfully' });
  })
);

export default router;
