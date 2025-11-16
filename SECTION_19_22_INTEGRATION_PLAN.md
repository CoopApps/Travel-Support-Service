# Section 19/22 Service Integration Plan

**Date:** 2025-01-15
**Purpose:** Comprehensive integration plan for combining Section 19 (car-based transport) and Section 22 (community bus) services into unified customer and driver dashboards.

---

## Executive Summary

The travel support application currently has **two parallel service architectures**:

1. **Section 19 (Community Transport)** - Car-based, schedule-driven journeys with customer assignments
2. **Section 22 (Community Bus)** - Bus routes with seat-based bookings and timetables

This document outlines the integration strategy to provide:
- **Service-aware dashboards** that adapt based on `tenants.service_transport_enabled` and `tenants.service_bus_enabled`
- **Unified customer experience** showing both scheduled car journeys and bus bookings
- **Unified driver experience** showing both car assignments and bus timetable duties
- **Extended route optimization** for both car pooling and bus route planning
- **Integrated payroll** tracking hours across both service types

---

## 1. Current State Analysis

### 1.1 Section 19 (Car-Based Transport)

**Data Model:**
```
tenant_customers
├── schedule (JSONB) - Weekly recurring schedule (mon/tue/wed/thu/fri/sat/sun)
│   └── Each day: { destination, pickup_time, drop_off_time, daily_price, notes }
├── address, postcode
└── mobility_requirements, medical_notes

tenant_schedule_assignments
├── Links driver_id ↔ customer_id ↔ assignment_date
├── Generated from customer.schedule
└── Used for driver daily view

tenant_trips (actual trip records)
├── trip_id, customer_id, driver_id, vehicle_id
├── trip_date, pickup_time, destination
├── status: pending, completed, cancelled, no_show
└── price, requires_wheelchair

tenant_adhoc_journeys
├── journey_id, customer_id
├── destination, journey_date, pickup_time
├── status: pending, approved, rejected
└── journey_type: ad-hoc
```

**Customer Dashboard Features:**
- 7-day calendar view of scheduled journeys (generated from `schedule` JSON)
- Ad-hoc journey requests
- Social outings bookings
- Messages from office
- Feedback submission
- Cooperative member widget (already service-aware)

**Driver Dashboard Features:**
- Today's schedule (from `tenant_schedule_assignments`)
- Tomorrow's schedule
- Weekly overview (7-day grid)
- Trip status updates (right-click context menu)
- Holiday requests (freelance: "time off", employee: "holiday")
- Safeguarding reports
- Hours/fuel submissions (freelance only)
- Messages, documents, training
- Vehicle maintenance alerts
- Cooperative member widget

**Route Optimization:**
- `routeOptimization.service.ts` - Google Maps API integration
- Functions: `geocodeAddress()`, `calculateDistance()`, `calculateRouteWithWaypoint()`
- Used for: Passenger matching, detour calculation, distance estimation
- **Current limitation:** Designed for car-based single passenger pickups

### 1.2 Section 22 (Bus Services)

**Data Model:**
```
section22_bus_routes
├── route_id, route_number, route_name
├── origin_point, destination_point
├── total_distance_miles, estimated_duration_minutes
├── service_pattern: daily/weekdays/weekends/custom
├── operates_monday...operates_sunday
└── status: planning, registered, active, suspended, cancelled

section22_route_stops
├── stop_id, route_id, stop_sequence
├── stop_name, stop_address, latitude, longitude
├── arrival_offset_minutes, departure_offset_minutes
├── is_timing_point, is_pickup_point, is_setdown_point
└── accessibility_features

section22_timetables
├── timetable_id, route_id
├── service_name, departure_time, direction
├── vehicle_id, driver_id (assignment!)
├── total_seats, wheelchair_spaces
├── valid_from, valid_until, recurrence_pattern
└── status: scheduled, active, cancelled, completed

section22_bus_bookings
├── booking_id, timetable_id, customer_id
├── boarding_stop_id, alighting_stop_id, service_date
├── seat_number, requires_wheelchair_space
├── booking_reference, booking_status
├── fare_amount, payment_status
└── special_requirements

section22_seat_availability (auto-updated via triggers)
├── timetable_id, service_date
├── total_seats, booked_seats, available_seats
└── wheelchair_spaces, booked_wheelchair_spaces, available_wheelchair_spaces
```

