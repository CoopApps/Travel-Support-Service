// Script to add missing archived column to tenant_invoices table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
});

async function addArchivedColumn() {
    const client = await pool.connect();

    try {
        console.log('🔄 Adding archived column to tenant_invoices table...\n');

        // Add archived column if it doesn't exist
        await client.query(`
            ALTER TABLE tenant_invoices
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
        `);

        await client.query(`
            ALTER TABLE tenant_invoices
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
        `);

        await client.query(`
            ALTER TABLE tenant_invoices
            ADD COLUMN IF NOT EXISTS archived_by INTEGER;
        `);

        console.log('✅ Added archived columns successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addArchivedColumn()
    .then(() => {
        console.log('✅ Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
