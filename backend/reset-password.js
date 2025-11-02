const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

async function resetPassword() {
  const newPassword = '123456'; // New 6-character password
  const username = 'admin'; // Change this if needed
  const tenantId = 2; // Your tenant ID (Sheffield Transport)

  try {
    // Generate bcrypt hash
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('Generated password hash:', passwordHash);

    // Connect to database
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'travel_support_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    // Update password in database
    const result = await pool.query(
      'UPDATE tenant_users SET password_hash = $1 WHERE username = $2 AND tenant_id = $3',
      [passwordHash, username, tenantId]
    );

    console.log('\n✅ Password updated successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Rows updated: ${result.rowCount}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