**Bus Modules Built:**
- `BusDashboard` - Overview with service switcher
- `BusRoutesPage` - Route management (CRUD)
- `BusTimetablesPage` - Service scheduling with vehicle/driver assignment
- `BusBookingsPage` - Seat bookings with cooperative fare transparency
- `Section22CompliancePage` - Regulatory monitoring (permits, drivers, vehicles, registrations)
- `SeatAssignmentPage` - Visual bus layout with seat selection
- `BusCommunicationsPage` - Passenger SMS/Email notifications
- `BusAnalyticsPage` - Route profitability, demand forecasting, demographics, efficiency

**Bus Features:**
- Cooperative fare calculation (break-even pricing)
- Seat-based bookings (vs schedule-based)
- Real-time seat availability
- Multi-stop route support
- Compliance dashboards

### 1.3 Payroll Module

**Data Model:**
```
tenant_payroll_periods
├── period_id, period_start, period_end
├── period_type: weekly, monthly
├── total_gross, total_net, hmrc_payment_due
└── status: draft, submitted, paid

tenant_payroll_records (employees)
├── record_id, period_id, driver_id
├── employment_type: contracted_hourly, contracted_weekly, contracted_monthly
├── hours_worked, hourly_rate, weekly_wage, monthly_salary
├── gross_pay, tax_deducted, ni_deducted, pension_deducted
└── payment_status: pending, paid

tenant_freelance_submissions
├── submission_id, period_id, driver_id
├── invoice_number, invoice_date, invoice_amount
├── tax_paid, ni_paid
└── payment_status: pending, paid

tenant_timesheets
├── timesheet_id, driver_id, week_start_date
├── hours per day (mon_hours, tue_hours, ...)
├── total_hours, status: draft, submitted, approved
└── Linked to payroll via hours_worked calculation
```

**Payroll Features:**
- Handles employee (contracted_hourly/weekly/monthly) vs freelance differentials
- Auto-generates payroll records for active drivers
- Freelance invoice tracking
- Timesheet integration for hourly workers
- HMRC payment calculations
- **Current limitation:** No service-type breakdown (transport vs bus hours)

---

## 2. Data Model Differences: Section 19 vs Section 22

| Aspect | Section 19 (Transport) | Section 22 (Bus) | Integration Challenge |
|--------|------------------------|------------------|----------------------|
| **Booking Model** | Schedule-based (recurring weekly via `customer.schedule` JSON) | Seat-based (individual `bus_bookings` per service_date) | Need unified view showing both recurring schedules and one-off bus bookings |
| **Driver Assignment** | Via `schedule_assignments` (1 driver per customer per day) | Via `timetables.driver_id` (1 driver per timetable service) | Need unified driver calendar showing both assignment types |
| **Customer Journey** | Implicit (from schedule JSON, no booking record) | Explicit (`bus_bookings` record with booking_reference) | Customer dashboard needs to show "scheduled journeys" (generated) and "bus bookings" (actual records) |
| **Capacity** | Vehicle-based (`tenant_vehicles.seats`) | Route-based (`timetables.total_seats` with real-time tracking) | Different capacity models |
| **Pricing** | Fixed daily_price in schedule JSON | Dynamic fare calculation (break-even + cooperative pricing) | Need consistent pricing display |
| **Route Planning** | Point-to-point (customer address → destination) | Multi-stop (route with ordered stops) | Route optimizer needs extension |
| **Compliance** | Section 19 permit (passenger classes A-F) | Section 22 registration (traffic commissioner) | Different regulatory requirements |
| **Payment** | Billed to paying organization (`customer.paying_org`) | Individual fares or account billing | Different payment flows |

---

## 3. Integration Touch Points

### 3.1 Customer Dashboard Integration

**File:** `frontend/src/pages/CustomerDashboard.tsx`

**Current Behavior:**
- Fetches `customer.schedule` JSON
- Generates bookings for next 7/14 days based on day-of-week recurrence
- Shows "scheduled transport" journeys only
- Journey request modal for ad-hoc car trips

