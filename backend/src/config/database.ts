import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

/**
 * Database Configuration
 *
 * Implements connection pooling for efficient database access.
 * Previously, the application created a new connection for each request,
 * which caused significant overhead. This pool maintains reusable connections.
 */

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.debug('New database client connected to pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
});

pool.on('remove', () => {
  logger.debug('Database client removed from pool');
});

/**
 * Get a database client from the pool
 * Usage:
 *   const client = await getDbClient();
 *   try {
 *     const result = await client.query('SELECT ...');
 *     return result.rows;
 *   } finally {
 *     client.release();
 *   }
 */
export async function getDbClient(): Promise<PoolClient> {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    logger.error('Failed to get database client from pool', { error });
    throw error;
  }
}

/**
 * Execute a query with automatic connection management
 * Simplifies common query patterns
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getDbClient();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now');
    logger.info('Database connection test successful', { timestamp: result[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}

/**
 * Gracefully close all database connections
 * Should be called when shutting down the application
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

// Initialize connection test on startup
testConnection().catch((error) => {
  logger.error('Initial database connection failed', { error });
  process.exit(1);
});
