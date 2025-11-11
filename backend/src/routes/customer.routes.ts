import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import {
  validate,
  validateQuery,
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema
} from '../utils/validators';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';
import {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListQuery,
  CustomerListResponse
} from '../types/customer.types';

const router: Router = express.Router();

/**
 * Customer Routes - Stage 4
 *
 * Complete CRUD implementation for customer management.
 * This serves as the template for all other features.
 */

/**
 * @route GET /api/tenants/:tenantId/customers/stats
 * @desc Get customer statistics for dashboard
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching customer stats', { tenantId });

    // Get total customers
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_customers WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // Get active customers (placeholder - adjust logic as needed)
    const active = total; // For now, all active customers are counted as active

    // Get unique destinations (from schedule JSON)
    const destinationsResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT (schedule->>'destination')) as count
       FROM tenant_customers
       WHERE tenant_id = $1 AND is_active = true AND schedule IS NOT NULL`,
      [tenantId]
    );
    const destinations = parseInt(destinationsResult[0]?.count || '0', 10);

    // Get split payment customers
    const splitPaymentResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_customers WHERE tenant_id = $1 AND is_active = true AND has_split_payment = true',
      [tenantId]
    );
    const splitPayment = parseInt(splitPaymentResult[0]?.count || '0', 10);

    // Get customers with times set (placeholder - would need schedule analysis)
    const withTimes = 0; // TODO: Implement schedule time analysis

    // Get login enabled customers
    const loginEnabledResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_customers WHERE tenant_id = $1 AND is_active = true AND is_login_enabled = true',
      [tenantId]
    );
    const loginEnabled = parseInt(loginEnabledResult[0]?.count || '0', 10);

    res.json({
      total,
      active,
      destinations,
      splitPayment,
      withTimes,
      loginEnabled,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/customers
 * @desc Get all customers for a tenant with pagination, search, and filtering
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers',
  verifyTenantAccess,
  validateQuery(customerListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      paying_org,
      is_login_enabled,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query as CustomerListQuery;

    logger.info('Fetching customers', {
      tenantId,
      page,
      limit,
      search,
      paying_org,
      sortBy
    });

    // Build WHERE clause dynamically
    const conditions: string[] = ['c.tenant_id = $1', 'c.is_active = true'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    // Search filter (name, email, phone, address)
    if (search && search.trim()) {
      conditions.push(`(
        c.name ILIKE $${paramCount} OR
        c.email ILIKE $${paramCount} OR
        c.phone ILIKE $${paramCount} OR
        c.address ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Payment org filter
    if (paying_org) {
      conditions.push(`c.paying_org = $${paramCount}`);
      params.push(paying_org);
      paramCount++;
    }

    // Login enabled filter
    if (is_login_enabled !== undefined) {
      conditions.push(`c.is_login_enabled = $${paramCount}`);
      params.push(is_login_enabled);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count for pagination
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_customers c WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Validate sort column to prevent SQL injection
    const validSortColumns: { [key: string]: string } = {
      name: 'c.name',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
    };
    const sortColumn = validSortColumns[sortBy as string] || 'c.name';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get customers with pagination
    const customers = await query<Customer>(
      `SELECT
        c.customer_id as id,
        c.tenant_id,
        c.name,
        c.address,
        c.address_line_2,
        c.city,
        c.county,
        c.postcode,
        c.phone,
        c.email,
        c.paying_org,
        c.has_split_payment,
        c.provider_split,
        c.payment_split,
        c.schedule,
        c.emergency_contact_name,
        c.emergency_contact_phone,
        c.medical_notes,
        c.medication_notes,
        c.driver_notes,
        c.mobility_requirements,
        c.is_active,
        c.is_login_enabled,
        c.user_id,
        u.username,
        u.last_login,
        c.created_at,
        c.updated_at
      FROM tenant_customers c
      LEFT JOIN tenant_users u ON c.user_id = u.user_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    // Parse JSON fields
    const processedCustomers = customers.map((customer) => ({
      ...customer,
      provider_split: typeof customer.provider_split === 'string'
        ? JSON.parse(customer.provider_split || '{}')
        : customer.provider_split || {},
      payment_split: typeof customer.payment_split === 'string'
        ? JSON.parse(customer.payment_split || '{}')
        : customer.payment_split || {},
      schedule: typeof customer.schedule === 'string'
        ? JSON.parse(customer.schedule || '{}')
        : customer.schedule || {},
    }));

    const response: CustomerListResponse = {
      customers: processedCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    logger.info('Customers retrieved successfully', {
      tenantId,
      count: customers.length,
      total,
      page,
    });

    res.json(response);
  })
);

/**
 * @route GET /api/tenants/:tenantId/customers/:customerId
 * @desc Get a specific customer by ID
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/:customerId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching customer', { tenantId, customerId });

    const customer = await queryOne<Customer>(
      `SELECT
        c.customer_id as id,
        c.tenant_id,
        c.name,
        c.address,
        c.address_line_2,
        c.city,
        c.county,
        c.postcode,
        c.phone,
        c.email,
        c.paying_org,
        c.has_split_payment,
        c.provider_split,
        c.payment_split,
        c.schedule,
        c.emergency_contact_name,
        c.emergency_contact_phone,
        c.medical_notes,
        c.medication_notes,
        c.driver_notes,
        c.mobility_requirements,
        c.is_active,
        c.is_login_enabled,
        c.user_id,
        u.username,
        u.last_login,
        c.created_at,
        c.updated_at
      FROM tenant_customers c
      LEFT JOIN tenant_users u ON c.user_id = u.user_id
      WHERE c.tenant_id = $1 AND c.customer_id = $2 AND c.is_active = true`,
      [tenantId, customerId]
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Parse JSON fields
    const processedCustomer = {
      ...customer,
      provider_split: typeof customer.provider_split === 'string'
        ? JSON.parse(customer.provider_split || '{}')
        : customer.provider_split || {},
      payment_split: typeof customer.payment_split === 'string'
        ? JSON.parse(customer.payment_split || '{}')
        : customer.payment_split || {},
      schedule: typeof customer.schedule === 'string'
        ? JSON.parse(customer.schedule || '{}')
        : customer.schedule || {},
    };

    logger.info('Customer retrieved successfully', { tenantId, customerId });

    res.json(processedCustomer);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers
 * @desc Create a new customer
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers',
  verifyTenantAccess,
  validate(createCustomerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const customerData: CreateCustomerDto = req.body;

    // Sanitize all string inputs
    const name = sanitizeInput(customerData.name, { maxLength: 200 });
    const address = sanitizeInput(customerData.address, { maxLength: 500 });
    const addressLine2 = sanitizeInput(customerData.address_line_2, { maxLength: 200 });
    const city = sanitizeInput(customerData.city, { maxLength: 100 });
    const county = sanitizeInput(customerData.county, { maxLength: 100 });
    const postcode = sanitizeInput(customerData.postcode, { maxLength: 20 });
    const phone = sanitizePhone(customerData.phone || '');
    const email = sanitizeEmail(customerData.email || '');
    const payingOrg = sanitizeInput(customerData.paying_org, { maxLength: 200 });
    const emergencyContactName = sanitizeInput(customerData.emergency_contact_name, { maxLength: 200 });
    const emergencyContactPhone = sanitizePhone(customerData.emergency_contact_phone || '');
    const medicalNotes = sanitizeInput(customerData.medical_notes, { maxLength: 2000 });
    const medicationNotes = sanitizeInput(customerData.medication_notes, { maxLength: 2000 });
    const driverNotes = sanitizeInput(customerData.driver_notes, { maxLength: 2000 });
    const mobilityRequirements = sanitizeInput(customerData.mobility_requirements, { maxLength: 1000 });

    logger.info('Creating customer', { tenantId, name });

    // Validate required fields
    if (!name) {
      throw new ValidationError('Customer name is required');
    }

    const result = await queryOne<{ id: number; name: string; created_at: Date }>(
      `INSERT INTO tenant_customers (
        tenant_id, name, address, address_line_2, city, county, postcode,
        phone, email, paying_org,
        has_split_payment, provider_split, payment_split, schedule,
        emergency_contact_name, emergency_contact_phone,
        medical_notes, medication_notes, driver_notes, mobility_requirements,
        reminder_opt_in, reminder_preference,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING customer_id as id, name, created_at`,
      [
        tenantId,
        name,
        address || '',
        addressLine2 || '',
        city || '',
        county || '',
        postcode || '',
        phone || '',
        email || '',
        payingOrg || 'Self-Pay',
        customerData.has_split_payment || false,
        JSON.stringify(customerData.provider_split || {}),
        JSON.stringify(customerData.payment_split || {}),
        JSON.stringify(customerData.schedule || {}),
        emergencyContactName || '',
        emergencyContactPhone || '',
        medicalNotes || '',
        medicationNotes || '',
        driverNotes || '',
        mobilityRequirements || '',
        customerData.reminder_opt_in !== undefined ? customerData.reminder_opt_in : true,
        customerData.reminder_preference || 'sms',
      ]
    );

    logger.info('Customer created successfully', {
      tenantId,
      customerId: result?.id,
      name: result?.name,
    });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/customers/:customerId
 * @desc Update a customer
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/customers/:customerId',
  verifyTenantAccess,
  validate(updateCustomerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const customerData: UpdateCustomerDto = req.body;

    logger.info('Updating customer', { tenantId, customerId });

    // Check if customer exists
    const existing = await queryOne<{ customer_id: number }>(
      'SELECT customer_id FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Sanitize all string inputs (only sanitize if provided)
    const name = customerData.name ? sanitizeInput(customerData.name, { maxLength: 200 }) : undefined;
    const address = customerData.address ? sanitizeInput(customerData.address, { maxLength: 500 }) : undefined;
    const addressLine2 = customerData.address_line_2 ? sanitizeInput(customerData.address_line_2, { maxLength: 200 }) : undefined;
    const city = customerData.city ? sanitizeInput(customerData.city, { maxLength: 100 }) : undefined;
    const county = customerData.county ? sanitizeInput(customerData.county, { maxLength: 100 }) : undefined;
    const postcode = customerData.postcode ? sanitizeInput(customerData.postcode, { maxLength: 20 }) : undefined;
    const phone = customerData.phone ? sanitizePhone(customerData.phone) : undefined;
    const email = customerData.email ? sanitizeEmail(customerData.email) : undefined;
    const payingOrg = customerData.paying_org ? sanitizeInput(customerData.paying_org, { maxLength: 200 }) : undefined;
    const emergencyContactName = customerData.emergency_contact_name ? sanitizeInput(customerData.emergency_contact_name, { maxLength: 200 }) : undefined;
    const emergencyContactPhone = customerData.emergency_contact_phone ? sanitizePhone(customerData.emergency_contact_phone) : undefined;
    const medicalNotes = customerData.medical_notes ? sanitizeInput(customerData.medical_notes, { maxLength: 2000 }) : undefined;
    const medicationNotes = customerData.medication_notes ? sanitizeInput(customerData.medication_notes, { maxLength: 2000 }) : undefined;
    const driverNotes = customerData.driver_notes ? sanitizeInput(customerData.driver_notes, { maxLength: 2000 }) : undefined;
    const mobilityRequirements = customerData.mobility_requirements ? sanitizeInput(customerData.mobility_requirements, { maxLength: 1000 }) : undefined;

    // Perform update
    const result = await queryOne<{ id: number; name: string; updated_at: Date }>(
      `UPDATE tenant_customers SET
        name = COALESCE($3, name),
        address = COALESCE($4, address),
        address_line_2 = COALESCE($5, address_line_2),
        city = COALESCE($6, city),
        county = COALESCE($7, county),
        postcode = COALESCE($8, postcode),
        phone = COALESCE($9, phone),
        email = COALESCE($10, email),
        paying_org = COALESCE($11, paying_org),
        has_split_payment = COALESCE($12, has_split_payment),
        provider_split = COALESCE($13, provider_split),
        payment_split = COALESCE($14, payment_split),
        schedule = COALESCE($15, schedule),
        emergency_contact_name = COALESCE($16, emergency_contact_name),
        emergency_contact_phone = COALESCE($17, emergency_contact_phone),
        medical_notes = COALESCE($18, medical_notes),
        medication_notes = COALESCE($19, medication_notes),
        driver_notes = COALESCE($20, driver_notes),
        mobility_requirements = COALESCE($21, mobility_requirements),
        reminder_opt_in = COALESCE($22, reminder_opt_in),
        reminder_preference = COALESCE($23, reminder_preference),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND customer_id = $2
      RETURNING customer_id as id, name, updated_at`,
      [
        tenantId,
        customerId,
        name,
        address,
        addressLine2,
        city,
        county,
        postcode,
        phone,
        email,
        payingOrg,
        customerData.has_split_payment,
        customerData.provider_split ? JSON.stringify(customerData.provider_split) : null,
        customerData.payment_split ? JSON.stringify(customerData.payment_split) : null,
        customerData.schedule ? JSON.stringify(customerData.schedule) : null,
        emergencyContactName,
        emergencyContactPhone,
        medicalNotes,
        medicationNotes,
        driverNotes,
        mobilityRequirements,
        customerData.reminder_opt_in,
        customerData.reminder_preference,
      ]
    );

    logger.info('Customer updated successfully', {
      tenantId,
      customerId,
      name: result?.name,
    });

    res.json(result);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/customers/:customerId
 * @desc Delete a customer (soft delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/customers/:customerId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Deleting customer', { tenantId, customerId });

    // Check if customer exists
    const existing = await queryOne<{ customer_id: number; name: string }>(
      'SELECT customer_id, name FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Soft delete
    await query(
      'UPDATE tenant_customers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND customer_id = $2',
      [tenantId, customerId]
    );

    logger.info('Customer deleted successfully', {
      tenantId,
      customerId,
      name: existing.name,
    });

    res.json({
      message: 'Customer deleted successfully',
      customerId: existing.customer_id,
      customerName: existing.name,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/:customerId/enable-login
 * @desc Enable customer portal login
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/:customerId/enable-login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { password } = req.body;

    // Sanitize username (but NOT password)
    const username = sanitizeInput(req.body.username, { maxLength: 100 });

    logger.info('Enabling customer login', { tenantId, customerId, username });

    // Validate inputs
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Get customer's name first
    const customer = await queryOne<any>(
      'SELECT name FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    // Check if username already exists
    const existingUser = await queryOne<any>(
      'SELECT user_id FROM tenant_users WHERE username = $1 AND tenant_id = $2',
      [username, tenantId]
    );

    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Hash password (password is NOT sanitized - important!)
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in tenant_users with full_name
    const userResult = await queryOne<any>(
      `INSERT INTO tenant_users (tenant_id, username, password_hash, email, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'customer', true, NOW(), NOW())
       RETURNING user_id`,
      [tenantId, username, passwordHash, `${username}@customer.portal`, customer.name]
    );

    const userId = userResult.user_id;

    // Update customer record
    await query(
      `UPDATE tenant_customers
       SET is_login_enabled = true, user_id = $1, updated_at = NOW()
       WHERE customer_id = $2 AND tenant_id = $3`,
      [userId, customerId, tenantId]
    );

    logger.info('Customer login enabled successfully', { tenantId, customerId, userId });

    res.json({
      message: 'Login enabled successfully',
      userId,
      username,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/:customerId/disable-login
 * @desc Disable customer portal login
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/:customerId/disable-login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Disabling customer login', { tenantId, customerId });

    // Get customer's user_id
    const customer = await queryOne<any>(
      'SELECT user_id FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (customer?.user_id) {
      // Deactivate user account
      await query(
        'UPDATE tenant_users SET is_active = false WHERE user_id = $1 AND tenant_id = $2',
        [customer.user_id, tenantId]
      );
    }

    // Update customer record
    await query(
      `UPDATE tenant_customers
       SET is_login_enabled = false, updated_at = NOW()
       WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    logger.info('Customer login disabled successfully', { tenantId, customerId });

    res.json({
      message: 'Login disabled successfully',
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/:customerId/reset-password
 * @desc Reset customer password
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/:customerId/reset-password',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { newPassword } = req.body;

    logger.info('Resetting customer password', { tenantId, customerId });

    if (!newPassword) {
      throw new ValidationError('New password is required');
    }

    // Get customer's user_id
    const customer = await queryOne<any>(
      'SELECT user_id FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (!customer?.user_id) {
      throw new NotFoundError('Customer login not found');
    }

    // Hash new password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE tenant_users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3',
      [passwordHash, customer.user_id, tenantId]
    );

    logger.info('Customer password reset successfully', { tenantId, customerId });

    res.json({
      message: 'Password reset successfully',
    });
  })
);

/**
 * Get customer login details
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/login-details',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching customer login details', { tenantId, customerId });

    // Get customer with user details
    const customer = await queryOne<any>(
      `SELECT
        c.user_id,
        c.is_login_enabled,
        u.username,
        u.created_at as account_created,
        u.last_login
       FROM tenant_customers c
       LEFT JOIN tenant_users u ON c.user_id = u.user_id AND c.tenant_id = u.tenant_id
       WHERE c.customer_id = $1 AND c.tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      res.status(404).json({
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
      });
      return;
    }

    res.json({
      isLoginEnabled: customer.is_login_enabled,
      username: customer.username || null,
      accountCreated: customer.account_created || null,
      lastLogin: customer.last_login || null,
    });
  })
);

/**
 * Update customer username
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/update-username',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;

    // Sanitize username
    const username = sanitizeInput(req.body.username, { maxLength: 100 });

    logger.info('Updating customer username', { tenantId, customerId, username });

    if (!username) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username is required',
        },
      });
      return;
    }

    // Get customer's user_id
    const customer = await queryOne<any>(
      'SELECT user_id FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (!customer?.user_id) {
      res.status(404).json({
        error: {
          code: 'LOGIN_NOT_FOUND',
          message: 'Customer login not found',
        },
      });
      return;
    }

    // Check if username already exists
    const existingUser = await queryOne<any>(
      'SELECT user_id FROM tenant_users WHERE username = $1 AND tenant_id = $2 AND user_id != $3',
      [username, tenantId, customer.user_id]
    );

    if (existingUser) {
      res.status(400).json({
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username already exists',
        },
      });
      return;
    }

    // Update username
    await query(
      'UPDATE tenant_users SET username = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3',
      [username, customer.user_id, tenantId]
    );

    logger.info('Customer username updated successfully', { tenantId, customerId });

    res.json({
      message: 'Username updated successfully',
      username,
    });
  })
);

/**
 * Get customer login history
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/login-history',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching customer login history', { tenantId, customerId });

    // Get customer's user_id
    const customer = await queryOne<any>(
      'SELECT user_id FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (!customer?.user_id) {
      res.json({
        history: [],
      });
      return;
    }

    // Get login history from tenant_login_logs table if it exists
    // For now, return the last login from tenant_users
    const user = await queryOne<any>(
      'SELECT last_login FROM tenant_users WHERE user_id = $1 AND tenant_id = $2',
      [customer.user_id, tenantId]
    );

    const history = [];
    if (user?.last_login) {
      history.push({
        timestamp: user.last_login,
        ipAddress: null,
        userAgent: null,
      });
    }

    res.json({
      history,
    });
  })
);

/**
 * Update customer schedule
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/schedule',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;
    const { schedule } = req.body;

    logger.info('Updating customer schedule', { tenantId, customerId });

    // Validate schedule structure
    if (!schedule || typeof schedule !== 'object') {
      res.status(400).json({
        error: {
          code: 'INVALID_SCHEDULE',
          message: 'Schedule must be a valid object',
        },
      });
      return;
    }

    // Update customer schedule in database
    await query(
      `UPDATE tenant_customers
       SET schedule = $1, updated_at = NOW()
       WHERE customer_id = $2 AND tenant_id = $3`,
      [JSON.stringify(schedule), customerId, tenantId]
    );

    logger.info('Customer schedule updated successfully', { tenantId, customerId });

    res.json({
      message: 'Schedule updated successfully',
      schedule,
    });
  })
);

/**
 * Update customer times
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/times',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;
    const { schedule } = req.body;

    logger.info('Updating customer times', { tenantId, customerId });

    // Validate schedule structure
    if (!schedule || typeof schedule !== 'object') {
      res.status(400).json({
        error: {
          code: 'INVALID_SCHEDULE',
          message: 'Schedule must be a valid object',
        },
      });
      return;
    }

    // Update customer schedule (times are part of schedule) in database
    await query(
      `UPDATE tenant_customers
       SET schedule = $1, updated_at = NOW()
       WHERE customer_id = $2 AND tenant_id = $3`,
      [JSON.stringify(schedule), customerId, tenantId]
    );

    logger.info('Customer times updated successfully', { tenantId, customerId });

    res.json({
      message: 'Times updated successfully',
      schedule,
    });
  })
);

/**
 * Get customer assessment
 */
router.get(
  '/tenants/:tenantId/customers/:customerId/assessment',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;

    logger.info('Fetching customer assessment', { tenantId, customerId });

    const customer = await queryOne<any>(
      `SELECT risk_assessment FROM tenant_customers
       WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      res.status(404).json({
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found',
        },
      });
      return;
    }

    res.json({
      assessment: customer.risk_assessment || null,
    });
  })
);

/**
 * Update customer assessment
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/assessment',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, customerId } = req.params;
    const { assessment } = req.body;

    logger.info('Updating customer assessment', { tenantId, customerId });

    // Validate assessment structure
    if (!assessment || typeof assessment !== 'object') {
      res.status(400).json({
        error: {
          code: 'INVALID_ASSESSMENT',
          message: 'Assessment must be a valid object',
        },
      });
      return;
    }

    // Update customer assessment in database
    await query(
      `UPDATE tenant_customers
       SET risk_assessment = $1, updated_at = NOW()
       WHERE customer_id = $2 AND tenant_id = $3`,
      [JSON.stringify(assessment), customerId, tenantId]
    );

    logger.info('Customer assessment updated successfully', { tenantId, customerId });

    res.json({
      message: 'Assessment updated successfully',
      assessment,
    });
  })
);

export default router;
