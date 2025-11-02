// Script to check invoice table structure
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
});

async function checkTables() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking invoice tables...\n');

        const tables = [
            'tenant_invoices',
            'tenant_invoice_line_items',
            'tenant_payment_records',
            'tenant_invoice_emails',
            'tenant_invoice_reminders',
            'tenant_email_templates',
            'tenant_invoice_settings',
            'tenant_invoice_alerts'
        ];

        for (const table of tables) {
            const result = await client.query(`
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            if (result.rows.length > 0) {
                console.log(`✅ ${table} (${result.rows.length} columns)`);
            } else {
                console.log(`❌ ${table} - NOT FOUND`);
            }
        }

        console.log('\n🎉 Invoice tables check complete!\n');

    } catch (error) {
        console.error('❌ Check failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkTables()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
