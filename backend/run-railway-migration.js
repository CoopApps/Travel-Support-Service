const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const migrationFile = process.argv[2] || 'add-customer-archive-fields.sql';
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  const pool = new Pool({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log(`Running migration: ${migrationFile}`);
    console.log(`Database: Railway Production`);
    console.log('---');

    const result = await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('---');

    // If there's a verification query at the end, the last result will show it
    if (result.rows && result.rows.length > 0) {
      console.log('Verification results:');
      console.table(result.rows);
    }

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

runMigration();
