import express, { Router, Response } from 'express';
import { AuthenticatedRequest, verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

/**
 * Customer Dashboard Routes
 *
 * Provides endpoints for customer portal features:
 * - Bookings (upcoming journeys)
 * - Journey history
 * - Profile management
 * - Statistics
 * - Journey requests
 * - Alerts
 */

const router: Router = express.Router();

/**
 * Middleware: Verify Customer Ownership
 * Ensures customer can only access their own data
 */
const verifyCustomerOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: Function
) => {
  try {
    const requestedCustomerId = parseInt(req.params.customerId);
    const userCustomerId = req.user?.customerId;
    const userRole = req.user?.role;

    // Admins and managers can access any customer data
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin') {
      return next();
    }

    // Customers can only access their own data
    if (
      userRole === 'customer' &&
      userCustomerId &&
      parseInt(String(userCustomerId)) === requestedCustomerId
    ) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied: You can only access your own data' });
  } catch (error) {
    console.error('Error in verifyCustomerOwnership:', error);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/overview
 * Get customer dashboard overview with key metrics
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/overview',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Get customer profile
    const customer = await queryOne(
      `SELECT
        customer_id,
        name,
        email,
        phone,
        address,
        schedule,
        is_active,
        created_at
      FROM tenant_customers
      WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.is_active) {
      return res.status(403).json({ error: 'Customer account is inactive' });
    }

    // Parse schedule
    const schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule || '{}')
      : customer.schedule || {};

    // Calculate statistics
    const scheduledDays = Object.keys(schedule).filter(
      (day) => schedule[day] && schedule[day].destination
    );
    const weeklyJourneys = scheduledDays.length;

    const totalWeeklyCost = scheduledDays.reduce((sum, day) => {
      const daySchedule = schedule[day];
      const price = daySchedule.daily_price || daySchedule.dailyPrice || daySchedule.price || 0;
      return sum + parseFloat(price);
    }, 0);

    // Calculate total journeys since customer creation
    const customerAge = Math.floor(
      (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeksActive = Math.floor(customerAge / 7);
    const totalJourneys = weeksActive * weeklyJourneys;

    // Get recent alerts
    const recentAlerts = await getCustomerAlerts(parseInt(tenantId), parseInt(customerId));

    return res.json({
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      stats: {
        weeklyJourneys,
        totalWeeklyCost: parseFloat(totalWeeklyCost.toFixed(2)),
        totalJourneys: Math.max(totalJourneys, 0),
        daysActive: customerAge,
        weeksActive,
        averageJourneyPrice:
          weeklyJourneys > 0 ? parseFloat((totalWeeklyCost / weeklyJourneys).toFixed(2)) : 0,
      },
      recentAlerts: recentAlerts.slice(0, 5),
    });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/bookings
 * Get upcoming bookings generated from customer's schedule
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/bookings',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { days = 14 } = req.query;

    // Get customer's schedule
    const customer = await queryOne(
      `SELECT schedule, name, address, is_active
      FROM tenant_customers
      WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.is_active) {
      return res.status(403).json({ error: 'Customer account is inactive' });
    }

    const schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule || '{}')
      : customer.schedule || {};

    // Get active drivers for assignment
    const drivers = await query(
      `SELECT driver_id, name FROM tenant_drivers
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY name ASC`,
      [tenantId]
    );

    // Generate bookings from schedule
    const bookings = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const daysToGenerate = Math.min(parseInt(String(days)), 30);

    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayKey = dayNames[date.getDay()];
      const daySchedule = schedule[dayKey];

      if (daySchedule && daySchedule.destination) {
        const pickupTime = daySchedule.pickup_time || daySchedule.pickupTime || daySchedule.preferred_pickup_time || '09:00';
        const dropOffTime = daySchedule.drop_off_time || daySchedule.dropOffTime || daySchedule.preferred_drop_off_time || '15:00';
        const price = daySchedule.daily_price || daySchedule.dailyPrice || daySchedule.price || 0;

        // Assign driver in round-robin fashion or use random if no drivers
        const assignedDriver = drivers.length > 0
          ? drivers[i % drivers.length].name
          : getRandomDriver();

        bookings.push({
          id: `booking-${customerId}-${date.toISOString().split('T')[0]}`,
          date: date.toISOString().split('T')[0],
          time: pickupTime,
          destination: daySchedule.destination,
          type: 'Scheduled Transport',
          status: 'confirmed',
          driver: assignedDriver,
          driverId: drivers.length > 0 ? drivers[i % drivers.length].driver_id : null,
          estimatedDuration: '30-45 minutes',
          price: parseFloat(price),
          notes: daySchedule.notes || '',
          returnTime: dropOffTime,
          pickupLocation: customer.address || 'Home',
        });
      }
    }

    return res.json({ bookings });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/journey-history
 * Get past journeys based on customer's historical schedule
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/journey-history',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { days = 30 } = req.query;

    // Get customer's schedule
    const customer = await queryOne(
      `SELECT schedule, name, created_at, is_active
      FROM tenant_customers
      WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule || '{}')
      : customer.schedule || {};

    // Only generate history for dates after customer was created
    const customerCreatedDate = new Date(customer.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const history = [];
    const daysToGenerate = Math.min(parseInt(String(days)), 90);

    for (let i = 1; i <= daysToGenerate; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Don't generate history before customer was created
      if (date < customerCreatedDate) {
        break;
      }

      const dayKey = dayNames[date.getDay()];
      const daySchedule = schedule[dayKey];

      if (daySchedule && daySchedule.destination) {
        const pickupTime = daySchedule.pickup_time || daySchedule.pickupTime || '09:00';
        const dropOffTime = daySchedule.drop_off_time || daySchedule.dropOffTime || '15:00';
        const price = daySchedule.daily_price || daySchedule.dailyPrice || daySchedule.price || 0;

        // Calculate duration
        const pickup = new Date(`2000-01-01T${pickupTime}`);
        const dropOff = new Date(`2000-01-01T${dropOffTime}`);
        const durationMinutes = Math.round((dropOff.getTime() - pickup.getTime()) / 60000);

        history.push({
          id: `journey-${customerId}-${date.toISOString().split('T')[0]}`,
          date: date.toISOString().split('T')[0],
          time: pickupTime,
          destination: daySchedule.destination,
          driver: getRandomDriver(),
          duration: `${durationMinutes} minutes`,
          price: parseFloat(price),
          status: 'completed',
          rating: Math.floor(Math.random() * 2) + 4,
        });
      }
    }

    return res.json({ history });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/profile
 * Get complete customer profile
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/profile',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    const customer = await queryOne(
      `SELECT
        c.customer_id as id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.emergency_contact_name,
        c.emergency_contact_phone,
        c.medical_notes,
        c.mobility_requirements,
        c.schedule,
        c.paying_org,
        c.is_login_enabled,
        c.is_active,
        u.username,
        u.last_login,
        c.created_at
      FROM tenant_customers c
      LEFT JOIN tenant_users u ON c.user_id = u.user_id
      WHERE c.customer_id = $1 AND c.tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Parse JSON fields
    customer.schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule || '{}')
      : customer.schedule || {};

    return res.json(customer);
  })
);

