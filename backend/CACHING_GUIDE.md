# Caching Implementation Guide

## Overview

Caching reduces database load and improves response times by storing frequently accessed data in memory.

**Performance Benefits:**
- **Database queries**: Reduced by 50-90%
- **Response time**: Improved by 10-100x for cached data
- **Server load**: Reduced by 30-70%

## Installation

Dependencies are already installed:
```bash
npm install node-cache
npm install --save-dev @types/node-cache
```

## Basic Usage

### Import the cache utilities

```typescript
import {
  cache,
  cachedTenantQuery,
  CacheKeys,
  invalidateTenantCache,
  invalidateResourceCache,
} from '../utils/cache';
```

### Simple caching

```typescript
// Set cache (with 5 minute TTL)
cache.set('my-key', { data: 'value' }, 300);

// Get cache
const data = cache.get('my-key');

// Delete cache
cache.del('my-key');
```

### Tenant-scoped caching

```typescript
import { getTenantCache, setTenantCache } from '../utils/cache';

// Set tenant cache
setTenantCache(tenantId, 'customers', customersList, 600); // 10 minutes

// Get tenant cache
const customers = getTenantCache(tenantId, 'customers');

if (!customers) {
  // Cache miss - fetch from database
  const result = await fetchCustomers(tenantId);
  setTenantCache(tenantId, 'customers', result, 600);
  return result;
}

return customers; // Cache hit
```

## Integration Examples

### Example 1: Cached GET endpoint

**BEFORE:**
```typescript
router.get('/customers', async (req, res) => {
  const { tenantId } = req.params;

  const result = await pool.query(
    'SELECT * FROM tenant_customers WHERE tenant_id = $1 AND is_active = true',
    [tenantId]
  );

  res.json(result.rows);
});
```

**AFTER:**
```typescript
import { cachedTenantQuery, CacheKeys } from '../utils/cache';

router.get('/customers', async (req, res) => {
  const { tenantId } = req.params;

  // Use cached query wrapper
  const customers = await cachedTenantQuery(
    tenantId,
    'customers:list', // Cache key
    600, // TTL: 10 minutes
    async () => {
      // Fetch function (only called on cache miss)
      const result = await pool.query(
        'SELECT * FROM tenant_customers WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );
      return result.rows;
    }
  );

  res.json(customers);
});
```

### Example 2: Cache invalidation on write

**BEFORE:**
```typescript
router.post('/customers', async (req, res) => {
  const { tenantId } = req.params;
  const { name, email } = req.body;

  const result = await pool.query(
    'INSERT INTO tenant_customers (tenant_id, name, email) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, name, email]
  );

  res.json(result.rows[0]);
});
```

**AFTER (Manual Invalidation):**
```typescript
import { invalidateResourceCache } from '../utils/cache';

router.post('/customers', async (req, res) => {
  const { tenantId } = req.params;
  const { name, email } = req.body;

  const result = await pool.query(
    'INSERT INTO tenant_customers (tenant_id, name, email) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, name, email]
  );

  // Invalidate customer list cache after creating new customer
  invalidateResourceCache(tenantId, 'customer');

  res.json(result.rows[0]);
});
```

**AFTER (Automatic Middleware):**
```typescript
import { cacheInvalidationMiddleware } from '../utils/cache';

// Apply middleware to automatically invalidate on POST/PUT/DELETE
router.post('/customers', cacheInvalidationMiddleware, async (req, res) => {
  // Middleware will automatically invalidate tenant cache after successful write
  const { tenantId } = req.params;
  const { name, email } = req.body;

  const result = await pool.query(
    'INSERT INTO tenant_customers (tenant_id, name, email) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, name, email]
  );

  res.json(result.rows[0]);
});
```

### Example 3: Dashboard stats (heavy aggregation)

