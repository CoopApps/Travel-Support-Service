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

async function resetPassword() {
  try {
    const username = 'admin';
    const newPassword = 'admin123';
    const tenantId = 2;

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('Generated hash for password:', newPassword);

    // Update the password
    const result = await pool.query(
      'UPDATE tenant_users SET password_hash = $1 WHERE username = $2 AND tenant_id = $3 RETURNING user_id, username, role',
      [hash, username, tenantId]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password reset successful for:', result.rows[0]);
      console.log('   New password:', newPassword);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