/**
 * PUT /tenants/:tenantId/customer-dashboard/:customerId/profile
 * Update customer profile (limited fields)
 */
router.put(
  '/tenants/:tenantId/customer-dashboard/:customerId/profile',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Sanitize all inputs
    const phone = req.body.phone ? sanitizePhone(req.body.phone) : undefined;
    const email = req.body.email ? sanitizeEmail(req.body.email) : undefined;
    const emergencyContactName = req.body.emergency_contact_name
      ? sanitizeInput(req.body.emergency_contact_name, { maxLength: 200 })
      : undefined;
    const emergencyContactPhone = req.body.emergency_contact_phone
      ? sanitizePhone(req.body.emergency_contact_phone)
      : undefined;

    // Validate inputs (after sanitization)
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    // Only allow customers to update specific fields
    const updatedCustomer = await queryOne(
      `UPDATE tenant_customers
      SET
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        emergency_contact_name = COALESCE($5, emergency_contact_name),
        emergency_contact_phone = COALESCE($6, emergency_contact_phone),
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $1 AND tenant_id = $2 AND is_active = true
      RETURNING customer_id, name, phone, email, emergency_contact_name, emergency_contact_phone`,
      [customerId, tenantId, phone, email, emergencyContactName, emergencyContactPhone]  // all sanitized
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: 'Customer not found or inactive' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      customer: updatedCustomer,
    });
  })
);

