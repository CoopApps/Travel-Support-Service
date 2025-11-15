# Dual Service Implementation Guide

This guide provides step-by-step instructions for implementing the dual-service architecture (Community Transport + Community Bus) in the Cooperative Commonwealth platform.

## Quick Start

### 1. Run the Database Migration

First, apply the database schema changes:

```bash
cd backend

# Option 1: Run on Railway (recommended for production)
DATABASE_URL="postgresql://postgres:PASSWORD@hopper.proxy.rlwy.net:55001/railway" node run-dual-service-migration.js

# Option 2: Run locally (for development)
node run-dual-service-migration.js
```

This will create:
- Service configuration columns in `tenants` table
- 5 new tables for bus service functionality
- User preferences table
- Subscription module support
- Automated triggers and helper views

### 2. Verify Migration Success

Check that the tables were created:

```bash
# Create a quick verification script
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  const result = await client.query(\`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name LIKE 'section22_%'
    ORDER BY table_name
  \`);
  console.log('✅ Section 22 tables created:');
  result.rows.forEach(row => console.log('  -', row.table_name));
  await client.end();
  await pool.end();
})();
"
```

Expected output:
```
✅ Section 22 tables created:
  - section22_bus_bookings
  - section22_bus_routes
  - section22_route_stops
  - section22_seat_availability
  - section22_timetables
```

---

## Phase 1: Backend API Development

### Step 1: Create Bus Routes API

Create `backend/src/routes/bus-routes.routes.ts`:

