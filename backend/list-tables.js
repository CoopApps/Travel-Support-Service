const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'travel_support_dev',
  user: 'postgres',
  password: '1234'
});

pool.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name LIKE 'tenant_%'
  ORDER BY table_name
`).then(result => {
  console.log('Total tenant tables:', result.rows.length);
  console.log('\nBusiness Tables:');
  result.rows.forEach(row => {
    console.log('  ✓', row.table_name);
  });
  pool.end();
}).catch(err => {
  console.log('Error:', err.message);
  pool.end();
});
