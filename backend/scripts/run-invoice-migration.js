// Script to run invoice table migrations
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration (from .env or defaults)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running invoice table migrations...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, '../migrations/create-invoice-tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Invoice tables created successfully!\n');
        console.log('Tables created:');
        console.log('  - tenant_invoices');
        console.log('  - tenant_invoice_line_items');
        console.log('  - tenant_payment_records');
        console.log('  - tenant_invoice_emails');
        console.log('  - tenant_invoice_reminders');
        console.log('  - tenant_email_templates');
        console.log('  - tenant_invoice_settings');
        console.log('  - tenant_invoice_alerts\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
