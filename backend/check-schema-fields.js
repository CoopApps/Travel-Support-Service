const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkSchema() {
  try {
    // Check customer payment fields
    const customerCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name='tenant_customers'
      AND (column_name LIKE '%pay%' OR column_name LIKE '%split%' OR column_name LIKE '%billing%')
      ORDER BY ordinal_position
    `);

    console.log('Payment-related columns in tenant_customers:');
    customerCols.rows.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

    // Check schedule time fields
    const scheduleCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name='tenant_schedules'
      AND (column_name LIKE '%time%' OR column_name LIKE '%pickup%' OR column_name LIKE '%price%')
      ORDER BY ordinal_position
    `);

    console.log('\nTime/price-related columns in tenant_schedules:');
    scheduleCols.rows.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
