# Co-operative Commonwealth Platform

## Overview

The **Co-operative Commonwealth** is a multi-app platform designed specifically for third-sector transport organizations. It replaces the traditional subscription tier model (basic/professional/enterprise) with an organization-type-based pricing structure that rewards co-operative ownership models.

### Platform Vision

The Commonwealth hosts multiple applications for the co-operative movement, starting with the Travel Support System. Organizations pay based on their structure, with significant discounts for co-operatives that share governance burdens and for commonwealth members who share services with other co-ops.

## Key Changes from Legacy Platform Admin

### 1. **Pricing Model Transformation**

**OLD MODEL (Removed):**
```
Subscription Tiers:
- Free: Limited features
- Basic: $X/month, max Y users
- Professional: $X/month, max Y users
- Enterprise: $X/month, unlimited users
```

**NEW MODEL (Current):**
```
Organization Types:
- Charity/CIC/Third Sector: Full price (0% discount), unlimited users
- Co-operative: 30% discount, unlimited users, governance requirements
- Commonwealth Co-operative: 50% discount, unlimited users, service sharing + governance
```

**Key Differences:**
- ❌ Removed: subscription_tier column
- ❌ Removed: max_users and max_customers limits
- ✅ Added: organization_type as pricing determiner
- ✅ Added: automatic discount calculation
- ✅ Added: governance tracking to maintain discount eligibility

### 2. **Multi-App Architecture**

The platform can now host multiple applications beyond just Travel Support:

**New `commonwealth_apps` Table:**
- Each app has unique `app_code` (e.g., 'travel_support')
- Tenants are associated with an app via `app_id`
- Platform admins can manage multiple apps from one dashboard

**Current Apps:**
1. **Travel Support System** (`travel_support`) - Accessible transport management

**Future Apps:**
- Additional co-operative sector applications can be added
- Each app can have its own configuration and branding

### 3. **Rebranded Administration**

**platform_admins → commonwealth_admins**

**New Admin Roles:**
- `super_admin` - Full platform access across all apps
- `app_admin` - Manage specific apps
- `support_admin` - Customer support access only
- `financial_admin` - Billing and finance access

**App Permissions:**
Admins can be granted access to:
- All apps: `{"all_apps": true}`
- Specific apps: `{"apps": ["travel_support", "other_app"]}`

## Pricing Structure Details

### How Pricing Works

Each tenant has:
- **base_price**: Monthly cost before discount (default: £100)
- **organization_type**: Determines discount percentage
- **discount_percentage**: Calculated automatically by database trigger
- **Actual Price**: `base_price * (1 - discount_percentage / 100)`

### Organization Types & Discounts

| Organization Type | Discount | Requirements | Enabled Modules |
|-------------------|----------|--------------|-----------------|
| **Charity** | 0% | None | Standard features |
| **CIC** (Community Interest Company) | 0% | None | Standard features |
| **Third Sector** | 0% | None | Standard features |
| **Co-operative** | 30% | ✅ Regular meetings<br>✅ Annual reports<br>✅ Structure documentation | Governance, Membership, Voting (based on model) |
| **Commonwealth Co-operative** | 50% | ✅ All co-op requirements<br>✅ Service sharing with other co-ops<br>✅ Commonwealth reporting | All co-op modules + Commonwealth Network |

### Co-operative Models

For organizations with `organization_type = 'cooperative'`:

#### **Worker Co-operative** (Driver-Owned)
- Drivers own and control the organization
- **Admin**: Governance, membership, voting, worker management
- **Driver Dashboard**: Ownership info, profit sharing, voting rights
- **Customer Dashboard**: Standard features only

#### **Passenger Co-operative** (Customer-Owned)
- Customers own the organization and employ drivers
- **Admin**: Governance, membership, voting, customer management
- **Driver Dashboard**: Standard features only
- **Customer Dashboard**: Membership portal, voting, employment decisions

#### **Hybrid Co-operative** (Mixed Ownership)
- Both drivers and customers have ownership stakes
- **Admin**: Full governance features for both groups
- **Driver Dashboard**: Ownership info, profit sharing, voting
- **Customer Dashboard**: Membership portal, voting, employment decisions

## New Database Schema

### New Tables

**1. `commonwealth_apps`**
```sql
- app_id (PK)
- app_name
- app_code (unique)
- description
- is_active
- config (JSONB)
```

**2. `commonwealth_admins`** (renamed from platform_admins)
```sql
- commonwealth_admin_id (PK) -- renamed from admin_id
- username
- email
- password_hash
- role (legacy: 'super_admin' | 'admin')
- commonwealth_role (new: specific roles)
- app_permissions (JSONB)
```

