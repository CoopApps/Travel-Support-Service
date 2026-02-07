# Home Care Integration Plan

## Overview

Integration of the Home Care Co-operative service into the existing Travel Support Platform, creating a unified triple-service system where:

1. **Community Transport** - Door-to-door accessible transport (cars/minibuses)
2. **Community Bus (Section 22)** - Fixed route scheduled bus services
3. **Home Care Services** - In-home care visits for elderly and disabled clients

## Key Feature: Partnership Model

When a travel support company and a home care company partner:
- **Home care clients can access transport services for free** (subsidized by the partnership)
- Care visits can automatically trigger transport bookings
- Carers can see client transport schedules
- Transport drivers can coordinate with care visit times
- Integrated billing shows partnership credits/subsidies

---

## Phase 1: Service Context & Toggle ✅ COMPLETE

### Changes Made:

**File: `frontend/src/contexts/ServiceContext.tsx`**
- ✅ Added `'homecare'` to `ServiceType` union type
- ✅ Added `homecareEnabled` prop and state
- ✅ Changed `bothEnabled` to `multipleEnabled` (supports 2+ services)
- ✅ Updated localStorage persistence to handle 'homecare'

**File: `frontend/src/components/layout/ServiceToggleCompact.tsx`**
- ✅ Added homecare icon (house icon) to button display
- ✅ Added "Home Care Services" dropdown option with green theme
- ✅ Conditional rendering based on `transportEnabled`, `busEnabled`, `homecareEnabled`
- ✅ Updated to use `multipleEnabled` instead of `bothEnabled`

### UI Changes:
The service toggle now shows:
- 🚗 **Community Transport** - Cars & Minibuses (Blue theme)
- 🏠 **Home Care Services** - Care Visits & Support (Green theme)
- 🚌 **Community Bus (Section 22)** - Fixed Routes & Schedules (Blue theme)

---

## Phase 2: Move Homecare Code (TODO)

### Backend Integration

**Source:** `travel-support-app -test/homecare/backend/src/`

**Destination:** `travel-support-app -test/conversion/backend/src/homecare/`

**Files to Move:**
```
conversion/backend/src/homecare/
├── routes/
│   ├── client.routes.ts       # Care recipients CRUD
│   ├── carer.routes.ts        # Care workers CRUD
│   ├── visit.routes.ts        # Care visits scheduling
│   ├── care-plan.routes.ts    # Care plan management
│   ├── member.routes.ts       # Co-op membership
│   ├── voting.routes.ts       # Democratic governance
│   ├── invoice.routes.ts      # Care billing
│   ├── document.routes.ts     # Document management
│   └── dashboard.routes.ts    # Homecare analytics
├── types/
│   ├── client.types.ts
│   ├── carer.types.ts
│   ├── visit.types.ts
│   └── care-plan.types.ts
└── middleware/
    └── homecareAuth.ts        # Homecare-specific auth checks
```

**Integration Steps:**
1. Copy homecare routes into conversion backend
2. Update route imports in main server.ts
3. Add homecare routes to Express app with `/api/homecare/` prefix
4. Ensure tenant isolation middleware applies to all homecare routes

### Frontend Integration

**Source:** `travel-support-app -test/homecare/frontend/src/`

**Destination:** `travel-support-app -test/conversion/frontend/src/homecare/`

**Files to Move:**
```
conversion/frontend/src/homecare/
├── components/
│   ├── clients/
│   │   ├── ClientListPage.tsx
│   │   ├── ClientFormModal.tsx
│   │   └── ClientDetailPage.tsx
│   ├── carers/
│   │   ├── CarerListPage.tsx
│   │   ├── CarerFormModal.tsx
│   │   └── CarerSchedulePage.tsx
│   ├── visits/
│   │   ├── VisitCalendar.tsx
│   │   ├── VisitCheckIn.tsx
│   │   └── VisitCheckOut.tsx
│   ├── care-plans/
│   │   └── CarePlanEditor.tsx
│   └── dashboard/
│       └── HomecareDashboard.tsx
├── types/
│   └── homecare.types.ts
└── api/
    └── homecareApi.ts
```

**Integration Steps:**
1. Copy homecare components into conversion frontend
2. Add homecare routes to App.tsx router
3. Update navigation to show/hide homecare menu items based on `homecareEnabled`
4. Ensure API calls use correct tenant context

---

## Phase 3: Database Schema Integration (TODO)

### New Tables for Homecare

Add to existing PostgreSQL schema:

