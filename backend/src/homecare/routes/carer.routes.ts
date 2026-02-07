import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Carer Routes
 * Manages care workers who are co-operative members
 */

/**
 * GET /api/homecare/tenants/:tenantId/carers
 * List all carers for a tenant
 */
router.get(
  '/tenants/:tenantId/carers',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status = 'active', search } = req.query;

    let sql = `
      SELECT
        carer_id,
        first_name,
        last_name,
        phone,
        email,
        dbs_check_date,
        dbs_expiry_date,
        employment_type,
        hourly_rate,
        status,
        total_visits_completed,
        on_time_percentage,
        created_at
      FROM tenant_carers
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

    const carers = await query(sql, params);

    logger.info(`Listed ${carers.length} carers for tenant ${tenantId}`);
    res.json(carers);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/carers/:carerId
 * Get a specific carer by ID
 */
router.get(
  '/tenants/:tenantId/carers/:carerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;

    const carer = await queryOne(
      `SELECT * FROM tenant_carers
       WHERE tenant_id = $1 AND carer_id = $2`,
      [tenantId, carerId]
    );

    if (!carer) {
      throw new NotFoundError('Carer not found');
    }

    res.json(carer);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/carers
 * Create a new carer
 */
router.post(
  '/tenants/:tenantId/carers',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      phone,
      email,
      address,
      postcode,
      dbs_check_date,
      dbs_expiry_date,
      dbs_certificate_number,
      qualifications,
      care_certificate,
      employment_type,
      hourly_rate,
      contracted_hours,
      max_daily_hours,
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      throw new ValidationError('First name, last name, and email are required');
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;

    const result = await queryOne(
      `INSERT INTO tenant_carers (
        tenant_id, first_name, last_name, date_of_birth,
        phone, email, address, postcode,
        dbs_check_date, dbs_expiry_date, dbs_certificate_number,
        qualifications, care_certificate,
        employment_type, hourly_rate, contracted_hours, max_daily_hours,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active'
      ) RETURNING *`,
      [
        tenantId,
        sanitizeInput(first_name),
        sanitizeInput(last_name),
        date_of_birth || null,
        sanitizedPhone,
        sanitizedEmail,
        address || null,
        postcode || null,
        dbs_check_date || null,
        dbs_expiry_date || null,
        dbs_certificate_number || null,
        qualifications || null,
        care_certificate || false,
        employment_type || 'full_time',
        hourly_rate || null,
        contracted_hours || null,
        max_daily_hours || 8,
      ]
    );

    logger.info(`Created carer ${result.carer_id} for tenant ${tenantId}`);
    res.status(201).json(result);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/carers/:carerId
 * Update an existing carer
 */
router.put(
  '/tenants/:tenantId/carers/:carerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      phone,
      email,
      address,
      postcode,
      dbs_check_date,
      dbs_expiry_date,
      dbs_certificate_number,
      qualifications,
      care_certificate,
      employment_type,
      hourly_rate,
      contracted_hours,
      max_daily_hours,
      status,
    } = req.body;

    // Check if carer exists
    const existing = await queryOne(
      'SELECT carer_id FROM tenant_carers WHERE tenant_id = $1 AND carer_id = $2',
      [tenantId, carerId]
    );

    if (!existing) {
      throw new NotFoundError('Carer not found');
    }

    // Sanitize inputs
    const sanitizedEmail = email ? sanitizeEmail(email) : null;
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;

    const result = await queryOne(
      `UPDATE tenant_carers SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        date_of_birth = COALESCE($5, date_of_birth),
        phone = COALESCE($6, phone),
        email = COALESCE($7, email),
        address = COALESCE($8, address),
        postcode = COALESCE($9, postcode),
        dbs_check_date = COALESCE($10, dbs_check_date),
        dbs_expiry_date = COALESCE($11, dbs_expiry_date),
        dbs_certificate_number = COALESCE($12, dbs_certificate_number),
        qualifications = COALESCE($13, qualifications),
        care_certificate = COALESCE($14, care_certificate),
        employment_type = COALESCE($15, employment_type),
        hourly_rate = COALESCE($16, hourly_rate),
        contracted_hours = COALESCE($17, contracted_hours),
        max_daily_hours = COALESCE($18, max_daily_hours),
        status = COALESCE($19, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND carer_id = $2
      RETURNING *`,
      [
        tenantId,
        carerId,
        first_name ? sanitizeInput(first_name) : null,
        last_name ? sanitizeInput(last_name) : null,
        date_of_birth,
        sanitizedPhone,
        sanitizedEmail,
        address,
        postcode,
        dbs_check_date,
        dbs_expiry_date,
        dbs_certificate_number,
        qualifications,
        care_certificate,
        employment_type,
        hourly_rate,
        contracted_hours,
        max_daily_hours,
        status,
      ]
    );

    logger.info(`Updated carer ${carerId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/carers/:carerId
 * Delete (inactivate) a carer
 */
router.delete(
  '/tenants/:tenantId/carers/:carerId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;

    // Soft delete by setting status to inactive
    const result = await queryOne(
      `UPDATE tenant_carers
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND carer_id = $2
       RETURNING carer_id`,
      [tenantId, carerId]
    );

    if (!result) {
      throw new NotFoundError('Carer not found');
    }

    logger.info(`Inactivated carer ${carerId} for tenant ${tenantId}`);
    res.json({ message: 'Carer inactivated successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/carers/:carerId/schedule
 * Get carer's schedule/upcoming visits
 */
router.get(
  '/tenants/:tenantId/carers/:carerId/schedule',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT
        v.visit_id,
        v.scheduled_start,
        v.scheduled_end,
        v.visit_type,
        v.status,
        c.client_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.address,
        c.postcode
      FROM tenant_care_visits v
      JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
      WHERE v.tenant_id = $1 AND v.carer_id = $2
    `;

    const params: any[] = [tenantId, carerId];

    if (start_date) {
      sql += ` AND v.scheduled_start >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND v.scheduled_start <= $${params.length + 1}`;
      params.push(end_date);
    }

    sql += ' ORDER BY v.scheduled_start';

    const schedule = await query(sql, params);

    res.json(schedule);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/carers/:carerId/sync-to-travel
 * Sync homecare carer to travel support system
 * Creates customer OR driver record (based on partnership settings)
 */
router.post(
  '/tenants/:tenantId/carers/:carerId/sync-to-travel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const user = req.user!;
    const { sync_as = 'customer' } = req.body; // 'customer' or 'driver'

    // Only admins can sync to travel
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can sync carers to travel support');
    }

    // Check if integration is enabled
    const settings = await queryOne(
      `SELECT travel_integration_enabled, travel_partnership_type, carer_travel_discount
       FROM tenant_homecare_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (!settings?.travel_integration_enabled) {
      throw new ValidationError('Travel integration is not enabled');
    }

    // Get carer details
    const carer = await queryOne(
      `SELECT * FROM tenant_carers WHERE tenant_id = $1 AND carer_id = $2`,
      [tenantId, carerId]
    );

    if (!carer) {
      throw new NotFoundError('Carer not found');
    }

    // Check if already synced
    if (carer.travel_customer_id || carer.travel_driver_id) {
      throw new ValidationError('Carer is already synced to travel support');
    }

    let travelCustomerId = null;
    let travelDriverId = null;

    if (sync_as === 'driver') {
      // Sync as driver (if they also provide transport services)
      const travelDriver = await queryOne(
        `INSERT INTO drivers (
          tenant_id,
          first_name,
          last_name,
          email,
          phone,
          address,
          postcode,
          notes,
          source,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'homecare_staff', NOW())
        RETURNING driver_id`,
        [
          tenantId,
          carer.first_name,
          carer.last_name,
          carer.email,
          carer.phone,
          carer.address,
          carer.postcode,
          'Homecare Staff - Can provide transport for clients'
        ]
      );
      travelDriverId = travelDriver.driver_id;
    }

    // Also create customer record (so they can book travel for themselves)
    const discountNote = settings.carer_travel_discount > 0
      ? ` - ${settings.carer_travel_discount}% staff discount applies`
      : '';

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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'homecare_staff', NOW())
      RETURNING customer_id`,
      [
        tenantId,
        carer.first_name,
        carer.last_name,
        carer.email,
        carer.phone,
        carer.address,
        '',
        carer.postcode,
        `Homecare Staff Member${discountNote}`
      ]
    );
    travelCustomerId = travelCustomer.customer_id;

    // Update carer with travel IDs
    await query(
      `UPDATE tenant_carers
       SET travel_customer_id = $3, travel_driver_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND carer_id = $2`,
      [tenantId, carerId, travelCustomerId, travelDriverId]
    );

    logger.info(`Synced homecare carer ${carerId} to travel (customer: ${travelCustomerId}, driver: ${travelDriverId})`);

    res.json({
      message: 'Carer synced to travel support successfully',
      travelCustomerId,
      travelDriverId,
      discount: settings.carer_travel_discount
    });
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/carers/:carerId/unsync-from-travel
 * Remove sync between homecare carer and travel records
 */
router.delete(
  '/tenants/:tenantId/carers/:carerId/unsync-from-travel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, carerId } = req.params;
    const user = req.user!;

    // Only admins can unsync
    if (user.role !== 'admin') {
      throw new ValidationError('Only administrators can unsync carers from travel support');
    }

    // Get carer
    const carer = await queryOne(
      `SELECT travel_customer_id, travel_driver_id FROM tenant_carers
       WHERE tenant_id = $1 AND carer_id = $2`,
      [tenantId, carerId]
    );

    if (!carer) {
      throw new NotFoundError('Carer not found');
    }

    if (!carer.travel_customer_id && !carer.travel_driver_id) {
      throw new ValidationError('Carer is not synced to travel support');
    }

    // Remove links (do not delete records from travel system)
    await query(
      `UPDATE tenant_carers
       SET travel_customer_id = NULL, travel_driver_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND carer_id = $2`,
      [tenantId, carerId]
    );

    logger.info(`Unsynced homecare carer ${carerId} from travel (customer: ${carer.travel_customer_id}, driver: ${carer.travel_driver_id})`);

    res.json({ message: 'Carer unsynced from travel support successfully' });
  })
);

export default router;