**3. `commonwealth_service_sharing`**
```sql
- sharing_id (PK)
- provider_tenant_id (FK)
- recipient_tenant_id (FK)
- service_type
- start_date, end_date
- estimated_value, actual_value
```

**4. `tenant_billing_history`**
```sql
- billing_id (PK)
- tenant_id (FK)
- billing_period_start, billing_period_end
- base_price, discount_percentage
- discount_amount, final_price
- organization_type, cooperative_model
- payment_status
```

### Modified Tables

**`tenants` table changes:**
```sql
-- Removed:
❌ subscription_tier
❌ max_users
❌ max_customers

-- Added:
✅ app_id (FK to commonwealth_apps) -- REQUIRED
✅ organization_type -- REQUIRED, determines pricing
✅ cooperative_model -- Required for cooperatives
✅ discount_percentage -- Auto-calculated
✅ base_price -- Monthly price before discount
✅ currency -- ISO 4217 code (GBP, USD, EUR, etc.)
✅ billing_cycle -- monthly, quarterly, annual
✅ governance_requirements (JSONB)
✅ enabled_modules (JSONB)
```

### Database Triggers

**`update_organization_config()`** - Auto-calculates discount and modules:
- Fires on INSERT or UPDATE of organization_type or cooperative_model
- Sets discount_percentage: 0% / 30% / 50%
- Sets governance_requirements based on type
- Configures enabled_modules based on cooperative_model

### Views

**`commonwealth_tenant_overview`** - Comprehensive tenant view with:
- Pricing calculations (base_price, discount, actual_price)
- App information
- Membership counts
- Governance compliance (meetings, reports)
- Commonwealth participation (services provided/received)

**`tenant_pricing_summary`** - Revenue analytics:
- Groups by organization_type and cooperative_model
- Calculates average prices and total monthly revenue

### Helper Functions

**`get_tenant_actual_price(tenant_id)`** - Returns actual monthly price after discount

**`check_commonwealth_eligibility(tenant_id)`** - Checks if a co-op qualifies for commonwealth status:
- Must be a cooperative
- Must provide services to other co-ops
- Must be governanceCompliant (meetings + reports)

## Governance & Compliance

### For Co-operatives (30% Discount)

**Meetings Required:**
- Tracked in `cooperative_meetings` table
- Record: meeting_type, scheduled_date, held_date, attendees_count, quorum_met, minutes_url

**Reports Required:**
- Annual structure report
- Quarterly membership reports
- Tracked in `cooperative_reports` table with approval workflow

**Membership Tracking:**
- `cooperative_membership` table
- Records ownership_shares and voting_rights per member

### For Commonwealth Co-operatives (50% Discount)

All standard co-op requirements PLUS:
- **Service Sharing**: Must provide services to other commonwealth members
- Tracked in `commonwealth_service_sharing` table
- Helper function `check_commonwealth_eligibility()` validates requirements

## Migration Guide

### Step 1: Run the Database Migrations

**First**: Add organization types (if not done):
```bash
psql -h localhost -U postgres -d travel_support_dev \
  -f backend/migrations/add-organization-types.sql
```

**Second**: Refactor to Commonwealth platform:
```bash
psql -h localhost -U postgres -d travel_support_dev \
  -f backend/migrations/refactor-to-cooperative-commonwealth.sql
```

### Step 2: Update Backend Code

**Routes Requiring Updates:**
- `platform-admin.routes.ts` → Update to use new schema
  - Remove subscription_tier references
  - Add app_id handling
  - Update tenant creation/update logic
  - Use commonwealth_admins table

**Types Already Updated:**
- ✅ `backend/src/types/tenant.types.ts` - Complete

**New Routes to Add:**
- ✅ `backend/src/routes/cooperative.routes.ts` - Co-op governance (already created)
- 🔄 `backend/src/routes/commonwealth-admin.routes.ts` - Multi-app management (TODO)
- 🔄 `backend/src/routes/service-sharing.routes.ts` - Commonwealth service sharing (TODO)

### Step 3: Update Frontend

**Remove:**
- Subscription tier dropdowns
- User/customer limit displays
- "Upgrade to Professional" prompts

**Add:**
- Organization type selector
- Co-operative model selector (conditional)
- Discount display
- Actual price calculation display
- Commonwealth admin dashboard (multi-app view)
- Governance compliance widgets (for co-ops)
- Service sharing management (for commonwealth co-ops)

### Step 4: Data Migration

**For Existing Tenants:**
```sql
-- Update existing tenants to set organization type
UPDATE tenants
SET organization_type = 'charity',  -- or appropriate type
    app_id = (SELECT app_id FROM commonwealth_apps WHERE app_code = 'travel_support'),
    base_price = 100.00,
    currency = 'GBP',
    billing_cycle = 'monthly'
WHERE organization_type IS NULL;
```