```typescript
import { cachedTenantQuery, CacheKeys } from '../utils/cache';

router.get('/dashboard/stats', async (req, res) => {
  const { tenantId } = req.params;

  const stats = await cachedTenantQuery(
    tenantId,
    'dashboard:stats',
    300, // 5 minutes (shorter TTL for frequently changing data)
    async () => {
      // Heavy aggregation queries
      const customerCount = await pool.query(
        'SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );
      const tripCount = await pool.query(
        'SELECT COUNT(*) FROM tenant_trips WHERE tenant_id = $1',
        [tenantId]
      );
      const revenueToday = await pool.query(
        `SELECT SUM(price) FROM tenant_trips
         WHERE tenant_id = $1 AND trip_date = CURRENT_DATE`,
        [tenantId]
      );

      return {
        customers: parseInt(customerCount.rows[0].count),
        trips: parseInt(tripCount.rows[0].count),
        revenue: parseFloat(revenueToday.rows[0].sum || 0),
      };
    }
  );

  res.json(stats);
});
```

### Example 4: User preferences (long TTL)

```typescript
import { settingsCache } from '../utils/cache';

router.get('/users/:userId/preferences', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `user:${userId}:preferences`;

  // Check cache
  let preferences = settingsCache.get(cacheKey);

  if (!preferences) {
    // Fetch from database
    const result = await pool.query(
      'SELECT preferences FROM tenant_users WHERE user_id = $1',
      [userId]
    );
    preferences = result.rows[0]?.preferences || {};

    // Cache with long TTL (1 hour)
    settingsCache.set(cacheKey, preferences, 3600);
  }

  res.json(preferences);
});

// Invalidate on update
router.put('/users/:userId/preferences', async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;

  await pool.query(
    'UPDATE tenant_users SET preferences = $2 WHERE user_id = $1',
    [userId, preferences]
  );

  // Invalidate cache
  settingsCache.del(`user:${userId}:preferences`);

  res.json({ message: 'Preferences updated' });
});
```

## Cache Strategies by Data Type

| Data Type | TTL | Strategy | Invalidation |
|-----------|-----|----------|--------------|
| **Dashboard stats** | 5 minutes | Query cache | Time-based |
| **Customer lists** | 10 minutes | Tenant cache | On create/update/delete |
| **Driver schedules** | 2 minutes | Tenant cache | On trip assignment |
| **User preferences** | 1 hour | Settings cache | On user update |
| **Tenant settings** | 1 hour | Settings cache | On settings change |
| **Trip details** | 5 minutes | Resource cache | On trip update |
| **Invoice data** | 30 minutes | Resource cache | On invoice generation |

## Cache Keys Best Practices

### Use consistent naming

```typescript
import { CacheKeys } from '../utils/cache';

// GOOD - Use CacheKeys helper
const key = CacheKeys.customerList(tenantId);

// GOOD - Descriptive pattern
const key = `tenant:${tenantId}:customers:list:active`;

// BAD - Inconsistent
const key = `${tenantId}_customers`;
```

### Include relevant filters in cache keys

```typescript
// Without filters (caches everything together)
const key = CacheKeys.customerList(tenantId);

// With filters (separate cache for each filter combination)
const filters = `active:${isActive}:page:${page}`;
const key = CacheKeys.customerList(tenantId, filters);
```

## Monitoring Cache Performance

### Get cache statistics

```typescript
import { getCacheStats } from '../utils/cache';

router.get('/admin/cache/stats', adminAuth, (req, res) => {
  const stats = getCacheStats();
  res.json(stats);
});

// Example output:
// {
//   "global": { "keys": 150, "hits": 5000, "misses": 500, "hitRate": 0.909 },
//   "tenant": { "keys": 50, "hits": 3000, "misses": 200, "hitRate": 0.937 }
// }
```

### Clear caches (admin only)

