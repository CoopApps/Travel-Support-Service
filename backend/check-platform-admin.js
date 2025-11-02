const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkPlatformAdmin() {
  try {
    // Check for platform_admins table
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'platform_admins'
      );
    `);

    console.log('\n🔍 Checking for platform admin setup...\n');

    if (tableCheck.rows[0].exists) {
      const admins = await pool.query('SELECT * FROM platform_admins LIMIT 5');
      console.log('✅ platform_admins table exists');
      console.log(`Found ${admins.rows.length} platform admins`);

      if (admins.rows.length > 0) {
        console.log('\n📋 Platform Admins:');
        admins.rows.forEach(admin => {
          console.log(`  - ID: ${admin.admin_id}, Email: ${admin.email}, Username: ${admin.username || 'N/A'}`);
        });
      } else {
        console.log('❌ No platform admins found - need to create one');
      }
    } else {
      console.log('❌ platform_admins table does not exist');
      console.log('   Platform admin functionality may not be set up');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkPlatformAdmin();
