const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function fixTrigger() {
  try {
    console.log('\n🔧 Dropping legacy subscription trigger...\n');

    // Drop the trigger
    await pool.query('DROP TRIGGER IF EXISTS user_subscription_change_trigger ON tenant_users');
    console.log('✅ Trigger dropped successfully');

    console.log('\n📝 Note: This was a legacy trigger that tracked subscription changes.');
    console.log('   You can recreate it later if needed, but it needs to be updated');
    console.log('   to work with the new schema columns.\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixTrigger();