## API Changes

### Tenant Creation (Platform Admin)

**OLD:**
```json
POST /api/platform-admin/tenants
{
  "company_name": "Example Transport",
  "subdomain": "example",
  "subscription_tier": "professional",
  "max_users": 20,
  "admin_username": "admin",
  "admin_email": "admin@example.com",
  "admin_password": "password123"
}
```

**NEW:**
```json
POST /api/platform-admin/tenants
{
  "company_name": "Example Transport",
  "subdomain": "example",
  "organization_type": "cooperative",
  "cooperative_model": "worker",
  "base_price": 100.00,
  "currency": "GBP",
  "billing_cycle": "monthly",
  "app_id": 1,  // optional, defaults to travel_support
  "admin_username": "admin",
  "admin_email": "admin@example.com",
  "admin_password": "password123"
}
```

**Response includes calculated pricing:**
```json
{
  "tenant_id": 1,
  "company_name": "Example Transport",
  "subdomain": "example",
  "organization_type": "cooperative",
  "cooperative_model": "worker",
  "base_price": 100.00,
  "discount_percentage": 30.00,
  "actual_price": 70.00,  // calculated
  "currency": "GBP",
  "enabled_modules": {
    "admin": {"governance": true, "membership": true, "voting": true, "worker_management": true},
    "driver": {"ownership_dashboard": true, "profit_sharing": true, "voting": true},
    "customer": {"membership_portal": false, "voting": false}
  }
}
```

### New Commonwealth Endpoints (To Be Implemented)

**Apps Management:**
```
GET    /api/commonwealth-admin/apps
POST   /api/commonwealth-admin/apps
PUT    /api/commonwealth-admin/apps/:appId
DELETE /api/commonwealth-admin/apps/:appId
```

**Service Sharing:**
```
GET    /api/tenants/:tenantId/commonwealth/services
POST   /api/tenants/:tenantId/commonwealth/services
PUT    /api/tenants/:tenantId/commonwealth/services/:sharingId
DELETE /api/tenants/:tenantId/commonwealth/services/:sharingId
GET    /api/tenants/:tenantId/commonwealth/eligibility
```

**Billing:**
```
GET    /api/tenants/:tenantId/billing/history
POST   /api/tenants/:tenantId/billing/generate-invoice
GET    /api/commonwealth-admin/billing/revenue-report
```

## Benefits of Commonwealth Model

### For Organizations:

1. **No User Limits**: Grow without worrying about seat-based pricing
2. **Rewarded Co-operation**: 30-50% discounts for democratic ownership
3. **Network Effects**: Commonwealth members benefit from shared services
4. **Transparency**: Governance tracking builds trust and accountability

### For the Platform:

1. **Mission Alignment**: Supports co-operative values
2. **Sustainable Revenue**: Fair pricing with clear discount rationale
3. **Quality Data**: Governance tracking provides valuable sector insights
4. **Network Growth**: Commonwealth tier incentivizes collaboration

### For the Movement:

1. **Promotes Co-operative Models**: Financial incentive to adopt democratic ownership
2. **Builds Solidarity**: Service sharing connects organizations
3. **Demonstrates Impact**: Compliance data shows co-op effectiveness
4. **Scales Values**: As platform grows, so does co-operative sector

## Next Steps

### Backend Development:
- [ ] Create Commonwealth admin routes for multi-app management
- [ ] Create service sharing routes
- [ ] Implement billing automation with discount tracking
- [ ] Add commonwealth eligibility checker endpoint
- [ ] Update platform-admin routes to use new schema

### Frontend Development:
- [ ] Redesign tenant creation form with organization types
- [ ] Build commonwealth admin dashboard (multi-app view)
- [ ] Create governance compliance widgets
- [ ] Build service sharing management UI
- [ ] Add pricing calculator showing discounts
- [ ] Remove subscription tier references throughout UI

### Documentation:
- [ ] API documentation for new endpoints
- [ ] Admin user guide for commonwealth features
- [ ] Tenant user guide for governance requirements
- [ ] Migration guide for existing customers

### Testing:
- [ ] Test discount calculation trigger
- [ ] Test commonwealth eligibility function
- [ ] Test multi-app tenant creation
- [ ] Test billing history generation
- [ ] Integration tests for governance workflows

## Questions & Support

For questions about the Commonwealth platform architecture, contact the development team.

For co-operative governance requirements, consult the Commonwealth governance handbook (coming soon).

---

**Built with co-operative values for the co-operative movement** 🌍✊
