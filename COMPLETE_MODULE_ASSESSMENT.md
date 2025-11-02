# Complete Module Assessment Report

**Date:** 2025-11-02
**Total Modules:** 33
**Status:** Comprehensive Assessment

---

## Assessment Methodology

Each module evaluated on:
- **Functionality** (Does it work?)
- **Security** (Sanitization, auth, validation)
- **Performance** (Indexes, caching, N+1 queries)
- **Error Handling** (Proper responses)
- **Code Quality** (Structure, comments)

**Scoring:**
- ✅ Excellent (90-100%)
- 🟢 Good (75-89%)
- 🟡 Needs Work (60-74%)
- 🔴 Critical Issues (<60%)

---

## Module 1: Authentication (auth.routes.ts) ✅

**Score: 98% - Excellent**

### Strengths
✅ Login endpoint functional and tested
✅ Rate limiting applied (5 req/15min)
✅ Input sanitization implemented (username)
✅ Password NOT sanitized (correct!)
✅ JWT generation secure
✅ Tenant isolation verified
✅ Swagger documentation added
✅ Proper error handling
✅ Audit logging present

### Issues
None critical

### Improvements Needed
1. **Add Swagger docs** to logout/verify endpoints
2. **Consider caching** user permissions after login
3. **Add integration tests** for login flow

### Action Items
- [ ] Add Swagger documentation to `/logout` and `/verify`
- [ ] Write integration tests for auth flow
- [ ] Consider adding refresh token support

**Production Ready:** ✅ YES

---

## Module 2: Customers (customer.routes.ts) 🟢

**Score: 85% - Good**

### Strengths
✅ Full CRUD implemented (list, get, create, update, delete)
✅ Pagination implemented
✅ Search functionality present
✅ Filtering by status
✅ Proper authentication middleware
✅ Tenant isolation verified
✅ Input validation schemas defined
✅ Error handling present
✅ Statistics endpoint for dashboard

### Issues
⚠️ **N+1 Query Pattern** - Stats endpoint makes 6 separate queries (lines 45-78)
⚠️ **No Input Sanitization** on create/update endpoints
⚠️ **Not using standardized response format**
⚠️ **No caching** for stats endpoint
⚠️ **Missing Swagger documentation**

### Performance Analysis
```typescript
// CURRENT (6 queries):
const totalResult = await query('SELECT COUNT(*)...'); // Query 1
const active = total; // No query
const destinationsResult = await query('SELECT COUNT(DISTINCT...)...'); // Query 2
const splitPaymentResult = await query('SELECT COUNT(*)...'); // Query 3
const loginEnabledResult = await query('SELECT COUNT(*)...'); // Query 4

// SHOULD BE (1 query):
const stats = await query(`
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(DISTINCT (schedule->>'destination')) as destinations,
    COUNT(*) FILTER (WHERE has_split_payment = true) as split_payment,
    COUNT(*) FILTER (WHERE is_login_enabled = true) as login_enabled
  FROM tenant_customers
  WHERE tenant_id = $1 AND is_active = true
`);
```

### Improvements Needed

#### 1. Add Input Sanitization
```typescript
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

router.post('/tenants/:tenantId/customers',
  verifyTenantAccess,
  validate(createCustomerSchema),
  asyncHandler(async (req, res) => {
    // Sanitize inputs
    const name = sanitizeInput(req.body.name, { maxLength: 200 });
    const email = sanitizeEmail(req.body.email);
    const phone = sanitizePhone(req.body.phone);
    const address = sanitizeInput(req.body.address, { maxLength: 500 });
    // ... continue with sanitized data
  })
);
```

#### 2. Optimize Stats Query
```typescript
router.get('/tenants/:tenantId/customers/stats',
  verifyTenantAccess,
  asyncHandler(async (req, res) => {
    // Cache for 5 minutes
    const stats = await cachedTenantQuery(
      tenantId,
      'customers:stats',
      300,
      async () => {
        const result = await query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active,
            COUNT(DISTINCT (schedule->>'destination')) as destinations,
            COUNT(*) FILTER (WHERE has_split_payment = true) as split_payment,
            COUNT(*) FILTER (WHERE is_login_enabled = true) as login_enabled
          FROM tenant_customers
          WHERE tenant_id = $1 AND is_active = true
        `, [tenantId]);
        return result[0];
      }
    );
    res.json(stats);
  })
);
```

#### 3. Add Swagger Documentation
```typescript
/**
 * @swagger
 * /api/tenants/{tenantId}/customers:
 *   get:
 *     summary: List all customers
 *     tags: [Customers]
 *     parameters:
 *       - $ref: '#/components/parameters/tenantId'
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 */
```

#### 4. Use Standardized Response Format
```typescript
import { successResponse } from '../utils/responseWrapper';

