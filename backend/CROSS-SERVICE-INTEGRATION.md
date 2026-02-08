# Cross-Service Integration Guide

## Overview

This multi-tenant platform supports three distinct service modes:
1. **Travel Support (Section 19)** - Door-to-door accessible transport
2. **Bus Service (Section 22)** - Community bus routes
3. **Home Care** - Domiciliary care services

Organizations can run one, two, or all three services. When clients/customers receive multiple services, the backend maintains proper data linkage while respecting data isolation principles.

---

## Data Architecture

### Service-Specific Tables

Each service has its own core tables:

**Travel Support:**
- `tenant_customers` - Transport service customers
- `tenant_drivers` - Drivers for transport
- `tenant_vehicles` - Fleet vehicles
- `tenant_schedules` - Journey bookings

**Bus Service (Section 22):**
- Uses `tenant_customers` with `section_22_eligible = true`
- `section22_bus_routes` - Bus routes
- `section22_route_stops` - Route stops
- `section22_timetables` - Bus schedules

**Home Care:**
- `tenant_care_clients` - Care recipients
- `tenant_carers` - Care workers
- `tenant_care_visits` - Care appointments
- `tenant_care_plans` - Care documentation
- `tenant_homecare_invoices` - Billing

### Cross-Service Linking

#### 1. Client/Customer Integration