**Required Changes:**

1. **Detect Service Types**
```typescript
// In loadDashboardData()
const tenantServices = await fetch(`/api/tenants/${tenantId}/services`);
const { service_transport_enabled, service_bus_enabled } = await tenantServices.json();
```

2. **Fetch Bus Bookings**
```typescript
// Only if service_bus_enabled
if (tenant.service_bus_enabled) {
  const busBookings = await customerDashboardApi.getBusBookings(tenantId, customerId, 7);
  setBusBookings(busBookings);
}
```

3. **Unified Calendar View**
```typescript
// Merge transport schedules and bus bookings into single array
const allJourneys = [
  ...transportBookings.map(b => ({ ...b, serviceType: 'transport', icon: 'car' })),
  ...busBookings.map(b => ({ ...b, serviceType: 'bus', icon: 'bus' }))
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
```

4. **Service-Aware Quick Actions**
```html
{tenant.service_transport_enabled && (
  <button onClick={() => setShowJourneyRequestModal(true)}>
    Request Ad-hoc Car Journey
  </button>
)}
{tenant.service_bus_enabled && (
  <button onClick={() => setShowBusBookingModal(true)}>
    Book Bus Seat
  </button>
)}
```

**New Backend Endpoints Needed:**
```typescript
// customer-dashboard.routes.ts
router.get('/tenants/:tenantId/customer-dashboard/:customerId/bus-bookings', ...)
// Returns array of bus bookings with route/timetable info

router.post('/tenants/:tenantId/customer-dashboard/:customerId/bus-bookings', ...)
// Create new bus booking from customer portal
```

**UI Changes:**
- Add service type badge (🚗 Transport | 🚌 Bus) to each journey card
- Color-code by service type (blue for transport, green for bus)
- Show different details (car: driver name, bus: route number + seat number)
- Separate stats cards for transport vs bus journeys

---

### 3.2 Driver Dashboard Integration

**File:** `frontend/src/pages/DriverDashboard.tsx`

**Current Behavior:**
- Fetches `schedule_assignments` for driver_id
- Shows today/tomorrow/weekly schedules
- All assignments are car-based

**Required Changes:**

1. **Detect Driver's Service Types**
```typescript
// Check which services this driver is assigned to
const driver = await driverDashboardApi.getProfile(tenantId, driverId);
const { works_on_transport, works_on_bus } = driver;
```

2. **Fetch Bus Timetable Assignments**
```typescript
if (driver.works_on_bus) {
  const busTimetables = await driverDashboardApi.getBusTimetables(tenantId, driverId, startDate, endDate);
  setBusTimetables(busTimetables);
}
```

3. **Unified Schedule View**
```typescript
// Merge schedule_assignments and bus timetables
const allAssignments = [
  ...scheduleAssignments.map(a => ({
    ...a,
    serviceType: 'transport',
    displayTime: a.pickup_time || '09:00',
    displayName: a.customer_name,
    displayLocation: a.customer_address
  })),
  ...busTimetables.map(t => ({
    ...t,
    serviceType: 'bus',
    displayTime: t.departure_time,
    displayName: `${t.route_number} - ${t.service_name}`,
    displayLocation: `${t.origin_point} → ${t.destination_point}`
  }))
].sort((a, b) => a.displayTime.localeCompare(b.displayTime));
```

4. **Service-Aware Trip Cards**
```typescript
const renderAssignmentCard = (assignment: Assignment) => {
  if (assignment.serviceType === 'transport') {
    return (
      <div className="trip-card transport">
        <div className="service-badge">🚗 Transport</div>
        <div className="customer-name">{assignment.customer_name}</div>
        <div className="customer-address">{assignment.customer_address}</div>
        <div className="mobility">{assignment.mobility_requirements}</div>
        <button onClick={() => navigateToCustomer(assignment)}>Navigate</button>
      </div>
    );
  } else {
    return (
      <div className="trip-card bus">
        <div className="service-badge">🚌 Bus Service</div>
        <div className="route-name">{assignment.route_number} - {assignment.service_name}</div>
        <div className="route-details">{assignment.origin_point} → {assignment.destination_point}</div>
        <div className="capacity">{assignment.booked_seats}/{assignment.total_seats} seats</div>
        <button onClick={() => viewPassengerList(assignment)}>View Passengers</button>
      </div>
    );
  }
};
```

