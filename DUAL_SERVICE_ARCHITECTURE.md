# Dual-Service Architecture: Community Transport vs Community Bus

## Executive Summary

This document outlines the architecture for supporting two distinct service models within the Cooperative Commonwealth platform:

1. **Community Transport Service** - Car-based scheduled and ad-hoc journeys (existing system)
2. **Community Bus Service** - Section 22 local bus operations with route planning and seat assignment

## Architectural Decision

**Recommended Approach: Single Platform with Service Modules**

Rather than creating entirely separate applications, we recommend a **modular service architecture** within the existing multi-tenant platform. This provides:

- **Single tenant management** - One organization can purchase/enable one or both services
- **Shared infrastructure** - Common auth, billing, user management, compliance
- **Service-specific features** - Distinct UI and workflows for each service type
- **Seamless switching** - Toggle between services when both are enabled
- **Cost efficiency** - No duplicate infrastructure or data synchronization

---

## Service Comparison

| Aspect | Community Transport (Cars) | Community Bus (Section 22) |
|--------|---------------------------|----------------------------|
| **Primary Use** | Scheduled & ad-hoc car journeys | Fixed route bus services |
| **Vehicle Type** | Cars, minibuses (≤16 seats) | Buses (typically 17+ seats) |
| **Booking Model** | Individual/group bookings per trip | Seat-based bookings on scheduled routes |
| **Scheduling** | Flexible, on-demand capable | Fixed timetables, recurring routes |
| **Permits** | Section 19 or Section 22 standard | Section 22 large bus |
| **Key Features** | Trip management, driver assignment | Route planning, timetables, seat maps |
| **Compliance Focus** | Passenger eligibility, volunteer drivers | 28-day notice, traffic commissioner registration |
| **Driver Assignment** | Per-trip assignment | Route rostering |

---

## Database Schema Enhancements

### 1. New Tenant Service Configuration

```sql
-- Add service type columns to tenants table
ALTER TABLE tenants
ADD COLUMN service_transport_enabled BOOLEAN DEFAULT true,
ADD COLUMN service_bus_enabled BOOLEAN DEFAULT false,
ADD COLUMN active_service_view VARCHAR(50) DEFAULT 'transport'; -- 'transport' | 'bus'

COMMENT ON COLUMN tenants.service_transport_enabled IS 'Enable community transport (car) service module';
COMMENT ON COLUMN tenants.service_bus_enabled IS 'Enable community bus (Section 22) service module';
COMMENT ON COLUMN tenants.active_service_view IS 'Currently active service view for multi-service tenants';
```

### 2. Section 22 Bus Service Tables

