/**
 * Migration Script: Add archived column
 *
 * Adds the archived column to tenant_customers and tenant_drivers tables.
 * This column is required by the list queries but missing in production.
 *
 * Run this script once: node backend/add-archived-column.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function addArchivedColumn() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add archived column to tenant_customers
    console.log('Adding archived column to tenant_customers...');
    await client.query(`
      ALTER TABLE tenant_customers
      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false
    `);
    console.log('✓ tenant_customers.archived column added');

    // Add archived column to tenant_drivers
    console.log('Adding archived column to tenant_drivers...');
    await client.query(`
      ALTER TABLE tenant_drivers
      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false
    `);
    console.log('✓ tenant_drivers.archived column added');

    console.log('\n✅ Migration completed successfully!');
    console.log('Both customers and drivers now have the archived column.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
addArchivedColumn();