**New Backend Endpoints Needed:**
```typescript
// driver-dashboard.routes.ts
router.get('/tenants/:tenantId/driver-dashboard/:driverId/bus-timetables', ...)
// Returns timetables where driver_id = :driverId for date range

router.get('/tenants/:tenantId/driver-dashboard/:driverId/bus-passenger-list/:timetableId/:serviceDate', ...)
// Returns all bus_bookings for specific timetable/date with passenger details

router.get('/tenants/:tenantId/driver-dashboard/:driverId/combined-schedule', ...)
// Returns merged view of schedule_assignments + bus timetables
```

**UI Changes:**
- Add service filter toggle (All | Transport | Bus)
- Show different icons for transport vs bus assignments
- Bus assignments show passenger count instead of single customer
- Add "View Passenger Manifest" button for bus services
- Stats cards split by service type

---

### 3.3 Route Optimization Extension

**File:** `backend/src/services/routeOptimization.service.ts`

**Current Capabilities:**
- `geocodeAddress()` - Convert address/postcode to lat/lng
- `calculateDistance()` - Get distance/duration between 2 points
- `calculateRouteWithWaypoint()` - Calculate detour for passenger pickup
- `estimatePostcodeProximity()` - Simple postcode-based proximity

**Required Extensions:**

1. **Multi-Stop Route Optimization (for bus routes)**
```typescript
/**
 * Calculate optimized route with multiple stops
 * Used for bus route planning with passenger postcodes
 */
export async function calculateMultiStopRoute(
  startPoint: Location,
  waypoints: Location[],
  endPoint: Location,
  optimize: boolean = true
): Promise<MultiStopRouteResult | null> {
  const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: startPoint.address,
      destination: endPoint.address,
      waypoints: optimize
        ? 'optimize:true|' + waypoints.map(w => w.address).join('|')
        : waypoints.map(w => w.address).join('|'),
      key: GOOGLE_MAPS_API_KEY,
    }
  });

  // Return total distance, duration, and optimized stop order
  return {
    totalDistance: ...,
    totalDuration: ...,
    optimizedOrder: response.data.routes[0].waypoint_order,
    legs: response.data.routes[0].legs
  };
}
```

2. **Demand-Based Route Planning**
```typescript
/**
 * Analyze passenger demand by postcode area
 * Returns hotspots for new route planning
 */
export async function analyzeDemandByArea(
  tenantId: number,
  dateRange: { start: Date; end: Date }
): Promise<DemandHotspot[]> {
  // Query bus_bookings grouped by postcode area
  // Return areas with high booking frequency
  // Used for: New route planning, service frequency adjustment
}
```

3. **Bus vs Car Service Recommendation**
```typescript
/**
 * Recommend service type based on passenger volume and area
 * If 5+ passengers in same postcode area going to same destination -> suggest bus
 * Otherwise -> suggest individual car transport
 */
export function recommendServiceType(
  passengerCount: number,
  originPostcodes: string[],
  destination: string,
  scheduleFrequency: 'daily' | 'weekly' | 'adhoc'
): 'transport' | 'bus' | 'both' {
  // Logic:
  // - High volume + regular schedule + similar origins = Bus route
  // - Low volume + irregular + scattered origins = Individual transport
  // - Medium volume = Both (bus for regular, car for adhoc)
}
```

**Usage:**
- **For Transport (existing):** Passenger matching, detour calculation
- **For Bus (new):** Route stop optimization, demand forecasting, new route planning

---

### 3.4 Payroll Integration

**Files:**
- `backend/src/routes/payroll.routes.ts`
- `frontend/src/components/payroll/PayrollPage.tsx`

**Current State:**
- Payroll records link to `driver_id`
- Employment types: contracted_hourly, contracted_weekly, contracted_monthly, freelance
- Hours come from timesheets (`tenant_timesheets.total_hours`)
- **No service type breakdown**

**Required Changes:**

