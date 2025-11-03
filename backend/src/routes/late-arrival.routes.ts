import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, getDbClient } from '../config/database';

const router: Router = express.Router();

// Extend Request type to include user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    role: string;
  };
}
  /**
   * Log a late arrival
   */
  router.post('/tenants/:tenantId/late-arrivals', verifyTenantAccess, async (req: AuthRequest, res) => {
    const { tenantId } = req.params;
    const {
      customer_id,
      scheduled_time,
      arrival_time,
      delay_minutes,
      reason,
      notes,
      date
    } = req.body;

    try {
      const client = await getDbClient();

      try {
        // Create table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS tenant_late_arrivals (
            late_arrival_id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            date DATE NOT NULL,
            scheduled_time TIME NOT NULL,
            arrival_time TIME NOT NULL,
            delay_minutes INTEGER NOT NULL,
            reason VARCHAR(50),
            notes TEXT,
            reported_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
            FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id)
          );

          CREATE INDEX IF NOT EXISTS idx_late_arrivals_tenant ON tenant_late_arrivals(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_late_arrivals_customer ON tenant_late_arrivals(customer_id);
          CREATE INDEX IF NOT EXISTS idx_late_arrivals_date ON tenant_late_arrivals(date);
        `);

        // Insert late arrival record
        const result = await client.query(`
          INSERT INTO tenant_late_arrivals (
            tenant_id,
            customer_id,
            date,
            scheduled_time,
            arrival_time,
            delay_minutes,
            reason,
            notes,
            reported_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          tenantId,
          customer_id,
          date,
          scheduled_time,
          arrival_time,
          delay_minutes,
          reason || null,
          notes || null,
          req.user?.userId || null
        ]);

        res.json({
          success: true,
          lateArrival: result.rows[0]
        });
      } finally {
        await client.end();
      }
    } catch (error: any) {
      console.error('Error logging late arrival:', error);
      res.status(500).json({
        error: {
          message: 'Failed to log late arrival',
          details: error.message
        }
      });
    }
  });

  /**
   * Get late arrivals for a tenant
   */
  router.get('/tenants/:tenantId/late-arrivals', verifyTenantAccess, async (req: AuthRequest, res) => {
    const { tenantId } = req.params;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const customerId = req.query.customerId as string | undefined;

    try {
      const client = await getDbClient();

      try {
        let query = `
          SELECT
            la.*,
            c.name as customer_name,
            c.phone as customer_phone,
            u.name as reported_by_name
          FROM tenant_late_arrivals la
          LEFT JOIN tenant_customers c ON la.customer_id = c.customer_id
          LEFT JOIN tenant_users u ON la.reported_by = u.user_id
          WHERE la.tenant_id = $1
        `;

        const params: any[] = [tenantId];
        let paramIndex = 2;

        if (startDate) {
          query += ` AND la.date >= $${paramIndex}`;
          params.push(startDate);
          paramIndex++;
        }

        if (endDate) {
          query += ` AND la.date <= $${paramIndex}`;
          params.push(endDate);
          paramIndex++;
        }

        if (customerId) {
          query += ` AND la.customer_id = $${paramIndex}`;
          params.push(customerId);
          paramIndex++;
        }

        query += ' ORDER BY la.date DESC, la.scheduled_time DESC';

        const result = await client.query(query, params);

        res.json({
          lateArrivals: result.rows
        });
      } finally {
        await client.end();
      }
    } catch (error: any) {
      console.error('Error fetching late arrivals:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch late arrivals',
          details: error.message
        }
      });
    }
  });

  /**
   * Get late arrival statistics
   */
  router.get('/tenants/:tenantId/late-arrivals/stats', verifyTenantAccess, async (req: AuthRequest, res) => {
    const { tenantId } = req.params;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    try {
      const client = await getDbClient();

      try {
        let query = `
          SELECT
            COUNT(*) as total_late_arrivals,
            AVG(delay_minutes) as avg_delay_minutes,
            MAX(delay_minutes) as max_delay_minutes,
            reason,
            COUNT(*) as count_by_reason
          FROM tenant_late_arrivals
          WHERE tenant_id = $1
        `;

        const params: any[] = [tenantId];
        let paramIndex = 2;

        if (startDate) {
          query += ` AND date >= $${paramIndex}`;
          params.push(startDate);
          paramIndex++;
        }

        if (endDate) {
          query += ` AND date <= $${paramIndex}`;
          params.push(endDate);
          paramIndex++;
        }

        query += ' GROUP BY reason';

        const result = await client.query(query, params);

        // Get total stats
        const totalQuery = `
          SELECT
            COUNT(*) as total,
            AVG(delay_minutes) as avg_delay,
            MAX(delay_minutes) as max_delay
          FROM tenant_late_arrivals
          WHERE tenant_id = $1
          ${startDate ? `AND date >= $2` : ''}
          ${endDate ? `AND date <= $${startDate ? 3 : 2}` : ''}
        `;

        const totalParams: (string | number)[] = [tenantId];
        if (startDate) totalParams.push(startDate as string);
        if (endDate) totalParams.push(endDate as string);

        const totalResult = await client.query(totalQuery, totalParams);

        res.json({
          stats: {
            total: parseInt(totalResult.rows[0]?.total || 0),
            averageDelay: parseFloat(totalResult.rows[0]?.avg_delay || 0).toFixed(1),
            maxDelay: parseInt(totalResult.rows[0]?.max_delay || 0),
            byReason: result.rows
          }
        });
      } finally {
        await client.end();
      }
    } catch (error: any) {
      console.error('Error fetching late arrival stats:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch late arrival statistics',
          details: error.message
        }
      });
    }
  });

export default router;
