const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log('Running vehicle incidents table migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create-vehicle-incidents-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✓ Vehicle incidents table created successfully');
    console.log('✓ Indexes created');
    console.log('✓ Triggers created');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