1. **Add Service Type Tracking to Timesheets**
```sql
-- Migration: add-service-hours-to-timesheets.sql
ALTER TABLE tenant_timesheets
ADD COLUMN transport_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN bus_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN other_hours DECIMAL(5,2) DEFAULT 0,
ADD CONSTRAINT check_hours_total CHECK (total_hours = transport_hours + bus_hours + other_hours);

COMMENT ON COLUMN tenant_timesheets.transport_hours IS 'Hours worked on Section 19 transport services';
COMMENT ON COLUMN tenant_timesheets.bus_hours IS 'Hours worked on Section 22 bus services';
```

2. **Auto-Calculate Bus Hours from Timetables**
```typescript
// In driver timesheet submission
async function calculateBusHours(driverId: number, weekStartDate: Date): Promise<number> {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const timetables = await query(`
    SELECT SUM(
      (r.estimated_duration_minutes / 60.0) *
      EXTRACT(EPOCH FROM (t.valid_until - t.valid_from)) / 86400 / 7
    ) as total_hours
    FROM section22_timetables t
    JOIN section22_bus_routes r ON t.route_id = r.route_id
    WHERE t.driver_id = $1
      AND t.valid_from <= $2
      AND (t.valid_until IS NULL OR t.valid_until >= $3)
  `, [driverId, weekEndDate, weekStartDate]);

  return parseFloat(timetables[0]?.total_hours || '0');
}
```

3. **Service Revenue Breakdown in Payroll**
```sql
-- Add columns to payroll_records
ALTER TABLE tenant_payroll_records
ADD COLUMN transport_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN bus_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN revenue_source_breakdown JSONB;

COMMENT ON COLUMN tenant_payroll_records.transport_revenue IS 'Revenue generated from transport services this period';
COMMENT ON COLUMN tenant_payroll_records.bus_revenue IS 'Revenue generated from bus services this period';
```

4. **Payroll Summary by Service**
```typescript
// In PayrollPage component
interface ServiceBreakdown {
  transport: { hours: number; revenue: number };
  bus: { hours: number; revenue: number };
  total: { hours: number; revenue: number };
}

// Display service breakdown in payroll period summary
<div className="service-breakdown">
  <h3>Hours by Service Type</h3>
  <div className="breakdown-grid">
    <div className="service-card transport">
      <div className="service-label">🚗 Transport Services</div>
      <div className="service-hours">{breakdown.transport.hours}h</div>
      <div className="service-revenue">£{breakdown.transport.revenue.toFixed(2)}</div>
    </div>
    <div className="service-card bus">
      <div className="service-label">🚌 Bus Services</div>
      <div className="service-hours">{breakdown.bus.hours}h</div>
      <div className="service-revenue">£{breakdown.bus.revenue.toFixed(2)}</div>
    </div>
  </div>
</div>
```

---

## 4. Service Configuration & Context

### 4.1 Tenant-Level Service Flags

**Database:** Already exists in `tenants` table via `add-dual-service-architecture.sql` migration

```sql
tenants
├── service_transport_enabled BOOLEAN DEFAULT true
├── service_bus_enabled BOOLEAN DEFAULT false
└── active_service_view VARCHAR(50) DEFAULT 'transport'
```

**Usage:**
- Controls which modules are available to the tenant
- Determines which dashboards to show
- Filters navigation menus

### 4.2 Service Context Provider

**Create:** `frontend/src/contexts/ServiceContext.tsx`

```typescript
interface ServiceContextValue {
  transportEnabled: boolean;
  busEnabled: boolean;
  activeService: 'transport' | 'bus';
  setActiveService: (service: 'transport' | 'bus') => void;
  hasMultipleServices: boolean;
}

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const [activeService, setActiveService] = useState<'transport' | 'bus'>(
    tenant?.active_service_view || 'transport'
  );

  const transportEnabled = tenant?.service_transport_enabled ?? true;
  const busEnabled = tenant?.service_bus_enabled ?? false;
  const hasMultipleServices = transportEnabled && busEnabled;

  return (
    <ServiceContext.Provider value={{
      transportEnabled,
      busEnabled,
      activeService,
      setActiveService,
      hasMultipleServices
    }}>
      {children}
    </ServiceContext.Provider>
  );
};
```