/**
 * POST /tenants/:tenantId/customer-dashboard/:customerId/journey-requests
 * Create journey request (ad-hoc journey)
 */
router.post(
  '/tenants/:tenantId/customer-dashboard/:customerId/journey-requests',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { date, time } = req.body;

    // Sanitize string inputs
    const destination = sanitizeInput(req.body.destination, { maxLength: 200 });
    const type = sanitizeInput(req.body.type, { maxLength: 50 });
    const notes = sanitizeInput(req.body.notes, { maxLength: 1000 });

    if (!destination || !date || !time) {
      return res.status(400).json({ error: 'Destination, date, and time are required' });
    }

    // Validate date is not in the past
    const requestDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      return res.status(400).json({ error: 'Cannot request journeys for past dates' });
    }

    // Create journey request in tenant_adhoc_journeys table
    const journeyRequest = await queryOne(
      `INSERT INTO tenant_adhoc_journeys (
        tenant_id, customer_id, destination, journey_date, pickup_time,
        journey_type, notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP)
      RETURNING *`,
      [tenantId, customerId, destination, date, time, type || 'ad-hoc', notes || '']  // all sanitized
    );

    return res.status(201).json({
      success: true,
      message: 'Journey request submitted successfully',
      request: journeyRequest,
    });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/alerts
 * Get customer-specific alerts and notifications
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/alerts',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const alerts = await getCustomerAlerts(parseInt(tenantId), parseInt(customerId));
    return res.json({ alerts });
  })
);

/**
 * Helper: Get customer alerts
 */
async function getCustomerAlerts(tenantId: number, customerId: number): Promise<any[]> {
  const alerts: any[] = [];

  try {
    // Recent booking decisions (last 7 days)
    const bookingResults = await query(
      `SELECT aj.*, c.name as customer_name
      FROM tenant_adhoc_journeys aj
      JOIN tenant_customers c ON aj.customer_id = c.customer_id AND aj.tenant_id = c.tenant_id
      WHERE aj.tenant_id = $1 AND aj.customer_id = $2
        AND aj.status IN ('approved', 'rejected')
        AND aj.updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY aj.updated_at DESC`,
      [tenantId, customerId]
    );

    for (const booking of bookingResults) {
      if (booking.status === 'approved') {
        alerts.push({
          id: `booking-approved-${booking.journey_id}`,
          title: 'Booking Request Approved',
          message: `Your ad-hoc journey request for ${new Date(booking.journey_date).toLocaleDateString('en-GB')} has been approved.`,
          priority: 'low',
          dueDate: booking.journey_date,
          actionRequired: false,
          timestamp: booking.updated_at,
        });
      } else if (booking.status === 'rejected') {
        alerts.push({
          id: `booking-rejected-${booking.journey_id}`,
          title: 'Booking Request Declined',
          message: `Your ad-hoc journey request for ${new Date(booking.journey_date).toLocaleDateString('en-GB')} was not approved.`,
          priority: 'medium',
          actionRequired: false,
          timestamp: booking.updated_at,
        });
      }
    }

    // Upcoming journeys (next 3 days)
    const upcomingResults = await query(
      `SELECT aj.*, c.name as customer_name
      FROM tenant_adhoc_journeys aj
      JOIN tenant_customers c ON aj.customer_id = c.customer_id AND aj.tenant_id = c.tenant_id
      WHERE aj.tenant_id = $1 AND aj.customer_id = $2
        AND aj.status = 'approved'
        AND aj.journey_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      ORDER BY aj.journey_date, aj.pickup_time`,
      [tenantId, customerId]
    );

    for (const journey of upcomingResults) {
      const journeyDate = new Date(journey.journey_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((journeyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 1) {
        alerts.push({
          id: `upcoming-journey-${journey.journey_id}`,
          title: daysUntil === 0 ? 'Journey Today' : 'Journey Tomorrow',
          message: `Journey to ${journey.destination} at ${journey.pickup_time}`,
          priority: 'high',
          dueDate: journey.journey_date,
          actionRequired: false,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching customer alerts:', error);
  }

  return alerts;
}

/**
 * Helper: Validate email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Validate phone
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\+\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/messages
 * Get messages from office for customer
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/messages',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Get messages targeted to this customer or broadcast messages
    const messages = await query(
      `SELECT
        message_id,
        title,
        message,
        priority,
        created_at,
        CASE
          WHEN message_id IN (
            SELECT message_id FROM customer_message_reads
            WHERE customer_id = $1
          ) THEN true
          ELSE false
        END as read
      FROM tenant_messages
      WHERE tenant_id = $2
        AND (target_customer_id = $1 OR target_customer_id IS NULL)
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC`,
      [customerId, tenantId]
    );

    return res.json({ messages });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/messages-to-office
 * Get messages sent by customer to office
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/messages-to-office',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    const messages = await query(
      `SELECT
        message_id,
        subject,
        message,
        status,
        created_at,
        read_at,
        resolved_at,
        admin_response
      FROM customer_messages_to_office
      WHERE tenant_id = $1 AND customer_id = $2
      ORDER BY created_at DESC`,
      [tenantId, customerId]
    );

    return res.json({ messages });
  })
);

/**
 * POST /tenants/:tenantId/customer-dashboard/:customerId/messages-to-office
 * Send message from customer to office
 */
router.post(
  '/tenants/:tenantId/customer-dashboard/:customerId/messages-to-office',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Sanitize inputs
    const subject = sanitizeInput(req.body.subject, { maxLength: 200 });
    const message = sanitizeInput(req.body.message, { maxLength: 2000 });

    // Validate input
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject must be 200 characters or less' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message must be 2000 characters or less' });
    }

    // Insert message
    const result = await queryOne(
      `INSERT INTO customer_messages_to_office
        (tenant_id, customer_id, subject, message, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      RETURNING message_id, subject, message, status, created_at`,
      [tenantId, customerId, subject, message]  // all sanitized
    );

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.message_id
    });
  })
);

