const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

(async () => {
  try {
    console.log('🔗 Connecting to Railway database...');
    const sql = fs.readFileSync('./migrations/add-archived-column-to-drivers.sql', 'utf8');
    console.log('📝 Running migration...');
    await pool.query(sql);
    console.log('✅ archived column added successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