**Usage in Components:**
```typescript
const { transportEnabled, busEnabled, activeService } = useService();

if (hasMultipleServices) {
  return <ServiceSwitcher active={activeService} onChange={setActiveService} />;
}
```

---

## 5. Implementation Phases

### Phase 1: Customer Dashboard Integration (Week 1)
**Priority:** HIGH
**Complexity:** MEDIUM

**Tasks:**
1. Add `getBusBookings` endpoint to `customer-dashboard.routes.ts`
2. Add `createBusBooking` endpoint for customer self-service
3. Update `CustomerDashboard.tsx`:
   - Fetch bus bookings if `service_bus_enabled`
   - Merge transport schedules + bus bookings into unified calendar
   - Add service type badges
   - Add bus booking modal (similar to journey request)
4. Add service switcher component if tenant has both services
5. Update stats cards to show transport vs bus journey counts

**Acceptance Criteria:**
- ✅ Customer sees both car schedules and bus bookings in calendar
- ✅ Service type clearly indicated (icon/color)
- ✅ Can book bus seats from customer portal
- ✅ Service switcher works for multi-service tenants

---

### Phase 2: Driver Dashboard Integration (Week 2)
**Priority:** HIGH
**Complexity:** MEDIUM

**Tasks:**
1. Add `works_on_transport` and `works_on_bus` flags to `tenant_drivers` table
2. Add `getBusTimetables` endpoint to `driver-dashboard.routes.ts`
3. Add `getBusPassengerList` endpoint for driver manifest
4. Update `DriverDashboard.tsx`:
   - Fetch bus timetables if driver `works_on_bus`
   - Merge schedule_assignments + bus timetables into unified view
   - Render different cards for transport vs bus assignments
   - Add "View Passenger Manifest" for bus services
5. Add service filter toggle (All | Transport | Bus)
6. Update weekly overview to show both service types

**Acceptance Criteria:**
- ✅ Driver sees both car assignments and bus timetables
- ✅ Can view passenger manifest for bus services
- ✅ Service type clearly indicated
- ✅ Can filter by service type

---

### Phase 3: Route Optimization Extension (Week 3)
**Priority:** MEDIUM
**Complexity:** HIGH

**Tasks:**
1. Extend `routeOptimization.service.ts`:
   - Add `calculateMultiStopRoute()` for bus route planning
   - Add `analyzeDemandByArea()` for postcode-based demand forecasting
   - Add `recommendServiceType()` helper
2. Create new route: `route-optimizer-bus.routes.ts`:
   - POST `/optimize-bus-route` - Optimize stop order for new route
   - GET `/analyze-demand` - Get demand hotspots by postcode
   - POST `/recommend-service` - Get service type recommendation
3. Integrate with `BusRoutesPage`:
   - Add "Optimize Stops" button on route edit
   - Show demand heatmap on route planning map
4. Extend transport route optimizer:
   - Add "Convert to Bus Route" suggestion if 5+ passengers detected

**Acceptance Criteria:**
- ✅ Can optimize stop order for bus routes using Google Maps
- ✅ Demand hotspots visualized on map
- ✅ Service type recommendation works correctly
- ✅ Existing transport optimizer still works

---

### Phase 4: Payroll Service Breakdown (Week 4)
**Priority:** MEDIUM
**Complexity:** LOW

**Tasks:**
1. Add service hour columns to `tenant_timesheets`:
   - `transport_hours`, `bus_hours`, `other_hours`
2. Add service revenue columns to `tenant_payroll_records`:
   - `transport_revenue`, `bus_revenue`
3. Update timesheet submission to auto-calculate bus hours from timetables
4. Update `PayrollPage.tsx`:
   - Show service breakdown in period summary
   - Display transport vs bus hours/revenue
5. Add service breakdown to payroll exports (CSV, PDF)

**Acceptance Criteria:**
- ✅ Timesheets track hours by service type
- ✅ Payroll summary shows service breakdown
- ✅ Bus hours auto-calculated from timetables
- ✅ Export includes service breakdown

---

### Phase 5: Admin & Reporting (Week 5)
**Priority:** LOW
**Complexity:** LOW

**Tasks:**
1. Add service type filter to all admin reports
2. Update dashboard analytics to split by service
3. Add service comparison charts (transport vs bus):
   - Revenue comparison
   - Passenger count comparison
   - Driver utilization by service