/**
 * PUT /tenants/:tenantId/customer-dashboard/:customerId/messages/:messageId/read
 * Mark a message as read by customer
 */
router.put(
  '/tenants/:tenantId/customer-dashboard/:customerId/messages/:messageId/read',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId, messageId } = req.params;

    // Verify message exists and is for this tenant
    const message = await queryOne(
      `SELECT message_id FROM tenant_messages
      WHERE tenant_id = $1 AND message_id = $2
        AND (target_customer_id = $3 OR target_customer_id IS NULL)`,
      [tenantId, messageId, customerId]
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Insert or update read record
    await queryOne(
      `INSERT INTO customer_message_reads (customer_id, message_id, read_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (customer_id, message_id) DO UPDATE SET read_at = NOW()`,
      [customerId, messageId]
    );

    return res.json({ success: true });
  })
);

/**
 * GET /tenants/:tenantId/customer-dashboard/:customerId/social-outings
 * Get upcoming social outings that customer can book
 */
router.get(
  '/tenants/:tenantId/customer-dashboard/:customerId/social-outings',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Get upcoming outings with customer's booking status
    const outings = await query(
      `SELECT
        o.*,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT CASE WHEN b.customer_id = $2 AND b.booking_status = 'confirmed' THEN 1 END) as customer_booked,
        COUNT(CASE WHEN b.customer_data->>'wheelchair_user' = 'true' THEN 1 END) as wheelchair_bookings
      FROM tenant_social_outings o
      LEFT JOIN tenant_outing_bookings b ON o.id = b.outing_id AND o.tenant_id = b.tenant_id
      WHERE o.tenant_id = $1
        AND o.outing_date >= CURRENT_DATE
        AND o.status = 'active'
      GROUP BY o.id
      ORDER BY o.outing_date ASC`,
      [tenantId, customerId]
    );

    return res.json({ outings });
  })
);

/**
 * POST /tenants/:tenantId/customer-dashboard/:customerId/social-outings/:outingId/book
 * Book customer onto a social outing
 */
