const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Running fuel card migrations...\n');

    // Migration 1: Fix card_number_last_four column type
    console.log('1. Fixing card_number_last_four column type...');
    const migration1 = fs.readFileSync(
      path.join(__dirname, 'migrations', 'fix-fuelcard-card-number-type.sql'),
      'utf8'
    );
    await client.query(migration1);
    console.log('   ✓ Column type fixed: CHARACTER → VARCHAR(4)\n');

    // Migration 2: Add archive fields
    console.log('2. Adding archive fields...');
    const migration2 = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add-fuelcard-archive-fields.sql'),
      'utf8'
    );
    await client.query(migration2);
    console.log('   ✓ Archive fields added\n');

    // Verify the changes
    console.log('3. Verifying schema changes...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'tenant_fuelcards'
      AND column_name IN ('card_number_last_four', 'archived')
      ORDER BY column_name
    `);

    console.log('\nFinal schema:');
    schemaCheck.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });

    console.log('\n✓ All migrations completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