4. Update compliance reports to show Section 19 vs Section 22 separately

**Acceptance Criteria:**
- ✅ All reports filterable by service type
- ✅ Service comparison charts working
- ✅ Compliance reports separated by section

---

## 6. Database Migrations Required

### Migration 1: Add Driver Service Flags
```sql
-- add-driver-service-flags.sql
ALTER TABLE tenant_drivers
ADD COLUMN works_on_transport BOOLEAN DEFAULT true,
ADD COLUMN works_on_bus BOOLEAN DEFAULT false,
ADD COLUMN primary_service VARCHAR(50) DEFAULT 'transport';

COMMENT ON COLUMN tenant_drivers.works_on_transport IS 'Driver assigned to Section 19 transport services';
COMMENT ON COLUMN tenant_drivers.works_on_bus IS 'Driver assigned to Section 22 bus services';
COMMENT ON COLUMN tenant_drivers.primary_service IS 'Primary service for payroll allocation';
```

### Migration 2: Add Service Hours to Timesheets
```sql
-- add-service-hours-to-timesheets.sql
ALTER TABLE tenant_timesheets
ADD COLUMN transport_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN bus_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN other_hours DECIMAL(5,2) DEFAULT 0;

-- Populate existing timesheets (assume all transport)
UPDATE tenant_timesheets
SET transport_hours = total_hours
WHERE transport_hours = 0 AND total_hours > 0;

ALTER TABLE tenant_timesheets
ADD CONSTRAINT check_hours_total CHECK (total_hours = transport_hours + bus_hours + other_hours);
```

### Migration 3: Add Service Revenue to Payroll
```sql
-- add-service-revenue-to-payroll.sql
ALTER TABLE tenant_payroll_records
ADD COLUMN transport_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN bus_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN revenue_source_breakdown JSONB;

ALTER TABLE tenant_freelance_submissions
ADD COLUMN service_type VARCHAR(50) DEFAULT 'transport',
ADD COLUMN service_breakdown JSONB;

COMMENT ON COLUMN tenant_payroll_records.revenue_source_breakdown IS 'JSON breakdown of revenue by service type and route';
```

---

## 7. API Endpoints Summary

### New Customer Dashboard Endpoints
```
GET    /api/tenants/:tenantId/customer-dashboard/:customerId/bus-bookings
       → Returns array of bus bookings with route/timetable info

POST   /api/tenants/:tenantId/customer-dashboard/:customerId/bus-bookings
       → Create new bus booking from customer portal
       Body: { timetableId, serviceDate, boardingStopId, alightingStopId, passengerTier, specialRequirements }

GET    /api/tenants/:tenantId/customer-dashboard/:customerId/combined-schedule
       → Returns merged view of transport schedules + bus bookings
```

### New Driver Dashboard Endpoints
```
GET    /api/tenants/:tenantId/driver-dashboard/:driverId/bus-timetables
       → Returns timetables where driver_id = :driverId for date range

GET    /api/tenants/:tenantId/driver-dashboard/:driverId/bus-passenger-list/:timetableId/:serviceDate
       → Returns all bus_bookings for specific timetable/date with passenger details

GET    /api/tenants/:tenantId/driver-dashboard/:driverId/combined-schedule
       → Returns merged view of schedule_assignments + bus timetables
```

### New Route Optimizer Endpoints
```
POST   /api/tenants/:tenantId/route-optimizer/optimize-bus-route
       Body: { stops: Location[], startPoint, endPoint, optimize: boolean }
       → Returns optimized stop order using Google Maps Directions API

GET    /api/tenants/:tenantId/route-optimizer/analyze-demand
       Query: { startDate, endDate, serviceType: 'transport' | 'bus' | 'both' }
       → Returns demand hotspots by postcode area

POST   /api/tenants/:tenantId/route-optimizer/recommend-service
       Body: { passengerCount, originPostcodes, destination, scheduleFrequency }
       → Returns recommended service type: 'transport' | 'bus' | 'both'
```

