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
    const { archived } = req.query;

    logger.info('Fetching fuel cards', { tenantId, archived });

    // Build archive filter
    let archiveFilter = '';
    if (archived === 'true') {
      archiveFilter = 'AND fc.archived = true';
    } else if (archived === 'false') {
      archiveFilter = 'AND fc.archived = false';
    }
    // If archived parameter not provided, return all cards

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
      WHERE fc.tenant_id = $1 AND fc.is_active = true ${archiveFilter}
      ORDER BY fc.created_at DESC
    `, [tenantId]);

    logger.info('Retrieved fuel cards', { tenantId, count: fuelCards.length, archived });
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

/**
 * FUEL CARD ENHANCEMENTS - November 11, 2025
 * New features: Archive, Analytics, Reconciliation, Enhanced Import
 */

/**
 * @route PUT /api/tenants/:tenantId/fuelcards/:cardId/archive
 * @desc Archive a fuel card
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/fuelcards/:cardId/archive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, cardId } = req.params;
    const { reason } = req.body;

    logger.info('Archiving fuel card', { tenantId, cardId });

    // Check if card exists and is not already archived
    const card = await queryOne(`
      SELECT fuel_card_id, card_number_last_four, archived
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
    `, [tenantId, cardId]);

    if (!card) {
      throw new NotFoundError('Fuel card not found');
    }

    if (card.archived) {
      throw new ValidationError('Fuel card is already archived');
    }

    // Archive the card
    const userId = (req as any).user?.userId || null;
    const archivedCard = await queryOne(`
      UPDATE tenant_fuelcards SET
        archived = true,
        archived_at = CURRENT_TIMESTAMP,
        archived_by = $3,
        archive_reason = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND fuel_card_id = $2
      RETURNING *
    `, [tenantId, cardId, userId, reason]);

    logger.info('Fuel card archived', { tenantId, cardId });
    res.json({
      message: 'Fuel card archived successfully',
      fuelCard: archivedCard
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/fuelcards/:cardId/unarchive
 * @desc Unarchive a fuel card
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/fuelcards/:cardId/unarchive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, cardId } = req.params;

    logger.info('Unarchiving fuel card', { tenantId, cardId });

    // Check if card exists and is archived
    const card = await queryOne(`
      SELECT fuel_card_id, archived
      FROM tenant_fuelcards
      WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
    `, [tenantId, cardId]);

    if (!card) {
      throw new NotFoundError('Fuel card not found');
    }

    if (!card.archived) {
      throw new ValidationError('Fuel card is not archived');
    }

    // Unarchive the card
    const unarchivedCard = await queryOne(`
      UPDATE tenant_fuelcards SET
        archived = false,
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND fuel_card_id = $2
      RETURNING *
    `, [tenantId, cardId]);

    logger.info('Fuel card unarchived', { tenantId, cardId });
    res.json({
      message: 'Fuel card unarchived successfully',
      fuelCard: unarchivedCard
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/fuel-transactions/enhanced-import
 * @desc Enhanced bulk import with validation and error handling
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/fuel-transactions/enhanced-import',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { transactions, provider_name, validate_only = false } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new ValidationError('Transactions array is required and must not be empty');
    }

    logger.info('Enhanced bulk import', { tenantId, count: transactions.length, provider: provider_name });

    const results: any[] = [];
    const userId = (req as any).user?.userId || null;

    // Validation phase
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      const errors: string[] = [];

      // Required field validation
      if (!txn.card_id) errors.push('card_id is required');
      if (!txn.transaction_date) errors.push('transaction_date is required');
      if (!txn.litres || txn.litres <= 0) errors.push('litres must be greater than 0');
      if (!txn.total_cost || txn.total_cost <= 0) errors.push('total_cost must be greater than 0');

      // Date format validation
      if (txn.transaction_date && isNaN(Date.parse(txn.transaction_date))) {
        errors.push('Invalid date format');
      }

      // Verify card exists
      let cardValid = false;
      if (txn.card_id) {
        const card = await queryOne(`
          SELECT fuel_card_id, archived, status
          FROM tenant_fuelcards
          WHERE tenant_id = $1 AND fuel_card_id = $2 AND is_active = true
        `, [tenantId, txn.card_id]);

        if (!card) {
          errors.push(`Card ID ${txn.card_id} not found`);
        } else if (card.archived) {
          errors.push(`Card ID ${txn.card_id} is archived`);
        } else if (card.status !== 'active') {
          errors.push(`Card ID ${txn.card_id} is not active (status: ${card.status})`);
        } else {
          cardValid = true;
        }
      }

      // Check for duplicate transaction
      if (cardValid && txn.transaction_date && txn.receipt_number) {
        const duplicate = await queryOne(`
          SELECT transaction_id
          FROM tenant_fuel_transactions
          WHERE tenant_id = $1 AND card_id = $2
          AND transaction_date = $3 AND receipt_number = $4
        `, [tenantId, txn.card_id, txn.transaction_date, txn.receipt_number]);

        if (duplicate) {
          errors.push('Duplicate transaction (same card, date, and receipt number)');
        }
      }

      // Calculate price per litre if not provided
      if (!txn.price_per_litre && txn.total_cost && txn.litres) {
        txn.price_per_litre = (txn.total_cost / txn.litres).toFixed(3);
      }

      // Validate reasonable values
      if (txn.price_per_litre && (txn.price_per_litre < 0.5 || txn.price_per_litre > 5.0)) {
        errors.push('Price per litre seems unusual (should be between £0.50-£5.00)');
      }

      if (txn.litres && txn.litres > 200) {
        errors.push('Litres exceeds reasonable tank capacity (>200L)');
      }

      results.push({
        row: i + 1,
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        data: txn
      });
    }

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    // If validate_only mode, return validation results
    if (validate_only) {
      return res.json({
        validation_mode: true,
        total: transactions.length,
        valid: validCount,
        invalid: invalidCount,
        results: results.filter(r => !r.valid) // Only return invalid ones
      });
    }

    // Import phase - only import valid transactions
    const imported: any[] = [];
    const failed: any[] = [];

    for (const result of results) {
      if (!result.valid) {
        failed.push(result);
        continue;
      }

      try {
        const txn = result.data;
        const transaction = await queryOne(`
          INSERT INTO tenant_fuel_transactions (
            tenant_id, card_id, driver_id, vehicle_id,
            transaction_date, transaction_time, station_name,
            litres, price_per_litre, total_cost,
            mileage, mpg, receipt_number, notes,
            created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          tenantId, txn.card_id, txn.driver_id, txn.vehicle_id,
          txn.transaction_date, txn.transaction_time, txn.station_name,
          txn.litres, txn.price_per_litre, txn.total_cost,
          txn.mileage, txn.mpg, txn.receipt_number, txn.notes, userId
        ]);

        imported.push({
          row: result.row,
          success: true,
          transaction
        });
      } catch (error: any) {
        failed.push({
          row: result.row,
          success: false,
          error: error.message,
          data: result.data
        });
      }
    }

    logger.info('Enhanced import complete', {
      tenantId,
      total: transactions.length,
      imported: imported.length,
      failed: failed.length
    });

    return res.json({
      total: transactions.length,
      imported: imported.length,
      failed: failed.length,
      imported_transactions: imported,
      failed_transactions: failed
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuel-reconciliation
 * @desc Reconciliation dashboard - identify issues and anomalies
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuel-reconciliation',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { start_date, end_date } = req.query;

    logger.info('Fetching reconciliation data', { tenantId });

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

    // Get transactions with missing driver/vehicle
    const unmatchedTransactions = await query(`
      SELECT
        ft.transaction_id,
        ft.transaction_date,
        ft.total_cost,
        ft.litres,
        fc.card_number_last_four,
        fc.provider,
        CASE
          WHEN ft.driver_id IS NULL THEN 'No driver assigned'
          WHEN ft.vehicle_id IS NULL THEN 'No vehicle assigned'
          ELSE 'Complete'
        END as issue_type
      FROM tenant_fuel_transactions ft
      LEFT JOIN tenant_fuelcards fc ON ft.card_id = fc.fuel_card_id
      WHERE ft.tenant_id = $1 ${dateFilter}
      AND (ft.driver_id IS NULL OR ft.vehicle_id IS NULL)
      ORDER BY ft.transaction_date DESC
      LIMIT 50
    `, queryParams);

    // Get cards exceeding monthly limits
    const exceededLimits = await query(`
      SELECT
        fc.fuel_card_id,
        fc.card_number_last_four,
        fc.provider,
        fc.monthly_limit,
        fc.daily_limit,
        d.name as driver_name,
        monthly_usage.total_cost as monthly_total,
        monthly_usage.transaction_count,
        CASE
          WHEN fc.monthly_limit IS NOT NULL AND monthly_usage.total_cost > fc.monthly_limit
          THEN 'Monthly limit exceeded'
          ELSE 'OK'
        END as status
      FROM tenant_fuelcards fc
      LEFT JOIN tenant_drivers d ON fc.driver_id = d.driver_id AND fc.tenant_id = d.tenant_id
      LEFT JOIN (
        SELECT
          card_id,
          COUNT(*) as transaction_count,
          SUM(total_cost) as total_cost
        FROM tenant_fuel_transactions
        WHERE tenant_id = $1
        AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY card_id
      ) monthly_usage ON fc.fuel_card_id = monthly_usage.card_id
      WHERE fc.tenant_id = $1
      AND fc.is_active = true
      AND fc.archived = false
      AND fc.monthly_limit IS NOT NULL
      AND monthly_usage.total_cost > fc.monthly_limit
      ORDER BY (monthly_usage.total_cost - fc.monthly_limit) DESC
    `, [tenantId]);

    // Get unusual transactions (high amounts, unusual times)
    const unusualTransactions = await query(`
      SELECT
        ft.transaction_id,
        ft.transaction_date,
        ft.transaction_time,
        ft.total_cost,
        ft.litres,
        ft.price_per_litre,
        fc.card_number_last_four,
        d.name as driver_name,
        v.registration as vehicle_registration,
        CASE
          WHEN ft.total_cost > 200 THEN 'High cost (>£200)'
          WHEN ft.litres > 150 THEN 'High volume (>150L)'
          WHEN ft.price_per_litre < 0.8 OR ft.price_per_litre > 3.0 THEN 'Unusual price per litre'
          ELSE 'Unknown issue'
        END as issue_type
      FROM tenant_fuel_transactions ft
      LEFT JOIN tenant_fuelcards fc ON ft.card_id = fc.fuel_card_id
      LEFT JOIN tenant_drivers d ON ft.driver_id = d.driver_id AND ft.tenant_id = d.tenant_id
      LEFT JOIN tenant_vehicles v ON ft.vehicle_id = v.vehicle_id AND ft.tenant_id = v.tenant_id
      WHERE ft.tenant_id = $1 ${dateFilter}
      AND (
        ft.total_cost > 200
        OR ft.litres > 150
        OR ft.price_per_litre < 0.8
        OR ft.price_per_litre > 3.0
      )
      ORDER BY ft.transaction_date DESC
      LIMIT 50
    `, queryParams);

    // Get duplicate/suspicious transactions (same card, similar amount, same day)
    const suspiciousTransactions = await query(`
      SELECT
        ft1.transaction_id,
        ft1.transaction_date,
        ft1.transaction_time,
        ft1.total_cost,
        fc.card_number_last_four,
        d.name as driver_name,
        COUNT(*) OVER (PARTITION BY ft1.card_id, ft1.transaction_date, ROUND(ft1.total_cost::numeric, 0)) as similar_count
      FROM tenant_fuel_transactions ft1
      LEFT JOIN tenant_fuelcards fc ON ft1.card_id = fc.fuel_card_id
      LEFT JOIN tenant_drivers d ON ft1.driver_id = d.driver_id AND ft1.tenant_id = d.tenant_id
      WHERE ft1.tenant_id = $1 ${dateFilter}
      HAVING COUNT(*) OVER (PARTITION BY ft1.card_id, ft1.transaction_date, ROUND(ft1.total_cost::numeric, 0)) > 1
      ORDER BY ft1.transaction_date DESC, ft1.transaction_time DESC
      LIMIT 50
    `, queryParams);

    // Summary stats
    const summary = {
      unmatched_transactions: unmatchedTransactions.length,
      cards_exceeding_limits: exceededLimits.length,
      unusual_transactions: unusualTransactions.length,
      suspicious_transactions: suspiciousTransactions.length,
      total_issues: unmatchedTransactions.length + exceededLimits.length + unusualTransactions.length + suspiciousTransactions.length
    };

    res.json({
      summary,
      issues: {
        unmatched_transactions: unmatchedTransactions,
        cards_exceeding_limits: exceededLimits,
        unusual_transactions: unusualTransactions,
        suspicious_transactions: suspiciousTransactions
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuel-analytics
 * @desc Advanced fuel analytics dashboard
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuel-analytics',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { period = '6' } = req.query; // months to analyze

    logger.info('Fetching fuel analytics', { tenantId, period });

    // Monthly trends for the past N months
    const monthlyTrends = await query(`
      SELECT
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(litres), 0) as total_litres,
        COALESCE(AVG(price_per_litre), 0) as avg_price_per_litre,
        COALESCE(AVG(mpg) FILTER (WHERE mpg IS NOT NULL), 0) as avg_mpg
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${parseInt(period as string)} months'
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
      ORDER BY month DESC
    `, [tenantId]);

    // Cost per driver ranking
    const driverRankings = await query(`
      SELECT
        d.driver_id,
        d.name as driver_name,
        d.employment_type,
        COUNT(ft.transaction_id) as transaction_count,
        COALESCE(SUM(ft.total_cost), 0) as total_spent,
        COALESCE(SUM(ft.litres), 0) as total_litres,
        COALESCE(AVG(ft.mpg) FILTER (WHERE ft.mpg IS NOT NULL), 0) as avg_mpg,
        CASE
          WHEN COUNT(ft.transaction_id) = 0 THEN 0
          ELSE COALESCE(SUM(ft.total_cost), 0) / COUNT(ft.transaction_id)
        END as avg_cost_per_transaction
      FROM tenant_drivers d
      LEFT JOIN tenant_fuel_transactions ft ON d.driver_id = ft.driver_id AND d.tenant_id = ft.tenant_id
        AND ft.transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
      WHERE d.tenant_id = $1 AND d.is_active = true
      GROUP BY d.driver_id, d.name, d.employment_type
      HAVING COUNT(ft.transaction_id) > 0
      ORDER BY total_spent DESC
      LIMIT 20
    `, [tenantId]);

    // Fuel efficiency by vehicle
    const vehicleEfficiency = await query(`
      SELECT
        v.vehicle_id,
        v.make,
        v.model,
        v.registration,
        COUNT(ft.transaction_id) as transaction_count,
        COALESCE(SUM(ft.total_cost), 0) as total_cost,
        COALESCE(SUM(ft.litres), 0) as total_litres,
        COALESCE(AVG(ft.mpg) FILTER (WHERE ft.mpg IS NOT NULL), 0) as avg_mpg,
        CASE
          WHEN SUM(ft.litres) = 0 THEN 0
          ELSE SUM(ft.total_cost) / SUM(ft.litres)
        END as cost_per_litre
      FROM tenant_vehicles v
      LEFT JOIN tenant_fuel_transactions ft ON v.vehicle_id = ft.vehicle_id AND v.tenant_id = ft.tenant_id
        AND ft.transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
      WHERE v.tenant_id = $1 AND v.is_active = true
      GROUP BY v.vehicle_id, v.make, v.model, v.registration
      HAVING COUNT(ft.transaction_id) > 0
      ORDER BY avg_mpg DESC
      LIMIT 20
    `, [tenantId]);

    // Station price comparison
    const stationComparison = await query(`
      SELECT
        station_name,
        COUNT(*) as transaction_count,
        COALESCE(AVG(price_per_litre), 0) as avg_price_per_litre,
        COALESCE(SUM(total_cost), 0) as total_spent
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND station_name IS NOT NULL
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
      GROUP BY station_name
      HAVING COUNT(*) >= 3
      ORDER BY avg_price_per_litre ASC
      LIMIT 15
    `, [tenantId]);

    // Peak usage patterns (day of week, hour of day)
    const usagePatterns = await query(`
      SELECT
        EXTRACT(DOW FROM transaction_date) as day_of_week,
        TO_CHAR(transaction_date, 'Day') as day_name,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
      GROUP BY EXTRACT(DOW FROM transaction_date), TO_CHAR(transaction_date, 'Day')
      ORDER BY day_of_week
    `, [tenantId]);

    res.json({
      monthly_trends: monthlyTrends,
      driver_rankings: driverRankings,
      vehicle_efficiency: vehicleEfficiency,
      station_comparison: stationComparison,
      usage_patterns: usagePatterns,
      generated_at: new Date().toISOString()
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/fuel-spending-analysis
 * @desc Budget and spending analysis
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/fuel-spending-analysis',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching spending analysis', { tenantId });

    // Current month vs previous month comparison
    const currentMonth = await queryOne<{
      transaction_count: string;
      total_cost: string;
      total_litres: string;
      avg_cost_per_transaction: string;
    }>(`
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(litres), 0) as total_litres,
        COALESCE(AVG(total_cost), 0) as avg_cost_per_transaction
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND transaction_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `, [tenantId]);

    const previousMonth = await queryOne<{
      transaction_count: string;
      total_cost: string;
      total_litres: string;
      avg_cost_per_transaction: string;
    }>(`
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(litres), 0) as total_litres,
        COALESCE(AVG(total_cost), 0) as avg_cost_per_transaction
      FROM tenant_fuel_transactions
      WHERE tenant_id = $1
      AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND transaction_date < DATE_TRUNC('month', CURRENT_DATE)
    `, [tenantId]);

    // Calculate percentage changes
    const currentCost = parseFloat(currentMonth?.total_cost || '0');
    const previousCost = parseFloat(previousMonth?.total_cost || '0');
    const costChange = previousCost > 0 ? ((currentCost - previousCost) / previousCost) * 100 : 0;

    const currentLitres = parseFloat(currentMonth?.total_litres || '0');
    const previousLitres = parseFloat(previousMonth?.total_litres || '0');
    const litresChange = previousLitres > 0 ? ((currentLitres - previousLitres) / previousLitres) * 100 : 0;

    // Cards with budget status
    const budgetStatus = await query(`
      SELECT
        fc.fuel_card_id,
        fc.card_number_last_four,
        fc.provider,
        fc.monthly_limit,
        d.name as driver_name,
        COALESCE(monthly_usage.total_cost, 0) as current_spending,
        COALESCE(monthly_usage.transaction_count, 0) as transaction_count,
        CASE
          WHEN fc.monthly_limit IS NULL THEN NULL
          WHEN monthly_usage.total_cost IS NULL THEN 0
          ELSE (monthly_usage.total_cost / fc.monthly_limit) * 100
        END as budget_used_percentage,
        CASE
          WHEN fc.monthly_limit IS NULL THEN 'No limit set'
          WHEN monthly_usage.total_cost IS NULL THEN 'Not used'
          WHEN monthly_usage.total_cost > fc.monthly_limit THEN 'Exceeded'
          WHEN (monthly_usage.total_cost / fc.monthly_limit) * 100 > 80 THEN 'Warning (>80%)'
          ELSE 'OK'
        END as status
      FROM tenant_fuelcards fc
      LEFT JOIN tenant_drivers d ON fc.driver_id = d.driver_id AND fc.tenant_id = d.tenant_id
      LEFT JOIN (
        SELECT
          card_id,
          COUNT(*) as transaction_count,
          SUM(total_cost) as total_cost
        FROM tenant_fuel_transactions
        WHERE tenant_id = $1
        AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY card_id
      ) monthly_usage ON fc.fuel_card_id = monthly_usage.card_id
      WHERE fc.tenant_id = $1
      AND fc.is_active = true
      AND fc.archived = false
      ORDER BY budget_used_percentage DESC NULLS LAST
    `, [tenantId]);

    // Projected monthly total (if month not complete)
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const projectedMonthly = currentDay > 0 ? (currentCost / currentDay) * daysInMonth : currentCost;

    res.json({
      month_comparison: {
        current_month: {
          transactions: parseInt(currentMonth?.transaction_count || '0', 10),
          total_cost: currentCost,
          total_litres: currentLitres,
          avg_per_transaction: parseFloat(currentMonth?.avg_cost_per_transaction || '0')
        },
        previous_month: {
          transactions: parseInt(previousMonth?.transaction_count || '0', 10),
          total_cost: previousCost,
          total_litres: previousLitres,
          avg_per_transaction: parseFloat(previousMonth?.avg_cost_per_transaction || '0')
        },
        changes: {
          cost_change_percent: costChange.toFixed(2),
          litres_change_percent: litresChange.toFixed(2),
          cost_change_amount: (currentCost - previousCost).toFixed(2)
        }
      },
      projected: {
        monthly_total: projectedMonthly.toFixed(2),
        days_elapsed: currentDay,
        days_in_month: daysInMonth,
        daily_average: (currentCost / currentDay).toFixed(2)
      },
      budget_status: budgetStatus,
      alerts: budgetStatus.filter((card: any) =>
        card.status === 'Exceeded' || card.status === 'Warning (>80%)'
      )
    });
  })
);

export default router;
