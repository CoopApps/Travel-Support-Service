# Soft Delete Implementation Guide

## Overview

Soft deletes mark records as deleted without removing them from the database, allowing:
- **Data recovery** - Restore accidentally deleted records
- **Audit trail** - Track when and who deleted data
- **Historical reporting** - Include deleted records in analytics
- **Regulatory compliance** - Meet data retention requirements

## Current Status

Most tables already have soft delete fields:
- `is_active` (BOOLEAN) - Used in most tables
- `deleted_at` (TIMESTAMP) - Used in some tables

## Standard Soft Delete Pattern

### Recommended Schema

Every table should have:

```sql
ALTER TABLE table_name
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL REFERENCES tenant_users(user_id);
```

### Field Usage

- **`is_active`**: Quick filter for active records (indexed for performance)
- **`deleted_at`**: Timestamp of deletion (for audit/recovery)
- **`deleted_by`**: User who performed the deletion (for accountability)

## Implementation Pattern

### 1. Delete Operation (Soft Delete)

**BEFORE:**
```typescript
router.delete('/customers/:id', async (req, res) => {
  const { id } = req.params;

  await pool.query(
    'DELETE FROM tenant_customers WHERE customer_id = $1',
    [id]
  );

  res.json({ message: 'Customer deleted' });
});
```

**AFTER:**
```typescript
router.delete('/customers/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // From auth middleware

  await pool.query(
    `UPDATE tenant_customers
     SET is_active = false,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = $2
     WHERE customer_id = $1`,
    [id, userId]
  );

  res.json({ message: 'Customer deactivated successfully' });
});
```

### 2. List Operation (Filter Out Deleted)

**BEFORE:**
```typescript
router.get('/customers', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM tenant_customers WHERE tenant_id = $1',
    [tenantId]
  );

  res.json(result.rows);
});
```

**AFTER:**
```typescript
router.get('/customers', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM tenant_customers
     WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );

  res.json(result.rows);
});
```

### 3. Restore Operation (Undelete)

```typescript
router.post('/customers/:id/restore', auth, async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE tenant_customers
     SET is_active = true,
         deleted_at = NULL,
         deleted_by = NULL
     WHERE customer_id = $1
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  res.json({ message: 'Customer restored', customer: result.rows[0] });
});
```

### 4. Permanent Delete (Admin Only)

```typescript
router.delete('/customers/:id/permanent', adminAuth, async (req, res) => {
  const { id } = req.params;

  // Actually delete from database
  await pool.query(
    'DELETE FROM tenant_customers WHERE customer_id = $1',
    [id]
  );

  res.json({ message: 'Customer permanently deleted' });
});
```

### 5. List Deleted Records (Admin/Audit)

```typescript
router.get('/customers/deleted', adminAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT
       c.*,
       u.username as deleted_by_username
     FROM tenant_customers c
     LEFT JOIN tenant_users u ON c.deleted_by = u.user_id
     WHERE c.tenant_id = $1 AND c.is_active = false
     ORDER BY c.deleted_at DESC`,
    [tenantId]
  );

  res.json(result.rows);
});
```

## Database Migration

### Add Soft Delete Columns to Existing Tables

```sql
-- Add to tables that don't have soft delete fields
ALTER TABLE tenant_trips
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_active
  ON tenant_trips(tenant_id, is_active)
  WHERE is_active = true;

-- Repeat for other tables
```

### Tables Already Supporting Soft Delete

✅ Tables with `is_active`:
- `tenant_users`
- `tenant_customers`
- `tenant_drivers`
- `tenant_vehicles`
- `tenant_permits`
- `tenant_cost_centers`
- `tenant_office_staff`
- `tenant_fuelcards`
- `tenant_providers`

⚠️ Tables needing soft delete fields:
- `tenant_trips`
- `tenant_invoices`
- `tenant_holidays`
- `tenant_social_outings`
- `tenant_messages`

## Best Practices

### 1. Always Check is_active in Queries

```sql
-- GOOD
SELECT * FROM tenant_customers
WHERE tenant_id = $1 AND is_active = true;

-- BAD (includes deleted records)
SELECT * FROM tenant_customers
WHERE tenant_id = $1;
```

### 2. Create Database Views for Active Records

```sql
CREATE OR REPLACE VIEW active_customers AS
SELECT * FROM tenant_customers
WHERE is_active = true;

