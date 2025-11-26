import { Pool } from 'pg';

/**
 * Test Database Utilities
 *
 * Provides utilities for setting up and tearing down test data
 * IMPORTANT: Uses the same database as development but with isolated test data
 *
 * Future improvement: Create a separate test database
 */

let testPool: Pool | null = null;

/**
 * Get test database connection pool
 */
export function getTestPool(): Pool {
  if (!testPool) {
    // Support DATABASE_URL for Railway/Heroku style connections
    if (process.env.DATABASE_URL) {
      testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      testPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'travel_support_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      });
    }
  }
  return testPool;
}

/**
 * Close test database pool
 */
export async function closeTestPool() {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Create a test tenant
 * Returns tenant ID for use in tests
 */
export async function createTestTenant(companyName: string = 'Test Company'): Promise<number> {
  const pool = getTestPool();
  const timestamp = Date.now();

  // Get the app_id for travel_support (required by schema)
  const appResult = await pool.query(
    `SELECT app_id FROM commonwealth_apps WHERE app_code = 'travel_support' LIMIT 1`
  );

  const appId = appResult.rows[0]?.app_id || 1; // Fallback to 1 if not found

  // Use unique domain for each test tenant to avoid constraint violations
  const result = await pool.query(
    `INSERT INTO tenants (company_name, subdomain, domain, app_id, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING tenant_id`,
    [`${companyName}_${timestamp}`, `test${timestamp}`, `test${timestamp}.local`, appId, true]
  );
  return result.rows[0].tenant_id;
}

/**
 * Create a test user for a tenant
 * Returns user ID, username, email, and generated password
 */
export async function createTestUser(
  tenantId: number,
  email: string = `test${Date.now()}@test.local`,
  role: string = 'admin'
): Promise<{ userId: number; username: string; email: string; password: string }> {
  const pool = getTestPool();
  const bcrypt = require('bcrypt');
  const password = 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const timestamp = Date.now();
  const username = `testuser${timestamp}`;

  const result = await pool.query(
    `INSERT INTO tenant_users (tenant_id, username, email, password_hash, role, full_name, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING user_id`,
    [tenantId, username, email, hashedPassword, role, 'Test User', true]
  );

  return {
    userId: result.rows[0].user_id,
    username,
    email,
    password,
  };
}

/**
 * Create a test customer for a tenant
 */
export async function createTestCustomer(
  tenantId: number,
  name: string = `Test Customer ${Date.now()}`
): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query(
    `INSERT INTO tenant_customers (
      tenant_id, name, email, phone, address, postcode,
      mobility_requirements, is_active, archived, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING customer_id`,
    [tenantId, name, `${name.replace(/\s/g, '')}@test.local`, '1234567890', '123 Test St', 'TE1 1ST', 'None', true, false]
  );
  return result.rows[0].customer_id;
}

/**
 * Clean up test data for a specific tenant
 * Deletes all data associated with test tenant(s)
 */
export async function cleanupTestTenant(tenantId: number) {
  const pool = getTestPool();

  // Delete in order of foreign key dependencies
  await pool.query('DELETE FROM tenant_training_records WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM tenant_training_types WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM tenant_customers WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM tenant_drivers WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]);
}

/**
 * Clean up all test tenants (for cleanup after all tests)
 * Finds and deletes all tenants with 'test' in subdomain
 */
export async function cleanupAllTestData() {
  const pool = getTestPool();

  // Find all test tenants
  const result = await pool.query(
    "SELECT tenant_id FROM tenants WHERE subdomain LIKE 'test%' OR company_name LIKE '%Test%'"
  );

  // Delete each test tenant
  for (const row of result.rows) {
    await cleanupTestTenant(row.tenant_id);
  }
}

/**
 * Global test setup - runs once before all tests
 */
export async function globalSetup() {
  // Optionally clean up old test data
  await cleanupAllTestData();
}

/**
 * Global test teardown - runs once after all tests
 */
export async function globalTeardown() {
  await cleanupAllTestData();
  await closeTestPool();
}