```sql
-- Care Recipients (Clients)
CREATE TABLE tenant_care_clients (
    client_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    customer_id INTEGER REFERENCES tenant_customers(customer_id), -- Link to transport customer
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    nhs_number VARCHAR(20),
    address TEXT,
    postcode VARCHAR(10),
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    mobility_needs TEXT,
    communication_needs TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Care Workers (Carers)
CREATE TABLE tenant_carers (
    carer_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    driver_id INTEGER REFERENCES tenant_drivers(driver_id), -- Link if carer also drives
    user_id INTEGER REFERENCES tenant_users(user_id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(200),
    dbs_check_date DATE,
    dbs_expiry_date DATE,
    dbs_certificate_number VARCHAR(100),
    training_completed JSONB, -- Array of training courses
    qualifications TEXT,
    hourly_rate DECIMAL(10,2),
    availability JSONB, -- Weekly availability schedule
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Care Visits
CREATE TABLE tenant_care_visits (
    visit_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id),
    carer_id INTEGER REFERENCES tenant_carers(carer_id),
    transport_schedule_id INTEGER REFERENCES tenant_schedules(schedule_id), -- Link to transport
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    check_in_location VARCHAR(100),
    check_out_location VARCHAR(100),
    tasks_completed JSONB, -- Array of completed tasks
    notes TEXT,
    medication_administered JSONB, -- MAR records
    mileage_claimed DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Care Plans
CREATE TABLE tenant_care_plans (
    care_plan_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id),
    category VARCHAR(50), -- personal_care, medication, mobility, etc.
    care_needs TEXT,
    support_required TEXT,
    frequency VARCHAR(50), -- daily, weekly, as_needed
    last_review_date DATE,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partnership Agreements
CREATE TABLE tenant_partnerships (
    partnership_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    partner_tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    partnership_type VARCHAR(50), -- 'transport_homecare', 'transport_bus', etc.
    transport_subsidy_type VARCHAR(50), -- 'free', 'discounted', 'credits'
    transport_subsidy_amount DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transport Referrals (for free transport)
CREATE TABLE tenant_transport_referrals (
    referral_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    partnership_id INTEGER NOT NULL REFERENCES tenant_partnerships(partnership_id),
    care_client_id INTEGER NOT NULL REFERENCES tenant_care_clients(client_id),
    transport_customer_id INTEGER REFERENCES tenant_customers(customer_id),
    care_visit_id INTEGER REFERENCES tenant_care_visits(visit_id),
    transport_schedule_id INTEGER REFERENCES tenant_schedules(schedule_id),
    subsidy_applied DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Steps:
1. Create migration file: `backend/migrations/XXX_add_homecare_tables.sql`
2. Run migration on development database
3. Update seed data to include sample homecare data
4. Test data isolation across tenants

---

## Phase 4: Partnership & Referral System (TODO)

### Business Logic

**Partnership Model:**
- Admin creates partnership between two tenants
- Partner A (home care) can refer clients for transport
- Partner B (transport) provides subsidized/free transport
- System tracks credits and usage

### API Endpoints Needed:

```typescript
// Partnership Management (Admin only)
POST   /api/partnerships                       // Create partnership
GET    /api/partnerships                       // List partnerships
PUT    /api/partnerships/:id                   // Update partnership
DELETE /api/partnerships/:id                   // End partnership

// Transport Referrals (Homecare → Transport)
POST   /api/homecare/referrals/transport       // Create referral
GET    /api/homecare/referrals/transport       // List referrals
GET    /api/transport/referrals/incoming       // View incoming referrals (transport side)
PUT    /api/transport/referrals/:id/approve    // Approve referral
POST   /api/transport/referrals/:id/schedule   // Create schedule from referral

// Credit Tracking
GET    /api/partnerships/:id/credits           // View credit balance
POST   /api/partnerships/:id/credits/add       // Add credits (admin)
```

### Frontend Components Needed:

**For Homecare Coordinators:**
- `components/homecare/TransportReferralForm.tsx` - Request transport for client
- Shows client's care visit schedule
- Allows booking transport to/from visit
- Shows partnership subsidy automatically applied

**For Transport Coordinators:**
- `components/transport/IncomingReferralsPage.tsx` - View homecare referrals
- Shows referred clients awaiting transport
- One-click approve and schedule
- Displays partnership credit usage

**For Admins:**
- `components/admin/PartnershipsPage.tsx` - Manage partnerships
- Create/edit partnership agreements
- Set subsidy rules
- Monitor usage and credits

---

## Phase 5: Navigation & Routing (TODO)

### Update App.tsx

Add homecare routes:

```typescript
// In App.tsx
{homecareEnabled && activeService === 'homecare' && (
  <>
    <Route path="/homecare/dashboard" element={<HomecareDashboard />} />
    <Route path="/homecare/clients" element={<ClientListPage />} />
    <Route path="/homecare/clients/:id" element={<ClientDetailPage />} />
    <Route path="/homecare/carers" element={<CarerListPage />} />
    <Route path="/homecare/carers/:id" element={<CarerDetailPage />} />
    <Route path="/homecare/visits" element={<VisitCalendarPage />} />
    <Route path="/homecare/visits/:id/check-in" element={<VisitCheckInPage />} />
    <Route path="/homecare/care-plans" element={<CarePlansPage />} />
    <Route path="/homecare/members" element={<MembersPage />} />
    <Route path="/homecare/voting" element={<VotingPage />} />
    <Route path="/homecare/referrals/transport" element={<TransportReferralsPage />} />
  </>
)}

