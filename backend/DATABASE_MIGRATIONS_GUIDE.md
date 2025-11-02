# Database Migrations Guide

## Overview

Database migrations provide:
- **Version control** for database schema
- **Rollback capability** for schema changes
- **Team collaboration** without conflicts
- **Automated deployment** of schema changes

## Setup

Dependencies installed:
```bash
npm install --save-dev node-pg-migrate
```

Configuration in `.migrate.json` and `package.json` scripts.

## Usage

### Create a New Migration

```bash
npm run migrate:create add-customer-notes
```

This creates a timestamped file in `database/migrations/`:
```
database/migrations/1641234567890_add-customer-notes.sql
```

### Write Migration

Edit the generated file:

```sql
-- Up Migration
ALTER TABLE tenant_customers
  ADD COLUMN notes TEXT;

-- Down Migration (for rollback)
-- Use special comment format for down migrations
-- Migration: down
ALTER TABLE tenant_customers
  DROP COLUMN notes;
```

### Apply Migrations

```bash
# Apply all pending migrations
npm run migrate:up

# Apply up to specific migration
npm run migrate:up -- --count 1

# Apply specific migration
npm run migrate:up -- 1641234567890
```

### Rollback Migrations

```bash
# Rollback last migration
npm run migrate:down

# Rollback specific number
npm run migrate:down -- --count 2
```

### Check Migration Status

```bash
npx node-pg-migrate list
```

Shows which migrations have been applied.

## Migration Examples

### Example 1: Add Column

```sql
-- Up
ALTER TABLE tenant_drivers
  ADD COLUMN license_class VARCHAR(10),
  ADD COLUMN preferred_hours JSONB;

-- Migration: down
ALTER TABLE tenant_drivers
  DROP COLUMN license_class,
  DROP COLUMN preferred_hours;
```

### Example 2: Create Index

```sql
-- Up
CREATE INDEX idx_trips_date_status
  ON tenant_trips(trip_date, status)
  WHERE is_active = true;

-- Migration: down
DROP INDEX IF EXISTS idx_trips_date_status;
```

### Example 3: Add Soft Delete Fields

```sql
-- Up
ALTER TABLE tenant_invoices
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by INTEGER REFERENCES tenant_users(user_id);

CREATE INDEX idx_invoices_active
  ON tenant_invoices(tenant_id, is_active)
  WHERE is_active = true;

-- Migration: down
DROP INDEX IF EXISTS idx_invoices_active;
ALTER TABLE tenant_invoices
  DROP COLUMN is_active,
  DROP COLUMN deleted_at,
  DROP COLUMN deleted_by;
```

### Example 4: Data Migration

```sql
-- Up
-- Update existing records with default values
UPDATE tenant_customers
SET customer_status = 'active'
WHERE customer_status IS NULL;

-- Make column NOT NULL after populating
ALTER TABLE tenant_customers
  ALTER COLUMN customer_status SET NOT NULL;

-- Migration: down
ALTER TABLE tenant_customers
  ALTER COLUMN customer_status DROP NOT NULL;
```

## Best Practices

### 1. **Always write down migrations**
```sql
-- Up
CREATE TABLE new_table (...);

-- Migration: down
DROP TABLE IF EXISTS new_table;
```

### 2. **Test migrations in development first**
```bash
# Apply migration
npm run migrate:up

# Test application

# If issues, rollback
npm run migrate:down

# Fix migration, reapply
npm run migrate:up
```

### 3. **Make migrations idempotent**
```sql
-- Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS table_name (...);

-- Use IF EXISTS for drops
DROP TABLE IF EXISTS table_name;

-- Check before altering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tenant_customers ADD COLUMN notes TEXT;
  END IF;
END $$;
```

### 4. **Keep migrations small and focused**
❌ Bad: One migration for 20 different changes
✅ Good: Separate migrations for each logical change

### 5. **Never modify applied migrations**
Once a migration is applied in production, create a new migration to change it.

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  run: |
    cd backend
    npm run migrate:up
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Railway/Render Deployment

Add to build command:
```bash
npm install && npm run build && npm run migrate:up
```

## Troubleshooting

### Migration Failed Midway

```bash
# Check which migrations are applied
npx node-pg-migrate list

# Manually fix database state

# Mark migration as complete or rollback
npm run migrate:down
```

### Reset All Migrations (Development Only!)

```bash
# WARNING: This drops all data!
npm run migrate:down -- --count 999

# Reapply all
npm run migrate:up
```

## Migration Workflow

1. **Development:**
   ```bash
   npm run migrate:create my-change
   # Edit migration file
   npm run migrate:up
   # Test thoroughly
   ```

2. **Commit:**
   ```bash
   git add database/migrations/
   git commit -m "Add customer notes field"
   ```

3. **CI/CD:**
   - Migrations run automatically on deployment
   - Rollback on failure

4. **Production:**
   - Migrations applied during deployment
   - Database changes version controlled

## Summary

**Benefits:**
- ✅ Version control for schema
- ✅ Team collaboration
- ✅ Automated deployments
- ✅ Rollback capability
- ✅ Audit trail

**Commands:**
- `npm run migrate:create <name>` - Create migration
- `npm run migrate:up` - Apply migrations
- `npm run migrate:down` - Rollback migration
- `npx node-pg-migrate list` - Show status