-- Then use in queries
SELECT * FROM active_customers WHERE tenant_id = 2;
```

### 3. Use Partial Indexes

```sql
-- Index only active records (more efficient)
CREATE INDEX idx_customers_active
ON tenant_customers(tenant_id, name)
WHERE is_active = true;
```

### 4. Handle Cascading Deletes

When deleting a parent record, decide:
- **Option A:** Soft delete children automatically
- **Option B:** Prevent deletion if children exist
- **Option C:** Allow orphaned children (not recommended)

Example: When soft-deleting a customer, soft-delete their trips:

```typescript
// Soft delete customer
await client.query(
  `UPDATE tenant_customers
   SET is_active = false, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
   WHERE customer_id = $1`,
  [customerId, userId]
);

// Soft delete customer's trips
await client.query(
  `UPDATE tenant_trips
   SET is_active = false, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
   WHERE customer_id = $1`,
  [customerId, userId]
);
```

### 5. Provide Admin UI for Recovery

Create an admin interface showing:
- List of recently deleted records
- Who deleted them and when
- One-click restore button
- Permanent delete option (with confirmation)

## Testing Soft Deletes

### Test Cases

1. ✅ Soft delete sets `is_active = false`
2. ✅ Soft delete sets `deleted_at` timestamp
3. ✅ Soft delete records `deleted_by` user
4. ✅ List queries exclude soft-deleted records
5. ✅ Restore operation works correctly
6. ✅ Cascading soft deletes work for related records
7. ✅ Admin can view deleted records
8. ✅ Foreign key constraints still work

### Example Test

```typescript
describe('Soft Delete', () => {
  it('should soft delete customer', async () => {
    // Create customer
    const customer = await createCustomer({ name: 'Test' });

    // Soft delete
    await deleteCustomer(customer.id, userId);

    // Verify is_active = false
    const result = await pool.query(
      'SELECT * FROM tenant_customers WHERE customer_id = $1',
      [customer.id]
    );
    expect(result.rows[0].is_active).toBe(false);
    expect(result.rows[0].deleted_at).not.toBeNull();
    expect(result.rows[0].deleted_by).toBe(userId);

    // Verify not in active list
    const active = await listCustomers();
    expect(active).not.toContainEqual(expect.objectContaining({ id: customer.id }));
  });

  it('should restore deleted customer', async () => {
    // Soft delete
    await deleteCustomer(customerId, userId);

    // Restore
    await restoreCustomer(customerId);

    // Verify is_active = true
    const result = await pool.query(
      'SELECT * FROM tenant_customers WHERE customer_id = $1',
      [customerId]
    );
    expect(result.rows[0].is_active).toBe(true);
    expect(result.rows[0].deleted_at).toBeNull();
  });
});
```

## Utility Functions

### Create Reusable Soft Delete Helpers

```typescript
// utils/softDelete.ts

export async function softDelete(
  tableName: string,
  idColumn: string,
  id: number,
  userId: number,
  client: any
): Promise<void> {
  await client.query(
    `UPDATE ${tableName}
     SET is_active = false,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = $2
     WHERE ${idColumn} = $1`,
    [id, userId]
  );
}

export async function restore(
  tableName: string,
  idColumn: string,
  id: number,
  client: any
): Promise<void> {
  await client.query(
    `UPDATE ${tableName}
     SET is_active = true,
         deleted_at = NULL,
         deleted_by = NULL
     WHERE ${idColumn} = $1`,
    [id]
  );
}

export async function permanentDelete(
  tableName: string,
  idColumn: string,
  id: number,
  client: any
): Promise<void> {
  await client.query(
    `DELETE FROM ${tableName} WHERE ${idColumn} = $1`,
    [id]
  );
}

// Usage
await softDelete('tenant_customers', 'customer_id', 123, req.user.userId, client);
await restore('tenant_customers', 'customer_id', 123, client);
```

## Migration Checklist

- [ ] Add `is_active`, `deleted_at`, `deleted_by` to all tables
- [ ] Create indexes on `is_active` columns
- [ ] Update all DELETE endpoints to use soft delete
- [ ] Update all SELECT queries to filter `is_active = true`
- [ ] Add restore endpoints for each resource
- [ ] Add admin endpoints to list deleted records
- [ ] Create soft delete utility functions
- [ ] Add cascading soft delete logic
- [ ] Test all delete/restore operations
- [ ] Update API documentation

## Summary

**Benefits:**
- ✅ Data recovery capability
- ✅ Audit trail for deletions
- ✅ Regulatory compliance
- ✅ Historical reporting

**Implementation:**
- ✅ Add 3 columns: `is_active`, `deleted_at`, `deleted_by`
- ✅ Update DELETE to UPDATE queries
- ✅ Filter queries with `WHERE is_active = true`
- ✅ Add restore endpoints

**Performance:**
- ✅ Add partial indexes on `is_active`
- ✅ Periodically archive old deleted records
- ✅ Consider database views for active records