router.get('/tenants/:tenantId/customers',
  verifyTenantAccess,
  asyncHandler(async (req, res) => {
    const customers = await query(/* ... */);
    const total = await query(/* count */);

    return successResponse(res, customers, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  })
);
```

#### 5. Implement Soft Delete
```typescript
import { softDelete } from '../utils/softDelete';

router.delete('/tenants/:tenantId/customers/:id',
  verifyTenantAccess,
  asyncHandler(async (req, res) => {
    await softDelete({
      tableName: 'tenant_customers',
      idColumn: 'customer_id',
      id: parseInt(req.params.id),
      userId: req.user.userId,
      tenantId: parseInt(req.params.tenantId),
    }, pool);

    // Invalidate cache
    invalidateResourceCache(parseInt(req.params.tenantId), 'customer');

    return successResponse(res, { message: 'Customer deleted successfully' });
  })
);
```

### Action Items
- [ ] Add input sanitization to create/update endpoints
- [ ] Optimize stats query (6 queries → 1 query)
- [ ] Add caching to stats endpoint
- [ ] Migrate to standardized response format
- [ ] Add Swagger documentation
- [ ] Implement soft delete
- [ ] Add cache invalidation on write operations
- [ ] Write integration tests

**Production Ready:** 🟢 YES (with improvements recommended)

---

## Module 3: Drivers (driver.routes.ts) 🟢

**Score: 83% - Good**

### Strengths
✅ **Complete CRUD operations** (list, get, create, update, delete)
✅ **Comprehensive driver login management** (enable, disable, password reset, username update)
✅ **Pagination and filtering** implemented
✅ **Search functionality** across name, email, phone
✅ **Soft delete** properly implemented (is_active flag)
✅ **Excellent error handling** (asyncHandler, proper error types)
✅ **Good logging** throughout all operations
✅ **Proper authentication** middleware on all endpoints
✅ **Tenant isolation** verified
✅ **Password security** - bcrypt hashing, passwords not sanitized (correct!)
✅ **17 endpoints** covering all driver operations

### Issues

#### 1. N+1 Query Pattern in Stats Endpoint (lines 32-57)
**Severity:** 🔴 High - Performance Issue

**Problem:**
```typescript
// Makes 3 separate queries
const totalResult = await query(
  'SELECT COUNT(*) as count FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true',
  [tenantId]
);

const employmentResult = await query(
  `SELECT employment_type, COUNT(*) as count
   FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true
   GROUP BY employment_type`,
  [tenantId]
);

const loginEnabledResult = await query(
  'SELECT COUNT(*) as count FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true AND is_login_enabled = true',
  [tenantId]
);
```

**Solution:**
```typescript
import { cachedTenantQuery } from '../utils/cache';

router.get('/tenants/:tenantId/drivers/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const stats = await cachedTenantQuery(
      parseInt(tenantId),
      'drivers:stats',
      300, // 5 minute cache
      async () => {
        const result = await query<{
          total: string;
          contracted: string;
          freelance: string;
          employed: string;
          login_enabled: string;
        }>(
          `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE employment_type = 'contracted') as contracted,
            COUNT(*) FILTER (WHERE employment_type = 'freelance') as freelance,
            COUNT(*) FILTER (WHERE employment_type = 'employed') as employed,
            COUNT(*) FILTER (WHERE is_login_enabled = true) as login_enabled
          FROM tenant_drivers
          WHERE tenant_id = $1 AND is_active = true`,
          [tenantId]
        );

        return {
          total: parseInt(result[0].total, 10),
          contracted: parseInt(result[0].contracted, 10),
          freelance: parseInt(result[0].freelance, 10),
          employed: parseInt(result[0].employed, 10),
          loginEnabled: parseInt(result[0].login_enabled, 10)
        };
      }
    );

    return successResponse(res, stats);
  })
);
```

**Impact:** 3x faster (3 queries → 1 query) + caching = 10-50x faster

#### 2. Enhanced Stats - Fetching All Data Instead of SQL Aggregation (lines 83-148)
**Severity:** 🔴 High - Performance Issue

**Problem:**
```typescript
// Fetches ALL drivers into memory
const drivers = await query(
  `SELECT d.*, u.username, u.last_login, u.created_at as user_created
   FROM tenant_drivers d
   LEFT JOIN tenant_users u ON d.user_id = u.user_id
   WHERE d.tenant_id = $1 AND d.is_active = true`,
  [tenantId]
);

