// Test database connection with detailed error output
require('dotenv').config();

console.log('=== Database Configuration ===');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_PORT:', process.env.DB_PORT || '5432');
console.log('DB_NAME:', process.env.DB_NAME || 'travel_support_dev');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***');
console.log('');

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: 2,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log('=== Testing Connection ===');
pool.query('SELECT NOW() as now')
  .then((result) => {
    console.log('✅ SUCCESS! Database connected!');
    console.log('Current time from database:', result.rows[0].now);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FAILED! Database connection error:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('');

    // Provide helpful suggestions based on error
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: PostgreSQL server is not running or not accepting connections.');
      console.log('   - Is PostgreSQL service running?');
      console.log('   - Is it listening on the correct port?');
    } else if (error.code === '28P01') {
      console.log('💡 Suggestion: Password authentication failed.');
      console.log('   - Check DB_PASSWORD in .env file');
    } else if (error.code === '3D000') {
      console.log('💡 Suggestion: Database does not exist.');
      console.log('   - Check DB_NAME in .env file');
      console.log('   - Create the database if needed');
    } else if (error.code === '28000') {
      console.log('💡 Suggestion: Invalid username.');
      console.log('   - Check DB_USER in .env file');
    }

    process.exit(1);
  });