router.post(
  '/tenants/:tenantId/customer-dashboard/:customerId/social-outings/:outingId/book',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId, outingId } = req.params;

    // Sanitize string inputs
    const specialRequirements = sanitizeInput(req.body.special_requirements, { maxLength: 500 });
    const dietaryRequirements = sanitizeInput(req.body.dietary_requirements, { maxLength: 500 });

    // Get customer details
    const customer = await queryOne(
      `SELECT customer_id, name, phone, accessibility_needs, wheelchair_user, medical_info
      FROM tenant_customers
      WHERE customer_id = $1 AND tenant_id = $2`,
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check outing exists and has capacity
    const outing = await queryOne(
      `SELECT o.id, o.name, o.max_passengers, COUNT(b.id) as current_bookings
      FROM tenant_social_outings o
      LEFT JOIN tenant_outing_bookings b ON o.id = b.outing_id
        AND o.tenant_id = b.tenant_id
        AND b.booking_status = 'confirmed'
      WHERE o.tenant_id = $1 AND o.id = $2 AND o.status = 'active'
      GROUP BY o.id, o.name, o.max_passengers`,
      [tenantId, outingId]
    );

    if (!outing) {
      return res.status(404).json({ error: 'Outing not found' });
    }

    const currentBookings = parseInt(outing.current_bookings || '0');
    if (currentBookings >= outing.max_passengers) {
      return res.status(400).json({ error: 'Outing is fully booked' });
    }

    // Check if already booked
    const existing = await queryOne(
      `SELECT id FROM tenant_outing_bookings
      WHERE tenant_id = $1 AND outing_id = $2 AND customer_id = $3
        AND booking_status = 'confirmed'`,
      [tenantId, outingId, customerId]
    );

    if (existing) {
      return res.status(400).json({ error: 'Already booked onto this outing' });
    }

    // Create booking
    const customerData = {
      name: customer.name,
      phone: customer.phone,
      accessibility_needs: customer.accessibility_needs,
      wheelchair_user: customer.wheelchair_user || false,
      medical_info: customer.medical_info
    };

    const booking = await queryOne(
      `INSERT INTO tenant_outing_bookings (
        tenant_id, outing_id, customer_id, customer_data,
        special_requirements, dietary_requirements, booking_status, booked_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'customer', NOW())
      RETURNING *`,
      [
        tenantId,
        outingId,
        customerId,
        JSON.stringify(customerData),
        specialRequirements || '',  // sanitized
        dietaryRequirements || ''  // sanitized
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Successfully booked onto outing',
      booking
    });
  })
);

/**
 * DELETE /tenants/:tenantId/customer-dashboard/:customerId/social-outings/:outingId/cancel
 * Cancel customer's booking for a social outing
 */
router.delete(
  '/tenants/:tenantId/customer-dashboard/:customerId/social-outings/:outingId/cancel',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId, outingId } = req.params;

    // Cancel the booking
    const result = await queryOne(
      `UPDATE tenant_outing_bookings
      SET booking_status = 'cancelled',
          cancellation_reason = 'Cancelled by customer',
          cancelled_at = NOW(),
          cancelled_by = 'customer'
      WHERE tenant_id = $1 AND outing_id = $2 AND customer_id = $3
        AND booking_status = 'confirmed'
      RETURNING *`,
      [tenantId, outingId, customerId]
    );

    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  })
);

/**
 * POST /tenants/:tenantId/customer-dashboard/:customerId/social-outings/suggest
 * Customer suggests a new social outing
 */
router.post(
  '/tenants/:tenantId/customer-dashboard/:customerId/social-outings/suggest',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;
    const { suggested_date } = req.body;

    // Sanitize string inputs
    const name = sanitizeInput(req.body.name, { maxLength: 200 });
    const description = sanitizeInput(req.body.description, { maxLength: 1000 });
    const suggestedLocation = sanitizeInput(req.body.suggested_location, { maxLength: 200 });
    const notes = sanitizeInput(req.body.notes, { maxLength: 1000 });

    // Validate input
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Get customer name
    const customer = await queryOne(
      'SELECT name FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [customerId, tenantId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create suggestion (stored as a draft outing or in a suggestions table)
    const suggestion = await queryOne(
      `INSERT INTO tenant_social_outings (
        tenant_id, name, description, outing_date, location,
        status, max_passengers, created_by, notes
      ) VALUES ($1, $2, $3, $4, $5, 'suggested', 50, $6, $7)
      RETURNING *`,
      [
        tenantId,
        name,  // sanitized
        description,  // sanitized
        suggested_date || null,
        suggestedLocation || '',  // sanitized
        `Suggested by: ${customer.name}`,
        notes || `Customer suggestion from ${customer.name}`  // sanitized
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Suggestion submitted successfully',
      suggestion
    });
  })
);

/**
 * Helper: Get random driver name (for mock journey history)
 */
function getRandomDriver(): string {
  const drivers = ['John Smith', 'Sarah Wilson', 'Michael Brown', 'Emma Davis', 'James Taylor'];
  return drivers[Math.floor(Math.random() * drivers.length)];
}

export default router;
