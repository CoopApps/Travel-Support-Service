const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function createDemoAdmin() {
  try {
    // Admin credentials
    const username = 'admin';
    const fullName = 'Demo Administrator';
    const email = 'admin@demo.com';
    const password = 'demo123';
    const role = 'admin';
    const tenantId = 1;

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('\n🔧 Creating Demo Admin User...\n');

    // Insert admin user
    const result = await pool.query(`
      INSERT INTO tenant_users (
        tenant_id, username, full_name, email, password_hash, role, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING user_id, username, full_name, email, role
    `, [tenantId, username, fullName, email, passwordHash, role]);

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('─'.repeat(50));
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${role}`);
    console.log(`User ID:  ${result.rows[0].user_id}`);
    console.log('─'.repeat(50));
    console.log('\n🌐 Access the demo at: http://demo.localhost:3001');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createDemoAdmin();
