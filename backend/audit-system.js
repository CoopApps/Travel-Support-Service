const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function auditSystem() {
  try {
    console.log('\n📊 SYSTEM AUDIT - Checking Implementation Status\n');
    console.log('='.repeat(80));

    // 1. Check all database tables
    console.log('\n🗄️  DATABASE TABLES:\n');
    const tablesResult = await pool.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    tables.forEach(table => {
      const row = tablesResult.rows.find(r => r.table_name === table);
      console.log(`  ✓ ${table.padEnd(35)} (${row.column_count} columns)`);
    });

    console.log(`\n  Total tables: ${tables.length}`);

    // 2. Check which tables have data
    console.log('\n\n📈 TABLES WITH DATA:\n');
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        if (count > 0) {
          console.log(`  ✓ ${table.padEnd(35)} (${count} rows)`);
        }
      } catch (err) {
        // Skip tables with issues
      }
    }

    // 3. Check tenant-scoped tables
    console.log('\n\n🏢 TENANT-SCOPED TABLES:\n');
    const tenantTables = [];
    for (const table of tables) {
      try {
        const columnCheck = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [table]);

        if (columnCheck.rows.length > 0) {
          tenantTables.push(table);
          console.log(`  ✓ ${table}`);
        }
      } catch (err) {
        // Skip
      }
    }

    console.log(`\n  Total tenant-scoped tables: ${tenantTables.length}`);

    // 4. Check feature implementation status
    console.log('\n\n🎯 FEATURE IMPLEMENTATION STATUS:\n');

    const features = [
      { name: 'Authentication', table: 'tenant_users', implemented: true },
      { name: 'Customer Management', table: 'tenant_customers', implemented: true },
      { name: 'Driver Management', table: 'tenant_drivers', implemented: false },
      { name: 'Vehicle Management', table: 'tenant_vehicles', implemented: false },
      { name: 'Schedule Management', table: 'tenant_schedules', implemented: false },
      { name: 'Billing/Invoicing', table: 'tenant_billing_invoices', implemented: false },
      { name: 'Dashboard', table: null, implemented: true },
      { name: 'Platform Admin', table: 'platform_admins', implemented: true },
      { name: 'Tenant Management', table: 'tenants', implemented: true },
      { name: 'User Management', table: 'tenant_users', implemented: false },
      { name: 'Audit Logs', table: 'tenant_audit_logs', implemented: false },
      { name: 'Permits', table: 'tenant_permits', implemented: false },
      { name: 'Training Records', table: 'tenant_training_records', implemented: false },
      { name: 'Maintenance Records', table: 'tenant_maintenance_records', implemented: false },
      { name: 'Holiday Management', table: 'tenant_holidays', implemented: false },
      { name: 'Route Optimization', table: 'tenant_optimized_routes', implemented: false },
    ];

    features.forEach(feature => {
      const status = feature.implemented ? '✅ DONE' : '❌ TODO';
      const tableStatus = feature.table && tables.includes(feature.table) ? '(table exists)' : '';
      console.log(`  ${status}  ${feature.name.padEnd(25)} ${tableStatus}`);
    });

    const implemented = features.filter(f => f.implemented).length;
    const total = features.length;
    const percentage = Math.round((implemented / total) * 100);

    console.log(`\n  Progress: ${implemented}/${total} features (${percentage}%)`);

    // 5. Check backend routes
    console.log('\n\n🛤️  BACKEND API ROUTES (React version):\n');
    const fs = require('fs');
    const path = require('path');
    const routesDir = path.join(__dirname, 'src', 'routes');

    if (fs.existsSync(routesDir)) {
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'));
      routeFiles.forEach(file => {
        console.log(`  ✓ ${file}`);
      });
      console.log(`\n  Total route files: ${routeFiles.length}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Audit complete!\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

auditSystem();
