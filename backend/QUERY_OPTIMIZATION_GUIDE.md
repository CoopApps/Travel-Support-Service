# Query Optimization Guide

## Overview

Prevents N+1 query problems that cause performance degradation as data grows.

**N+1 Problem:** Fetching a list of records, then making additional queries for each record.

**Impact:**
- 1 query for customers → 100 queries for their trips = **101 total queries!**
- With optimization → **1-2 total queries** (99% reduction)

## Common N+1 Patterns

### Pattern 1: Customer → Trips

**BAD (N+1 Problem):**
```typescript
// Query 1: Get all customers
const customers = await pool.query(
  'SELECT * FROM tenant_customers WHERE tenant_id = $1',
  [tenantId]
);

// Query 2-101: Get trips for EACH customer (100 more queries!)
for (const customer of customers.rows) {
  const trips = await pool.query(
    'SELECT * FROM tenant_trips WHERE customer_id = $1',
    [customer.customer_id]
  );
  customer.trips = trips.rows;
}
```

**GOOD (Single JOIN):**
```typescript
// Single query with JOIN
const result = await pool.query(
  `SELECT
     c.*,
     json_agg(json_build_object(
       'trip_id', t.trip_id,
       'trip_date', t.trip_date,
       'status', t.status
     )) as trips
   FROM tenant_customers c
   LEFT JOIN tenant_trips t ON c.customer_id = t.customer_id
   WHERE c.tenant_id = $1
   GROUP BY c.customer_id`,
  [tenantId]
);
```

### Pattern 2: Driver → Vehicle

**BAD:**
```typescript
const drivers = await pool.query('SELECT * FROM tenant_drivers WHERE tenant_id = $1', [tenantId]);

for (const driver of drivers.rows) {
  if (driver.vehicle_id) {
    const vehicle = await pool.query(
      'SELECT * FROM tenant_vehicles WHERE vehicle_id = $1',
      [driver.vehicle_id]
    );
    driver.vehicle = vehicle.rows[0];
  }
}
```

**GOOD:**
```typescript
const result = await pool.query(
  `SELECT
     d.*,
     row_to_json(v.*) as vehicle
   FROM tenant_drivers d
   LEFT JOIN tenant_vehicles v ON d.vehicle_id = v.vehicle_id
   WHERE d.tenant_id = $1`,
  [tenantId]
);
```

### Pattern 3: Batch Loading (DataLoader Pattern)

**BAD:**
```typescript
// Get trips
const trips = await pool.query('SELECT * FROM tenant_trips WHERE tenant_id = $1', [tenantId]);

// Get customer for each trip (N queries)
for (const trip of trips.rows) {
  const customer = await pool.query(
    'SELECT * FROM tenant_customers WHERE customer_id = $1',
    [trip.customer_id]
  );
  trip.customer = customer.rows[0];
}
```

**GOOD (Batch Load):**
```typescript
// Get trips
const trips = await pool.query('SELECT * FROM tenant_trips WHERE tenant_id = $1', [tenantId]);

// Get ALL customer IDs
const customerIds = [...new Set(trips.rows.map(t => t.customer_id))];

// Single query for all customers
const customers = await pool.query(
  'SELECT * FROM tenant_customers WHERE customer_id = ANY($1)',
  [customerIds]
);

// Create lookup map
const customerMap = new Map(
  customers.rows.map(c => [c.customer_id, c])
);

// Attach customers to trips
trips.rows.forEach(trip => {
  trip.customer = customerMap.get(trip.customer_id);
});
```

## Detection Methods

### Method 1: Enable Query Logging

```typescript
// In database.ts
const pool = new Pool({
  // ... config
  log: (query) => {
    console.log('QUERY:', query);
  },
});
```

Watch for repeated similar queries with different IDs.

### Method 2: Use EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT * FROM tenant_trips WHERE customer_id = 5;
```

If you see many similar EXPLAIN outputs, you have N+1 problem.

### Method 3: Count Queries

```typescript
let queryCount = 0;
const originalQuery = pool.query;
pool.query = function(...args) {
  queryCount++;
  console.log(`Query #${queryCount}:`, args[0]);
  return originalQuery.apply(this, args);
};
```

## Optimization Utilities

### Create a DataLoader Utility

```typescript
// src/utils/dataLoader.ts

export class DataLoader<K, V> {
  private cache = new Map<K, V>();
  private batchLoader: (keys: K[]) => Promise<V[]>;
  private batch: K[] = [];
  private batchPromise: Promise<void> | null = null;

  constructor(batchLoader: (keys: K[]) => Promise<V[]>) {
    this.batchLoader = batchLoader;
  }

