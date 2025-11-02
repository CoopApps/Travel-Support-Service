// Script to create missing tenant_invoice_alerts table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234'
});

async function createAlertsTable() {
    const client = await pool.connect();

    try {
        console.log('🔄 Creating tenant_invoice_alerts table...\n');

        await client.query(`
            CREATE TABLE IF NOT EXISTS tenant_invoice_alerts (
                alert_id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
                invoice_id INTEGER NOT NULL REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE,

                -- Alert details
                alert_type VARCHAR(50) NOT NULL, -- overdue, payment_received, reminder_sent, provider_unpaid
                alert_message TEXT NOT NULL,

                -- Target
                target_user_type VARCHAR(20), -- admin, customer, driver
                target_user_id INTEGER, -- customer_id or user_id

                -- Status
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoice_alerts_tenant ON tenant_invoice_alerts(tenant_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoice_alerts_target ON tenant_invoice_alerts(target_user_type, target_user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_invoice_alerts_unread ON tenant_invoice_alerts(is_read) WHERE is_read = FALSE;`);

        console.log('✅ tenant_invoice_alerts table created successfully!\n');

    } catch (error) {
        console.error('❌ Creation failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createAlertsTable()
    .then(() => {
        console.log('✅ All invoice tables now ready!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
