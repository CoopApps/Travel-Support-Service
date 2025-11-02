const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testLogin() {
  try {
    // Get admin user
    const result = await pool.query(
      'SELECT user_id, username, password_hash, role, is_active FROM tenant_users WHERE username = $1 AND tenant_id = $2',
      ['admin', 1]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:', { user_id: user.user_id, username: user.username, role: user.role, is_active: user.is_active });
    console.log('   Password hash exists:', user.password_hash ? 'Yes' : 'No');

    if (user.password_hash) {
      console.log('   Hash length:', user.password_hash.length);
      console.log('   Hash starts with:', user.password_hash.substring(0, 10));

      // Test common passwords
      const passwords = ['admin123', 'password', 'admin', '1234'];
      for (const pwd of passwords) {
        const match = await bcrypt.compare(pwd, user.password_hash);
        if (match) {
          console.log(`✅ Password '${pwd}' MATCHES!`);
        } else {
          console.log(`   Password '${pwd}' does not match`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();