```sql
-- Bus Routes
CREATE TABLE section22_bus_routes (
    route_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    route_number VARCHAR(20) NOT NULL,
    route_name VARCHAR(200) NOT NULL,
    description TEXT,
    registration_number VARCHAR(100), -- Links to local_bus_service_registrations

    -- Route details
    origin_point VARCHAR(200) NOT NULL,
    destination_point VARCHAR(200) NOT NULL,
    total_distance_miles DECIMAL(6,2),
    estimated_duration_minutes INTEGER,

    -- Service pattern
    service_pattern VARCHAR(50) NOT NULL, -- 'daily' | 'weekdays' | 'weekends' | 'custom'
    operates_monday BOOLEAN DEFAULT false,
    operates_tuesday BOOLEAN DEFAULT false,
    operates_wednesday BOOLEAN DEFAULT false,
    operates_thursday BOOLEAN DEFAULT false,
    operates_friday BOOLEAN DEFAULT false,
    operates_saturday BOOLEAN DEFAULT false,
    operates_sunday BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(50) DEFAULT 'planning', -- 'planning' | 'registered' | 'active' | 'suspended' | 'cancelled'
    start_date DATE,
    end_date DATE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),

    CONSTRAINT unique_tenant_route_number UNIQUE(tenant_id, route_number)
);

CREATE INDEX idx_section22_routes_tenant ON section22_bus_routes(tenant_id, status);
CREATE INDEX idx_section22_routes_registration ON section22_bus_routes(registration_number);

-- Route Stops
CREATE TABLE section22_route_stops (
    stop_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    stop_sequence INTEGER NOT NULL,
    stop_name VARCHAR(200) NOT NULL,
    stop_address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Timing
    arrival_offset_minutes INTEGER, -- Minutes from route start
    departure_offset_minutes INTEGER,
    dwell_time_minutes INTEGER DEFAULT 2,

    -- Stop features
    is_timing_point BOOLEAN DEFAULT false,
    is_pickup_point BOOLEAN DEFAULT true,
    is_setdown_point BOOLEAN DEFAULT true,
    accessibility_features TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_route_stop_sequence UNIQUE(route_id, stop_sequence)
);

CREATE INDEX idx_section22_stops_route ON section22_route_stops(route_id, stop_sequence);

-- Timetables (service patterns for routes)
CREATE TABLE section22_timetables (
    timetable_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    service_name VARCHAR(200) NOT NULL, -- e.g., "Morning Service", "Afternoon Service"

    -- Timing
    departure_time TIME NOT NULL, -- First departure time
    direction VARCHAR(50) NOT NULL, -- 'outbound' | 'inbound' | 'circular'

    -- Vehicle assignment
    vehicle_id INTEGER REFERENCES tenant_vehicles(vehicle_id),
    driver_id INTEGER REFERENCES tenant_drivers(driver_id),

    -- Capacity
    total_seats INTEGER NOT NULL,
    wheelchair_spaces INTEGER DEFAULT 0,

    -- Recurrence
    valid_from DATE NOT NULL,
    valid_until DATE,
    recurrence_pattern JSONB, -- Stores complex recurrence rules

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled' | 'active' | 'cancelled' | 'completed'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_section22_timetables_route ON section22_timetables(route_id, departure_time);
CREATE INDEX idx_section22_timetables_vehicle ON section22_timetables(vehicle_id);
CREATE INDEX idx_section22_timetables_driver ON section22_timetables(driver_id);

-- Bus Bookings (seat-based)
CREATE TABLE section22_bus_bookings (
    booking_id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    -- Passenger
    customer_id INTEGER REFERENCES tenant_customers(customer_id),
    passenger_name VARCHAR(200) NOT NULL,
    passenger_phone VARCHAR(50),

    -- Journey details
    boarding_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
    alighting_stop_id INTEGER REFERENCES section22_route_stops(stop_id),
    service_date DATE NOT NULL,

    -- Seat assignment
    seat_number VARCHAR(10), -- e.g., "1A", "2B"
    requires_wheelchair_space BOOLEAN DEFAULT false,

    -- Booking metadata
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booking_status VARCHAR(50) DEFAULT 'confirmed', -- 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed'

    -- Pricing
    fare_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid' | 'paid' | 'refunded'

    -- Notes
    special_requirements TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),

    CONSTRAINT valid_journey CHECK (boarding_stop_id != alighting_stop_id)
);

CREATE INDEX idx_section22_bookings_timetable ON section22_bus_bookings(timetable_id, service_date);
CREATE INDEX idx_section22_bookings_customer ON section22_bus_bookings(customer_id);
CREATE INDEX idx_section22_bookings_reference ON section22_bus_bookings(booking_reference);
CREATE INDEX idx_section22_bookings_date ON section22_bus_bookings(service_date, booking_status);

-- Seat Availability Cache (for quick lookups)
CREATE TABLE section22_seat_availability (
    availability_id SERIAL PRIMARY KEY,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,

    total_seats INTEGER NOT NULL,
    booked_seats INTEGER DEFAULT 0,
    available_seats INTEGER GENERATED ALWAYS AS (total_seats - booked_seats) STORED,

    wheelchair_spaces INTEGER NOT NULL,
    booked_wheelchair_spaces INTEGER DEFAULT 0,
    available_wheelchair_spaces INTEGER GENERATED ALWAYS AS (wheelchair_spaces - booked_wheelchair_spaces) STORED,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_timetable_date UNIQUE(timetable_id, service_date)
);

CREATE INDEX idx_section22_availability_date ON section22_seat_availability(service_date, timetable_id);
```

### 3. Service-Specific User Preferences

```sql
-- User service preferences
CREATE TABLE user_service_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    preferred_service_view VARCHAR(50) DEFAULT 'transport', -- 'transport' | 'bus'

    -- Service-specific settings
    transport_default_view VARCHAR(50), -- 'calendar' | 'list' | 'map'
    bus_default_view VARCHAR(50), -- 'routes' | 'timetables' | 'bookings'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_tenant_preferences UNIQUE(user_id, tenant_id)
);
```

---

## Frontend Architecture

### 1. Service Toggle Component

Create a new component for switching between services when both are enabled:

