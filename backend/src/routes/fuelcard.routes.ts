import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Fuel Card Routes
 *
 * Complete fuel card management system
 * Database Tables: tenant_fuelcards, tenant_fuel_transactions
 */

/**
 * @route GET /api/tenants/:tenantId/fuelcards
 * @desc Get all fuel cards for tenant with statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuelcards',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching fuel cards', { tenantId });

    const fuelCards = await query(`
      SELECT
        fc.*,
        d.name as driver_name,
        d.phone as driver_phone,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.registration as vehicle_registration,
        -- Monthly statistics for each card
        COALESCE(monthly_stats.transaction_count, 0) as monthly_transactions,
        COALESCE(monthly_stats.monthly_cost, 0) as monthly_cost,
        COALESCE(monthly_stats.monthly_litres, 0) as monthly_litres,
        -- Last transaction info
        last_trans.transaction_date as last_transaction_date,
        last_trans.station_name as last_station
      FROM tenant_fuelcards fc
      LEFT JOIN tenant_drivers d ON fc.driver_id = d.driver_id AND fc.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON fc.vehicle_id = v.vehicle_id AND fc.tenant_id = v.tenant_id
      LEFT JOIN (
        SELECT
          card_id,
          COUNT(*) as transaction_count,
          SUM(total_cost) as monthly_cost,
          SUM(litres) as monthly_litres
        FROM tenant_fuel_transactions
        WHERE tenant_id = $1
        AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY card_id
      ) monthly_stats ON fc.fuel_card_id = monthly_stats.card_id
      LEFT JOIN (
        SELECT DISTINCT ON (card_id)
          card_id,
          transaction_date,
          station_name
        FROM tenant_fuel_transactions
        WHERE tenant_id = $1
        ORDER BY card_id, transaction_date DESC, transaction_time DESC
      ) last_trans ON fc.fuel_card_id = last_trans.card_id
      WHERE fc.tenant_id = $1 AND fc.is_active = true
      ORDER BY fc.created_at DESC
    `, [tenantId]);

    logger.info('Retrieved fuel cards', { tenantId, count: fuelCards.length });
    res.json(fuelCards);
  })
);

/**
 * @route POST /api/tenants/:tenantId/fuelcards
 * @desc Create new fuel card
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/fuelcards',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      card_number_last_four,
      provider,
      pin,
      driver_id,
      vehicle_id,
      monthly_limit,
      daily_limit,
      status = 'active'
    } = req.body;

    logger.info('Creating fuel card', { tenantId, provider });

    // Validate required fields
    if (!card_number_last_four || !provider) {
      throw new ValidationError('Card number (last 4 digits) and provider are required');
    }

    // Validate card number format
    if (!/^\d{4}$/.test(card_number_last_four)) {
      throw new ValidationError('Card number must be exactly 4 digits');
    }

    // Check for duplicate card numbers
    const duplicate = await queryOne(`
      SELECT fuel_card_id
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND card_number_last_four = $2 AND is_active = true
    `, [tenantId, card_number_last_four]);

    if (duplicate) {
      throw new ValidationError(`A fuel card ending in ${card_number_last_four} already exists`);
    }

    // Verify driver exists if provided
    if (driver_id) {
      const driver = await queryOne(`
        SELECT driver_id FROM tenant_drivers
        WHERE tenant_id = $1 AND driver_id = $2 AND is_active = true
      `, [tenantId, driver_id]);

      if (!driver) {
        throw new ValidationError('Invalid driver ID');
      }
    }

    // Verify vehicle exists if provided
    if (vehicle_id) {
      const vehicle = await queryOne(`
        SELECT vehicle_id FROM tenant_vehicles
        WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
      `, [tenantId, vehicle_id]);

      if (!vehicle) {
        throw new ValidationError('Invalid vehicle ID');
      }
    }

    // Create fuel card
    const userId = (req as any).user?.userId || null;
    const fuelCard = await queryOne(`
      INSERT INTO tenant_fuelcards (
        tenant_id,
        card_number_last_four,
        provider,
        pin,
        driver_id,
        vehicle_id,
        monthly_limit,
        daily_limit,
        status,
        is_active,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      tenantId, card_number_last_four, provider, pin,
      driver_id, vehicle_id, monthly_limit, daily_limit,
      status, userId
    ]);

    logger.info('Fuel card created', { tenantId, cardId: fuelCard.fuel_card_id });
    res.status(201).json({ fuelCard });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/fuelcards/:cardId
 * @desc Update existing fuel card
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/fuelcards/:cardId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, cardId } = req.params;
    const {
      card_number_last_four,
      provider,
      pin,
      driver_id,
      vehicle_id,
      monthly_limit,
      daily_limit,
      status
    } = req.body;

    logger.info('Updating fuel card', { tenantId, cardId });

    // Verify card exists
    const existing = await queryOne(`
      SELECT fuel_card_id
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
    `, [tenantId, cardId]);

    if (!existing) {
      throw new NotFoundError('Fuel card not found');
    }

    // Validate card number format if provided
    if (card_number_last_four && !/^\d{4}$/.test(card_number_last_four)) {
      throw new ValidationError('Card number must be exactly 4 digits');
    }

    // Check for duplicate card numbers (excluding current card)
    if (card_number_last_four) {
      const duplicate = await queryOne(`
        SELECT fuel_card_id
        FROM tenant_fuelcards
        WHERE tenant_id = $1 AND card_number_last_four = $2
        AND fuel_card_id != $3 AND is_active = true
      `, [tenantId, card_number_last_four, cardId]);

      if (duplicate) {
        throw new ValidationError(`Another fuel card ending in ${card_number_last_four} already exists`);
      }
    }

    // Verify driver exists if provided
    if (driver_id) {
      const driver = await queryOne(`
        SELECT driver_id FROM tenant_drivers
        WHERE tenant_id = $1 AND driver_id = $2 AND is_active = true
      `, [tenantId, driver_id]);

      if (!driver) {
        throw new ValidationError('Invalid driver ID');
      }
    }

    // Verify vehicle exists if provided
    if (vehicle_id) {
      const vehicle = await queryOne(`
        SELECT vehicle_id FROM tenant_vehicles
        WHERE tenant_id = $1 AND vehicle_id = $2 AND is_active = true
      `, [tenantId, vehicle_id]);

      if (!vehicle) {
        throw new ValidationError('Invalid vehicle ID');
      }
    }

    // Update fuel card
    const fuelCard = await queryOne(`
      UPDATE tenant_fuelcards SET
        card_number_last_four = COALESCE($3, card_number_last_four),
        provider = COALESCE($4, provider),
        pin = COALESCE($5, pin),
        driver_id = $6,
        vehicle_id = $7,
        monthly_limit = $8,
        daily_limit = $9,
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND fuel_card_id = $2
      RETURNING *
    `, [
      tenantId, cardId, card_number_last_four, provider, pin,
      driver_id, vehicle_id, monthly_limit, daily_limit, status
    ]);

    logger.info('Fuel card updated', { tenantId, cardId });
    res.json({ fuelCard });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/fuelcards/:cardId
 * @desc Delete/deactivate fuel card
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/fuelcards/:cardId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, cardId } = req.params;
    const forceDelete = req.query.force_delete === 'true';

    logger.info('Deleting fuel card', { tenantId, cardId, forceDelete });

    // Check if card exists
    const card = await queryOne(`
      SELECT fuel_card_id, card_number_last_four, provider
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
    `, [tenantId, cardId]);

    if (!card) {
      throw new NotFoundError('Fuel card not found');
    }

    // Check for existing transactions
    const transactionCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM tenant_fuel_transactions
      WHERE tenant_id = $1 AND card_id = $2
    `, [tenantId, cardId]);

    const hasTransactions = parseInt(transactionCount?.count || '0', 10) > 0;

    if (hasTransactions && !forceDelete) {
      // Soft delete - deactivate card but keep records
      await query(`
        UPDATE tenant_fuelcards SET
          is_active = false,
          status = 'deleted',
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND fuel_card_id = $2
      `, [tenantId, cardId]);

      logger.info('Fuel card deactivated', { tenantId, cardId });
      res.json({
        message: 'Fuel card deactivated successfully',
        note: 'Card has transaction history and was deactivated rather than deleted permanently'
      });
    } else {
      // Hard delete - remove card completely
      await query(`
        DELETE FROM tenant_fuelcards
        WHERE tenant_id = $1 AND fuel_card_id = $2
      `, [tenantId, cardId]);

      logger.info('Fuel card deleted permanently', { tenantId, cardId });
      res.json({ message: 'Fuel card deleted successfully' });
    }
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuel-statistics
 * @desc Get fuel statistics for dashboard
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuel-statistics',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const period = (req.query.period as string) || 'current_month';

    logger.info('Fetching fuel statistics', { tenantId, period });

    // Get card counts
    const cardCounts = await query<{ status: string; count: string }>(`
      SELECT status, COUNT(*) as count
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY status
    `, [tenantId]);

    const activeCards = cardCounts.find(row => row.status === 'active');
    const totalCards = cardCounts.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    // Get current month statistics
    const monthStats = await queryOne<{
      transaction_count: string;
      total_cost: string;
      total_litres: string;
      avg_mpg: string;
    }>(`
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(litres), 0) as total_litres,
        COALESCE(AVG(mpg) FILTER (WHERE mpg IS NOT NULL), 0) as avg_mpg
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND transaction_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `, [tenantId]);

    const stats = {
      activeCards: parseInt(activeCards?.count || '0', 10),
      totalCards,
      monthTotal: parseFloat(monthStats?.total_cost || '0'),
      transactionsThisMonth: parseInt(monthStats?.transaction_count || '0', 10),
      avgMPG: parseFloat(monthStats?.avg_mpg || '0'),
      monthLitres: parseFloat(monthStats?.total_litres || '0'),
    };

    logger.info('Retrieved fuel statistics', { tenantId, stats });
    res.json({ stats });
  })
);

/**
 * @route POST /api/tenants/:tenantId/fuel-transactions
 * @desc Create new fuel transaction
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/fuel-transactions',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      card_id,
      driver_id,
      vehicle_id,
      transaction_date,
      transaction_time,
      station_name,
      litres,
      price_per_litre,
      total_cost,
      mileage,
      mpg,
      receipt_number,
      notes
    } = req.body;

    logger.info('Creating fuel transaction', { tenantId, card_id });

    // Validate required fields
    if (!card_id || !transaction_date || !litres || !total_cost) {
      throw new ValidationError('Card ID, transaction date, litres, and total cost are required');
    }

    // Verify card exists
    const card = await queryOne(`
      SELECT fuel_card_id FROM tenant_fuelcards
      WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
    `, [tenantId, card_id]);

    if (!card) {
      throw new ValidationError('Invalid fuel card ID');
    }

    // Create transaction
    const userId = (req as any).user?.userId || null;
    const transaction = await queryOne(`
      INSERT INTO tenant_fuel_transactions (
        tenant_id,
        card_id,
        driver_id,
        vehicle_id,
        transaction_date,
        transaction_time,
        station_name,
        litres,
        price_per_litre,
        total_cost,
        mileage,
        mpg,
        receipt_number,
        notes,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      tenantId, card_id, driver_id, vehicle_id, transaction_date,
      transaction_time, station_name, litres, price_per_litre,
      total_cost, mileage, mpg, receipt_number, notes, userId
    ]);

    logger.info('Fuel transaction created', { tenantId, transactionId: transaction.transaction_id });
    res.status(201).json({ transaction });
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuelcards/:cardId/transactions
 * @desc Get transaction history for a specific fuel card
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuelcards/:cardId/transactions',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, cardId } = req.params;
    const { limit = '50', offset = '0', start_date, end_date } = req.query;

    logger.info('Fetching fuel card transactions', { tenantId, cardId });

    // Build date filter
    let dateFilter = '';
    const queryParams: any[] = [tenantId, cardId];
    let paramIndex = 3;

    if (start_date) {
      dateFilter += ` AND ft.transaction_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      dateFilter += ` AND ft.transaction_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Get transactions
    queryParams.push(parseInt(limit as string), parseInt(offset as string));
    const transactions = await query(`
      SELECT
        ft.*,
        d.name as driver_name,
        d.phone as driver_phone,
        v.registration as vehicle_registration,
        v.make as vehicle_make,
        v.model as vehicle_model,
        fc.card_number_last_four,
        fc.provider
      FROM tenant_fuel_transactions ft
      LEFT JOIN tenant_drivers d ON ft.driver_id = d.driver_id AND ft.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON ft.vehicle_id = v.vehicle_id AND ft.tenant_id = v.tenant_id
      LEFT JOIN tenant_fuelcards fc ON ft.card_id = fc.fuel_card_id AND ft.tenant_id = fc.tenant_id
      WHERE ft.tenant_id = $1 AND ft.card_id = $2 ${dateFilter}
      ORDER BY ft.transaction_date DESC, ft.transaction_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get total count
    const countParams = queryParams.slice(0, queryParams.length - 2);
    const countResult = await query<{ total: string }>(`
      SELECT COUNT(*) as total
      FROM tenant_fuel_transactions ft
      WHERE ft.tenant_id = $1 AND ft.card_id = $2 ${dateFilter}
    `, countParams);

    const total = parseInt(countResult[0]?.total || '0', 10);

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        has_more: total > (parseInt(offset as string, 10) + parseInt(limit as string, 10))
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuelcards/available-drivers
 * @desc Get available drivers for fuel card assignment
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuelcards/available-drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const includeAssigned = req.query.include_assigned !== 'false';

    logger.info('Fetching available drivers', { tenantId, includeAssigned });

    const drivers = await query(`
      SELECT
        d.driver_id,
        d.name,
        d.phone,
        d.email,
        d.employment_type,
        fc.fuel_card_id,
        fc.card_number_last_four,
        fc.provider,
        CASE
          WHEN fc.fuel_card_id IS NOT NULL THEN false
          ELSE true
        END as available_for_card
      FROM tenant_drivers d
      LEFT JOIN tenant_fuelcards fc ON d.driver_id = fc.driver_id
        AND d.tenant_id = fc.tenant_id
        AND fc.is_active = true
      WHERE d.tenant_id = $1 AND d.is_active = true
      ${includeAssigned ? '' : 'AND fc.fuel_card_id IS NULL'}
      ORDER BY d.name
    `, [tenantId]);

    res.json(drivers);
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuelcards/available-vehicles
 * @desc Get available vehicles for fuel card assignment
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuelcards/available-vehicles',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const includeAssigned = req.query.include_assigned !== 'false';

    logger.info('Fetching available vehicles', { tenantId, includeAssigned });

    const vehicles = await query(`
      SELECT
        v.vehicle_id,
        v.make,
        v.model,
        v.registration,
        v.ownership,
        v.driver_id,
        d.name as driver_name,
        fc.fuel_card_id,
        fc.card_number_last_four,
        fc.provider,
        CASE
          WHEN fc.fuel_card_id IS NOT NULL THEN false
          ELSE true
        END as available_for_card
      FROM tenant_vehicles v
      LEFT JOIN tenant_drivers d ON v.driver_id = d.driver_id AND v.tenant_id = d.tenant_id
      LEFT JOIN tenant_fuelcards fc ON v.vehicle_id = fc.vehicle_id
        AND v.tenant_id = fc.tenant_id
        AND fc.is_active = true
      WHERE v.tenant_id = $1 AND v.is_active = true
      ${includeAssigned ? '' : 'AND fc.fuel_card_id IS NULL'}
      ORDER BY v.make, v.model
    `, [tenantId]);

    res.json(vehicles);
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuelcards/export
 * @desc Export fuel transaction data
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuelcards/export',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { format = 'csv', start_date, end_date } = req.query;

    logger.info('Exporting fuel data', { tenantId, format });

    // Build date filter
    let dateFilter = '';
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (start_date) {
      dateFilter += ` AND ft.transaction_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      dateFilter += ` AND ft.transaction_date <= $${paramIndex}`;
      queryParams.push(end_date);
    }

    const transactions = await query(`
      SELECT
        ft.transaction_date,
        ft.transaction_time,
        fc.card_number_last_four,
        fc.provider as card_provider,
        d.name as driver_name,
        v.registration as vehicle_registration,
        v.make as vehicle_make,
        v.model as vehicle_model,
        ft.station_name,
        ft.litres,
        ft.price_per_litre,
        ft.total_cost,
        ft.mileage,
        ft.mpg,
        ft.notes
      FROM tenant_fuel_transactions ft
      LEFT JOIN tenant_fuelcards fc ON ft.card_id = fc.fuel_card_id
      LEFT JOIN tenant_drivers d ON ft.driver_id = d.driver_id AND ft.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON ft.vehicle_id = v.vehicle_id AND ft.tenant_id = v.tenant_id
      WHERE ft.tenant_id = $1 ${dateFilter}
      ORDER BY ft.transaction_date DESC, ft.transaction_time DESC
    `, queryParams);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date', 'Time', 'Card Last 4', 'Provider', 'Driver', 'Vehicle Reg',
        'Vehicle Make', 'Vehicle Model', 'Station', 'Litres', 'Price/L',
        'Total Cost', 'Mileage', 'MPG', 'Notes'
      ];

      let csv = headers.join(',') + '\n';
      transactions.forEach((row: any) => {
        csv += [
          row.transaction_date,
          row.transaction_time || '',
          row.card_number_last_four || '',
          row.card_provider || '',
          row.driver_name || '',
          row.vehicle_registration || '',
          row.vehicle_make || '',
          row.vehicle_model || '',
          `"${row.station_name || ''}"`,
          row.litres || '',
          row.price_per_litre || '',
          row.total_cost || '',
          row.mileage || '',
          row.mpg || '',
          `"${row.notes || ''}"`
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fuel-transactions-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      // JSON format
      res.json({
        export_date: new Date().toISOString(),
        tenant_id: tenantId,
        transaction_count: transactions.length,
        date_range: {
          start_date: start_date || null,
          end_date: end_date || null
        },
        transactions
      });
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/fuel-transactions/bulk-import
 * @desc Bulk import fuel transactions
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/fuel-transactions/bulk-import',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new ValidationError('Transactions array is required');
    }

    logger.info('Bulk importing transactions', { tenantId, count: transactions.length });

    const results: any[] = [];
    const userId = (req as any).user?.userId || null;

    // Process each transaction
    for (const txn of transactions) {
      try {
        // Validate required fields
        if (!txn.card_id || !txn.transaction_date || !txn.litres || !txn.total_cost) {
          results.push({
            success: false,
            error: 'Missing required fields',
            data: txn
          });
          continue;
        }

        // Verify card exists
        const card = await queryOne(`
          SELECT fuel_card_id FROM tenant_fuelcards
          WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
        `, [tenantId, txn.card_id]);

        if (!card) {
          results.push({
            success: false,
            error: 'Invalid fuel card ID',
            data: txn
          });
          continue;
        }

        // Insert transaction
        const transaction = await queryOne(`
          INSERT INTO tenant_fuel_transactions (
            tenant_id,
            card_id,
            driver_id,
            vehicle_id,
            transaction_date,
            transaction_time,
            station_name,
            litres,
            price_per_litre,
            total_cost,
            mileage,
            mpg,
            receipt_number,
            notes,
            created_by,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          tenantId, txn.card_id, txn.driver_id, txn.vehicle_id,
          txn.transaction_date, txn.transaction_time, txn.station_name,
          txn.litres, txn.price_per_litre, txn.total_cost,
          txn.mileage, txn.mpg, txn.receipt_number, txn.notes, userId
        ]);

        results.push({
          success: true,
          transaction
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
          data: txn
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Bulk import complete', { tenantId, successCount, failureCount });

    res.json({
      total: transactions.length,
      successful: successCount,
      failed: failureCount,
      results
    });
  })
);

export default router;