// Partnership routes (admin only, all services)
<Route path="/partnerships" element={<PartnershipsPage />} />
```

### Update Layout.tsx Navigation

Add homecare menu items:

```typescript
{activeService === 'homecare' && (
  <>
    <NavLink to="/homecare/dashboard" icon="📊">Dashboard</NavLink>
    <NavLink to="/homecare/clients" icon="👤">Clients</NavLink>
    <NavLink to="/homecare/carers" icon="👥">Care Workers</NavLink>
    <NavLink to="/homecare/visits" icon="📅">Visits</NavLink>
    <NavLink to="/homecare/care-plans" icon="📋">Care Plans</NavLink>
    <NavLink to="/homecare/referrals/transport" icon="🚗">Transport Requests</NavLink>
    <NavLink to="/homecare/members" icon="🤝">Members</NavLink>
    <NavLink to="/homecare/voting" icon="🗳️">Voting</NavLink>
  </>
)}

// Partnership menu (show for all services if enabled)
{isAdmin && hasPartnerships && (
  <NavLink to="/partnerships" icon="🔗">Partnerships</NavLink>
)}
```

---

## Phase 6: Tenant Configuration (TODO)

### Database Changes

Update tenants table or subscriptions table:

```sql
ALTER TABLE tenants
ADD COLUMN homecare_enabled BOOLEAN DEFAULT false,
ADD COLUMN has_partnerships BOOLEAN DEFAULT false;

-- Or in subscriptions table
ALTER TABLE subscriptions
ADD COLUMN homecare_service BOOLEAN DEFAULT false;
```

### Admin Interface

Add to Platform Admin > Tenant Configuration:
- ☐ Enable Home Care Service checkbox
- ☐ Partnership configuration panel
  - Select partner tenant
  - Configure subsidy rules
  - Set credit limits

### ServiceProvider Props

Update where ServiceProvider is initialized (likely in App.tsx or main.tsx):

```typescript
<ServiceProvider
  transportEnabled={tenant.transport_enabled}
  busEnabled={tenant.bus_enabled}
  homecareEnabled={tenant.homecare_enabled}
>
  <App />
</ServiceProvider>
```

---

## Phase 7: Testing Plan (TODO)

### Unit Tests
- [ ] ServiceContext correctly handles 3 services
- [ ] ServiceToggleCompact renders all enabled services
- [ ] Partnership credit calculations
- [ ] Referral approval workflow

### Integration Tests
- [ ] Create homecare tenant
- [ ] Create partnership between transport and homecare tenants
- [ ] Create care visit
- [ ] Create transport referral from care visit
- [ ] Approve and schedule transport
- [ ] Verify subsidy applied
- [ ] Complete trip and verify billing

### User Acceptance Tests
- [ ] Homecare coordinator can refer clients for transport
- [ ] Transport coordinator sees and approves referrals
- [ ] Free/subsidized transport appears correctly in billing
- [ ] Service toggle works smoothly between all 3 services
- [ ] Data isolation between tenants maintained

---

## Implementation Order

### Week 1: Backend Foundation
1. ✅ Update ServiceContext and ServiceToggleCompact
2. ⏳ Copy homecare backend routes to conversion
3. ⏳ Add partnership and referral tables to database
4. ⏳ Implement partnership API endpoints

### Week 2: Frontend Components
5. ⏳ Copy homecare frontend components to conversion
6. ⏳ Update routing and navigation
7. ⏳ Build TransportReferralForm component
8. ⏳ Build IncomingReferralsPage component

### Week 3: Integration & Testing
9. ⏳ Build PartnershipsPage (admin)
10. ⏳ Connect referral system between services
11. ⏳ Test end-to-end partnership workflow
12. ⏳ Update documentation

---

## Benefits of Integrated System

### For Clients
- **Seamless Experience** - One platform for care and transport
- **Better Coordination** - Care visits and transport synchronized
- **Free Transport** - Partnership subsidy removes transport barriers
- **Shared Profile** - Medical/mobility info shared between services

### For Organizations
- **Revenue Sharing** - Transport and care orgs support each other
- **Reduced Admin** - Single platform, shared data
- **Better Outcomes** - Coordinated care improves client wellbeing
- **Co-operative Model** - True multi-stakeholder co-op possible

### Technical Benefits
- **Code Reuse** - Shared authentication, tenant isolation, UI components
- **Consistent UX** - Same interface patterns across services
- **Unified Billing** - Cross-service invoicing and credits
- **Single Deployment** - One codebase, multiple service offerings

---

## Next Steps

1. **Copy homecare code** into conversion folder structure
2. **Test service toggle** with all three services enabled
3. **Design partnership UI** mockups
4. **Implement referral API** endpoints
5. **Build transport referral flow** (homecare → transport)
6. **Add partnership admin panel**
7. **End-to-end testing** with real scenarios

---

## Questions to Resolve

- [ ] How should credits/subsidies be calculated? (per trip, monthly allocation, unlimited?)
- [ ] Should transport drivers see client care plans? (privacy vs. safety)
- [ ] Can care workers also be transport drivers? (already supported via linked IDs)
- [ ] Should partnerships be bidirectional? (homecare→transport AND transport→homecare referrals?)
- [ ] What happens when partnership ends? (honor existing referrals, block new ones)

---

**Status:** Phase 1 Complete ✅ | Ready for Phase 2
**Updated:** 2026-02-07
