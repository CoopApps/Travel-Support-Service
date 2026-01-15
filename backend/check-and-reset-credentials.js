/**
 * Check and Reset Admin Credentials
 *
 * This script checks what credentials exist for tenant 2 (Sheffield)
 * and optionally resets them to admin/admin123
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Connect to Railway production database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
  ssl: false,
});

async function checkAndResetCredentials() {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to database\n');

    // Check current admin user for tenant 2
    console.log('📋 Checking admin user for tenant 2 (Sheffield)...\n');

    const checkResult = await client.query(`
      SELECT
        user_id,
        username,
        email,
        role,
        is_active,
        created_at,
        last_login
      FROM tenant_users
      WHERE tenant_id = 2 AND username = 'admin'
    `);

    if (checkResult.rows.length === 0) {
      console.log('❌ No admin user found for tenant 2');
      return;
    }

    const adminUser = checkResult.rows[0];
    console.log('✅ Found admin user:');
    console.log('   User ID:', adminUser.user_id);
    console.log('   Username:', adminUser.username);
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Active:', adminUser.is_active);
    console.log('   Last Login:', adminUser.last_login || 'Never');
    console.log('');

    // Test both possible passwords
    console.log('🔐 Testing common passwords...\n');

    const passwordsToTest = [
      'admin123',
      'Sheffield2024!',
      'PlatformAdmin2024!',
      'Admin123!'
    ];

    const currentHashResult = await client.query(
      'SELECT password_hash FROM tenant_users WHERE user_id = $1 AND tenant_id = $2',
      [adminUser.user_id, 2]
    );
    const currentHash = currentHashResult.rows[0].password_hash;

    let foundPassword = null;
    for (const testPassword of passwordsToTest) {
      const matches = await bcrypt.compare(testPassword, currentHash);
      if (matches) {
        console.log(`✅ Current password is: "${testPassword}"`);
        foundPassword = testPassword;
        break;
      }
    }

    if (!foundPassword) {
      console.log('⚠️  Current password does not match any common passwords');
      console.log('');
    }

    // Prompt to reset
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Would you like to reset the password to "admin123"?');
    console.log('Set RESET_PASSWORD=true environment variable to proceed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (process.env.RESET_PASSWORD === 'true') {
      console.log('🔄 Resetting password to "admin123"...\n');

      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await client.query(
        'UPDATE tenant_users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND tenant_id = $3',
        [hashedPassword, adminUser.user_id, 2]
      );

      console.log('✅ Password reset successful!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 LOGIN CREDENTIALS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('Tenant ID: 2');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  Wait 15 minutes for rate limiting to expire before trying to log in');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndResetCredentials().catch(console.error);