**File**: `frontend/src/components/layout/ServiceToggle.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenantStore } from '../../stores/tenantStore';
import { api } from '../../services/api';

type ServiceType = 'transport' | 'bus';

interface ServiceToggleProps {
  currentService: ServiceType;
  onServiceChange: (service: ServiceType) => void;
}

export function ServiceToggle({ currentService, onServiceChange }: ServiceToggleProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenantStore();

  const [isToggling, setIsToggling] = useState(false);

  // Don't render if only one service is enabled
  if (!tenant?.service_transport_enabled || !tenant?.service_bus_enabled) {
    return null;
  }

  const handleToggle = async (newService: ServiceType) => {
    if (newService === currentService || isToggling) return;

    setIsToggling(true);

    try {
      // Save user preference
      await api.updateUserPreferences(tenant.tenant_id, {
        preferred_service_view: newService
      });

      // Navigate to appropriate dashboard
      const targetPath = newService === 'transport'
        ? '/dashboard'
        : '/bus/dashboard';

      navigate(targetPath);
      onServiceChange(newService);
    } catch (error) {
      console.error('Failed to switch service:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="service-toggle-container">
      <div className="service-toggle">
        <button
          className={`toggle-option ${currentService === 'transport' ? 'active' : ''}`}
          onClick={() => handleToggle('transport')}
          disabled={isToggling}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
          <span>Community Transport</span>
          <span className="service-description">Cars & Minibuses</span>
        </button>

        <button
          className={`toggle-option ${currentService === 'bus' ? 'active' : ''}`}
          onClick={() => handleToggle('bus')}
          disabled={isToggling}
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
          <span>Community Bus</span>
          <span className="service-description">Fixed Routes</span>
        </button>
      </div>
    </div>
  );
}
```

**Styles**: `frontend/src/components/layout/ServiceToggle.css`

```css
.service-toggle-container {
  position: sticky;
  top: 64px; /* Below main header */
  z-index: 100;
  background: var(--background-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 24px;
}

.service-toggle {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

.toggle-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 24px;
  background: var(--background-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-option:hover:not(:disabled) {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toggle-option.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.toggle-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-option .icon {
  width: 32px;
  height: 32px;
  fill: currentColor;
}

.toggle-option span:first-of-type {
  font-size: 16px;
  font-weight: 600;
}

.toggle-option .service-description {
  font-size: 12px;
  opacity: 0.8;
}

.toggle-option.active .service-description {
  opacity: 1;
}
```

### 2. Routing Structure

Update `App.tsx` to support dual service routing:

```typescript
import { ServiceToggle } from './components/layout/ServiceToggle';
import BusDashboard from './components/bus/BusDashboard';
import BusRoutesPage from './components/bus/BusRoutesPage';
import BusTimetablesPage from './components/bus/BusTimetablesPage';
import BusBookingsPage from './components/bus/BusBookingsPage';
// ... other imports

function App() {
  const [activeService, setActiveService] = useState<'transport' | 'bus'>('transport');
  const { tenant } = useTenantStore();

  // Determine which services are enabled
  const transportEnabled = tenant?.service_transport_enabled ?? true;
  const busEnabled = tenant?.service_bus_enabled ?? false;

  return (
    <Router>
      <div className="app">
        <Header />

        {/* Service Toggle - only shows if both services enabled */}
        <ServiceToggle
          currentService={activeService}
          onServiceChange={setActiveService}
        />

        <Routes>
          {/* Community Transport Routes (existing) */}
          {transportEnabled && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              {/* ... all existing routes ... */}
            </>
          )}

          {/* Community Bus Routes (new) */}
          {busEnabled && (
            <>
              <Route path="/bus/dashboard" element={<BusDashboard />} />
              <Route path="/bus/routes" element={<BusRoutesPage />} />
              <Route path="/bus/routes/:routeId" element={<RouteDetailPage />} />
              <Route path="/bus/timetables" element={<BusTimetablesPage />} />
              <Route path="/bus/bookings" element={<BusBookingsPage />} />
              <Route path="/bus/seat-map/:timetableId" element={<SeatMapPage />} />
            </>
          )}

          {/* Shared Routes (available in both services) */}
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/permits" element={<PermitsPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}
```

### 3. Navigation Menu Updates

Update the main navigation to be service-aware:

```typescript
// components/layout/Navigation.tsx
function Navigation() {
  const { activeService } = useServiceContext();
  const { tenant } = useTenantStore();

  const transportMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/trips', label: 'Trips', icon: 'directions_car' },
    { path: '/drivers', label: 'Drivers', icon: 'person' },
    { path: '/vehicles', label: 'Vehicles', icon: 'local_shipping' },
    { path: '/schedules', label: 'Schedules', icon: 'calendar_today' },
  ];

  const busMenuItems = [
    { path: '/bus/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/bus/routes', label: 'Routes', icon: 'route' },
    { path: '/bus/timetables', label: 'Timetables', icon: 'schedule' },
    { path: '/bus/bookings', label: 'Bookings', icon: 'confirmation_number' },
    { path: '/bus/drivers', label: 'Driver Roster', icon: 'person' },
  ];

  const sharedMenuItems = [
    { path: '/customers', label: 'Customers', icon: 'people' },
    { path: '/permits', label: 'Permits', icon: 'badge' },
    { path: '/compliance', label: 'Compliance', icon: 'verified' },
    { path: '/reports', label: 'Reports', icon: 'assessment' },
  ];

  const menuItems = activeService === 'transport'
    ? [...transportMenuItems, ...sharedMenuItems]
    : [...busMenuItems, ...sharedMenuItems];

  return (
    <nav className="main-navigation">
      {menuItems.map(item => (
        <NavItem key={item.path} {...item} />
      ))}
    </nav>
  );
}
```

---

## Backend API Structure

### 1. New Route Files

Create separate route modules for bus service:

- `backend/src/routes/bus-routes.routes.ts` - Bus route management
- `backend/src/routes/bus-timetables.routes.ts` - Timetable management
- `backend/src/routes/bus-bookings.routes.ts` - Seat-based bookings
- `backend/src/routes/bus-seat-availability.routes.ts` - Real-time availability

### 2. Service Configuration API

Add to `backend/src/routes/tenant-settings.routes.ts`:

```typescript
// Get tenant service configuration
router.get(
  '/tenants/:tenantId/service-config',
  verifyTenantAccess,
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    try {
      const result = await queryOne<{
        service_transport_enabled: boolean;
        service_bus_enabled: boolean;
        active_service_view: string;
      }>(
        `SELECT
          service_transport_enabled,
          service_bus_enabled,
          active_service_view
         FROM tenants
         WHERE tenant_id = $1`,
        [tenantId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      return res.json(result);
    } catch (error) {
      logger.error('Failed to fetch service config', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update service configuration (admin only)
router.patch(
  '/tenants/:tenantId/service-config',
  verifyTenantAccess,
  verifyRole('admin'),
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      service_transport_enabled,
      service_bus_enabled,
      active_service_view
    } = req.body;

    try {
      const result = await queryOne(
        `UPDATE tenants
         SET service_transport_enabled = COALESCE($2, service_transport_enabled),
             service_bus_enabled = COALESCE($3, service_bus_enabled),
             active_service_view = COALESCE($4, active_service_view)
         WHERE tenant_id = $1
         RETURNING *`,
        [tenantId, service_transport_enabled, service_bus_enabled, active_service_view]
      );

      logger.info('Service configuration updated', { tenantId, result });
      return res.json(result);
    } catch (error) {
      logger.error('Failed to update service config', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

---

## Purchase & Licensing Model

### Subscription Tiers

Extend the existing subscription system to support service modules:

| Tier | Community Transport | Community Bus | Price/Month |
|------|---------------------|---------------|-------------|
| **Transport Starter** | ✓ (up to 5 vehicles) | ✗ | £49 |
| **Transport Professional** | ✓ (up to 20 vehicles) | ✗ | £149 |
| **Bus Starter** | ✗ | ✓ (up to 2 routes) | £79 |
| **Bus Professional** | ✗ | ✓ (up to 10 routes) | £199 |
| **Combined Starter** | ✓ (up to 5 vehicles) | ✓ (up to 2 routes) | £99 |
| **Combined Professional** | ✓ (unlimited) | ✓ (unlimited) | £299 |

### Subscription Schema Updates

```sql
ALTER TABLE subscriptions
ADD COLUMN module_transport BOOLEAN DEFAULT true,
ADD COLUMN module_bus BOOLEAN DEFAULT false,
ADD COLUMN transport_vehicle_limit INTEGER,
ADD COLUMN bus_route_limit INTEGER;