### New Payroll Endpoints
```
GET    /api/tenants/:tenantId/payroll/periods/:periodId/service-breakdown
       → Returns hours and revenue breakdown by service type

GET    /api/tenants/:tenantId/payroll/drivers/:driverId/service-hours
       Query: { startDate, endDate }
       → Returns driver's hours split by service type
```

---

## 8. Testing Strategy

### Unit Tests
- Route optimization multi-stop calculation
- Service type recommendation logic
- Hour calculation from bus timetables
- Payroll service breakdown calculations

### Integration Tests
- Customer dashboard shows both service types correctly
- Driver dashboard merges assignments correctly
- Payroll period totals match service breakdown
- Bus booking creation from customer portal

### E2E Tests (Playwright/Cypress)
1. **Multi-Service Tenant Flow:**
   - Login as customer of multi-service tenant
   - Verify both transport and bus sections visible
   - Book bus seat
   - Request ad-hoc car journey
   - Verify calendar shows both

2. **Driver Multi-Service Flow:**
   - Login as driver assigned to both services
   - Verify today's schedule shows car assignments
   - Verify today's schedule shows bus timetables
   - Filter by service type
   - View bus passenger manifest

3. **Payroll Integration Flow:**
   - Create payroll period
   - Auto-generate records
   - Verify bus hours calculated from timetables
   - Verify service breakdown displayed
   - Export and verify CSV contains service columns

### Manual Testing Checklist
- [ ] Customer with transport-only tenant sees no bus features
- [ ] Customer with bus-only tenant sees no transport features
- [ ] Customer with both services sees service switcher
- [ ] Driver with transport assignments sees car schedules
- [ ] Driver with bus assignments sees timetables
- [ ] Driver with both sees merged view
- [ ] Payroll summary shows correct service breakdown
- [ ] Route optimizer works for both car and bus
- [ ] Service type badges display correctly
- [ ] Color coding consistent across app

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data model confusion** (schedule JSON vs bus_bookings) | HIGH | MEDIUM | Clear documentation, unified API responses with explicit `serviceType` field |
| **Performance** (multiple API calls for merged views) | MEDIUM | MEDIUM | Implement combined endpoints (`/combined-schedule`), use pagination |
| **UI complexity** (too many conditionals) | MEDIUM | LOW | Extract service-aware components, use composition over conditionals |
| **Payroll calculation errors** (service hour breakdown) | LOW | HIGH | Extensive unit tests, manual verification in staging |
| **Route optimizer API costs** (Google Maps) | LOW | MEDIUM | Cache results, implement request throttling, use estimation where possible |
| **Driver confusion** (which service am I driving today?) | MEDIUM | MEDIUM | Clear visual indicators, color coding, separate cards |

---

## 10. Success Metrics

### Technical Metrics
- ✅ Zero data model conflicts (schedule JSON vs bookings)
- ✅ API response time < 500ms for merged views
- ✅ 100% test coverage for service integration logic
- ✅ Zero payroll calculation discrepancies

### User Experience Metrics
- ✅ Customer can complete bus booking in < 3 clicks
- ✅ Driver sees unified schedule without confusion
- ✅ Service type immediately obvious (< 1 second recognition)
- ✅ No complaints about "where did my transport/bus go?"

### Business Metrics
- ✅ Multi-service tenants show higher engagement (track active users)
- ✅ Payroll processing time unchanged despite service breakdown
- ✅ Route optimizer usage increases for bus route planning
- ✅ Customer satisfaction with unified experience > 4/5

---

## 11. Conclusion

This integration plan provides a comprehensive roadmap for unifying Section 19 (car-based transport) and Section 22 (community bus) services while preserving the distinct characteristics of each service type.

**Key Principles:**
1. **Service-aware, not service-siloed** - Components adapt to available services
2. **Unified experience** - Single dashboard shows all relevant information
3. **Explicit service types** - Always clear which service type is being displayed
4. **Backward compatible** - Existing single-service tenants unaffected
5. **Data integrity** - Separate storage models, unified presentation layer

**Next Steps:**
1. Review and approve integration plan
2. Create detailed technical specifications for Phase 1
3. Set up development environment with test data for both service types
4. Begin Phase 1 implementation (Customer Dashboard Integration)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Status:** Draft - Awaiting Approval
