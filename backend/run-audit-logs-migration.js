/**
 * Run audit logs table migration
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('📦 Running audit logs migration...');

    const sqlFile = path.join(__dirname, 'migrations', 'create-audit-logs.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('✅ audit_logs table created');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
