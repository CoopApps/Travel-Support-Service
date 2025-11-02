/**
 * Caching Utilities
 *
 * Provides in-memory caching for frequently accessed data.
 *
 * Features:
 * - TTL (Time To Live) for automatic expiration
 * - Per-tenant caching with isolation
 * - Cache invalidation
 * - Statistics and monitoring
 *
 * Usage:
 *   import { cache, getTenantCache, invalidateTenantCache } from './utils/cache';
 *
 *   // Simple caching
 *   const data = cache.get('key');
 *   cache.set('key', value, 300); // 5 minute TTL
 *
 *   // Tenant-scoped caching
 *   const customers = getTenantCache(tenantId, 'customers');
 */

import NodeCache from 'node-cache';
import { logger } from './logger';

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  stdTTL: 300, // Default TTL: 5 minutes (300 seconds)
  checkperiod: 60, // Check for expired entries every 60 seconds
  useClones: false, // Don't clone objects (better performance, but mutable)
  deleteOnExpire: true, // Automatically delete expired entries
  maxKeys: 10000, // Maximum number of keys
};

/**
 * Global cache instance
 */
export const cache = new NodeCache(CACHE_CONFIG);

/**
 * Tenant-specific caches with longer TTL for stable data
 */
export const tenantCache = new NodeCache({
  ...CACHE_CONFIG,
  stdTTL: 600, // 10 minutes for tenant data
});

/**
 * User session cache with shorter TTL
 */
export const sessionCache = new NodeCache({
  ...CACHE_CONFIG,
  stdTTL: 1800, // 30 minutes for sessions
});

/**
 * Settings cache with very long TTL
 */
export const settingsCache = new NodeCache({
  ...CACHE_CONFIG,
  stdTTL: 3600, // 1 hour for settings
});

/**
 * Cache key generators
 */
export const CacheKeys = {
  // Tenant-scoped keys
  tenant: (tenantId: number) => `tenant:${tenantId}`,
  tenantSettings: (tenantId: number) => `tenant:${tenantId}:settings`,
  tenantUsers: (tenantId: number) => `tenant:${tenantId}:users`,
  tenantCustomers: (tenantId: number) => `tenant:${tenantId}:customers`,
  tenantDrivers: (tenantId: number) => `tenant:${tenantId}:drivers`,
  tenantVehicles: (tenantId: number) => `tenant:${tenantId}:vehicles`,

  // User-scoped keys
  user: (userId: number) => `user:${userId}`,
  userPermissions: (userId: number) => `user:${userId}:permissions`,
  userPreferences: (userId: number) => `user:${userId}:preferences`,

  // Resource-specific keys
  customer: (tenantId: number, customerId: number) => `tenant:${tenantId}:customer:${customerId}`,
  driver: (tenantId: number, driverId: number) => `tenant:${tenantId}:driver:${driverId}`,
  vehicle: (tenantId: number, vehicleId: number) => `tenant:${tenantId}:vehicle:${vehicleId}`,
  trip: (tenantId: number, tripId: number) => `tenant:${tenantId}:trip:${tripId}`,

  // List/query keys
  customerList: (tenantId: number, filters?: string) =>
    `tenant:${tenantId}:customers:list${filters ? `:${filters}` : ''}`,
  tripList: (tenantId: number, date?: string) =>
    `tenant:${tenantId}:trips:list${date ? `:${date}` : ''}`,

  // Aggregation/stats keys
  dashboardStats: (tenantId: number) => `tenant:${tenantId}:dashboard:stats`,
  driverStats: (tenantId: number, driverId: number) => `tenant:${tenantId}:driver:${driverId}:stats`,
};

/**
 * Get tenant-scoped cached data
 *
 * @param tenantId - Tenant ID
 * @param key - Cache key
 * @returns Cached value or undefined
 */
export function getTenantCache<T>(tenantId: number, key: string): T | undefined {
  const cacheKey = `tenant:${tenantId}:${key}`;
  const value = tenantCache.get<T>(cacheKey);

  if (value !== undefined) {
    logger.debug('Cache hit', { cacheKey });
  } else {
    logger.debug('Cache miss', { cacheKey });
  }

  return value;
}

/**
 * Set tenant-scoped cached data
 *
 * @param tenantId - Tenant ID
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - TTL in seconds (optional, uses default if not specified)
 */
export function setTenantCache<T>(
  tenantId: number,
  key: string,
  value: T,
  ttl?: number
): void {
  const cacheKey = `tenant:${tenantId}:${key}`;
  tenantCache.set(cacheKey, value, ttl || CACHE_CONFIG.stdTTL);
  logger.debug('Cache set', { cacheKey, ttl });
}

/**
 * Invalidate all cache for a tenant
 *
 * @param tenantId - Tenant ID
 */
export function invalidateTenantCache(tenantId: number): void {
  const pattern = `tenant:${tenantId}:`;
  const keys = tenantCache.keys().filter((key) => key.startsWith(pattern));

  keys.forEach((key) => tenantCache.del(key));

  logger.info('Tenant cache invalidated', { tenantId, keysDeleted: keys.length });
}

/**
 * Invalidate specific tenant cache entry
 *
 * @param tenantId - Tenant ID
 * @param key - Cache key
 */
