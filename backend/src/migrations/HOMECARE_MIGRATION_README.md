# Homecare Database Migration

## Overview
This migration adds all necessary tables for the Home Care Co-operative service.

## Tables Created

1. **tenant_care_clients** - Care recipients with medical info
2. **tenant_carers** - Care workers (co-op members)
3. **tenant_care_visits** - Scheduled visits with check-in/out
4. **tenant_care_plans** - Care needs documentation
5. **tenant_homecare_invoices** - Billing for care services
6. **tenant_homecare_invoice_items** - Invoice line items
7. **tenant_homecare_documents** - Care documents and files
8. **tenant_homecare_members** - Co-operative membership
9. **tenant_homecare_votes** - Democratic governance votes
10. **tenant_homecare_ballots** - Individual vote records

## Running the Migration

### Option 1: Using psql
```bash
cd backend/src/migrations
psql -U your_username -d your_database -f add-homecare-tables.sql
```

### Option 2: Using Database Client
1. Open your PostgreSQL client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute `add-homecare-tables.sql`

### Option 3: Automated (if using node-pg-migrate)
```bash
cd backend
npm run migrate up
```

## Verification

After running the migration, verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%care%'
ORDER BY table_name;
```

Expected output should include all 10 tables listed above.

## Enabling Homecare for a Tenant

After migration, enable homecare for specific tenants:

```sql
UPDATE tenants
SET homecare_enabled = true
WHERE tenant_id = YOUR_TENANT_ID;
```

## Rollback (If Needed)

To remove homecare tables:

```sql
DROP TABLE IF EXISTS tenant_homecare_ballots CASCADE;
DROP TABLE IF EXISTS tenant_homecare_votes CASCADE;
DROP TABLE IF EXISTS tenant_homecare_members CASCADE;
DROP TABLE IF EXISTS tenant_homecare_documents CASCADE;
DROP TABLE IF EXISTS tenant_homecare_invoice_items CASCADE;
DROP TABLE IF EXISTS tenant_homecare_invoices CASCADE;
DROP TABLE IF EXISTS tenant_care_plans CASCADE;
DROP TABLE IF EXISTS tenant_care_visits CASCADE;
DROP TABLE IF EXISTS tenant_carers CASCADE;
DROP TABLE IF EXISTS tenant_care_clients CASCADE;
ALTER TABLE tenants DROP COLUMN IF EXISTS homecare_enabled;
```

## Notes

- All tables include tenant_id for multi-tenant isolation
- Foreign keys maintain referential integrity
- Indexes added for common query patterns
- JSONB fields used for flexible data (tasks, medications, availability)
- Status checks enforce valid values
- Timestamps track creation and updates

## Next Steps

After running the migration:

1. Test API endpoints: `GET /api/homecare/health`
2. Create test data (clients, carers, visits)
3. Test the homecare dashboard UI
4. Enable homecare for test tenant
5. Switch to homecare service via service toggle
