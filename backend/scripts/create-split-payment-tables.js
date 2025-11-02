// Script to create enhanced split payment tables
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

async function createSplitPaymentTables() {
    const client = await pool.connect();

    try {
        console.log('🔄 Creating enhanced split payment tables...\n');

        // Read the SQL migration file
        const sqlPath = path.join(__dirname, '../migrations/enhance-split-payments.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Split payment tables created successfully!\n');

        // Verify tables were created
        const tablesCheck = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('tenant_invoice_split_payments', 'tenant_split_payment_records')
            ORDER BY table_name
        `);

        console.log('📋 Created tables:');
        tablesCheck.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        console.log();

        // Verify function was created
        const funcCheck = await client.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_invoice_split_summary'
        `);

        if (funcCheck.rows.length > 0) {
            console.log('✅ Helper function created: get_invoice_split_summary');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createSplitPaymentTables()
    .then(() => {
        console.log('\n✅ Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
