const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: node run-migration.js <migration-file>');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Use DATABASE_URL for Railway, fallback to individual vars for local
  const pool = new Pool(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'travel_support_dev',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
        }
  );

  try {
    console.log(`Running migration: ${migrationFile}`);
    console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log('---');

    const result = await pool.query(sql);

    console.log('Migration completed successfully!');
    console.log('---');

    // If there's a verification query at the end, the last result will show it
    if (result.rows && result.rows.length > 0) {
      console.log('Verification results:');
      console.table(result.rows);
    }

  } catch (error) {
    console.error('Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
