// Script to create reminder tables for invoice system
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
});

async function createReminderTables() {
    const client = await pool.connect();

    try {
        console.log('🔄 Creating reminder tables...\n');

        // Read the SQL migration file
        const sqlPath = path.join(__dirname, '../migrations/create-invoice-reminder-tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Reminder tables created successfully!\n');

        // Verify tables were created
        const tablesCheck = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('tenant_invoice_reminders', 'tenant_invoice_reminder_config', 'tenant_invoice_reminder_log')
            ORDER BY table_name
        `);

        console.log('📋 Created tables:');
        tablesCheck.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        console.log();

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createReminderTables()
    .then(() => {
        console.log('✅ Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