```typescript
import { clearAllCaches, invalidateTenantCache } from '../utils/cache';

// Clear all caches
router.post('/admin/cache/clear', adminAuth, (req, res) => {
  clearAllCaches();
  res.json({ message: 'All caches cleared' });
});

// Clear specific tenant cache
router.post('/admin/cache/clear/:tenantId', adminAuth, (req, res) => {
  const { tenantId } = req.params;
  invalidateTenantCache(parseInt(tenantId, 10));
  res.json({ message: `Cache cleared for tenant ${tenantId}` });
});
```

## Performance Tips

### 1. **Cache expensive operations**
```typescript
// GOOD - Cache heavy aggregations
const stats = await cachedTenantQuery(tenantId, 'stats', 300, () => {
  return calculateComplexStats(tenantId); // Expensive operation
});

// DON'T cache simple queries
const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
// Not worth caching - already fast
```

### 2. **Use appropriate TTLs**
```typescript
// Frequently changing data: Short TTL
setTenantCache(tenantId, 'live:trips', trips, 60); // 1 minute

// Rarely changing data: Long TTL
setTenantCache(tenantId, 'settings', settings, 3600); // 1 hour

// Static data: Very long TTL
setTenantCache(tenantId, 'config', config, 86400); // 24 hours
```

### 3. **Invalidate selectively**
```typescript
// GOOD - Invalidate only affected cache
invalidateResourceCache(tenantId, 'customer', customerId);

// AVOID - Invalidating entire tenant cache too often
invalidateTenantCache(tenantId); // Clears everything!
```

### 4. **Cache paginated results separately**
```typescript
// Cache each page separately
const page = parseInt(req.query.page) || 1;
const customers = await cachedTenantQuery(
  tenantId,
  `customers:list:page:${page}`,
  600,
  () => fetchCustomersPage(tenantId, page)
);
```

## Common Pitfalls

❌ **Don't cache user-specific data in shared cache**
```typescript
// BAD - Leaks data between users
cache.set(`trips`, userTrips);

// GOOD - User-scoped cache
cache.set(`user:${userId}:trips`, userTrips);
```

❌ **Don't forget to invalidate cache**
```typescript
// BAD - Stale data after update
await updateCustomer(customerId, data);
// Cache still has old data!

// GOOD - Invalidate after update
await updateCustomer(customerId, data);
invalidateResourceCache(tenantId, 'customer', customerId);
```

❌ **Don't cache everything**
```typescript
// BAD - Wasting memory
cache.set(`trip:${tripId}`, trip, 3600); // Trip changes frequently!

// GOOD - Only cache stable/expensive data
```

❌ **Don't use very long TTLs for changing data**
```typescript
// BAD - Will show stale trip counts
setTenantCache(tenantId, 'trip:count', count, 3600); // 1 hour

// GOOD - Shorter TTL for frequently changing data
setTenantCache(tenantId, 'trip:count', count, 300); // 5 minutes
```

## Migration Checklist

- [ ] Install node-cache dependency (done)
- [ ] Create cache utility (done)
- [ ] Identify expensive queries to cache
- [ ] Add caching to dashboard endpoints
- [ ] Add caching to list endpoints
- [ ] Add cache invalidation to write operations
- [ ] Test cache hit rates
- [ ] Monitor cache statistics
- [ ] Adjust TTLs based on data change frequency

## Summary

**When to cache:**
- ✅ Dashboard statistics (expensive aggregations)
- ✅ List endpoints (customers, drivers, vehicles)
- ✅ User preferences and settings
- ✅ Frequently accessed data
- ✅ Expensive computations

**When NOT to cache:**
- ❌ User authentication (always verify)
- ❌ Sensitive data (passwords, tokens)
- ❌ Real-time data (live tracking)
- ❌ Data that changes on every request

**Cache TTLs:**
- 1-2 minutes: Live data (current trips)
- 5-10 minutes: Lists and dashboard stats
- 30-60 minutes: Settings and preferences
- 1-24 hours: Configuration and static data

**Invalidation strategy:**
- Time-based: Let TTL expire (simple)
- Event-based: Invalidate on write (accurate)
- Hybrid: Short TTL + invalidation on write (recommended)
