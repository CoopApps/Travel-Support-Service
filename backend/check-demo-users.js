const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkDemoUsers() {
  try {
    const res = await pool.query('SELECT * FROM tenant_users WHERE tenant_id = 1 LIMIT 1');

    console.log('\n📋 Demo Tenant (ID: 1) Users:\n');

    if (res.rows.length === 0) {
      console.log('❌ No users found - need to create admin user');
    } else {
      console.log('Columns:', Object.keys(res.rows[0]));
      const userList = await pool.query('SELECT user_id, email, role FROM tenant_users WHERE tenant_id = 1');
      userList.rows.forEach(u => {
        console.log(`✅ User ID ${u.user_id}: ${u.email} - Role: ${u.role}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkDemoUsers();
