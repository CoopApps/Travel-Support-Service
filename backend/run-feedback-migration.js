const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Running feedback table migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-feedback-table.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);

    console.log('✓ Feedback table created successfully');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
