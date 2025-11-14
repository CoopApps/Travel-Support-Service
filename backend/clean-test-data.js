/**
 * Clean up test data from database
 * Run this before integration tests or when tests leave behind data
 */

const { Pool } = require('pg');
require('dotenv').config();

async function cleanTestData() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🧹 Cleaning up test data...');

    // Delete test tenant users
    const usersResult = await pool.query(
      `DELETE FROM tenant_users
       WHERE email LIKE '%test%' OR email LIKE '%@test.local'
       RETURNING user_id`
    );
    console.log(`✅ Deleted ${usersResult.rowCount} test users`);

    // Delete test customers
    const customersResult = await pool.query(
      `DELETE FROM tenant_customers
       WHERE email LIKE '%test%' OR email LIKE '%@test.local'
       RETURNING customer_id`
    );
    console.log(`✅ Deleted ${customersResult.rowCount} test customers`);

    // Delete test tenants
    const tenantsResult = await pool.query(
      `DELETE FROM tenants
       WHERE subdomain LIKE 'test%' OR company_name LIKE '%Test%'
       RETURNING tenant_id`
    );
    console.log(`✅ Deleted ${tenantsResult.rowCount} test tenants`);

    console.log('✨ Test data cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning test data:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanTestData();