  async load(key: K): Promise<V | null> {
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Add to batch
    this.batch.push(key);

    // Schedule batch load
    if (!this.batchPromise) {
      this.batchPromise = Promise.resolve().then(() => this.dispatchBatch());
    }

    await this.batchPromise;
    return this.cache.get(key) || null;
  }

  private async dispatchBatch() {
    const keys = this.batch;
    this.batch = [];
    this.batchPromise = null;

    const values = await this.batchLoader(keys);

    keys.forEach((key, index) => {
      this.cache.set(key, values[index]);
    });
  }
}

// Usage
const customerLoader = new DataLoader(async (customerIds: number[]) => {
  const result = await pool.query(
    'SELECT * FROM tenant_customers WHERE customer_id = ANY($1)',
    [customerIds]
  );
  return customerIds.map(id =>
    result.rows.find(c => c.customer_id === id)
  );
});

// Load customers efficiently
const customer1 = await customerLoader.load(1);
const customer2 = await customerLoader.load(2);
// Only 1 query executed!
```

## Real Examples

### Example 1: Dashboard with Multiple Stats

**BAD:**
```typescript
const customerCount = await pool.query('SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1', [tenantId]);
const driverCount = await pool.query('SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = $1', [tenantId]);
const vehicleCount = await pool.query('SELECT COUNT(*) FROM tenant_vehicles WHERE tenant_id = $1', [tenantId]);
const tripCount = await pool.query('SELECT COUNT(*) FROM tenant_trips WHERE tenant_id = $1', [tenantId]);
// 4 queries
```

**GOOD:**
```typescript
const stats = await pool.query(
  `SELECT
     (SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1) as customer_count,
     (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = $1) as driver_count,
     (SELECT COUNT(*) FROM tenant_vehicles WHERE tenant_id = $1) as vehicle_count,
     (SELECT COUNT(*) FROM tenant_trips WHERE tenant_id = $1) as trip_count`,
  [tenantId]
);
// 1 query
```

### Example 2: Trip List with Details

**BAD:**
```typescript
const trips = await pool.query('SELECT * FROM tenant_trips WHERE tenant_id = $1', [tenantId]);

for (const trip of trips.rows) {
  const customer = await pool.query('SELECT * FROM tenant_customers WHERE customer_id = $1', [trip.customer_id]);
  const driver = await pool.query('SELECT * FROM tenant_drivers WHERE driver_id = $1', [trip.driver_id]);
  const vehicle = await pool.query('SELECT * FROM tenant_vehicles WHERE vehicle_id = $1', [trip.vehicle_id]);

  trip.customer = customer.rows[0];
  trip.driver = driver.rows[0];
  trip.vehicle = vehicle.rows[0];
}
// 1 + (100 * 3) = 301 queries!
```

**GOOD:**
```typescript
const trips = await pool.query(
  `SELECT
     t.*,
     row_to_json(c.*) as customer,
     row_to_json(d.*) as driver,
     row_to_json(v.*) as vehicle
   FROM tenant_trips t
   LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id
   LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
   LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id
   WHERE t.tenant_id = $1`,
  [tenantId]
);
// 1 query (300x improvement!)
```

## Query Optimization Checklist

- [ ] Identify N+1 patterns in route handlers
- [ ] Replace loops with JOINs where possible
- [ ] Use batch loading for many-to-one relationships
- [ ] Add DataLoader for GraphQL-like batching
- [ ] Use `row_to_json()` for nested objects
- [ ] Use `json_agg()` for arrays of related records
- [ ] Cache frequently accessed data
- [ ] Profile queries with EXPLAIN ANALYZE
- [ ] Monitor query counts in development

## Performance Monitoring

```typescript
// Middleware to log query counts per request
app.use((req, res, next) => {
  let queryCount = 0;
  const originalQuery = pool.query.bind(pool);

  req.pool = {
    query: (...args: any[]) => {
      queryCount++;
      return originalQuery(...args);
    }
  };

  res.on('finish', () => {
    if (queryCount > 10) {
      logger.warn('High query count', {
        path: req.path,
        method: req.method,
        queries: queryCount
      });
    }
  });

  next();
});
```

## Summary

| Pattern | Queries Before | Queries After | Improvement |
|---------|----------------|---------------|-------------|
| N+1 Customer→Trips | 101 | 1 | 101x faster |
| N+1 Trip Details | 301 | 1 | 301x faster |
| Dashboard Stats | 4 | 1 | 4x faster |
| Batch Loading | 100 | 1-2 | 50-100x faster |

**Best Practices:**
- ✅ Use JOINs instead of loops
- ✅ Batch load related records
- ✅ Use subqueries for aggregations
- ✅ Profile and monitor query counts
- ✅ Cache expensive operations
