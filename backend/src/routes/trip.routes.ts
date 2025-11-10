import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Trip Routes
 *
 * Complete trip/schedule management system
 * Database Table: tenant_trips
 */

/**
 * @route GET /api/tenants/:tenantId/trips/server-time
 * @desc Get current server date/time from PostgreSQL database
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/trips/server-time',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching server time', { tenantId });

    const result = await queryOne<{
      server_datetime: Date;
      server_date: string;
      server_time: string;
      formatted_date: string;
      formatted_time: string;
      day_name: string;
      day_of_week: number;
    }>(
      `SELECT
        NOW() as server_datetime,
        CURRENT_DATE as server_date,
        CURRENT_TIME as server_time,
        TO_CHAR(NOW(), 'YYYY-MM-DD') as formatted_date,
        TO_CHAR(NOW(), 'HH24:MI:SS') as formatted_time,
        TO_CHAR(NOW(), 'Day') as day_name,
        EXTRACT(DOW FROM NOW()) as day_of_week`
    );

    res.json({
      ...result,
      timezone: process.env.SYSTEM_TIMEZONE || 'UTC'
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/trips
 * @desc Get all trips with optional filtering
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/trips',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      tripType,
      driverId,
      customerId,
      status,
      startDate,
      endDate,
      limit = '100',
      offset = '0'
    } = req.query;

    logger.info('Fetching trips', { tenantId, filters: req.query });

    let queryText = `
      SELECT
        t.*,
        c.name as customer_name,
        c.phone as customer_phone,
        d.name as driver_name,
        v.registration as vehicle_registration
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1
    `;

    const queryParams: any[] = [tenantId];
    let paramCount = 1;

    if (tripType) {
      paramCount++;
      queryText += ` AND t.trip_type = $${paramCount}`;
      queryParams.push(tripType);
    }

    if (driverId) {
      paramCount++;
      queryText += ` AND t.driver_id = $${paramCount}`;
      queryParams.push(driverId);
    }

    if (customerId) {
      paramCount++;
      queryText += ` AND t.customer_id = $${paramCount}`;
      queryParams.push(customerId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND t.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (startDate) {
      paramCount++;
      queryText += ` AND t.trip_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND t.trip_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY t.trip_date DESC, t.pickup_time DESC`;

    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const trips = await query(queryText, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM tenant_trips t WHERE t.tenant_id = $1`;
    const countParams: any[] = [tenantId];
    let countParamIndex = 1;

    if (tripType) {
      countParamIndex++;
      countQuery += ` AND t.trip_type = $${countParamIndex}`;
      countParams.push(tripType);
    }

    if (driverId) {
      countParamIndex++;
      countQuery += ` AND t.driver_id = $${countParamIndex}`;
      countParams.push(driverId);
    }

    if (customerId) {
      countParamIndex++;
      countQuery += ` AND t.customer_id = $${countParamIndex}`;
      countParams.push(customerId);
    }

    if (status) {
      countParamIndex++;
      countQuery += ` AND t.status = $${countParamIndex}`;
      countParams.push(status);
    }

    if (startDate) {
      countParamIndex++;
      countQuery += ` AND t.trip_date >= $${countParamIndex}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countParamIndex++;
      countQuery += ` AND t.trip_date <= $${countParamIndex}`;
      countParams.push(endDate);
    }

    const countResult = await queryOne<{ total: string }>(countQuery, countParams);
    const total = parseInt(countResult?.total || '0', 10);

    res.json({
      trips,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/trips/today
 * @desc Get today's trips
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/trips/today',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching today\'s trips', { tenantId });

    const trips = await query(
      `SELECT
        t.*,
        c.name as customer_name,
        c.phone as customer_phone,
        d.name as driver_name,
        v.registration as vehicle_registration
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1 AND t.trip_date = CURRENT_DATE
      ORDER BY t.pickup_time ASC`,
      [tenantId]
    );

    res.json({ trips, date: new Date().toISOString().split('T')[0] });
  })
);

/**
 * @route GET /api/tenants/:tenantId/schedules/daily
 * @desc Get schedule for a specific date (for dashboard modal)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/schedules/daily',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw new ValidationError('Date parameter is required');
    }

    logger.info('Fetching daily schedule', { tenantId, date });

    const journeys = await query(
      `SELECT
        t.trip_id,
        t.trip_date,
        t.pickup_time,
        t.return_time,
        t.pickup_address,
        t.destination,
        t.notes,
        t.status,
        c.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.special_requirements,
        d.driver_id,
        d.name as driver_name,
        d.phone as driver_phone,
        v.vehicle_id,
        v.registration as vehicle_registration,
        v.make as vehicle_make,
        v.model as vehicle_model
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1 AND t.trip_date = $2
      ORDER BY t.pickup_time ASC`,
      [tenantId, date]
    );

    res.json({
      date,
      journeys,
      total: journeys.length,
      assigned: journeys.filter((j: any) => j.driver_id).length,
      unassigned: journeys.filter((j: any) => !j.driver_id).length
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/trips/:tripId
 * @desc Get a single trip by ID
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/trips/:tripId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tripId } = req.params;

    logger.info('Fetching trip', { tenantId, tripId });

    const trip = await queryOne(
      `SELECT
        t.*,
        c.name as customer_name,
        c.phone as customer_phone,
        d.name as driver_name,
        v.registration as vehicle_registration
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      WHERE t.tenant_id = $1 AND t.trip_id = $2`,
      [tenantId, tripId]
    );

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    res.json(trip);
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips
 * @desc Create a new trip
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      customer_id,
      driver_id,
      vehicle_id,
      trip_date,
      pickup_time,
      pickup_location,
      pickup_address,
      destination,
      destination_address,
      trip_type = 'adhoc',
      status = 'scheduled',
      urgent = false,
      price,
      notes,
      requires_wheelchair = false,
      requires_escort = false,
      passenger_count = 1
    } = req.body;

    logger.info('Creating trip', { tenantId, customer_id, trip_date });

    // Validate required fields
    if (!customer_id || !trip_date || !pickup_time || !destination) {
      throw new ValidationError('Missing required fields: customer_id, trip_date, pickup_time, destination');
    }

    // Get day of week from trip_date
    const dayOfWeekResult = await queryOne<{ day_name: string }>(
      `SELECT TO_CHAR($1::date, 'Day') as day_name`,
      [trip_date]
    );

    const newTrip = await queryOne(
      `INSERT INTO tenant_trips (
        tenant_id, customer_id, driver_id, vehicle_id, trip_date, day_of_week,
        pickup_time, pickup_location, pickup_address, destination, destination_address,
        trip_type, trip_source, status, urgent, price, notes,
        requires_wheelchair, requires_escort, passenger_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *`,
      [
        tenantId, customer_id, driver_id, vehicle_id, trip_date, dayOfWeekResult?.day_name?.trim(),
        pickup_time, pickup_location, pickup_address, destination, destination_address,
        trip_type, 'manual', status, urgent, price, notes,
        requires_wheelchair, requires_escort, passenger_count
      ]
    );

    logger.info('Trip created', { tripId: newTrip?.trip_id });

    res.status(201).json(newTrip);
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/bulk
 * @desc Create multiple trips in a transaction (for carpooling)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/bulk',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { trips } = req.body;

    logger.info('Creating bulk trips', { tenantId, count: trips?.length });

    // Validate input
    if (!trips || !Array.isArray(trips) || trips.length === 0) {
      throw new ValidationError('trips array is required and must not be empty');
    }

    // Import pg for transaction support
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const client = await pool.connect();
    const createdTrips: any[] = [];

    try {
      // Start transaction
      await client.query('BEGIN');

      // Create each trip within the transaction
      for (const tripData of trips) {
        const {
          customer_id,
          driver_id,
          vehicle_id,
          trip_date,
          pickup_time,
          pickup_location,
          pickup_address,
          destination,
          destination_address,
          trip_type = 'adhoc',
          status = 'scheduled',
          urgent = false,
          price,
          notes,
          requires_wheelchair = false,
          requires_escort = false,
          passenger_count = 1
        } = tripData;

        // Validate required fields
        if (!customer_id || !trip_date || !pickup_time || !destination) {
          throw new ValidationError('Missing required fields in trip data: customer_id, trip_date, pickup_time, destination');
        }

        // Get day of week from trip_date
        const dayOfWeekResult = await client.query(
          `SELECT TO_CHAR($1::date, 'Day') as day_name`,
          [trip_date]
        );

        const result = await client.query(
          `INSERT INTO tenant_trips (
            tenant_id, customer_id, driver_id, vehicle_id, trip_date, day_of_week,
            pickup_time, pickup_location, pickup_address, destination, destination_address,
            trip_type, trip_source, status, urgent, price, notes,
            requires_wheelchair, requires_escort, passenger_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          ) RETURNING *`,
          [
            tenantId, customer_id, driver_id, vehicle_id, trip_date, dayOfWeekResult.rows[0]?.day_name?.trim(),
            pickup_time, pickup_location, pickup_address, destination, destination_address,
            trip_type, 'manual', status, urgent, price, notes,
            requires_wheelchair, requires_escort, passenger_count
          ]
        );

        createdTrips.push(result.rows[0]);
      }

      // Commit transaction
      await client.query('COMMIT');

      logger.info('Bulk trips created successfully', { count: createdTrips.length });

      res.status(201).json({
        success: true,
        count: createdTrips.length,
        trips: createdTrips
      });
    } catch (error) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      logger.error('Bulk trip creation failed, rolled back transaction', { error });
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  })
);

/**
 * @route PUT /api/tenants/:tenantId/trips/:tripId
 * @desc Update a trip
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/trips/:tripId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tripId } = req.params;
    const updateData = req.body;

    logger.info('Updating trip', { tenantId, tripId });

    // Check if trip exists
    const existingTrip = await queryOne(
      'SELECT * FROM tenant_trips WHERE tenant_id = $1 AND trip_id = $2',
      [tenantId, tripId]
    );

    if (!existingTrip) {
      throw new NotFoundError('Trip not found');
    }

    // Build update query dynamically
    const allowedFields = [
      'customer_id', 'driver_id', 'vehicle_id', 'trip_date', 'pickup_time',
      'pickup_location', 'pickup_address', 'destination', 'destination_address',
      'status', 'urgent', 'price', 'notes', 'requires_wheelchair', 'requires_escort', 'passenger_count'
    ];

    const updates: string[] = [];
    const values: any[] = [tenantId, tripId];
    let paramCount = 2;

    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Update day_of_week if trip_date is being updated
    if (updateData.trip_date) {
      const dayOfWeekResult = await queryOne<{ day_name: string }>(
        `SELECT TO_CHAR($1::date, 'Day') as day_name`,
        [updateData.trip_date]
      );
      paramCount++;
      updates.push(`day_of_week = $${paramCount}`);
      values.push(dayOfWeekResult?.day_name?.trim());
    }

    updates.push('updated_at = NOW()');

    const updatedTrip = await queryOne(
      `UPDATE tenant_trips
       SET ${updates.join(', ')}
       WHERE tenant_id = $1 AND trip_id = $2
       RETURNING *`,
      values
    );

    logger.info('Trip updated', { tripId });

    res.json(updatedTrip);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/trips/:tripId
 * @desc Delete a trip
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/trips/:tripId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, tripId } = req.params;

    logger.info('Deleting trip', { tenantId, tripId });

    const result = await queryOne(
      'DELETE FROM tenant_trips WHERE tenant_id = $1 AND trip_id = $2 RETURNING trip_id',
      [tenantId, tripId]
    );

    if (!result) {
      throw new NotFoundError('Trip not found');
    }

    logger.info('Trip deleted', { tripId });

    res.json({ message: 'Trip deleted successfully', tripId });
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/auto-assign
 * @desc Auto-assign customers to their regular drivers for a date range
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/auto-assign',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.body;

    logger.info('Auto-assigning customers to regular drivers', { tenantId, startDate, endDate });

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required');
    }

    // Get all active customers with schedules
    const customers = await query<{
      customer_id: number;
      name: string;
      schedule: any;
      regular_driver_id: number | null;
      pickup_location: string | null;
      address: string | null;
      requires_wheelchair: boolean;
      requires_escort: boolean;
    }>(
      `SELECT
        customer_id,
        name,
        schedule,
        regular_driver_id,
        address as pickup_location,
        address,
        mobility_requirements->>'requiresWheelchair' as requires_wheelchair,
        mobility_requirements->>'requiresEscort' as requires_escort
       FROM tenant_customers
       WHERE tenant_id = $1 AND is_active = true AND schedule IS NOT NULL`,
      [tenantId]
    );

    logger.info('Found customers with schedules', { count: customers.length });

    // Get all drivers with their holidays
    const drivers = await query<{
      driver_id: number;
      name: string;
      holidays: any;
    }>(
      `SELECT driver_id, name, holidays
       FROM tenant_drivers
       WHERE tenant_id = $1 AND employment_status = 'active'`,
      [tenantId]
    );

    logger.info('Found active drivers', { count: drivers.length });

    // Generate array of dates in range
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    logger.info('Processing date range', { dates: dates.length });

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    let successCount = 0;
    const failures: Array<{
      customerId: number;
      customerName: string;
      day: string;
      reason: string;
    }> = [];

    // For each customer and each date, try to create trips
    for (const customer of customers) {
      if (!customer.schedule || !customer.regular_driver_id) {
        // Skip customers without schedules or regular drivers
        continue;
      }

      const schedule = customer.schedule;

      for (const dateStr of dates) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayName = dayNames[dayOfWeek];

        // Check if customer has schedule for this day
        const daySchedule = schedule[dayName];
        if (!daySchedule || !daySchedule.destination || daySchedule.destination.trim() === '') {
          continue; // No schedule for this day
        }

        // Check if trip already exists for this customer on this date
        const existingTrip = await queryOne(
          `SELECT trip_id FROM tenant_trips
           WHERE tenant_id = $1 AND customer_id = $2 AND trip_date = $3 AND trip_type = 'regular'`,
          [tenantId, customer.customer_id, dateStr]
        );

        if (existingTrip) {
          continue; // Trip already exists
        }

        // Check if driver is on holiday
        const driver = drivers.find(d => d.driver_id === customer.regular_driver_id);
        if (!driver) {
          failures.push({
            customerId: customer.customer_id,
            customerName: customer.name,
            day: dateStr,
            reason: 'Regular driver not found or inactive'
          });
          continue;
        }

        // Check driver holidays
        const driverHolidays = driver.holidays || [];
        const isOnHoliday = driverHolidays.some((holiday: any) => {
          const holidayStart = new Date(holiday.startDate);
          const holidayEnd = new Date(holiday.endDate);
          return date >= holidayStart && date <= holidayEnd;
        });

        if (isOnHoliday) {
          failures.push({
            customerId: customer.customer_id,
            customerName: customer.name,
            day: dateStr,
            reason: `Regular driver (${driver.name}) is on holiday`
          });
          continue;
        }

        // Create trips for morning and afternoon if scheduled
        const times = [];
        if (daySchedule.morningTime) {
          times.push({ time: daySchedule.morningTime, period: 'morning' });
        }
        if (daySchedule.afternoonTime) {
          times.push({ time: daySchedule.afternoonTime, period: 'afternoon' });
        }

        // If no specific times, create single trip with default time
        if (times.length === 0 && daySchedule.destination) {
          times.push({ time: '09:00', period: 'morning' });
        }

        for (const { time, period } of times) {
          try {
            // Get day of week name for database
            const dayOfWeekResult = await queryOne<{ day_name: string }>(
              `SELECT TO_CHAR($1::date, 'Day') as day_name`,
              [dateStr]
            );

            const newTrip = await queryOne(
              `INSERT INTO tenant_trips (
                tenant_id, customer_id, driver_id, trip_date, day_of_week,
                pickup_time, pickup_location, pickup_address, destination, destination_address,
                trip_type, trip_source, status, urgent, price,
                requires_wheelchair, requires_escort, passenger_count
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
              ) RETURNING trip_id`,
              [
                tenantId,
                customer.customer_id,
                customer.regular_driver_id,
                dateStr,
                dayOfWeekResult?.day_name?.trim(),
                time,
                customer.pickup_location,
                customer.address,
                daySchedule.destination,
                daySchedule.destination, // Using destination as address for now
                'regular',
                'auto_assigned',
                'scheduled',
                false, // not urgent
                daySchedule.dailyPrice || daySchedule.price || 0,
                customer.requires_wheelchair || false,
                customer.requires_escort || false,
                1
              ]
            );

            if (newTrip) {
              successCount++;
              logger.debug('Trip created', {
                tripId: newTrip.trip_id,
                customer: customer.name,
                date: dateStr,
                period
              });
            }
          } catch (error) {
            logger.error('Failed to create trip', {
              error,
              customer: customer.name,
              date: dateStr
            });
            failures.push({
              customerId: customer.customer_id,
              customerName: customer.name,
              day: dateStr,
              reason: 'Database error creating trip'
            });
          }
        }
      }
    }

    logger.info('Auto-assignment completed', {
      successCount,
      failureCount: failures.length
    });

    res.json({
      successful: successCount,
      failed: failures
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/recommend-passengers
 * @desc Get passenger recommendations for carpooling based on route optimization
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/recommend-passengers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      driverId,
      driverLocation,
      destination,
      pickupTime,
      tripDate,
      includeGoogleMaps // Optional: use Google Maps for precise calculations (will check tenant settings)
    } = req.body;

    // Get tenant's route optimization settings
    const tenantSettings = await queryOne<{ route_optimization: any }>(
      "SELECT settings->'routeOptimization' as route_optimization FROM tenants WHERE tenant_id = $1",
      [tenantId]
    );

    const routeOptSettings = tenantSettings?.route_optimization || {
      enabled: true,
      useGoogleMaps: false,
      maxDetourMinutes: 15,
      maxDetourMiles: 5
    };

    // Use tenant setting if includeGoogleMaps not explicitly provided
    const shouldUseGoogleMaps = includeGoogleMaps !== undefined
      ? includeGoogleMaps
      : (routeOptSettings.useGoogleMaps || false);

    logger.info('Fetching passenger recommendations', {
      tenantId,
      driverId,
      destination,
      tripDate
    });

    // Import route optimization service
    const { routeOptimizationService } = require('../services/routeOptimization.service');

    // Validate required fields
    if (!destination || !pickupTime || !tripDate) {
      throw new ValidationError('Missing required fields: destination, pickupTime, tripDate');
    }

    // Get driver info with address
    let driverInfo = null;
    if (driverId) {
      driverInfo = await queryOne<{
        driver_id: number;
        name: string;
        address: string;
        postcode: string;
      }>(
        `SELECT driver_id, name, address, postcode
         FROM tenant_drivers
         WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driverId]
      );
    }

    // Get all customers who:
    // 1. Have a schedule for this day of week
    // 2. Are active
    // 3. Don't already have a trip assigned for this date
    const dayOfWeekResult = await queryOne<{ day_name: string; day_index: number }>(
      `SELECT
        TO_CHAR($1::date, 'Day') as day_name,
        EXTRACT(DOW FROM $1::date) as day_index`,
      [tripDate]
    );

    const dayName = dayOfWeekResult?.day_name?.trim().toLowerCase();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[Math.floor(dayOfWeekResult?.day_index || 0)];

    logger.info('Looking for customers on', { dayName, dayKey, tripDate });

    // Get all active customers with schedules
    const potentialPassengers = await query<{
      customer_id: number;
      name: string;
      address: string;
      postcode: string;
      phone: string;
      schedule: any;
      regular_driver_id: number | null;
      requires_wheelchair: boolean;
      requires_escort: boolean;
    }>(
      `SELECT
        customer_id,
        name,
        address,
        postcode,
        phone,
        schedule,
        regular_driver_id,
        mobility_requirements->>'requiresWheelchair' as requires_wheelchair,
        mobility_requirements->>'requiresEscort' as requires_escort
       FROM tenant_customers
       WHERE tenant_id = $1
         AND is_active = true
         AND schedule IS NOT NULL`,
      [tenantId]
    );

    logger.info('Found potential passengers', { count: potentialPassengers.length });

    // Filter customers who have schedule for this day
    const customersWithSchedule = potentialPassengers.filter(customer => {
      if (!customer.schedule) return false;
      const daySchedule = customer.schedule[dayKey];
      return daySchedule && daySchedule.destination && daySchedule.destination.trim() !== '';
    });

    logger.info('Customers with schedule for this day', { count: customersWithSchedule.length });

    // Get existing trips for this date to exclude already assigned customers
    const existingTrips = await query<{ customer_id: number }>(
      `SELECT DISTINCT customer_id
       FROM tenant_trips
       WHERE tenant_id = $1 AND trip_date = $2`,
      [tenantId, tripDate]
    );

    const assignedCustomerIds = new Set(existingTrips.map(t => t.customer_id));

    // Filter out already assigned customers
    const unassignedCustomers = customersWithSchedule.filter(
      c => !assignedCustomerIds.has(c.customer_id)
    );

    logger.info('Unassigned customers', { count: unassignedCustomers.length });

    // Calculate compatibility scores for each unassigned customer
    const recommendations: Array<{
      customerId: number;
      customerName: string;
      phone: string;
      address: string;
      postcode: string;
      destination: string;
      pickupTime: string;
      score: number;
      reasoning: string[];
      distanceFromDriver?: number;
      sharedDestination: boolean;
      detourMinutes?: number;
      requiresWheelchair: boolean;
      requiresEscort: boolean;
      isRegularDriver: boolean;
    }> = [];

    for (const customer of unassignedCustomers) {
      const daySchedule = customer.schedule[dayKey];
      if (!daySchedule) continue;

      const customerDestination = daySchedule.destination || '';
      const customerPickupTime = daySchedule.morningTime || daySchedule.afternoonTime || '09:00';

      // Calculate postcode proximity
      const postcodeProximity = routeOptimizationService.estimatePostcodeProximity(
        driverLocation?.postcode || driverInfo?.postcode,
        customer.postcode
      );

      // Check if destinations are similar
      const sharedDestination = routeOptimizationService.destinationsSimilar(
        destination,
        customerDestination
      );

      // Optionally calculate precise route optimization using Google Maps
      let routeOptimization = null;
      if (shouldUseGoogleMaps && driverLocation && customer.address) {
        try {
          routeOptimization = await routeOptimizationService.calculateRouteWithWaypoint(
            { address: driverLocation.address || driverInfo?.address || '', postcode: driverLocation.postcode },
            { address: customer.address, postcode: customer.postcode },
            { address: destination }
          );
        } catch (error) {
          logger.error('Google Maps route optimization failed', { error, customerId: customer.customer_id });
        }
      }

      // Calculate compatibility score
      const { score, reasoning } = routeOptimizationService.calculateCompatibilityScore({
        driverLocation: { address: driverLocation?.address || driverInfo?.address || '', postcode: driverLocation?.postcode },
        passengerLocation: { address: customer.address, postcode: customer.postcode },
        driverDestination: destination,
        passengerDestination: customerDestination,
        driverPickupTime: pickupTime,
        passengerPickupTime: customerPickupTime,
        routeOptimization: routeOptimization || undefined,
        postcodeProximity
      });

      // Only include if score is reasonable (> 20)
      if (score > 20) {
        recommendations.push({
          customerId: customer.customer_id,
          customerName: customer.name,
          phone: customer.phone,
          address: customer.address,
          postcode: customer.postcode || '',
          destination: customerDestination,
          pickupTime: customerPickupTime,
          score,
          reasoning,
          sharedDestination,
          detourMinutes: routeOptimization ? Math.round(routeOptimization.detourDuration / 60) : undefined,
          requiresWheelchair: customer.requires_wheelchair || false,
          requiresEscort: customer.requires_escort || false,
          isRegularDriver: customer.regular_driver_id === driverId
        });
      }
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Return top 10 recommendations
    const topRecommendations = recommendations.slice(0, 10);

    logger.info('Generated recommendations', {
      total: recommendations.length,
      returned: topRecommendations.length
    });

    res.json({
      recommendations: topRecommendations,
      totalCandidates: unassignedCustomers.length,
      metadata: {
        tripDate,
        destination,
        pickupTime,
        dayOfWeek: dayName,
        usedGoogleMaps: shouldUseGoogleMaps,
        googleMapsEnabled: routeOptSettings.useGoogleMaps,
        maxDetourMinutes: routeOptSettings.maxDetourMinutes,
        maxDetourMiles: routeOptSettings.maxDetourMiles
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/generate-from-schedules
 * @desc Generate trip records from customer recurring schedules
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/generate-from-schedules',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate, overwrite = false } = req.body;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    logger.info('Generating trips from customer schedules', { tenantId, startDate, endDate, overwrite });

    // Get all active customers with schedules
    const customers = await query(
      `SELECT
        customer_id,
        name,
        schedule,
        pickup_address,
        mobility_requirements,
        special_requirements
      FROM tenant_customers
      WHERE tenant_id = $1
        AND is_active = true
        AND schedule IS NOT NULL`,
      [tenantId]
    );

    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const generated: any[] = [];
    const skipped: any[] = [];
    const conflicts: any[] = [];

    // If overwrite, delete existing trips in date range
    if (overwrite) {
      await query(
        `DELETE FROM tenant_trips
         WHERE tenant_id = $1
           AND trip_date >= $2
           AND trip_date <= $3
           AND trip_type = 'regular'`,
        [tenantId, startDate, endDate]
      );
    }

    // Iterate through each date in range
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const dayName = dayNames[dayOfWeek];

      // For each customer, check if they have a schedule for this day
      for (const customer of customers) {
        const schedule = customer.schedule || {};
        const daySchedule = schedule[dayName];

        if (daySchedule && daySchedule.destination) {
          // Check if trip already exists
          const existing = await queryOne(
            `SELECT trip_id FROM tenant_trips
             WHERE tenant_id = $1
               AND customer_id = $2
               AND trip_date = $3`,
            [tenantId, customer.customer_id, dateStr]
          );

          if (existing && !overwrite) {
            skipped.push({
              customer: customer.name,
              date: dateStr,
              reason: 'Trip already exists'
            });
            continue;
          }

          // Create trip
          try {
            await queryOne(
              `INSERT INTO tenant_trips (
                tenant_id,
                customer_id,
                driver_id,
                trip_date,
                pickup_time,
                return_time,
                pickup_address,
                destination,
                notes,
                status,
                trip_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *`,
              [
                tenantId,
                customer.customer_id,
                daySchedule.driverId || null,
                dateStr,
                daySchedule.pickupTime || '09:00',
                daySchedule.returnTime || null,
                customer.pickup_address || daySchedule.pickupAddress || null,
                daySchedule.destination,
                daySchedule.notes || customer.special_requirements || null,
                'scheduled',
                'regular'
              ]
            );

            generated.push({
              customer: customer.name,
              date: dateStr,
              time: daySchedule.pickupTime,
              destination: daySchedule.destination
            });
          } catch (err: any) {
            conflicts.push({
              customer: customer.name,
              date: dateStr,
              reason: err.message
            });
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      generated: generated.length,
      skipped: skipped.length,
      conflicts: conflicts.length,
      details: {
        generated,
        skipped,
        conflicts
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/check-conflicts
 * @desc Check for scheduling conflicts before creating/updating a trip
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/check-conflicts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { tripId, driverId, customerId, tripDate, pickupTime, returnTime } = req.body;

    logger.info('Checking trip conflicts', { tenantId, tripDate, driverId, customerId });

    const conflicts: any[] = [];

    // 1. Check driver time conflicts
    if (driverId && pickupTime) {
      const driverConflicts = await query(
        `SELECT
          t.trip_id,
          t.pickup_time,
          t.return_time,
          c.name as customer_name
        FROM tenant_trips t
        JOIN tenant_customers c ON t.customer_id = c.customer_id
        WHERE t.tenant_id = $1
          AND t.driver_id = $2
          AND t.trip_date = $3
          AND t.trip_id != $4
          AND t.status != 'cancelled'
          AND (
            (t.pickup_time <= $5 AND (t.return_time IS NULL OR t.return_time > $5))
            OR (t.pickup_time < $6 AND (t.return_time IS NULL OR t.return_time >= $6))
            OR (t.pickup_time >= $5 AND t.pickup_time < $6)
          )`,
        [tenantId, driverId, tripDate, tripId || -1, pickupTime, returnTime || '23:59']
      );

      if (driverConflicts.length > 0) {
        conflicts.push({
          type: 'driver_overlap',
          severity: 'critical',
          message: `Driver has ${driverConflicts.length} overlapping trip(s) at this time`,
          details: driverConflicts
        });
      }
    }

    // 2. Check if driver is on leave
    if (driverId && tripDate) {
      const driverLeave = await queryOne(
        `SELECT request_id, start_date, end_date, reason
        FROM holiday_requests
        WHERE tenant_id = $1
          AND entity_type = 'driver'
          AND entity_id = $2
          AND status = 'approved'
          AND $3 BETWEEN start_date AND end_date`,
        [tenantId, driverId, tripDate]
      );

      if (driverLeave) {
        conflicts.push({
          type: 'driver_on_leave',
          severity: 'critical',
          message: `Driver is on approved leave from ${driverLeave.start_date} to ${driverLeave.end_date}`,
          details: driverLeave
        });
      }
    }

    // 3. Check vehicle availability (if driver has assigned vehicle)
    if (driverId) {
      const driverVehicle = await queryOne(
        `SELECT v.vehicle_id, v.registration, v.mot_date, v.is_active
        FROM tenant_drivers d
        JOIN tenant_vehicles v ON d.vehicle_id = v.vehicle_id
        WHERE d.tenant_id = $1 AND d.driver_id = $2`,
        [tenantId, driverId]
      );

      if (driverVehicle) {
        // Check MOT expiry
        if (driverVehicle.mot_date && driverVehicle.mot_date < tripDate) {
          conflicts.push({
            type: 'expired_mot',
            severity: 'critical',
            message: `Driver's vehicle (${driverVehicle.registration}) has expired MOT`,
            details: driverVehicle
          });
        }

        // Check if vehicle is active
        if (!driverVehicle.is_active) {
          conflicts.push({
            type: 'inactive_vehicle',
            severity: 'warning',
            message: `Driver's vehicle (${driverVehicle.registration}) is marked as inactive`,
            details: driverVehicle
          });
        }
      } else {
        conflicts.push({
          type: 'no_vehicle',
          severity: 'warning',
          message: 'Driver has no vehicle assigned',
          details: null
        });
      }
    }

    // 4. Check customer overlapping trips
    if (customerId && pickupTime) {
      const customerConflicts = await query(
        `SELECT trip_id, pickup_time, return_time, destination
        FROM tenant_trips
        WHERE tenant_id = $1
          AND customer_id = $2
          AND trip_date = $3
          AND trip_id != $4
          AND status != 'cancelled'
          AND (
            (pickup_time <= $5 AND (return_time IS NULL OR return_time > $5))
            OR (pickup_time < $6 AND (return_time IS NULL OR return_time >= $6))
            OR (pickup_time >= $5 AND pickup_time < $6)
          )`,
        [tenantId, customerId, tripDate, tripId || -1, pickupTime, returnTime || '23:59']
      );

      if (customerConflicts.length > 0) {
        conflicts.push({
          type: 'customer_overlap',
          severity: 'critical',
          message: `Customer has ${customerConflicts.length} overlapping trip(s)`,
          details: customerConflicts
        });
      }
    }

    // 5. Check if customer is on holiday
    if (customerId && tripDate) {
      const customerHoliday = await queryOne(
        `SELECT request_id, start_date, end_date, notes
        FROM holiday_requests
        WHERE tenant_id = $1
          AND entity_type = 'customer'
          AND entity_id = $2
          AND status = 'approved'
          AND $3 BETWEEN start_date AND end_date`,
        [tenantId, customerId, tripDate]
      );

      if (customerHoliday) {
        conflicts.push({
          type: 'customer_on_holiday',
          severity: 'warning',
          message: `Customer is on holiday from ${customerHoliday.start_date} to ${customerHoliday.end_date}`,
          details: customerHoliday
        });
      }
    }

    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      criticalCount: conflicts.filter(c => c.severity === 'critical').length,
      warningCount: conflicts.filter(c => c.severity === 'warning').length
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/trips/copy-week
 * @desc Copy all trips from one week to another
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/trips/copy-week',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { sourceStartDate, targetStartDate, includeCancelled = false } = req.body;

    if (!sourceStartDate || !targetStartDate) {
      throw new ValidationError('Source and target start dates are required');
    }

    logger.info('Copying week trips', { tenantId, sourceStartDate, targetStartDate });

    // Calculate date ranges (7 days)
    const sourceEnd = new Date(sourceStartDate);
    sourceEnd.setDate(sourceEnd.getDate() + 6);
    const sourceEndDate = sourceEnd.toISOString().split('T')[0];

    const targetEnd = new Date(targetStartDate);
    targetEnd.setDate(targetEnd.getDate() + 6);
    const targetEndDate = targetEnd.toISOString().split('T')[0];

    // Get all trips from source week
    const sourceTrips = await query(
      `SELECT * FROM tenant_trips
       WHERE tenant_id = $1
         AND trip_date >= $2
         AND trip_date <= $3
         ${!includeCancelled ? "AND status != 'cancelled'" : ''}
       ORDER BY trip_date, pickup_time`,
      [tenantId, sourceStartDate, sourceEndDate]
    );

    const created: any[] = [];
    const errors: any[] = [];

    // Calculate day difference
    const daysDiff = Math.floor(
      (new Date(targetStartDate).getTime() - new Date(sourceStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const trip of sourceTrips) {
      try {
        // Calculate new date
        const oldDate = new Date(trip.trip_date);
        const newDate = new Date(oldDate);
        newDate.setDate(newDate.getDate() + daysDiff);
        const newDateStr = newDate.toISOString().split('T')[0];

        // Check if trip already exists on target date
        const existing = await queryOne(
          `SELECT trip_id FROM tenant_trips
           WHERE tenant_id = $1
             AND customer_id = $2
             AND trip_date = $3
             AND pickup_time = $4`,
          [tenantId, trip.customer_id, newDateStr, trip.pickup_time]
        );

        if (existing) {
          errors.push({
            original: trip,
            targetDate: newDateStr,
            reason: 'Trip already exists on target date'
          });
          continue;
        }

        // Create new trip
        const newTrip = await queryOne(
          `INSERT INTO tenant_trips (
            tenant_id, customer_id, driver_id, vehicle_id,
            trip_date, pickup_time, return_time,
            pickup_address, destination, notes,
            status, trip_type, distance_miles, estimated_duration_mins
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            tenantId,
            trip.customer_id,
            trip.driver_id,
            trip.vehicle_id,
            newDateStr,
            trip.pickup_time,
            trip.return_time,
            trip.pickup_address,
            trip.destination,
            trip.notes,
            'scheduled', // Reset to scheduled
            trip.trip_type,
            trip.distance_miles,
            trip.estimated_duration_mins
          ]
        );

        created.push(newTrip);
      } catch (err: any) {
        errors.push({
          original: trip,
          reason: err.message
        });
      }
    }

    res.json({
      success: true,
      copied: created.length,
      errors: errors.length,
      sourceWeek: { start: sourceStartDate, end: sourceEndDate },
      targetWeek: { start: targetStartDate, end: targetEndDate },
      details: {
        created,
        errors
      }
    });
  })
);

export default router;