```typescript
import express, { Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all routes for a tenant
router.get(
  '/tenants/:tenantId/bus/routes',
  verifyTenantAccess,
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status } = req.query;

    try {
      const routes = await query(
        `SELECT
          r.route_id,
          r.route_number,
          r.route_name,
          r.description,
          r.origin_point,
          r.destination_point,
          r.total_distance_miles,
          r.estimated_duration_minutes,
          r.service_pattern,
          r.status,
          r.start_date,
          r.end_date,
          COUNT(DISTINCT s.stop_id) as stop_count,
          COUNT(DISTINCT t.timetable_id) as timetable_count
         FROM section22_bus_routes r
         LEFT JOIN section22_route_stops s ON r.route_id = s.route_id
         LEFT JOIN section22_timetables t ON r.route_id = t.route_id
         WHERE r.tenant_id = $1
         ${status ? 'AND r.status = $2' : ''}
         GROUP BY r.route_id
         ORDER BY r.route_number`,
        status ? [tenantId, status] : [tenantId]
      );

      return res.json(routes);
    } catch (error) {
      logger.error('Failed to fetch bus routes', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create a new route
router.post(
  '/tenants/:tenantId/bus/routes',
  verifyTenantAccess,
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      route_number,
      route_name,
      description,
      origin_point,
      destination_point,
      total_distance_miles,
      estimated_duration_minutes,
      service_pattern,
      operating_days
    } = req.body;

    try {
      const result = await queryOne(
        `INSERT INTO section22_bus_routes (
          tenant_id,
          route_number,
          route_name,
          description,
          origin_point,
          destination_point,
          total_distance_miles,
          estimated_duration_minutes,
          service_pattern,
          operates_monday,
          operates_tuesday,
          operates_wednesday,
          operates_thursday,
          operates_friday,
          operates_saturday,
          operates_sunday,
          created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          tenantId,
          route_number,
          route_name,
          description,
          origin_point,
          destination_point,
          total_distance_miles,
          estimated_duration_minutes,
          service_pattern,
          operating_days?.monday || false,
          operating_days?.tuesday || false,
          operating_days?.wednesday || false,
          operating_days?.thursday || false,
          operating_days?.friday || false,
          operating_days?.saturday || false,
          operating_days?.sunday || false,
          req.user?.userId
        ]
      );

      logger.info('Bus route created', { tenantId, routeId: result.route_id });
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create bus route', { tenantId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get route details with stops
router.get(
  '/tenants/:tenantId/bus/routes/:routeId',
  verifyTenantAccess,
  async (req: Request, res: Response) => {
    const { tenantId, routeId } = req.params;

    try {
      const route = await queryOne(
        `SELECT * FROM section22_bus_routes
         WHERE tenant_id = $1 AND route_id = $2`,
        [tenantId, routeId]
      );

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      const stops = await query(
        `SELECT * FROM section22_route_stops
         WHERE route_id = $1
         ORDER BY stop_sequence`,
        [routeId]
      );

      return res.json({ ...route, stops });
    } catch (error) {
      logger.error('Failed to fetch route details', { tenantId, routeId, error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add more endpoints: update, delete, add stops, etc.

export default router;
```

### Step 2: Register Routes in Server

Update `backend/src/server.ts`:

```typescript
// Import new routes
import busRoutesRoutes from './routes/bus-routes.routes';
import busTimetablesRoutes from './routes/bus-timetables.routes';
import busBookingsRoutes from './routes/bus-bookings.routes';

// Register routes
app.use('/api', busRoutesRoutes);
app.use('/api', busTimetablesRoutes);
app.use('/api', busBookingsRoutes);
```

### Step 3: Create API Service Methods (Frontend)

Create `frontend/src/services/busApi.ts`:

```typescript
import { apiClient } from './api';

export interface BusRoute {
  route_id: number;
  tenant_id: number;
  route_number: string;
  route_name: string;
  description?: string;
  origin_point: string;
  destination_point: string;
  total_distance_miles?: number;
  estimated_duration_minutes?: number;
  service_pattern: 'daily' | 'weekdays' | 'weekends' | 'custom';
  status: 'planning' | 'registered' | 'active' | 'suspended' | 'cancelled';
  start_date?: string;
  end_date?: string;
  stop_count?: number;
  timetable_count?: number;
}

export const busRoutesApi = {
  getRoutes: async (tenantId: number, status?: string): Promise<BusRoute[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get(`/tenants/${tenantId}/bus/routes`, { params });
    return response.data;
  },

  getRoute: async (tenantId: number, routeId: number): Promise<BusRoute> => {
    const response = await apiClient.get(`/tenants/${tenantId}/bus/routes/${routeId}`);
    return response.data;
  },

  createRoute: async (tenantId: number, data: Partial<BusRoute>): Promise<BusRoute> => {
    const response = await apiClient.post(`/tenants/${tenantId}/bus/routes`, data);
    return response.data;
  },

  updateRoute: async (tenantId: number, routeId: number, data: Partial<BusRoute>): Promise<BusRoute> => {
    const response = await apiClient.put(`/tenants/${tenantId}/bus/routes/${routeId}`, data);
    return response.data;
  },

  deleteRoute: async (tenantId: number, routeId: number): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/bus/routes/${routeId}`);
  }
};
```

---

## Phase 2: Frontend Core Components

### Step 1: Create Service Context

Create `frontend/src/contexts/ServiceContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTenantStore } from '../stores/tenantStore';

type ServiceType = 'transport' | 'bus';

interface ServiceContextValue {
  activeService: ServiceType;
  setActiveService: (service: ServiceType) => void;
  transportEnabled: boolean;
  busEnabled: boolean;
  bothEnabled: boolean;
}

const ServiceContext = createContext<ServiceContextValue | undefined>(undefined);

export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenantStore();
  const [activeService, setActiveService] = useState<ServiceType>('transport');

  const transportEnabled = tenant?.service_transport_enabled ?? true;
  const busEnabled = tenant?.service_bus_enabled ?? false;
  const bothEnabled = transportEnabled && busEnabled;

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('preferred_service');
    if (saved === 'bus' && busEnabled) {
      setActiveService('bus');
    } else if (saved === 'transport' && transportEnabled) {
      setActiveService('transport');
    }
  }, [transportEnabled, busEnabled]);

  // Save preference when changed
  const handleSetActiveService = (service: ServiceType) => {
    setActiveService(service);
    localStorage.setItem('preferred_service', service);
  };

  return (
    <ServiceContext.Provider
      value={{
        activeService,
        setActiveService: handleSetActiveService,
        transportEnabled,
        busEnabled,
        bothEnabled
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useServiceContext() {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServiceContext must be used within ServiceProvider');
  }
  return context;
}
```

### Step 2: Update App.tsx

```typescript
import { ServiceProvider } from './contexts/ServiceContext';
import { ServiceToggle } from './components/layout/ServiceToggle';

function App() {
  return (
    <Router>
      <ServiceProvider>
        <div className="app">
          <Header />
          <ServiceToggle />
          <Routes>
            {/* Routes here */}
          </Routes>
        </div>
      </ServiceProvider>
    </Router>
  );
}
```

---

## Phase 3: Build Bus Service UI

### Step 1: Bus Dashboard

Create `frontend/src/components/bus/BusDashboard.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { busRoutesApi, busTimetablesApi, busBookingsApi } from '../../services/busApi';
import { useTenantStore } from '../../stores/tenantStore';

export default function BusDashboard() {
  const { tenant } = useTenantStore();
  const [stats, setStats] = useState({
    activeRoutes: 0,
    todaysServices: 0,
    todaysBookings: 0,
    availableSeats: 0
  });

  useEffect(() => {
    if (!tenant) return;

    // Fetch dashboard data
    Promise.all([
      busRoutesApi.getRoutes(tenant.tenant_id, 'active'),
      busTimetablesApi.getTodaysServices(tenant.tenant_id),
      busBookingsApi.getTodaysBookings(tenant.tenant_id)
    ]).then(([routes, services, bookings]) => {
      setStats({
        activeRoutes: routes.length,
        todaysServices: services.length,
        todaysBookings: bookings.length,
        availableSeats: services.reduce((sum, s) => sum + s.available_seats, 0)
      });
    });
  }, [tenant]);

  return (
    <div className="bus-dashboard">
      <h1>Community Bus Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚌</div>
          <div className="stat-value">{stats.activeRoutes}</div>
          <div className="stat-label">Active Routes</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats.todaysServices}</div>
          <div className="stat-label">Today's Services</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-value">{stats.todaysBookings}</div>
          <div className="stat-label">Today's Bookings</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💺</div>
          <div className="stat-value">{stats.availableSeats}</div>
          <div className="stat-label">Available Seats</div>
        </div>
      </div>

      {/* Add more dashboard content */}
    </div>
  );
}
```

### Step 2: Bus Routes Page

Create `frontend/src/components/bus/BusRoutesPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { busRoutesApi, BusRoute } from '../../services/busApi';
import { useTenantStore } from '../../stores/tenantStore';

export default function BusRoutesPage() {
  const { tenant } = useTenantStore();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    busRoutesApi.getRoutes(tenant.tenant_id)
      .then(data => {
        setRoutes(data);
        setLoading(false);
      });
  }, [tenant]);

  if (loading) return <div>Loading routes...</div>;

  return (
    <div className="bus-routes-page">
      <div className="page-header">
        <h1>Bus Routes</h1>
        <button className="btn-primary" onClick={() => {/* Open create modal */}}>
          Create New Route
        </button>
      </div>

      <div className="routes-list">
        {routes.map(route => (
          <div key={route.route_id} className="route-card">
            <div className="route-header">
              <div className="route-number">{route.route_number}</div>
              <div className="route-status">{route.status}</div>
            </div>
            <h3>{route.route_name}</h3>
            <div className="route-details">
              <span>{route.origin_point}</span>
              <span>→</span>
              <span>{route.destination_point}</span>
            </div>
            <div className="route-meta">
              <span>{route.stop_count} stops</span>
              <span>{route.timetable_count} services</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 4: Testing

### Test Scenarios

1. **Service Toggle**
   - User with both services can switch between transport and bus
   - Preference is saved and persists across sessions
   - Correct routes are shown based on active service

2. **Bus Route Creation**
   - Create new route with stops
   - Validate required fields
   - Route appears in routes list

3. **Timetable Management**
   - Create timetable for a route
   - Assign vehicle and driver
   - Set capacity correctly

4. **Booking System**
   - Create seat booking
   - Verify seat availability updates
   - Check booking appears in manifest

5. **Subscription Limits**
   - Verify route limits are enforced
   - Test upgrade flow to increase limits

---

## Deployment Checklist

- [ ] Database migration run on production (Railway)
- [ ] Environment variables updated
- [ ] Backend routes registered
- [ ] Frontend built and deployed
- [ ] Service toggle tested with multi-service tenant
- [ ] Bus routes API tested
- [ ] Booking system tested
- [ ] Seat availability triggers working
- [ ] Subscription tiers configured
- [ ] Documentation updated
- [ ] User training materials prepared

---

## Troubleshooting

### Migration fails with "relation already exists"
The migration uses `IF NOT EXISTS` clauses, so this is safe to ignore.

### Service toggle doesn't appear
Check that both `service_transport_enabled` and `service_bus_enabled` are `true` for the tenant.

### Seat availability not updating
Verify the trigger function was created:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'section22_bus_bookings';
```

### Can't create route - subscription limit
Check the tenant's subscription:
```sql
SELECT bus_route_limit FROM subscriptions WHERE tenant_id = X;
```

---

## Next Steps After Implementation

1. **Add route optimization** - Suggest optimal stop sequences
2. **Real-time tracking** - GPS integration for live bus locations
3. **Customer mobile app** - Allow passengers to book from mobile
4. **Driver mobile app** - Route navigation and passenger manifest
5. **Automated reporting** - Section 22 compliance reports for Traffic Commissioner

This implementation creates a solid foundation for dual-service operations while maintaining code quality and user experience.