export function invalidateTenantCacheKey(tenantId: number, key: string): void {
  const cacheKey = `tenant:${tenantId}:${key}`;
  tenantCache.del(cacheKey);
  logger.debug('Cache key invalidated', { cacheKey });
}

/**
 * Cache wrapper for database queries
 *
 * Automatically caches query results and returns cached data if available
 *
 * @param key - Cache key
 * @param ttl - TTL in seconds
 * @param fetchFn - Function to fetch data if not cached
 * @returns Cached or freshly fetched data
 */
export async function cachedQuery<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    logger.debug('Query cache hit', { key });
    return cached;
  }

  // Cache miss - fetch from database
  logger.debug('Query cache miss - fetching', { key });
  const result = await fetchFn();

  // Store in cache
  cache.set(key, result, ttl);

  return result;
}

/**
 * Tenant-scoped cached query
 *
 * @param tenantId - Tenant ID
 * @param key - Cache key
 * @param ttl - TTL in seconds
 * @param fetchFn - Function to fetch data if not cached
 * @returns Cached or freshly fetched data
 */
export async function cachedTenantQuery<T>(
  tenantId: number,
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cacheKey = `tenant:${tenantId}:${key}`;

  // Check cache first
  const cached = tenantCache.get<T>(cacheKey);
  if (cached !== undefined) {
    logger.debug('Tenant query cache hit', { cacheKey });
    return cached;
  }

  // Cache miss - fetch from database
  logger.debug('Tenant query cache miss - fetching', { cacheKey });
  const result = await fetchFn();

  // Store in cache
  tenantCache.set(cacheKey, result, ttl);

  return result;
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics
 */
export function getCacheStats() {
  return {
    global: {
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses),
    },
    tenant: {
      keys: tenantCache.keys().length,
      hits: tenantCache.getStats().hits,
      misses: tenantCache.getStats().misses,
      hitRate:
        tenantCache.getStats().hits / (tenantCache.getStats().hits + tenantCache.getStats().misses),
    },
    session: {
      keys: sessionCache.keys().length,
      hits: sessionCache.getStats().hits,
      misses: sessionCache.getStats().misses,
      hitRate:
        sessionCache.getStats().hits / (sessionCache.getStats().hits + sessionCache.getStats().misses),
    },
    settings: {
      keys: settingsCache.keys().length,
      hits: settingsCache.getStats().hits,
      misses: settingsCache.getStats().misses,
      hitRate:
        settingsCache.getStats().hits /
        (settingsCache.getStats().hits + settingsCache.getStats().misses),
    },
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  cache.flushAll();
  tenantCache.flushAll();
  sessionCache.flushAll();
  settingsCache.flushAll();

  logger.warn('All caches cleared');
}

/**
 * Cache invalidation middleware
 *
 * Automatically invalidates cache on write operations (POST/PUT/DELETE)
 *
 * Usage:
 *   router.post('/customers', cacheInvalidationMiddleware, handler);
 */
export function cacheInvalidationMiddleware(req: any, res: any, next: any) {
  const originalSend = res.send;

  res.send = function (body: any) {
    // Only invalidate on successful write operations
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
    ) {
      const tenantId = req.params.tenantId || (req as any).user?.tenantId;

      if (tenantId) {
        // Invalidate tenant cache on writes
        invalidateTenantCache(parseInt(tenantId, 10));
        logger.debug('Cache invalidated after write operation', {
          method: req.method,
          path: req.path,
          tenantId,
        });
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Selective cache invalidation
 *
 * Invalidates only specific cache entries related to the resource
 *
 * @param tenantId - Tenant ID
 * @param resource - Resource type (customers, drivers, trips, etc.)
 * @param resourceId - Optional resource ID
 */
export function invalidateResourceCache(
  tenantId: number,
  resource: string,
  resourceId?: number
): void {
  if (resourceId) {
    // Invalidate specific resource
    const key = `tenant:${tenantId}:${resource}:${resourceId}`;
    tenantCache.del(key);
  }

  // Invalidate resource lists
  const listPattern = `tenant:${tenantId}:${resource}s:list`;
  const keys = tenantCache.keys().filter((key) => key.startsWith(listPattern));
  keys.forEach((key) => tenantCache.del(key));

  logger.debug('Resource cache invalidated', { tenantId, resource, resourceId, keysDeleted: keys.length });
}

// Log cache events
cache.on('set', (key) => {
  logger.debug('Cache set event', { key });
});

cache.on('del', (key) => {
  logger.debug('Cache delete event', { key });
});

cache.on('expired', (key) => {
  logger.debug('Cache expired event', { key });
});

tenantCache.on('expired', (key) => {
  logger.debug('Tenant cache expired event', { key });
});

// Export cache instances
export default {
  cache,
  tenantCache,
  sessionCache,
  settingsCache,
  CacheKeys,
  getTenantCache,
  setTenantCache,
  invalidateTenantCache,
  invalidateTenantCacheKey,
  cachedQuery,
  cachedTenantQuery,
  getCacheStats,
  clearAllCaches,
  cacheInvalidationMiddleware,
  invalidateResourceCache,
};
