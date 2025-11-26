/**
 * Check which tables exist and which are missing
 */
require('dotenv').config();
const { Pool } = require('pg');

async function checkMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  // Tables that should exist based on migration files
  const expectedTables = [
    // Core tables
    'tenants',
    'tenant_users',
    'tenant_customers',
    'tenant_drivers',
    'tenant_vehicles',
    'tenant_trips',
    'tenant_invoices',
    'tenant_schedules',
    // Messaging
    'tenant_messages',
    'driver_messages',
    'driver_to_office_messages',
    'sms_delivery_log',
    'driver_sms_delivery_log',
    // Invoicing
    'tenant_invoice_line_items',
    'tenant_invoice_reminders',
    'tenant_invoice_reminder_config',
    // Payroll
    'tenant_payroll_periods',
    'tenant_payroll_records',
    'tenant_timesheets',
    // Compliance
    'tenant_training_records',
    'tenant_driver_permits',
    'tenant_vehicle_maintenance',
    'tenant_vehicle_incidents',
    // Documents
    'tenant_documents',
    'document_versions',
    // Cooperative/Section 22
    'section22_bus_routes',
    'section22_bus_bookings',
    'section22_route_stops',
    'section22_timetables',
    'cooperative_members',
    'cooperative_voting',
    // Safeguarding
    'tenant_safeguarding_reports',
    // Audit
    'tenant_audit_log',
    // Password reset
    'password_reset_tokens',
    // Cost centers
    'tenant_cost_centers',
    // Feedback
    'customer_feedback',
    // Reminder system
    'tenant_customer_reminder_logs',
  ];

  try {
    console.log('Checking database tables...\n');

    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = new Set(result.rows.map(r => r.table_name));

    const missing = [];
    const exists = [];

    for (const table of expectedTables) {
      if (existingTables.has(table)) {
        exists.push(table);
      } else {
        missing.push(table);
      }
    }

    console.log(`✅ Existing tables (${exists.length}):`);
    exists.forEach(t => console.log(`   - ${t}`));

    if (missing.length > 0) {
      console.log(`\n❌ Missing tables (${missing.length}):`);
      missing.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('\n✅ All expected tables exist!');
    }

    console.log(`\n📊 Total tables in database: ${existingTables.size}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrations();