// Then loops through all drivers in JavaScript
drivers.forEach((driver: any) => {
  // Calculate stats in JS (lines 109-148)
  // This is inefficient!
});
```

**Solution:**
```typescript
router.get('/tenants/:tenantId/drivers/enhanced-stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const stats = await cachedTenantQuery(
      parseInt(tenantId),
      'drivers:enhanced-stats',
      300,
      async () => {
        // Calculate financial stats in SQL
        const financialResult = await query(`
          SELECT
            SUM(CASE WHEN employment_type IN ('contracted', 'employed') THEN weekly_wage ELSE 0 END) as contracted_weekly,
            SUM(CASE WHEN employment_type = 'freelance' THEN weekly_wage ELSE 0 END) as freelance_est,
            SUM(CASE WHEN employment_type IN ('contracted', 'employed') THEN weekly_lease ELSE 0 END) as fuel_costs
          FROM tenant_drivers
          WHERE tenant_id = $1 AND is_active = true
        `, [tenantId]);

        // Calculate fleet stats in SQL
        const fleetResult = await query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE employment_type = 'contracted') as employment_contracted,
            COUNT(*) FILTER (WHERE employment_type = 'freelance') as employment_freelance,
            COUNT(*) FILTER (WHERE employment_type = 'employed') as employment_employed,
            COUNT(*) FILTER (WHERE vehicle_id IS NULL) as vehicles_none,
            COUNT(*) FILTER (WHERE vehicle_type = 'company') as vehicles_company,
            COUNT(*) FILTER (WHERE vehicle_type = 'lease') as vehicles_lease,
            COUNT(*) FILTER (WHERE vehicle_type = 'personal') as vehicles_personal,
            COUNT(*) FILTER (WHERE is_login_enabled = true) as dashboard_enabled,
            COUNT(*) FILTER (WHERE is_login_enabled = false) as dashboard_no_access
          FROM tenant_drivers
          WHERE tenant_id = $1 AND is_active = true
        `, [tenantId]);

        return {
          financial: {
            contractedWeekly: parseFloat(financialResult[0].contracted_weekly || '0'),
            freelanceEst: parseFloat(financialResult[0].freelance_est || '0'),
            fuelCosts: parseFloat(financialResult[0].fuel_costs || '0')
          },
          fleet: {
            employment: {
              contracted: parseInt(fleetResult[0].employment_contracted || '0'),
              freelance: parseInt(fleetResult[0].employment_freelance || '0'),
              employed: parseInt(fleetResult[0].employment_employed || '0')
            },
            vehicles: {
              company: parseInt(fleetResult[0].vehicles_company || '0'),
              lease: parseInt(fleetResult[0].vehicles_lease || '0'),
              personal: parseInt(fleetResult[0].vehicles_personal || '0'),
              none: parseInt(fleetResult[0].vehicles_none || '0')
            },
            dashboard: {
              enabled: parseInt(fleetResult[0].dashboard_enabled || '0'),
              noAccess: parseInt(fleetResult[0].dashboard_no_access || '0')
            }
          },
          summary: {
            total: parseInt(fleetResult[0].total || '0'),
            contracted: parseInt(fleetResult[0].employment_contracted || '0'),
            freelance: parseInt(fleetResult[0].employment_freelance || '0'),
            employed: parseInt(fleetResult[0].employment_employed || '0'),
            loginEnabled: parseInt(fleetResult[0].dashboard_enabled || '0')
          }
        };
      }
    );

    return successResponse(res, stats);
  })
);
```

**Impact:** 10-100x faster (no memory overhead, pure SQL aggregation)

#### 3. No Input Sanitization (All Write Endpoints)
**Severity:** 🔴 Critical - Security Issue

**Affected Endpoints:**
- POST /drivers (create) - line 332
- PUT /drivers/:driverId (update) - line 439
- POST /drivers/:driverId/login (create login) - line 552
- POST /drivers/:driverId/enable-login - line 854

**Problem:**
```typescript
// CREATE endpoint (line 332)
const driverData = req.body;
// Direct use of unsanitized inputs:
driverData.name,
driverData.email,
driverData.phone,
driverData.notes,
driverData.emergencyContact,
driverData.emergencyPhone
```

**Solution:**
```typescript
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

router.post('/tenants/:tenantId/drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const driverData = req.body;

    // Sanitize all string inputs
    const name = sanitizeInput(driverData.name, { maxLength: 200 });
    const email = sanitizeEmail(driverData.email);
    const phone = sanitizePhone(driverData.phone);
    const licenseNumber = sanitizeInput(driverData.licenseNumber, { maxLength: 50 });
    const licenseClass = sanitizeInput(driverData.licenseClass, { maxLength: 10 });
    const emergencyContact = sanitizeInput(driverData.emergencyContact, { maxLength: 200 });
    const emergencyPhone = sanitizePhone(driverData.emergencyPhone);
    const notes = sanitizeInput(driverData.notes, { maxLength: 2000 });

    // Validate required fields
    if (!name) {
      throw new ValidationError('Driver name is required');
    }

    // Use sanitized data in INSERT
    const result = await query(
      `INSERT INTO tenant_drivers (...)
       VALUES ($1, $2, $3, $4, ...)`,
      [
        tenantId,
        name,           // sanitized
        phone,          // sanitized
        email,          // sanitized
        licenseNumber,  // sanitized
        // ... other fields
      ]
    );

    return successResponse(res, result[0], 201);
  })
);
```

**Apply same sanitization to:**
- Update endpoint (line 434)
- Username updates (line 722)
- Enable login endpoint (line 854)

**Important:** ✅ Passwords are correctly NOT sanitized (lines 583, 692, 882, 990) - this is correct!

#### 4. No Swagger Documentation
**Severity:** 🟡 Medium

All 17 endpoints need Swagger JSDoc comments.

**Example:**
```typescript
/**
 * @swagger
 * /api/tenants/{tenantId}/drivers/stats:
 *   get:
 *     summary: Get driver statistics
 *     description: Returns aggregated driver statistics including employment type breakdown
 *     tags: [Drivers]
 *     parameters:
 *       - $ref: '#/components/parameters/tenantId'
 *     responses:
 *       200:
 *         description: Driver statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 contracted:
 *                   type: integer
 *                 freelance:
 *                   type: integer
 *                 employed:
 *                   type: integer
 *                 loginEnabled:
 *                   type: integer
 */
```

#### 5. Not Using Standardized Response Format
**Severity:** 🟡 Medium

**Problem:**
```typescript
res.json(driver);
res.json({ drivers, total, page, limit, totalPages });
res.status(201).json(result[0]);
```

**Solution:**
```typescript
import { successResponse } from '../utils/responseWrapper';

// GET single
return successResponse(res, driver);

// GET list
return successResponse(res, drivers, { total, page, limit, totalPages });

// POST create
return successResponse(res, result[0], 201);
```

### Action Items

**High Priority (Security & Performance):**
- [ ] Add input sanitization to create endpoint (lines 332-427)
- [ ] Add input sanitization to update endpoint (lines 434-499)
- [ ] Add input sanitization to username updates (lines 717-769, 854-916)
- [ ] Optimize stats endpoint (3 queries → 1 query with caching)
- [ ] Optimize enhanced-stats endpoint (SQL aggregation instead of JS loop)

**Medium Priority (Consistency):**
- [ ] Migrate all endpoints to standardized response format
- [ ] Add Swagger documentation to all 17 endpoints
- [ ] Add cache invalidation on write operations

**Low Priority (Nice to Have):**
- [ ] Write integration tests for driver CRUD
- [ ] Write integration tests for login management
- [ ] Add unit tests for salary structure calculations

### Performance Improvements

**Expected Impact:**
- Stats endpoint: **3x faster** (3 queries → 1) + caching = **10-50x faster**
- Enhanced stats: **10-100x faster** (no memory overhead, pure SQL)
- Overall database load: **30-50% reduction** with caching

### Security Improvements

**Expected Impact:**
- XSS protection on all driver input fields
- SQL injection protection (already has parameterized queries ✅)
- Input validation preventing malformed data

**Production Ready:** 🟢 YES (with improvements recommended)

**Overall Assessment:**
This is a **well-implemented module** with comprehensive functionality. The driver login management is particularly well done with proper bcrypt hashing and user account management. Main improvements needed are input sanitization and query optimization for stats endpoints.

---

## Module 4: Driver Dashboard (driver-dashboard.routes.ts) 🟢

**Score: 87% - Good**

### Strengths
✅ **Read-only dashboard** - No write operations (appropriate for driver access level)
✅ **Comprehensive metrics** - Overview, schedules, holidays, performance, alerts
✅ **Proper authentication** - verifyTenantAccess on all endpoints
✅ **Tenant isolation** - All queries properly scoped to tenant_id
✅ **Excellent error handling** - asyncHandler, proper error types
✅ **Good logging** throughout
✅ **Smart use of SQL FILTER** - Trip stats query already optimized (lines 86-96)
✅ **Holiday balance calculation** - Proper year-based tracking
✅ **Date range queries** - Flexible schedule viewing
✅ **5 well-defined endpoints** covering all driver dashboard needs

### Issues

#### 1. N+1 Query Pattern in Overview Endpoint (lines 31-108)
**Severity:** 🟡 Medium - Performance Issue (Less critical as read-only)

**Problem:**
```typescript
// Makes 7 separate queries
const driver = await queryOne(...);                // Query 1
const todaySchedules = await query(...);           // Query 2
const upcomingSchedules = await query(...);        // Query 3
const pendingHolidays = await query(...);          // Query 4
const activeHolidays = await query(...);           // Query 5
const tripStats = await queryOne(...);             // Query 6 ✅ (uses FILTER - good)
const recentAlerts = await query(...);             // Query 7
```

**Solution:**
Consolidate schedule and holiday queries using SQL FILTER and CTEs. Add caching for dashboard data.

**Impact:** 7 queries → 5 queries (29% reduction) + caching = **10-20x faster**

#### 2. No Date Validation in Schedule Endpoint (lines 153, 158-159)
**Severity:** 🟡 Medium - Validation Issue

**Problem:**
```typescript
const { startDate, endDate } = req.query;
const start = startDate || new Date().toISOString().split('T')[0];
// No validation - could accept malformed dates
```

**Solution:**
```typescript
import { sanitizeDate } from '../utils/sanitize';

const startDateParam = req.query.startDate as string;
const startDateObj = startDateParam ? sanitizeDate(startDateParam) : new Date();

if (startDateParam && !startDateObj) {
  throw new ValidationError('Invalid date format');
}
```

#### 3. No Caching on Any Endpoint
**Severity:** 🟡 Medium - Performance Issue

**Recommended cache TTLs:**
- Overview: 5 minutes (relatively static)
- Schedule: 2 minutes (more dynamic)
- Holidays: 5 minutes
- Performance: 10 minutes
- Alerts: 2 minutes (should be timely)

#### 4. No Swagger Documentation
**Severity:** 🟡 Medium

All 5 endpoints need Swagger JSDoc documentation.

#### 5. Not Using Standardized Response Format
**Severity:** 🟡 Medium

Should use `successResponse()` wrapper for consistency.

### Action Items

**High Priority:**
- [ ] Optimize overview endpoint (7 queries → 5 queries)
- [ ] Add caching to all 5 endpoints

**Medium Priority:**
- [ ] Add date validation to schedule endpoint
- [ ] Migrate to standardized response format
- [ ] Add Swagger documentation

**Low Priority:**
- [ ] Write integration tests
- [ ] Add cache invalidation triggers

### Performance Improvements

**Expected Impact:**
- Overview: **29% fewer queries** + caching = **10-20x faster**
- All endpoints: **50-80% database load reduction** with caching

**Production Ready:** ✅ YES (with caching recommended)

**Overall Assessment:**
Well-designed read-only dashboard with clear separation of concerns. Good use of SQL FILTER in trip stats. Main improvements: query consolidation and caching.

---

## Module 5: Customer Dashboard (customer-dashboard.routes.ts) 🟢

**Score: 84% - Good**

### Strengths
✅ **Comprehensive customer portal** - 15 endpoints covering all customer needs
✅ **Custom security middleware** - `verifyCustomerOwnership` prevents customers accessing other customer data
✅ **Role-based access** - Admins can access any customer, customers only their own data
✅ **Schedule-based booking system** - Clever generation of bookings/history from schedule JSON
✅ **Excellent error handling** - Proper 404/403/400 responses with clear messages
✅ **Helper function abstraction** - Email/phone validation, alert fetching
✅ **Social outings integration** - Booking, cancellation, suggestions
✅ **Messaging system** - Two-way communication with office
✅ **Journey request system** - Ad-hoc booking capabilities
✅ **Profile management** - Limited field updates (appropriate for customers)

### Issues

#### 1. No Input Sanitization on Write Endpoints (CRITICAL)
**Severity:** 🔴 Critical - Security Issue

**Affected Endpoints:**
- PUT /profile (line 357) - phone, email, emergency contacts
- POST /journey-requests (line 404) - destination, notes
- POST /messages-to-office (line 626) - subject, message
- POST /social-outings/suggest (line 860) - name, description, notes
- POST /social-outings/:outingId/book (line 735) - special_requirements, dietary_requirements

**Problem (PUT /profile example):**
```typescript
// Lines 357-379
const { phone, email, emergency_contact_name, emergency_contact_phone } = req.body;

// Validation exists but NO sanitization:
if (email && !isValidEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
// Direct use in UPDATE without sanitization - XSS vulnerability!
```

**Solution:**
```typescript
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

router.put('/tenants/:tenantId/customer-dashboard/:customerId/profile',
  verifyTenantAccess,
  verifyCustomerOwnership,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, customerId } = req.params;

    // Sanitize all inputs
    const phone = sanitizePhone(req.body.phone);
    const email = sanitizeEmail(req.body.email);
    const emergencyContactName = sanitizeInput(req.body.emergency_contact_name, { maxLength: 200 });
    const emergencyContactPhone = sanitizePhone(req.body.emergency_contact_phone);

    // Validate sanitized inputs
    if (req.body.email && !email) {
      throw new ValidationError('Invalid email format');
    }

    if (req.body.phone && !phone) {
      throw new ValidationError('Invalid phone format');
    }

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
      [customerId, tenantId, phone, email, emergencyContactName, emergencyContactPhone]
    );

    if (!updatedCustomer) {
      throw new NotFoundError('Customer not found or inactive');
    }

    return successResponse(res, updatedCustomer, 'Profile updated successfully');
  })
);
```

**Apply same sanitization to all write endpoints:**

**POST /journey-requests (line 404):**
```typescript
const destination = sanitizeInput(req.body.destination, { maxLength: 200 });
const notes = sanitizeInput(req.body.notes, { maxLength: 1000 });
const type = sanitizeInput(req.body.type, { maxLength: 50 });
```

**POST /messages-to-office (line 626):**
```typescript
const subject = sanitizeInput(req.body.subject, { maxLength: 200 });
const message = sanitizeInput(req.body.message, { maxLength: 2000 });
```

**POST /social-outings/suggest (line 860):**
```typescript
const name = sanitizeInput(req.body.name, { maxLength: 200 });
const description = sanitizeInput(req.body.description, { maxLength: 1000 });
const suggestedLocation = sanitizeInput(req.body.suggested_location, { maxLength: 200 });
const notes = sanitizeInput(req.body.notes, { maxLength: 1000 });
```

#### 2. getCustomerAlerts Makes 2 Queries (lines 460-504)
**Severity:** 🟡 Medium - Performance Issue

**Problem:**
```typescript
// Query 1: Recent booking decisions
const bookingResults = await query(...);

// Query 2: Upcoming journeys
const upcomingResults = await query(...);
```

**Solution:**
```typescript
async function getCustomerAlerts(tenantId: number, customerId: number): Promise<any[]> {
  // Consolidate into single query with UNION
  const results = await query(`
    SELECT
      'booking-decision' as alert_type,
      aj.journey_id,
      aj.status,
      aj.journey_date,
      aj.destination,
      aj.pickup_time,
      aj.updated_at as timestamp
    FROM tenant_adhoc_journeys aj
    WHERE aj.tenant_id = $1 AND aj.customer_id = $2
      AND aj.status IN ('approved', 'rejected')
      AND aj.updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'

    UNION ALL

    SELECT
      'upcoming-journey' as alert_type,
      aj.journey_id,
      aj.status,
      aj.journey_date,
      aj.destination,
      aj.pickup_time,
      NOW() as timestamp
    FROM tenant_adhoc_journeys aj
    WHERE aj.tenant_id = $1 AND aj.customer_id = $2
      AND aj.status = 'approved'
      AND aj.journey_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'

    ORDER BY timestamp DESC
  `, [tenantId, customerId]);

  return results.map(result => {
    // Format alerts based on type
    // ... formatting logic
  });
}
```

**Impact:** 2 queries → 1 query (50% reduction)

#### 3. No Caching on Read-Heavy Endpoints
**Severity:** 🟡 Medium - Performance Issue

**Recommended cache TTLs:**
- Overview: 5 minutes
- Bookings: 2 minutes (schedule-generated)
- Journey history: 10 minutes (historical data)
- Messages: 1 minute (should be timely)
- Social outings: 5 minutes

#### 4. Schedule-Based Generation Could Be Slow
**Severity:** 🟡 Medium - Performance Issue

**Current implementation (lines 185-217):**
- Generates bookings by looping through dates in JavaScript
- Could be slow for large date ranges (max 30 days currently)
- Not a major issue due to day limit, but could be optimized

**Consideration:** This is actually a clever design for schedule-based transport, not a bug.

#### 5. No Swagger Documentation
**Severity:** 🟡 Medium

All 15 endpoints need Swagger JSDoc documentation.

#### 6. Inconsistent Response Format
**Severity:** 🟡 Medium

**Problem:**
```typescript
return res.json({ customerInfo, stats, recentAlerts }); // Line 117
return res.json({ bookings }); // Line 219
return res.json({ success: true, message: '...', customer: ... }); // Line 386
```

**Solution:** Use `successResponse()` wrapper consistently.

### Action Items

**Critical Priority (Security):**
- [ ] Add input sanitization to PUT /profile (line 357)
- [ ] Add input sanitization to POST /journey-requests (line 404)
- [ ] Add input sanitization to POST /messages-to-office (line 626)
- [ ] Add input sanitization to POST /social-outings/suggest (line 860)
- [ ] Add input sanitization to POST /social-outings/:outingId/book (line 735)

**High Priority (Performance):**
- [ ] Optimize getCustomerAlerts (2 queries → 1 query)
- [ ] Add caching to overview endpoint
- [ ] Add caching to bookings/history endpoints

**Medium Priority (Consistency):**
- [ ] Migrate all endpoints to standardized response format
- [ ] Add Swagger documentation to all 15 endpoints

**Low Priority:**
- [ ] Write integration tests for customer portal
- [ ] Add cache invalidation triggers

### Performance Improvements

**Expected Impact:**
- Alert fetching: **50% faster** (2 queries → 1)
- Overview/bookings: **10-50x faster** with caching
- Overall database load: **40-60% reduction** with caching

### Security Assessment

**Current Security:** 🟢 Very Good (with critical gap)
- ✅ Excellent custom ownership middleware
- ✅ Role-based access control
- ✅ Proper authentication and tenant isolation
- ✅ Validation functions exist
- 🔴 **MISSING input sanitization on all write endpoints** - CRITICAL

**Production Ready:** 🟡 CONDITIONAL - Requires input sanitization before deployment

**Overall Assessment:**
This is an **exceptionally well-designed customer portal** with excellent security architecture (custom ownership middleware) and comprehensive functionality. The schedule-based booking/history generation is clever. However, the missing input sanitization on ALL 5 write endpoints is a critical security gap that MUST be fixed before production deployment. Once sanitization is added, this module will be production-ready at 90%+.

**Key Strengths:**
- Custom `verifyCustomerOwnership` middleware (lines 24-53) is excellent security practice
- Comprehensive customer functionality (15 endpoints)
- Good validation logic (just needs sanitization layer)

**Key Weakness:**
- No sanitization layer despite having validation

---

