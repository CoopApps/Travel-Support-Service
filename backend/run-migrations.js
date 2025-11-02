const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting migrations...\n');

    // Run safeguarding tables migration
    console.log('📋 Creating safeguarding tables...');
    const safeguardingSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-safeguarding-tables.sql'),
      'utf8'
    );
    await client.query(safeguardingSql);
    console.log('✅ Safeguarding tables created successfully\n');

    // Run driver hours/fuel tables migration
    console.log('📋 Creating driver hours and fuel tables...');
    const hoursFuelSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-driver-hours-fuel-tables.sql'),
      'utf8'
    );
    await client.query(hoursFuelSql);
    console.log('✅ Driver hours and fuel tables created successfully\n');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
