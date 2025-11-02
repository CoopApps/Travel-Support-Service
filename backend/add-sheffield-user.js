const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function addSheffieldAdmin() {
  const client = await pool.connect();

  try {
    console.log('\n🔨 Creating admin user for Sheffield Transport...\n');

    // Check if user already exists
    const existing = await client.query(
      `SELECT user_id FROM tenant_users WHERE tenant_id = 2 AND username = 'admin'`
    );

    if (existing.rows.length > 0) {
      console.log('✅ Admin user already exists for Sheffield Transport');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create user
    const result = await client.query(
      `INSERT INTO tenant_users (
        tenant_id, username, email, full_name, password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING user_id, username, email, role`,
      [2, 'admin', 'admin@sheffieldtransport.co.uk', 'Sheffield Administrator', hashedPassword, 'admin']
    );

    console.log('✅ Admin user created:', result.rows[0]);
    console.log('\nAccess details:');
    console.log(`  URL: http://sheffieldtransport.localhost:5174`);
    console.log(`  Username: admin`);
    console.log(`  Password: admin123\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addSheffieldAdmin();