When a person receives **both homecare AND transport services**, they have:
- ONE record in `tenant_care_clients` (if they're primarily a homecare client)
- ONE record in `tenant_customers` (if they use transport)
- **Bidirectional link** between the two records

**Database Schema:**
```sql
-- Homecare client table
tenant_care_clients
  ├── travel_customer_id → links to tenant_customers.customer_id
  └── customer_id (DEPRECATED, kept for backwards compatibility)

-- Transport customer table
tenant_customers
  ├── homecare_client_id → links to tenant_care_clients.client_id
  ├── section_19_eligible → can use transport services
  └── section_22_eligible → can use bus services
```

#### 2. Staff Integration

Care workers who also drive have dual records:

```sql
tenant_carers
  ├── driver_id → links to tenant_drivers.driver_id
  └── user_id → links to tenant_users.user_id
```

#### 3. Service Coordination

Care visits that require transport:

```sql
tenant_care_visits
  └── transport_schedule_id → links to tenant_schedules.schedule_id
```

---

## Sync Process

### Syncing Homecare Client to Travel Service

**Endpoint:** `POST /api/homecare/tenants/:tenantId/clients/:clientId/sync-to-travel`

**Requirements:**
- User must be an admin
- Homecare-to-travel integration must be enabled in settings
- Client must not already be synced

**Process:**
1. Creates a new record in `tenant_customers` with:
   - Basic contact info (name, email, phone, address, postcode)
   - `section_19_eligible = true` (eligible for transport)
   - Note: "Home Healthcare Client - Medical data held separately"
   - **NO medical data transferred** (GDPR/HIPAA compliant)

2. Updates `tenant_care_clients.travel_customer_id` with the new customer ID

3. Updates `tenant_customers.homecare_client_id` with the client ID (bidirectional link)

**Data Privacy:**
- Medical conditions, allergies, mobility needs remain **ONLY** in homecare system
- Transport staff see basic contact info only
- Special note indicates medical data is held separately

### Unsyncing

**Endpoint:** `DELETE /api/homecare/tenants/:tenantId/clients/:clientId/unsync-from-travel`

**Process:**
1. Removes `travel_customer_id` from `tenant_care_clients`
2. Removes `homecare_client_id` from `tenant_customers`
3. **Does NOT delete** the customer record (maintains history)

---

## Service Eligibility Flags

The `tenant_customers` table uses boolean flags to determine which services a customer can access:

```sql
section_19_eligible BOOLEAN DEFAULT true   -- Can use door-to-door transport
section_22_eligible BOOLEAN DEFAULT false  -- Can use bus services
```

### Customer Types:

| Type | section_19 | section_22 | Description |
|------|-----------|-----------|-------------|
| Transport Only | `true` | `false` | Uses door-to-door service |
| Bus Only | `false` | `true` | Uses community bus |
| Dual Service | `true` | `true` | Uses both transport types |

**Note:** If a customer also receives homecare, `homecare_client_id` will be set.

---

## Querying Cross-Service Data

### Find all homecare clients who also use transport

```sql
SELECT
  c.client_id,
  c.first_name,
  c.last_name,
  c.travel_customer_id,
  cu.name as transport_customer_name
FROM tenant_care_clients c
LEFT JOIN tenant_customers cu ON c.travel_customer_id = cu.customer_id
WHERE c.tenant_id = $1
  AND c.travel_customer_id IS NOT NULL;
```

### Find all transport customers who also receive homecare

```sql
SELECT
  cu.customer_id,
  cu.first_name,
  cu.last_name,
  cu.homecare_client_id,
  c.nhs_number
FROM tenant_customers cu
LEFT JOIN tenant_care_clients c ON cu.homecare_client_id = c.client_id
WHERE cu.tenant_id = $1
  AND cu.homecare_client_id IS NOT NULL;
```

### Find staff who are both carers and drivers

```sql
SELECT
  ca.carer_id,
  ca.first_name,
  ca.last_name,
  ca.driver_id,
  d.license_number
FROM tenant_carers ca
LEFT JOIN tenant_drivers d ON ca.driver_id = d.driver_id
WHERE ca.tenant_id = $1
  AND ca.driver_id IS NOT NULL;
```

---

## Data Isolation Guarantees

### What is Isolated:
- Medical records (homecare only)
- Care plans (homecare only)
- Route optimization data (transport only)
- Bus timetables (bus service only)

### What is Shared (when synced):
- Name
- Contact information (phone, email, address)
- Basic demographics

### Tenant Isolation:
ALL tables include `tenant_id` filtering. Cross-tenant data access is **impossible** by design:
- Every query includes `WHERE tenant_id = $1`
- Foreign keys respect tenant boundaries
- Middleware validates tenant access on every request

---

## Integration Settings

Organizations control integration features via `tenant_homecare_settings`:

```sql
travel_integration_enabled BOOLEAN   -- Master switch for homecare-transport integration
client_travel_enabled BOOLEAN        -- Allow client sync to transport
carer_driver_enabled BOOLEAN         -- Allow carers to also be drivers
```

---

## Migration Scripts

To enable cross-service integration on existing databases:

1. `add-travel-customer-link.sql` - Adds `travel_customer_id` to `tenant_care_clients`
2. `add-homecare-client-link-to-customers.sql` - Adds `homecare_client_id` and service flags to `tenant_customers`

Run in order:
```bash
psql -d your_database -f backend/src/migrations/add-travel-customer-link.sql
psql -d your_database -f backend/src/migrations/add-homecare-client-link-to-customers.sql
```

---

## API Endpoints

### Client Sync Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/homecare/tenants/:tenantId/clients/:clientId/sync-to-travel` | Create customer record for homecare client |
| DELETE | `/api/homecare/tenants/:tenantId/clients/:clientId/unsync-from-travel` | Remove sync link (keeps customer record) |

### Customer Service Flags

Update via standard customer endpoints:
```javascript
PUT /api/tenants/:tenantId/customers/:customerId
{
  "section_19_eligible": true,
  "section_22_eligible": true
}
```

---

## Frontend Integration

### Homecare Client Page

Shows sync status and allows admins to sync:

```typescript
// Check if synced
if (client.travel_customer_id) {
  // Show "Synced to Transport" badge
  // Show "Unsync" button
} else {
  // Show "Sync to Travel Service" button
}
```

### Customer Page

Shows homecare status:

```typescript
// Check if also a homecare client
if (customer.homecare_client_id) {
  // Show "Homecare Client" badge
  // Link to homecare client record
}
```

---

## Best Practices

1. **Always use the sync endpoint** - Don't manually create duplicate records
2. **Check settings first** - Verify integration is enabled before showing sync UI
3. **Admin-only** - Only administrators should sync/unsync records
4. **Preserve both records** - Unsyncing removes the link, not the data
5. **Privacy first** - Never transfer medical data to transport system
6. **Query efficiently** - Use the indexed foreign keys for joins

---

## Troubleshooting

### Client appears in both lists but not linked

**Cause:** Manual creation in both systems before sync feature existed

**Fix:**
1. Verify they are the same person
2. Use sync endpoint to create proper link
3. Consider archiving duplicate if appropriate

### Sync fails with "already synced" error

**Cause:** `travel_customer_id` already set

**Fix:**
1. Check if link is valid: `SELECT * FROM tenant_customers WHERE customer_id = <id>`
2. If customer deleted, clear the orphaned link
3. If valid, use unsync endpoint first

### Medical data appearing in transport system

**Cause:** This should NEVER happen - indicates a serious bug

**Fix:**
1. Immediately investigate the code path
2. Remove medical data from transport tables
3. File security incident report
4. Review sync endpoint code

---

## Future Enhancements

Potential improvements to cross-service integration:

- [ ] Automatic scheduling coordination (care visit + transport)
- [ ] Unified invoicing across services
- [ ] Family/household linking (multiple clients, one billing contact)
- [ ] Care worker transport services (carer gets ride to client)
- [ ] Dashboard showing cross-service analytics
- [ ] Automated suggestions for clients who might benefit from multiple services