COMMENT ON COLUMN subscriptions.module_transport IS 'Enable community transport service';
COMMENT ON COLUMN subscriptions.module_bus IS 'Enable community bus service';
COMMENT ON COLUMN subscriptions.transport_vehicle_limit IS 'Max vehicles for transport service (NULL = unlimited)';
COMMENT ON COLUMN subscriptions.bus_route_limit IS 'Max routes for bus service (NULL = unlimited)';
```

---

## Implementation Roadmap

### Phase 1: Database Foundation (Week 1)
- [ ] Create migration for service configuration columns
- [ ] Create Section 22 bus service tables
- [ ] Create user service preferences table
- [ ] Run migrations on development and Railway databases
- [ ] Verify existing data integrity

### Phase 2: Backend API (Week 2-3)
- [ ] Create bus routes API endpoints
- [ ] Create timetables API endpoints
- [ ] Create bookings API endpoints
- [ ] Create seat availability API endpoints
- [ ] Add service configuration endpoints
- [ ] Update subscription management for service modules
- [ ] Write integration tests for new endpoints

### Phase 3: Frontend Core (Week 4-5)
- [ ] Create ServiceToggle component
- [ ] Update App.tsx routing for dual services
- [ ] Create service-aware navigation
- [ ] Update tenant store with service config
- [ ] Create shared UI components for bus service

### Phase 4: Bus Service UI (Week 6-8)
- [ ] Build BusDashboard page
- [ ] Build BusRoutesPage with route creation/editing
- [ ] Build RouteDetailPage with stop management
- [ ] Build BusTimetablesPage with schedule management
- [ ] Build BusBookingsPage with seat assignment
- [ ] Build SeatMapPage with visual seat selection
- [ ] Create route map visualization

### Phase 5: Integration & Polish (Week 9-10)
- [ ] Implement service toggle persistence
- [ ] Add service-specific analytics
- [ ] Update billing integration for service modules
- [ ] Comprehensive testing (both services)
- [ ] Documentation updates
- [ ] Migration guide for existing tenants
- [ ] Deploy to Railway

---

## Benefits of This Architecture

### 1. **Flexibility**
- Organizations can start with one service and add the other later
- No need to maintain separate codebases or databases
- Easy to extend with additional service types (e.g., demand-responsive transport)

### 2. **Code Reuse**
- Shared components: drivers, vehicles, customers, permits, compliance
- Single authentication system
- Common analytics and reporting infrastructure
- Unified billing and subscription management

### 3. **User Experience**
- Seamless switching between services with toggle
- Consistent UI/UX across both services
- Single login for multi-service organizations
- Integrated customer directory

### 4. **Operational Efficiency**
- One platform to maintain and update
- Shared data reduces duplication
- Cross-service reporting (e.g., driver utilization across both services)
- Federation capabilities for cooperative commonwealth

### 5. **Cost Efficiency**
- Single hosting infrastructure
- No data synchronization required
- Reduced development and maintenance costs
- Bundled pricing options

---

## Key Differences in Service Workflows

### Community Transport (Existing)
1. Customer requests transport
2. Admin creates trip or customer books online
3. System assigns driver and vehicle
4. Driver completes trip
5. Invoice generated (if applicable)

### Community Bus (New)
1. Admin creates route and timetable
2. Route registered with Traffic Commissioner (28-day notice)
3. Timetable published with seat availability
4. Customers book specific seats on specific services
5. Driver follows route schedule with passenger manifest
6. Service completion tracking and reporting

---

## Migration Path for Existing Tenants

### For Tenants Currently Using Transport Service:

1. **No Action Required**: Transport service continues working as-is
2. **Optional Upgrade**: Contact platform admin to enable bus service
3. **Gradual Adoption**: Can experiment with bus routes while maintaining transport operations
4. **Data Preservation**: All existing trips, drivers, vehicles remain unchanged

### For New Tenants:

1. **Service Selection**: Choose transport, bus, or both during registration
2. **Guided Setup**: Service-specific onboarding wizard
3. **Sample Data**: Optional demo routes/trips to explore features

---

## Questions for Final Decisions

1. **Default Service**: When both services are enabled, which should be the default view?
   - Recommendation: Last used service (stored in user preferences)

2. **Service Icons**: Should we use different color schemes for each service?
   - Recommendation: Transport = Blue, Bus = Green

3. **Shared Resources**: Should drivers/vehicles be shared across both services or service-specific?
   - Recommendation: Shared by default with optional service restrictions

4. **Reporting**: Should analytics combine both services or keep separate?
   - Recommendation: Separate tabs with combined overview option

5. **Mobile Apps**: Should mobile apps support both services or be separate?
   - Recommendation: Single app with service toggle (future consideration)

---

## Next Steps

1. **Review & Approve**: Review this architecture and provide feedback
2. **Create Database Migration**: Implement Phase 1 schema changes
3. **Build Service Toggle**: Create the UI component for switching
4. **Develop Bus Routes API**: Start with core bus routing functionality
5. **Iterate & Expand**: Build remaining features incrementally

This architecture provides a solid foundation for supporting both community transport and community bus services within a unified platform while maintaining the distinct operational models each requires.
