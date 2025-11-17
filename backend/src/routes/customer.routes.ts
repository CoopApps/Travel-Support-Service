import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { validate, validateMultiple } from '../middleware/validation';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
} from '../schemas/customer.schemas';
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

    // Get customers with times set (analyze schedule JSONB)
    const withTimesResult = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT customer_id) as count
       FROM tenant_customers,
       LATERAL jsonb_each(schedule) AS day_entry
       WHERE tenant_id = $1
         AND is_active = true
         AND schedule IS NOT NULL
         AND (
           (day_entry.value->>'pickup_time') IS NOT NULL
           OR (day_entry.value->>'drop_off_time') IS NOT NULL
           OR (day_entry.value->>'outbound_time') IS NOT NULL
           OR (day_entry.value->>'return_time') IS NOT NULL
         )`,
      [tenantId]
    );
    const withTimes = parseInt(withTimesResult[0]?.count || '0', 10);

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
 * @route GET /api/tenants/:tenantId/customers/enhanced-stats
 * @desc Get enhanced customer statistics with trip history, revenue, and detailed breakdowns
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/enhanced-stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching enhanced customer stats', { tenantId });

    // Get all active customers with their details
    const customers = await query<{
      customer_id: number;
      name: string;
      has_split_payment: boolean;
      payment_split: any;
      schedule: any;
      reminder_opt_in: boolean;
      reminder_preference: string;
      is_login_enabled: boolean;
      no_show_count: number;
      total_completed_trips: number;
      total_trips_attempted: number;
      reliability_percentage: number;
      default_price: number;
    }>(
      `SELECT customer_id, name, has_split_payment, payment_split, schedule,
              reminder_opt_in, reminder_preference, is_login_enabled,
              no_show_count, total_completed_trips, total_trips_attempted,
              reliability_percentage, default_price
       FROM tenant_customers
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Get trip statistics from tenant_trips table
    const tripStats = await query<{
      customer_id: number;
      total_trips: string;
      completed_trips: string;
      cancelled_trips: string;
      total_revenue: string;
    }>(
      `SELECT
        customer_id,
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE trip_status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE trip_status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(price), 0) as total_revenue
       FROM tenant_trips
       WHERE tenant_id = $1
       GROUP BY customer_id`,
      [tenantId]
    );

    // Create a map of trip stats by customer
    const tripStatsMap = new Map();
    tripStats.forEach((stat) => {
      tripStatsMap.set(stat.customer_id, {
        totalTrips: parseInt(stat.total_trips || '0'),
        completedTrips: parseInt(stat.completed_trips || '0'),
        cancelledTrips: parseInt(stat.cancelled_trips || '0'),
        totalRevenue: parseFloat(stat.total_revenue || '0'),
      });
    });

    // Calculate aggregated statistics
    const stats = {
      payment: {
        selfPay: 0,
        splitPayment: 0,
        totalSplitProviders: 0,
      },
      schedule: {
        hasSchedule: 0,
        withPickupTimes: 0,
        uniqueDestinations: new Set<string>(),
      },
      reminders: {
        optedIn: 0,
        optedOut: 0,
        preferSms: 0,
        preferEmail: 0,
        preferBoth: 0,
        preferNone: 0,
      },
      portal: {
        loginEnabled: 0,
        noAccess: 0,
      },
      trips: {
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalRevenue: 0,
        noShows: 0,
        averageReliability: 0,
      },
    };

    let reliabilityCount = 0;
    let reliabilitySum = 0;

    customers.forEach((customer) => {
      // Payment stats
      if (customer.has_split_payment) {
        stats.payment.splitPayment++;
        const paymentSplit = typeof customer.payment_split === 'string'
          ? JSON.parse(customer.payment_split)
          : customer.payment_split || {};
        stats.payment.totalSplitProviders += Object.keys(paymentSplit).length;
      } else {
        stats.payment.selfPay++;
      }

      // Schedule stats
      if (customer.schedule) {
        const schedule = typeof customer.schedule === 'string'
          ? JSON.parse(customer.schedule)
          : customer.schedule;

        if (Object.keys(schedule).length > 0) {
          stats.schedule.hasSchedule++;

          // Check each day for times and destinations
          Object.values(schedule).forEach((day: any) => {
            if (day.pickup_time || day.drop_off_time) {
              stats.schedule.withPickupTimes++;
            }
            if (day.destination) {
              stats.schedule.uniqueDestinations.add(day.destination);
            }
            if (day.outbound_destination) {
              stats.schedule.uniqueDestinations.add(day.outbound_destination);
            }
            if (day.return_destination) {
              stats.schedule.uniqueDestinations.add(day.return_destination);
            }
          });
        }
      }

      // Reminder stats
      if (customer.reminder_opt_in) {
        stats.reminders.optedIn++;
      } else {
        stats.reminders.optedOut++;
      }

      switch (customer.reminder_preference) {
        case 'sms':
          stats.reminders.preferSms++;
          break;
        case 'email':
          stats.reminders.preferEmail++;
          break;
        case 'both':
          stats.reminders.preferBoth++;
          break;
        case 'none':
          stats.reminders.preferNone++;
          break;
      }

      // Portal stats
      if (customer.is_login_enabled) {
        stats.portal.loginEnabled++;
      } else {
        stats.portal.noAccess++;
      }

      // Trip stats from map
      const customerTripStats = tripStatsMap.get(customer.customer_id);
      if (customerTripStats) {
        stats.trips.totalTrips += customerTripStats.totalTrips;
        stats.trips.completedTrips += customerTripStats.completedTrips;
        stats.trips.cancelledTrips += customerTripStats.cancelledTrips;
        stats.trips.totalRevenue += customerTripStats.totalRevenue;
      }

      // No-show and reliability stats
      if (customer.no_show_count) {
        stats.trips.noShows += customer.no_show_count;
      }

      if (customer.reliability_percentage !== null && customer.reliability_percentage !== undefined) {
        reliabilitySum += customer.reliability_percentage;
        reliabilityCount++;
      }
    });

    // Calculate average reliability
    if (reliabilityCount > 0) {
      stats.trips.averageReliability = Math.round(reliabilitySum / reliabilityCount);
    }

    // Get top destinations (from schedule JSONB)
    const destinationsResult = await query<{ destination: string; count: string }>(
      `WITH RECURSIVE destinations AS (
        SELECT
          customer_id,
          jsonb_each(schedule) AS day_entry
        FROM tenant_customers
        WHERE tenant_id = $1 AND is_active = true AND schedule IS NOT NULL
      ),
      extracted_destinations AS (
        SELECT
          (day_entry).value->>'destination' AS destination
        FROM destinations
        WHERE (day_entry).value->>'destination' IS NOT NULL
        UNION ALL
        SELECT
          (day_entry).value->>'outbound_destination' AS destination
        FROM destinations
        WHERE (day_entry).value->>'outbound_destination' IS NOT NULL
        UNION ALL
        SELECT
          (day_entry).value->>'return_destination' AS destination
        FROM destinations
        WHERE (day_entry).value->>'return_destination' IS NOT NULL
      )
      SELECT destination, COUNT(*) as count
      FROM extracted_destinations
      WHERE destination IS NOT NULL AND destination != ''
      GROUP BY destination
      ORDER BY count DESC
      LIMIT 10`,
      [tenantId]
    );

    const topDestinations = destinationsResult.map((d) => ({
      destination: d.destination,
      count: parseInt(d.count),
    }));

    res.json({
      summary: {
        totalCustomers: customers.length,
        activeCustomers: customers.length, // All queried customers are active
        loginEnabled: stats.portal.loginEnabled,
        hasSchedules: stats.schedule.hasSchedule,
      },
      payment: {
        selfPay: stats.payment.selfPay,
        splitPayment: stats.payment.splitPayment,
        averageProvidersPerSplit: stats.payment.splitPayment > 0
          ? Math.round(stats.payment.totalSplitProviders / stats.payment.splitPayment * 10) / 10
          : 0,
      },
      schedule: {
        withSchedules: stats.schedule.hasSchedule,
        withPickupTimes: stats.schedule.withPickupTimes,
        uniqueDestinations: stats.schedule.uniqueDestinations.size,
        topDestinations,
      },
      reminders: {
        optedIn: stats.reminders.optedIn,
        optedOut: stats.reminders.optedOut,
        preferSms: stats.reminders.preferSms,
        preferEmail: stats.reminders.preferEmail,
        preferBoth: stats.reminders.preferBoth,
        preferNone: stats.reminders.preferNone,
      },
      portal: {
        loginEnabled: stats.portal.loginEnabled,
        noAccess: stats.portal.noAccess,
      },
      trips: {
        totalTrips: stats.trips.totalTrips,
        completedTrips: stats.trips.completedTrips,
        cancelledTrips: stats.trips.cancelledTrips,
        noShows: stats.trips.noShows,
        completionRate: stats.trips.totalTrips > 0
          ? Math.round((stats.trips.completedTrips / stats.trips.totalTrips) * 100)
          : 0,
        averageReliability: stats.trips.averageReliability,
      },
      financial: {
        totalRevenue: Math.round(stats.trips.totalRevenue * 100) / 100,
        averageRevenuePerCustomer: customers.length > 0
          ? Math.round((stats.trips.totalRevenue / customers.length) * 100) / 100
          : 0,
        averageRevenuePerTrip: stats.trips.completedTrips > 0
          ? Math.round((stats.trips.totalRevenue / stats.trips.completedTrips) * 100) / 100
          : 0,
      },
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
  validate(listCustomersQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = '',
      paying_org,
      is_login_enabled,
      archived,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query as CustomerListQuery & { archived?: string };

    logger.info('Fetching customers', {
      tenantId,
      page,
      limit,
      search,
      paying_org,
      archived,
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

    // Archived filter (default: show only non-archived)
    if (archived === 'true') {
      conditions.push('c.archived = true');
    } else if (archived === 'false' || archived === undefined) {
      conditions.push('c.archived = false');
    }
    // If archived === 'all', don't add any filter (show both)

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
 * @route GET /api/tenants/:tenantId/customers/export
 * @desc Export customers to CSV format
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/export',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { search, paying_org, is_login_enabled, archived } = req.query;

    logger.info('Exporting customers to CSV', { tenantId });

    // Build WHERE clause (same as list endpoint)
    const conditions: string[] = ['c.tenant_id = $1', 'c.is_active = true'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(`(
        c.name ILIKE $${paramCount} OR
        c.email ILIKE $${paramCount} OR
        c.phone ILIKE $${paramCount} OR
        c.address ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (paying_org) {
      conditions.push(`c.paying_org = $${paramCount}`);
      params.push(paying_org);
      paramCount++;
    }

    if (is_login_enabled !== undefined) {
      conditions.push(`c.is_login_enabled = $${paramCount}`);
      params.push(is_login_enabled);
      paramCount++;
    }

    if (archived === 'true') {
      conditions.push('c.archived = true');
    } else if (archived === 'false' || archived === undefined) {
      conditions.push('c.archived = false');
    }

    const whereClause = conditions.join(' AND ');

    // Get all customers (no pagination for export)
    const customers = await query<any>(
      `SELECT
        c.customer_id,
        c.name,
        c.address,
        c.address_line_2,
        c.city,
        c.county,
        c.postcode,
        c.phone,
        c.email,
        c.paying_org,
        c.is_login_enabled,
        c.reminder_opt_in,
        c.reminder_preference,
        c.emergency_contact_name,
        c.emergency_contact_phone,
        c.medical_notes,
        c.medication_notes,
        c.mobility_requirements,
        c.driver_notes,
        c.archived,
        c.created_at,
        c.updated_at
       FROM tenant_customers c
       WHERE ${whereClause}
       ORDER BY c.name ASC`,
      params
    );

    // Generate CSV
    const csvHeaders = [
      'ID',
      'Name',
      'Address',
      'Address Line 2',
      'City',
      'County',
      'Postcode',
      'Phone',
      'Email',
      'Paying Organization',
      'Portal Login Enabled',
      'Reminder Opt-in',
      'Reminder Preference',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Medical Notes',
      'Medication Notes',
      'Mobility Requirements',
      'Driver Notes',
      'Archived',
      'Created At',
      'Updated At',
    ];

    // Escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // If contains comma, newline, or quotes, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = customers.map((c) => [
      escapeCsvValue(c.customer_id),
      escapeCsvValue(c.name),
      escapeCsvValue(c.address),
      escapeCsvValue(c.address_line_2),
      escapeCsvValue(c.city),
      escapeCsvValue(c.county),
      escapeCsvValue(c.postcode),
      escapeCsvValue(c.phone),
      escapeCsvValue(c.email),
      escapeCsvValue(c.paying_org),
      escapeCsvValue(c.is_login_enabled ? 'Yes' : 'No'),
      escapeCsvValue(c.reminder_opt_in ? 'Yes' : 'No'),
      escapeCsvValue(c.reminder_preference),
      escapeCsvValue(c.emergency_contact_name),
      escapeCsvValue(c.emergency_contact_phone),
      escapeCsvValue(c.medical_notes),
      escapeCsvValue(c.medication_notes),
      escapeCsvValue(c.mobility_requirements),
      escapeCsvValue(c.driver_notes),
      escapeCsvValue(c.archived ? 'Yes' : 'No'),
      escapeCsvValue(c.created_at?.toISOString()),
      escapeCsvValue(c.updated_at?.toISOString()),
    ]);

    const csv = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    // Set headers for file download
    const filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

    logger.info('Customers exported successfully', {
      tenantId,
      count: customers.length,
    });
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
  validate(createCustomerSchema, 'body'),
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
  validateMultiple({
    params: customerIdParamSchema,
    body: updateCustomerSchema
  }),
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
 * @route POST /api/tenants/:tenantId/customers/bulk
 * @desc Create multiple customers at once (bulk import)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/bulk',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { customers } = req.body;

    logger.info('Bulk creating customers', { tenantId, count: customers?.length });

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new ValidationError('customers array is required and must not be empty');
    }

    if (customers.length > 500) {
      throw new ValidationError('Maximum 500 customers per bulk operation');
    }

    const results = {
      success: [] as any[],
      errors: [] as any[],
      summary: {
        total: customers.length,
        created: 0,
        failed: 0,
      },
    };

    // Process each customer
    for (let i = 0; i < customers.length; i++) {
      const customerData = customers[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!customerData.name || customerData.name.trim().length === 0) {
          throw new Error('Name is required');
        }

        // Sanitize inputs
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

        // Insert customer
        const result = await queryOne<{ id: number; name: string }>(
          `INSERT INTO tenant_customers (
            tenant_id, name, address, address_line_2, city, county, postcode,
            phone, email, paying_org,
            has_split_payment, provider_split, payment_split, schedule,
            emergency_contact_name, emergency_contact_phone,
            medical_notes, medication_notes, driver_notes, mobility_requirements,
            reminder_opt_in, reminder_preference,
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING customer_id as id, name`,
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

        results.success.push({
          row: rowNumber,
          customerId: result?.id,
          name: result?.name,
        });
        results.summary.created++;
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          name: customerData.name,
          error: error.message,
        });
        results.summary.failed++;
      }
    }

    logger.info('Bulk customer creation completed', {
      tenantId,
      created: results.summary.created,
      failed: results.summary.failed,
    });

    res.status(results.summary.failed > 0 ? 207 : 201).json(results);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/customers/bulk-update
 * @desc Update multiple customers at once
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/customers/bulk-update',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { updates } = req.body;

    logger.info('Bulk updating customers', { tenantId, count: updates?.length });

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationError('updates array is required and must not be empty');
    }

    if (updates.length > 500) {
      throw new ValidationError('Maximum 500 customers per bulk operation');
    }

    const results = {
      success: [] as any[],
      errors: [] as any[],
      summary: {
        total: updates.length,
        updated: 0,
        failed: 0,
      },
    };

    // Process each update
    for (let i = 0; i < updates.length; i++) {
      const updateData = updates[i];
      const rowNumber = i + 1;

      try {
        if (!updateData.customer_id) {
          throw new Error('customer_id is required');
        }

        // Check if customer exists
        const existing = await queryOne<{ customer_id: number }>(
          'SELECT customer_id FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
          [tenantId, updateData.customer_id]
        );

        if (!existing) {
          throw new Error('Customer not found');
        }

        // Build dynamic update query based on provided fields
        const updateFields: string[] = [];
        const params: any[] = [tenantId, updateData.customer_id];
        let paramIndex = 3;

        if (updateData.name !== undefined) {
          updateFields.push(`name = $${paramIndex++}`);
          params.push(sanitizeInput(updateData.name, { maxLength: 200 }));
        }
        if (updateData.phone !== undefined) {
          updateFields.push(`phone = $${paramIndex++}`);
          params.push(sanitizePhone(updateData.phone));
        }
        if (updateData.email !== undefined) {
          updateFields.push(`email = $${paramIndex++}`);
          params.push(sanitizeEmail(updateData.email));
        }
        if (updateData.address !== undefined) {
          updateFields.push(`address = $${paramIndex++}`);
          params.push(sanitizeInput(updateData.address, { maxLength: 500 }));
        }
        if (updateData.city !== undefined) {
          updateFields.push(`city = $${paramIndex++}`);
          params.push(sanitizeInput(updateData.city, { maxLength: 100 }));
        }
        if (updateData.postcode !== undefined) {
          updateFields.push(`postcode = $${paramIndex++}`);
          params.push(sanitizeInput(updateData.postcode, { maxLength: 20 }));
        }
        if (updateData.paying_org !== undefined) {
          updateFields.push(`paying_org = $${paramIndex++}`);
          params.push(sanitizeInput(updateData.paying_org, { maxLength: 200 }));
        }
        if (updateData.reminder_opt_in !== undefined) {
          updateFields.push(`reminder_opt_in = $${paramIndex++}`);
          params.push(updateData.reminder_opt_in);
        }
        if (updateData.reminder_preference !== undefined) {
          updateFields.push(`reminder_preference = $${paramIndex++}`);
          params.push(updateData.reminder_preference);
        }

        if (updateFields.length === 0) {
          throw new Error('No fields to update');
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        await query(
          `UPDATE tenant_customers SET ${updateFields.join(', ')} WHERE tenant_id = $1 AND customer_id = $2`,
          params
        );

        results.success.push({
          row: rowNumber,
          customerId: updateData.customer_id,
        });
        results.summary.updated++;
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          customerId: updateData.customer_id,
          error: error.message,
        });
        results.summary.failed++;
      }
    }

    logger.info('Bulk customer update completed', {
      tenantId,
      updated: results.summary.updated,
      failed: results.summary.failed,
    });

    res.status(results.summary.failed > 0 ? 207 : 200).json(results);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/bulk-archive
 * @desc Archive multiple customers at once
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/bulk-archive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { customer_ids } = req.body;

    logger.info('Bulk archiving customers', { tenantId, count: customer_ids?.length });

    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      throw new ValidationError('customer_ids array is required and must not be empty');
    }

    if (customer_ids.length > 500) {
      throw new ValidationError('Maximum 500 customers per bulk operation');
    }

    // Archive all customers in one query
    const result = await query(
      `UPDATE tenant_customers
       SET archived = TRUE,
           archived_at = CURRENT_TIMESTAMP,
           archived_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND customer_id = ANY($2::int[]) AND is_active = true
       RETURNING customer_id, name`,
      [tenantId, customer_ids, (req as any).user?.userId || null]
    );

    logger.info('Bulk archive completed', {
      tenantId,
      requested: customer_ids.length,
      archived: result.length,
    });

    res.json({
      message: `${result.length} customer(s) archived successfully`,
      archived: result.length,
      requested: customer_ids.length,
      customers: result.map((c: any) => ({ id: c.customer_id, name: c.name })),
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/customers/bulk-delete
 * @desc Soft delete multiple customers at once
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/customers/bulk-delete',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { customer_ids } = req.body;

    logger.info('Bulk deleting customers', { tenantId, count: customer_ids?.length });

    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      throw new ValidationError('customer_ids array is required and must not be empty');
    }

    if (customer_ids.length > 500) {
      throw new ValidationError('Maximum 500 customers per bulk operation');
    }

    // Soft delete all customers in one query
    const result = await query(
      `UPDATE tenant_customers
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND customer_id = ANY($2::int[]) AND is_active = true
       RETURNING customer_id, name`,
      [tenantId, customer_ids]
    );

    logger.info('Bulk delete completed', {
      tenantId,
      requested: customer_ids.length,
      deleted: result.length,
    });

    res.json({
      message: `${result.length} customer(s) deleted successfully`,
      deleted: result.length,
      requested: customer_ids.length,
      customers: result.map((c: any) => ({ id: c.customer_id, name: c.name })),
    });
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
 * @route PUT /api/tenants/:tenantId/customers/:customerId/archive
 * @desc Archive a customer (different from soft delete - for inactive customers you want to keep)
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/archive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Archiving customer', { tenantId, customerId });

    // Check if customer exists
    const existing = await queryOne<{ customer_id: number; name: string }>(
      'SELECT customer_id, name FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Archive customer
    await query(
      `UPDATE tenant_customers
       SET archived = TRUE,
           archived_at = CURRENT_TIMESTAMP,
           archived_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND customer_id = $2`,
      [tenantId, customerId, (req as any).user?.userId || null]
    );

    logger.info('Customer archived successfully', {
      tenantId,
      customerId,
      name: existing.name,
    });

    res.json({
      message: 'Customer archived successfully',
      customerId: existing.customer_id,
      customerName: existing.name,
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/customers/:customerId/unarchive
 * @desc Unarchive a customer
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/customers/:customerId/unarchive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, customerId } = req.params;

    logger.info('Unarchiving customer', { tenantId, customerId });

    // Check if customer exists (can be archived)
    const existing = await queryOne<{ customer_id: number; name: string }>(
      'SELECT customer_id, name FROM tenant_customers WHERE tenant_id = $1 AND customer_id = $2 AND is_active = true',
      [tenantId, customerId]
    );

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    // Unarchive customer
    await query(
      `UPDATE tenant_customers
       SET archived = FALSE,
           archived_at = NULL,
           archived_by = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND customer_id = $2`,
      [tenantId, customerId]
    );

    logger.info('Customer unarchived successfully', {
      tenantId,
      customerId,
      name: existing.name,
    });

    res.json({
      message: 'Customer unarchived successfully',
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
 * @route GET /api/tenants/:tenantId/customers/check-username/:username
 * @desc Check if username is available for customer portal
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/customers/check-username/:username',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, username } = req.params;
    const { exclude } = req.query; // Customer ID to exclude (for updates)

    logger.info('Checking username availability', { tenantId, username, exclude });

    let result;
    if (exclude) {
      // Check username availability excluding current customer's user
      result = await query(
        `SELECT u.user_id FROM tenant_users u
         WHERE u.username = $1 AND u.tenant_id = $2
         AND u.user_id NOT IN (
           SELECT user_id FROM tenant_customers
           WHERE customer_id = $3 AND tenant_id = $2 AND user_id IS NOT NULL
         )`,
        [username, tenantId, exclude]
      );
    } else {
      // Check username availability (new customer)
      result = await query(
        'SELECT user_id FROM tenant_users WHERE username = $1 AND tenant_id = $2',
        [username, tenantId]
      );
    }

    res.json({
      available: result.length === 0,
      username: username,
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
