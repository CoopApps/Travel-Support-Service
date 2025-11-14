import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { runReminderScheduler } from '../services/reminderScheduler';
import { generateInvoicePDF } from '../services/pdfGenerator';
import { sendInvoiceEmail } from '../services/emailService';
import {
  Invoice,
  InvoiceStatsResponse,
  InvoiceListResponse,
  InvoiceDetailResponse,
  PaymentRecordResponse,
  InvoiceStatus
} from '../types/invoice.types';

const router: Router = express.Router();

/**
 * Invoice Routes - Phase 1
 * Complete invoice management system with automated generation and reminders
 */

// ============================================================================
// INVOICE STATS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/stats
 * @desc Get invoice statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching invoice stats', { tenantId });

    const stats = await query<{
      total_invoices: string;
      paid_invoices: string;
      sent_invoices: string;
      overdue_invoices: string;
      total_amount: string;
      total_paid: string;
      split_payment_invoices: string;
    }>(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN invoice_status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN invoice_status = 'sent' THEN 1 END) as sent_invoices,
        COUNT(CASE WHEN invoice_status = 'overdue' THEN 1 END) as overdue_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COUNT(CASE WHEN is_split_payment = true THEN 1 END) as split_payment_invoices
      FROM tenant_invoices
      WHERE tenant_id = $1 AND archived = FALSE
    `, [tenantId]);

    const statsRow = stats[0];
    const totalAmount = parseFloat(statsRow.total_amount) || 0;
    const totalPaid = parseFloat(statsRow.total_paid) || 0;
    const collectionRate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    // Get average days to pay
    let avgDaysToPay = 0;
    try {
      const paymentStats = await query<{ avg_days: string }>(`
        SELECT AVG(
          EXTRACT(DAY FROM (pr.payment_date - i.invoice_date))
        ) as avg_days
        FROM tenant_payment_records pr
        JOIN tenant_invoices i ON pr.invoice_id = i.invoice_id
        WHERE pr.tenant_id = $1
      `, [tenantId]);

      avgDaysToPay = Math.round(parseFloat(paymentStats[0]?.avg_days) || 0);
    } catch (error) {
      logger.warn('Could not calculate avg days to pay', { error });
    }

    const response: InvoiceStatsResponse = {
      totalInvoices: parseInt(statsRow.total_invoices),
      totalPaid: totalPaid,
      totalPending: totalAmount - totalPaid,
      totalOverdue: parseInt(statsRow.overdue_invoices),
      collectionRate,
      avgDaysToPay,
      splitPaymentInvoices: parseInt(statsRow.split_payment_invoices)
    };

    res.json(response);
  })
);

// ============================================================================
// PAYMENT PROVIDERS (must come before :invoiceId routes)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/payment-providers
 * @desc Get list of payment providers
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/payment-providers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const providers = await query<{ name: string }>(`
      SELECT name
      FROM tenant_providers
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [tenantId]);

    const providerNames = providers.map(p => p.name);

    // Always include Self-Pay
    if (!providerNames.includes('Self-Pay')) {
      providerNames.push('Self-Pay');
    }

    res.json(providerNames);
  })
);

// ============================================================================
// BULK INVOICE GENERATION
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/invoices/bulk-preview
 * @desc Preview bulk invoice generation for a billing period
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/bulk-preview',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { start_date, end_date, default_rate } = req.body;

    if (!start_date || !end_date) {
      throw new ValidationError('Start date and end date are required');
    }

    logger.info('Previewing bulk invoice generation', { tenantId, start_date, end_date });

    // Get default trip rate from tenant settings
    const settingsResult = await query<{ setting_value: string }>(`
      SELECT setting_value FROM tenant_settings
      WHERE tenant_id = $1 AND setting_key = 'default_trip_rate'
    `, [tenantId]);

    const tenantDefaultRate = settingsResult.length > 0 ? parseFloat(settingsResult[0].setting_value) : null;

    // Get all active customers with their payment providers
    const customers = await query<{
      customer_id: number;
      customer_name: string;
      email: string;
      paying_organisation: string;
      trip_count: string;
    }>(`
      SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email,
        COALESCE(c.paying_organisation, 'Self-Pay') as paying_organisation,
        COUNT(DISTINCT s.schedule_id) as trip_count
      FROM tenant_customers c
      LEFT JOIN tenant_schedules s ON s.customer_id = c.customer_id
        AND s.tenant_id = c.tenant_id
        AND s.date BETWEEN $2 AND $3
        AND s.status = 'completed'
      WHERE c.tenant_id = $1
        AND c.active = true
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.paying_organisation
      HAVING COUNT(DISTINCT s.schedule_id) > 0
      ORDER BY c.last_name, c.first_name
    `, [tenantId, start_date, end_date]);

    // Use tenant setting first, then provided rate, then fallback to £25
    const rate = tenantDefaultRate || parseFloat(default_rate) || 25.00;

    const preview = customers.map(customer => ({
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      email: customer.email,
      payingOrg: customer.paying_organisation,
      tripCount: parseInt(customer.trip_count),
      estimatedAmount: parseInt(customer.trip_count) * rate
    }));

    const totalAmount = preview.reduce((sum, p) => sum + p.estimatedAmount, 0);

    res.json({
      period: { start_date, end_date },
      defaultRate: rate,
      invoiceCount: preview.length,
      totalEstimated: totalAmount,
      preview
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/bulk-generate
 * @desc Generate invoices in bulk for a billing period
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/bulk-generate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { start_date, end_date, default_rate, due_days, description } = req.body;
    const userId = (req as any).userId;

    if (!start_date || !end_date) {
      throw new ValidationError('Start date and end date are required');
    }

    // Get default trip rate from tenant settings
    const settingsResult = await query<{ setting_value: string }>(`
      SELECT setting_value FROM tenant_settings
      WHERE tenant_id = $1 AND setting_key = 'default_trip_rate'
    `, [tenantId]);

    const tenantDefaultRate = settingsResult.length > 0 ? parseFloat(settingsResult[0].setting_value) : null;

    // Use tenant setting first, then provided rate, then fallback to £25
    const rate = tenantDefaultRate || parseFloat(default_rate) || 25.00;
    const dueDays = parseInt(due_days) || 30;

    logger.info('Generating bulk invoices', { tenantId, start_date, end_date, rate, dueDays });

    // Get customers with trips in the period
    const customers = await query<{
      customer_id: number;
      customer_name: string;
      email: string;
      paying_organisation: string;
      trip_count: string;
      trips: string; // JSON array of trip details
    }>(`
      SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email,
        COALESCE(c.paying_organisation, 'Self-Pay') as paying_organisation,
        COUNT(DISTINCT s.schedule_id) as trip_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'schedule_id', s.schedule_id,
            'date', s.date,
            'pickup_time', s.pickup_time,
            'destination', s.destination,
            'status', s.status
          ) ORDER BY s.date, s.pickup_time
        ) FILTER (WHERE s.schedule_id IS NOT NULL) as trips
      FROM tenant_customers c
      LEFT JOIN tenant_schedules s ON s.customer_id = c.customer_id
        AND s.tenant_id = c.tenant_id
        AND s.date BETWEEN $2 AND $3
        AND s.status = 'completed'
      WHERE c.tenant_id = $1
        AND c.active = true
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.paying_organisation
      HAVING COUNT(DISTINCT s.schedule_id) > 0
    `, [tenantId, start_date, end_date]);

    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const generated = [];

    for (const customer of customers) {
      const tripCount = parseInt(customer.trip_count);
      const totalAmount = tripCount * rate;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(parseInt(tenantId));

      // Create invoice
      const invoiceResult = await query<{ invoice_id: number }>(`
        INSERT INTO tenant_invoices (
          tenant_id, customer_id, customer_name, email,
          paying_organisation, invoice_number, invoice_date,
          period_start, period_end, due_date,
          total_amount, amount_paid, invoice_status,
          description, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, 0, 'draft', $12, $13, NOW(), NOW()
        )
        RETURNING invoice_id
      `, [
        tenantId,
        customer.customer_id,
        customer.customer_name,
        customer.email,
        customer.paying_organisation,
        invoiceNumber,
        invoiceDate,
        start_date,
        end_date,
        dueDate,
        totalAmount,
        description || `Transport services for period ${start_date} to ${end_date}`,
        userId
      ]);

      const invoiceId = invoiceResult[0].invoice_id;

      // Create line items from trips
      const trips = JSON.parse(customer.trips || '[]');
      for (const trip of trips) {
        await query(`
          INSERT INTO tenant_invoice_line_items (
            tenant_id, invoice_id, description,
            quantity, unit_price, total_price,
            metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          tenantId,
          invoiceId,
          `Trip to ${trip.destination} on ${trip.date}`,
          1,
          rate,
          rate,
          JSON.stringify({ schedule_id: trip.schedule_id, date: trip.date })
        ]);
      }

      generated.push({
        invoiceId,
        invoiceNumber,
        customerId: customer.customer_id,
        customerName: customer.customer_name,
        tripCount,
        totalAmount
      });
    }

    logger.info('Bulk invoice generation complete', {
      tenantId,
      invoicesGenerated: generated.length
    });

    res.json({
      success: true,
      invoicesGenerated: generated.length,
      invoices: generated
    });
  })
);

// Helper function to generate invoice numbers
async function generateInvoiceNumber(tenantId: number): Promise<string> {
  const result = await query<{ max_number: string }>(`
    SELECT MAX(
      CAST(
        SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER
      )
    ) as max_number
    FROM tenant_invoices
    WHERE tenant_id = $1
      AND invoice_number ~ '^INV-[0-9]+$'
  `, [tenantId]);

  const nextNumber = (parseInt(result[0]?.max_number) || 0) + 1;
  return `INV-${String(nextNumber).padStart(6, '0')}`;
}

// ============================================================================
// INVOICE CRUD
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices
 * @desc Get all invoices with optional filters
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, type, provider, start_date, end_date, archived } = req.query;

    logger.info('Fetching invoices', { tenantId, filters: req.query });

    let queryText = `
      SELECT * FROM tenant_invoices
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND invoice_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND invoice_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (provider) {
      queryText += ` AND paying_organisation = $${paramIndex}`;
      params.push(provider);
      paramIndex++;
    }

    if (start_date) {
      queryText += ` AND invoice_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      queryText += ` AND invoice_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    queryText += ` AND archived = $${paramIndex}`;
    params.push(archived === 'true' ? true : false);

    queryText += ` ORDER BY invoice_date DESC`;

    const invoices = await query<Invoice>(queryText, params);

    const response: InvoiceListResponse[] = invoices.map(inv => ({
      id: inv.invoice_id,
      number: inv.invoice_number,
      customerName: inv.customer_name,
      payingOrg: inv.paying_org,
      date: inv.invoice_date.toISOString().split('T')[0],
      dueDate: inv.due_date.toISOString().split('T')[0],
      periodStart: inv.period_start.toISOString().split('T')[0],
      periodEnd: inv.period_end.toISOString().split('T')[0],
      amount: inv.total_amount,
      amountPaid: inv.amount_paid,
      status: inv.invoice_status,
      type: inv.invoice_type,
      isSplitPayment: inv.is_split_payment,
      splitProvider: inv.split_provider || undefined,
      splitPercentage: inv.split_percentage || undefined,
      emailSent: inv.email_sent,
      createdAt: inv.created_at.toISOString(),
      updatedAt: inv.updated_at.toISOString()
    }));

    res.json(response);
  })
);

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId
 * @desc Get specific invoice with line items
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Fetching invoice details', { tenantId, invoiceId });

    const invoices = await query<Invoice>(`
      SELECT * FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];

    // Get line items
    const lineItems = await query<any>(`
      SELECT * FROM tenant_invoice_line_items
      WHERE tenant_id = $1 AND invoice_id = $2
      ORDER BY line_number ASC
    `, [tenantId, invoiceId]);

    const response: InvoiceDetailResponse = {
      ...invoice,
      id: invoice.invoice_id,
      number: invoice.invoice_number,
      customerName: invoice.customer_name,
      payingOrg: invoice.paying_org,
      date: invoice.invoice_date.toISOString().split('T')[0],
      dueDate: invoice.due_date.toISOString().split('T')[0],
      periodStart: invoice.period_start.toISOString().split('T')[0],
      periodEnd: invoice.period_end.toISOString().split('T')[0],
      subtotal: invoice.subtotal,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      amountPaid: invoice.amount_paid,
      status: invoice.invoice_status,
      type: invoice.invoice_type,
      isSplitPayment: invoice.is_split_payment,
      splitProvider: invoice.split_provider || undefined,
      splitPercentage: invoice.split_percentage || undefined,
      notes: invoice.notes || undefined,
      items: lineItems.map(item => ({
        id: item.line_item_id,
        lineNumber: item.line_number,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.line_total,
        serviceDate: item.service_date?.toISOString().split('T')[0],
        providerName: item.provider_name,
        providerPercentage: item.provider_percentage,
        tripId: item.trip_id
      }))
    };

    res.json(response);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId/status
 * @desc Update invoice status
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId/status',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { status } = req.body;

    const validStatuses: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    logger.info('Updating invoice status', { tenantId, invoiceId, status });

    await query(`
      UPDATE tenant_invoices
      SET invoice_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $2 AND invoice_id = $3
    `, [status, tenantId, invoiceId]);

    res.json({ message: 'Invoice status updated successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/payment
 * @desc Record a payment for an invoice
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/payment',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!amount || !payment_date) {
      throw new ValidationError('Missing required fields: amount, payment_date');
    }

    logger.info('Recording payment', { tenantId, invoiceId, amount });

    // Get current invoice
    const invoices = await query<Invoice>(`
      SELECT total_amount, amount_paid FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];
    const newAmountPaid = invoice.amount_paid + amount;
    const newStatus: InvoiceStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'sent';

    // Record payment
    await query(`
      INSERT INTO tenant_payment_records (
        tenant_id, invoice_id, payment_amount, payment_date,
        payment_method, reference_number, notes, processed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      tenantId, invoiceId, amount, payment_date,
      payment_method, reference_number, notes,
      (req as any).user?.userId || null
    ]);

    // Update invoice
    await query(`
      UPDATE tenant_invoices
      SET amount_paid = $1, invoice_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $3 AND invoice_id = $4
    `, [newAmountPaid, newStatus, tenantId, invoiceId]);

    const response: PaymentRecordResponse = {
      message: 'Payment recorded successfully',
      newAmountPaid,
      newStatus,
      fullyPaid: newAmountPaid >= invoice.total_amount
    };

    res.json(response);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/invoices/:invoiceId
 * @desc Delete an invoice (draft only)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/invoices/:invoiceId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Deleting invoice', { tenantId, invoiceId });

    // Check if invoice can be deleted
    const invoices = await query<Invoice>(`
      SELECT invoice_status FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoices[0].invoice_status !== 'draft') {
      throw new ValidationError('Only draft invoices can be deleted');
    }

    await query(`
      DELETE FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    res.json({ message: 'Invoice deleted successfully' });
  })
);

// ============================================================================
// ARCHIVE
// ============================================================================

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId/archive
 * @desc Archive an invoice
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId/archive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Archiving invoice', { tenantId, invoiceId });

    await query(`
      UPDATE tenant_invoices
      SET archived = TRUE,
          archived_at = CURRENT_TIMESTAMP,
          archived_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId, (req as any).user?.userId || null]);

    res.json({ message: 'Invoice archived successfully' });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId/unarchive
 * @desc Unarchive an invoice
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId/unarchive',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Unarchiving invoice', { tenantId, invoiceId });

    await query(`
      UPDATE tenant_invoices
      SET archived = FALSE,
          archived_at = NULL,
          archived_by = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    res.json({ message: 'Invoice unarchived successfully' });
  })
);

// ============================================================================
// REMINDER CONFIGURATION
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/reminder-config
 * @desc Get reminder configuration for tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/reminder-config',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching reminder config', { tenantId });

    const configs = await query<any>(`
      SELECT * FROM tenant_invoice_reminder_config
      WHERE tenant_id = $1
    `, [tenantId]);

    if (configs.length === 0) {
      // Return default config if none exists
      res.json({
        tenantId: parseInt(tenantId),
        remindersEnabled: true,
        defaultPreDueDays: 7,
        defaultOverdue1stDays: 7,
        defaultOverdue2ndDays: 14,
        defaultOverdue3rdDays: 21,
        defaultFinalWarningDays: 28,
        fromEmail: null,
        fromName: null,
        replyToEmail: null,
        includeCompanyLogo: true,
        includePaymentLink: false
      });
    } else {
      const config = configs[0];
      res.json({
        tenantId: config.tenant_id,
        remindersEnabled: config.reminders_enabled,
        defaultPreDueDays: config.default_pre_due_days,
        defaultOverdue1stDays: config.default_overdue_1st_days,
        defaultOverdue2ndDays: config.default_overdue_2nd_days,
        defaultOverdue3rdDays: config.default_overdue_3rd_days,
        defaultFinalWarningDays: config.default_final_warning_days,
        fromEmail: config.from_email,
        fromName: config.from_name,
        replyToEmail: config.reply_to_email,
        includeCompanyLogo: config.include_company_logo,
        includePaymentLink: config.include_payment_link,
        updatedAt: config.updated_at
      });
    }
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/reminder-config
 * @desc Update reminder configuration
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/reminder-config',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      remindersEnabled,
      defaultPreDueDays,
      defaultOverdue1stDays,
      defaultOverdue2ndDays,
      defaultOverdue3rdDays,
      defaultFinalWarningDays,
      fromEmail,
      fromName,
      replyToEmail,
      includeCompanyLogo,
      includePaymentLink
    } = req.body;

    logger.info('Updating reminder config', { tenantId });

    await query(`
      INSERT INTO tenant_invoice_reminder_config (
        tenant_id, reminders_enabled,
        default_pre_due_days, default_overdue_1st_days,
        default_overdue_2nd_days, default_overdue_3rd_days,
        default_final_warning_days,
        from_email, from_name, reply_to_email,
        include_company_logo, include_payment_link,
        updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        reminders_enabled = $2,
        default_pre_due_days = $3,
        default_overdue_1st_days = $4,
        default_overdue_2nd_days = $5,
        default_overdue_3rd_days = $6,
        default_final_warning_days = $7,
        from_email = $8,
        from_name = $9,
        reply_to_email = $10,
        include_company_logo = $11,
        include_payment_link = $12,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $13
    `, [
      tenantId, remindersEnabled,
      defaultPreDueDays, defaultOverdue1stDays,
      defaultOverdue2ndDays, defaultOverdue3rdDays,
      defaultFinalWarningDays,
      fromEmail, fromName, replyToEmail,
      includeCompanyLogo, includePaymentLink,
      (req as any).user?.userId || null
    ]);

    res.json({ message: 'Reminder configuration updated successfully' });
  })
);

// ============================================================================
// REMINDER MANAGEMENT
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId/reminders
 * @desc Get all reminders for an invoice
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId/reminders',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Fetching invoice reminders', { tenantId, invoiceId });

    const reminders = await query<any>(`
      SELECT * FROM tenant_invoice_reminders
      WHERE tenant_id = $1 AND invoice_id = $2
      ORDER BY scheduled_date ASC
    `, [tenantId, invoiceId]);

    res.json(reminders.map(r => ({
      id: r.reminder_id,
      invoiceId: r.invoice_id,
      reminderType: r.reminder_type,
      scheduledDate: r.scheduled_date.toISOString().split('T')[0],
      status: r.status,
      sentAt: r.sent_at?.toISOString(),
      errorMessage: r.error_message,
      createdAt: r.created_at.toISOString()
    })));
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/reminders
 * @desc Schedule a new reminder for an invoice
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/reminders',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { reminderType, scheduledDate } = req.body;

    if (!reminderType || !scheduledDate) {
      throw new ValidationError('Missing required fields: reminderType, scheduledDate');
    }

    logger.info('Scheduling reminder', { tenantId, invoiceId, reminderType });

    const result = await query<any>(`
      INSERT INTO tenant_invoice_reminders (
        tenant_id, invoice_id, reminder_type, scheduled_date, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING reminder_id
    `, [tenantId, invoiceId, reminderType, scheduledDate]);

    // Log the scheduling event
    await query(`
      INSERT INTO tenant_invoice_reminder_log (
        tenant_id, invoice_id, reminder_id, event_type,
        reminder_type, success, created_by
      ) VALUES ($1, $2, $3, 'scheduled', $4, true, $5)
    `, [
      tenantId, invoiceId, result[0].reminder_id,
      reminderType, (req as any).user?.userId || null
    ]);

    res.json({
      message: 'Reminder scheduled successfully',
      reminderId: result[0].reminder_id
    });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/invoices/reminders/:reminderId
 * @desc Cancel a scheduled reminder
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/invoices/reminders/:reminderId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, reminderId } = req.params;

    logger.info('Cancelling reminder', { tenantId, reminderId });

    // Get reminder details before canceling
    const reminders = await query<any>(`
      SELECT invoice_id, reminder_type FROM tenant_invoice_reminders
      WHERE tenant_id = $1 AND reminder_id = $2
    `, [tenantId, reminderId]);

    if (reminders.length === 0) {
      throw new NotFoundError('Reminder not found');
    }

    const reminder = reminders[0];

    // Update status to cancelled
    await query(`
      UPDATE tenant_invoice_reminders
      SET status = 'cancelled'
      WHERE tenant_id = $1 AND reminder_id = $2
    `, [tenantId, reminderId]);

    // Log the cancellation
    await query(`
      INSERT INTO tenant_invoice_reminder_log (
        tenant_id, invoice_id, reminder_id, event_type,
        reminder_type, success, created_by
      ) VALUES ($1, $2, $3, 'cancelled', $4, true, $5)
    `, [
      tenantId, reminder.invoice_id, reminderId,
      reminder.reminder_type, (req as any).user?.userId || null
    ]);

    res.json({ message: 'Reminder cancelled successfully' });
  })
);

// ============================================================================
// REMINDER LOGS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId/reminder-logs
 * @desc Get reminder logs for an invoice
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId/reminder-logs',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Fetching reminder logs', { tenantId, invoiceId });

    const logs = await query<any>(`
      SELECT * FROM tenant_invoice_reminder_log
      WHERE tenant_id = $1 AND invoice_id = $2
      ORDER BY created_at DESC
    `, [tenantId, invoiceId]);

    res.json(logs.map(log => ({
      id: log.log_id,
      invoiceId: log.invoice_id,
      reminderId: log.reminder_id,
      eventType: log.event_type,
      reminderType: log.reminder_type,
      recipientEmail: log.recipient_email,
      ccEmails: log.cc_emails,
      success: log.success,
      errorMessage: log.error_message,
      emailProviderResponse: log.email_provider_response,
      createdAt: log.created_at.toISOString()
    })));
  })
);

/**
 * @route GET /api/tenants/:tenantId/invoices/reminder-logs
 * @desc Get all reminder logs for the tenant (with optional filters)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/reminder-logs',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { eventType, reminderType, startDate, endDate } = req.query;

    logger.info('Fetching all reminder logs', { tenantId, filters: req.query });

    let queryText = `
      SELECT * FROM tenant_invoice_reminder_log
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (eventType) {
      queryText += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (reminderType) {
      queryText += ` AND reminder_type = $${paramIndex}`;
      params.push(reminderType);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT 100`;

    const logs = await query<any>(queryText, params);

    res.json(logs.map(log => ({
      id: log.log_id,
      invoiceId: log.invoice_id,
      reminderId: log.reminder_id,
      eventType: log.event_type,
      reminderType: log.reminder_type,
      recipientEmail: log.recipient_email,
      ccEmails: log.cc_emails,
      success: log.success,
      errorMessage: log.error_message,
      createdAt: log.created_at.toISOString()
    })));
  })
);

// ============================================================================
// REMINDER SCHEDULER - MANUAL TRIGGER
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/invoices/run-scheduler
 * @desc Manually trigger the reminder scheduler (for testing/maintenance)
 * @access Protected - Admin only
 */
router.post(
  '/tenants/:tenantId/invoices/run-scheduler',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Manual scheduler trigger requested', { tenantId });

    // Run the scheduler
    await runReminderScheduler();

    res.json({
      success: true,
      message: 'Reminder scheduler completed successfully'
    });
  })
);

// ============================================================================
// SPLIT PAYMENT MANAGEMENT
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId/split-payments
 * @desc Get all split payments for an invoice
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Fetching split payments', { tenantId, invoiceId });

    // Get split payments with payment records
    const splitPayments = await query<any>(`
      SELECT
        sp.*,
        COALESCE(
          json_agg(
            json_build_object(
              'split_payment_record_id', spr.split_payment_record_id,
              'payment_amount', spr.payment_amount,
              'payment_date', spr.payment_date,
              'payment_method', spr.payment_method,
              'reference_number', spr.reference_number,
              'paid_by_provider', spr.paid_by_provider,
              'notes', spr.notes,
              'processed_by', spr.processed_by,
              'created_at', spr.created_at
            ) ORDER BY spr.payment_date DESC
          ) FILTER (WHERE spr.split_payment_record_id IS NOT NULL),
          '[]'
        ) as payments
      FROM tenant_invoice_split_payments sp
      LEFT JOIN tenant_split_payment_records spr
        ON sp.split_payment_id = spr.split_payment_id
      WHERE sp.tenant_id = $1 AND sp.invoice_id = $2
      GROUP BY sp.split_payment_id
      ORDER BY sp.created_at
    `, [tenantId, invoiceId]);

    const response = splitPayments.map(sp => ({
      id: sp.split_payment_id,
      providerName: sp.provider_name,
      providerId: sp.provider_id,
      splitPercentage: parseFloat(sp.split_percentage),
      splitAmount: parseFloat(sp.split_amount),
      amountPaid: parseFloat(sp.amount_paid),
      amountOutstanding: parseFloat(sp.split_amount) - parseFloat(sp.amount_paid),
      paymentStatus: sp.payment_status,
      notes: sp.notes,
      createdAt: sp.created_at.toISOString(),
      updatedAt: sp.updated_at.toISOString(),
      payments: sp.payments.map((p: any) => ({
        id: p.split_payment_record_id,
        paymentAmount: parseFloat(p.payment_amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number,
        paidByProvider: p.paid_by_provider,
        notes: p.notes,
        processedBy: p.processed_by,
        createdAt: p.created_at
      }))
    }));

    res.json(response);
  })
);

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId/split-payments/summary
 * @desc Get split payment summary for an invoice
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/summary',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Fetching split payment summary', { tenantId, invoiceId });

    // Use the helper function from the database
    const summary = await query<any>(`
      SELECT * FROM get_invoice_split_summary($1)
    `, [invoiceId]);

    if (summary.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    // Get detailed provider information
    const providers = await query<any>(`
      SELECT
        sp.split_payment_id,
        sp.provider_name,
        sp.provider_id,
        sp.split_percentage,
        sp.split_amount,
        sp.amount_paid,
        sp.payment_status,
        sp.notes
      FROM tenant_invoice_split_payments sp
      WHERE sp.tenant_id = $1 AND sp.invoice_id = $2
      ORDER BY sp.created_at
    `, [tenantId, invoiceId]);

    const response = {
      totalInvoiceAmount: parseFloat(summary[0].total_invoice_amount),
      totalSplitAmount: parseFloat(summary[0].total_split_amount),
      totalPaid: parseFloat(summary[0].total_paid),
      totalOutstanding: parseFloat(summary[0].total_outstanding),
      numProviders: summary[0].num_providers,
      allPaid: summary[0].all_paid,
      providers: providers.map(p => ({
        id: p.split_payment_id,
        providerName: p.provider_name,
        providerId: p.provider_id,
        splitPercentage: parseFloat(p.split_percentage),
        splitAmount: parseFloat(p.split_amount),
        amountPaid: parseFloat(p.amount_paid),
        amountOutstanding: parseFloat(p.split_amount) - parseFloat(p.amount_paid),
        paymentStatus: p.payment_status,
        notes: p.notes
      }))
    };

    res.json(response);
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/split-payments
 * @desc Create split payment(s) for an invoice
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { provider_name, provider_id, split_percentage, notes } = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Creating split payment', { tenantId, invoiceId, provider_name });

    // Validate input
    if (!provider_name || !split_percentage) {
      throw new ValidationError('Provider name and split percentage are required');
    }

    if (split_percentage <= 0 || split_percentage > 100) {
      throw new ValidationError('Split percentage must be between 0 and 100');
    }

    // Use transaction for atomicity
    await query('BEGIN');

    try {
      // Get invoice details
      const invoices = await query<any>(`
        SELECT total_amount FROM tenant_invoices
        WHERE invoice_id = $1 AND tenant_id = $2
        FOR UPDATE
      `, [invoiceId, tenantId]);

      if (invoices.length === 0) {
        throw new NotFoundError('Invoice not found');
      }

      const totalAmount = parseFloat(invoices[0].total_amount);
      const splitAmount = (totalAmount * split_percentage) / 100;

      // Check if total percentages don't exceed 100%
      const existingSplits = await query<any>(`
        SELECT COALESCE(SUM(split_percentage), 0) as total_percentage
        FROM tenant_invoice_split_payments
        WHERE invoice_id = $1 AND tenant_id = $2
      `, [invoiceId, tenantId]);

      const newTotalPercentage = parseFloat(existingSplits[0].total_percentage) + split_percentage;
      if (newTotalPercentage > 100) {
        throw new ValidationError(
          `Total split percentage would exceed 100% (current: ${existingSplits[0].total_percentage}%, adding: ${split_percentage}%)`
        );
      }

      // Create split payment
      const result = await query<any>(`
        INSERT INTO tenant_invoice_split_payments (
          tenant_id, invoice_id, provider_name, provider_id,
          split_percentage, split_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [tenantId, invoiceId, provider_name, provider_id, split_percentage, splitAmount, notes, userId]);

      // Log the creation
      await query(`
        INSERT INTO tenant_invoice_reminder_log (
          tenant_id, invoice_id, event_type, reminder_type,
          success, created_at, created_by
        ) VALUES ($1, $2, 'split_payment_created', 'info', true, CURRENT_TIMESTAMP, $3)
      `, [tenantId, invoiceId, userId]);

      const splitPayment = result[0];

      // Commit transaction
      await query('COMMIT');

      res.status(201).json({
        message: 'Split payment created successfully',
        splitPayment: {
          id: splitPayment.split_payment_id,
          providerName: splitPayment.provider_name,
          providerId: splitPayment.provider_id,
          splitPercentage: parseFloat(splitPayment.split_percentage),
          splitAmount: parseFloat(splitPayment.split_amount),
          amountPaid: parseFloat(splitPayment.amount_paid),
          amountOutstanding: parseFloat(splitPayment.split_amount),
          paymentStatus: splitPayment.payment_status,
          notes: splitPayment.notes,
          createdAt: splitPayment.created_at.toISOString()
        }
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/split-payments/bulk
 * @desc Create multiple split payments at once
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/bulk',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { splits } = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Creating bulk split payments', { tenantId, invoiceId, count: splits?.length });

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      throw new ValidationError('Splits array is required');
    }

    // Validate total percentage
    const totalPercentage = splits.reduce((sum, s) => sum + s.split_percentage, 0);
    if (totalPercentage > 100) {
      throw new ValidationError(`Total split percentage exceeds 100% (${totalPercentage}%)`);
    }

    // Get invoice details
    const invoices = await query<any>(`
      SELECT total_amount FROM tenant_invoices
      WHERE invoice_id = $1 AND tenant_id = $2
    `, [invoiceId, tenantId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const totalAmount = parseFloat(invoices[0].total_amount);

    // Delete existing splits for this invoice
    await query(`
      DELETE FROM tenant_invoice_split_payments
      WHERE invoice_id = $1 AND tenant_id = $2
    `, [invoiceId, tenantId]);

    // Create new splits
    const createdSplits = [];
    for (const split of splits) {
      const splitAmount = (totalAmount * split.split_percentage) / 100;

      const result = await query<any>(`
        INSERT INTO tenant_invoice_split_payments (
          tenant_id, invoice_id, provider_name, provider_id,
          split_percentage, split_amount, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        tenantId, invoiceId, split.provider_name, split.provider_id || null,
        split.split_percentage, splitAmount, userId
      ]);

      createdSplits.push(result[0]);
    }

    // Update invoice type to split
    await query(`
      UPDATE tenant_invoices
      SET invoice_type = 'split', is_split_payment = true
      WHERE invoice_id = $1 AND tenant_id = $2
    `, [invoiceId, tenantId]);

    res.status(201).json({
      message: `${createdSplits.length} split payments created successfully`,
      totalPercentage,
      splitPayments: createdSplits.map(sp => ({
        id: sp.split_payment_id,
        providerName: sp.provider_name,
        providerId: sp.provider_id,
        splitPercentage: parseFloat(sp.split_percentage),
        splitAmount: parseFloat(sp.split_amount),
        paymentStatus: sp.payment_status
      }))
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId
 * @desc Update a split payment
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId, splitPaymentId } = req.params;
    const { provider_name, split_percentage, notes } = req.body;

    logger.info('Updating split payment', { tenantId, invoiceId, splitPaymentId });

    // Get current split payment
    const current = await query<any>(`
      SELECT * FROM tenant_invoice_split_payments
      WHERE split_payment_id = $1 AND tenant_id = $2 AND invoice_id = $3
    `, [splitPaymentId, tenantId, invoiceId]);

    if (current.length === 0) {
      throw new NotFoundError('Split payment not found');
    }

    // Check if there are any payments against this split
    const payments = await query<any>(`
      SELECT COUNT(*) as count FROM tenant_split_payment_records
      WHERE split_payment_id = $1
    `, [splitPaymentId]);

    if (payments[0].count > 0 && split_percentage && split_percentage !== parseFloat(current[0].split_percentage)) {
      throw new ValidationError('Cannot change split percentage when payments have been recorded');
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (provider_name) {
      updates.push(`provider_name = $${paramIndex++}`);
      values.push(provider_name);
    }

    if (split_percentage && split_percentage !== parseFloat(current[0].split_percentage)) {
      // Validate new percentage doesn't exceed 100%
      const otherSplits = await query<any>(`
        SELECT COALESCE(SUM(split_percentage), 0) as total_percentage
        FROM tenant_invoice_split_payments
        WHERE invoice_id = $1 AND tenant_id = $2 AND split_payment_id != $3
      `, [invoiceId, tenantId, splitPaymentId]);

      const newTotalPercentage = parseFloat(otherSplits[0].total_percentage) + split_percentage;
      if (newTotalPercentage > 100) {
        throw new ValidationError(`Total split percentage would exceed 100%`);
      }

      // Recalculate split amount
      const invoice = await query<any>(`
        SELECT total_amount FROM tenant_invoices WHERE invoice_id = $1
      `, [invoiceId]);

      const newSplitAmount = (parseFloat(invoice[0].total_amount) * split_percentage) / 100;

      updates.push(`split_percentage = $${paramIndex++}`);
      values.push(split_percentage);
      updates.push(`split_amount = $${paramIndex++}`);
      values.push(newSplitAmount);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(splitPaymentId, tenantId, invoiceId);
    const result = await query<any>(`
      UPDATE tenant_invoice_split_payments
      SET ${updates.join(', ')}
      WHERE split_payment_id = $${paramIndex}
        AND tenant_id = $${paramIndex + 1}
        AND invoice_id = $${paramIndex + 2}
      RETURNING *
    `, values);

    res.json({
      message: 'Split payment updated successfully',
      splitPayment: {
        id: result[0].split_payment_id,
        providerName: result[0].provider_name,
        splitPercentage: parseFloat(result[0].split_percentage),
        splitAmount: parseFloat(result[0].split_amount),
        notes: result[0].notes,
        updatedAt: result[0].updated_at.toISOString()
      }
    });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId
 * @desc Delete a split payment
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId, splitPaymentId } = req.params;

    logger.info('Deleting split payment', { tenantId, invoiceId, splitPaymentId });

    // Check if there are any payments against this split
    const payments = await query<any>(`
      SELECT COUNT(*) as count FROM tenant_split_payment_records
      WHERE split_payment_id = $1
    `, [splitPaymentId]);

    if (payments[0].count > 0) {
      throw new ValidationError('Cannot delete split payment with existing payment records');
    }

    const result = await query<any>(`
      DELETE FROM tenant_invoice_split_payments
      WHERE split_payment_id = $1 AND tenant_id = $2 AND invoice_id = $3
      RETURNING split_payment_id
    `, [splitPaymentId, tenantId, invoiceId]);

    if (result.length === 0) {
      throw new NotFoundError('Split payment not found');
    }

    res.json({
      message: 'Split payment deleted successfully'
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId/payments
 * @desc Record a payment against a split payment
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/:splitPaymentId/payments',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId, splitPaymentId } = req.params;
    const { payment_amount, payment_date, payment_method, reference_number, notes } = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Recording split payment', { tenantId, invoiceId, splitPaymentId, amount: payment_amount });

    // Validate input
    if (!payment_amount || payment_amount <= 0) {
      throw new ValidationError('Payment amount must be greater than 0');
    }

    if (!payment_date) {
      throw new ValidationError('Payment date is required');
    }

    if (!payment_method) {
      throw new ValidationError('Payment method is required');
    }

    // Get split payment details
    const splitPayments = await query<any>(`
      SELECT sp.*, i.invoice_number
      FROM tenant_invoice_split_payments sp
      JOIN tenant_invoices i ON sp.invoice_id = i.invoice_id
      WHERE sp.split_payment_id = $1 AND sp.tenant_id = $2 AND sp.invoice_id = $3
    `, [splitPaymentId, tenantId, invoiceId]);

    if (splitPayments.length === 0) {
      throw new NotFoundError('Split payment not found');
    }

    const splitPayment = splitPayments[0];
    const splitAmount = parseFloat(splitPayment.split_amount);
    const amountPaid = parseFloat(splitPayment.amount_paid);
    const remaining = splitAmount - amountPaid;

    if (payment_amount > remaining) {
      throw new ValidationError(
        `Payment amount ($${payment_amount}) exceeds remaining balance ($${remaining.toFixed(2)})`
      );
    }

    // Record the payment
    const result = await query<any>(`
      INSERT INTO tenant_split_payment_records (
        tenant_id, invoice_id, split_payment_id,
        payment_amount, payment_date, payment_method,
        reference_number, paid_by_provider, notes, processed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId, invoiceId, splitPaymentId,
      payment_amount, payment_date, payment_method,
      reference_number, splitPayment.provider_name, notes, userId
    ]);

    // The trigger will automatically update the split payment amount_paid and status

    // Get updated split payment
    const updated = await query<any>(`
      SELECT * FROM tenant_invoice_split_payments
      WHERE split_payment_id = $1
    `, [splitPaymentId]);

    // Also create a regular payment record for backwards compatibility
    await query(`
      INSERT INTO tenant_payment_records (
        tenant_id, invoice_id, payment_amount, payment_date,
        payment_method, reference_number, notes, processed_by,
        split_payment_id, paid_by_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      tenantId, invoiceId, payment_amount, payment_date,
      payment_method, reference_number, notes, userId,
      splitPaymentId, splitPayment.provider_name
    ]);

    // Update main invoice amount_paid
    await query(`
      UPDATE tenant_invoices
      SET amount_paid = amount_paid + $1,
          invoice_status = CASE
            WHEN amount_paid + $1 >= total_amount THEN 'paid'
            WHEN amount_paid + $1 > 0 THEN 'partially_paid'
            ELSE invoice_status
          END
      WHERE invoice_id = $2 AND tenant_id = $3
    `, [payment_amount, invoiceId, tenantId]);

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: {
        id: result[0].split_payment_record_id,
        paymentAmount: parseFloat(result[0].payment_amount),
        paymentDate: result[0].payment_date,
        paymentMethod: result[0].payment_method,
        referenceNumber: result[0].reference_number,
        paidByProvider: result[0].paid_by_provider
      },
      updatedSplitPayment: {
        id: updated[0].split_payment_id,
        amountPaid: parseFloat(updated[0].amount_paid),
        amountOutstanding: parseFloat(updated[0].split_amount) - parseFloat(updated[0].amount_paid),
        paymentStatus: updated[0].payment_status
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/split-payments/validate
 * @desc Validate split payment percentages
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/split-payments/validate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { splits } = req.body;

    logger.info('Validating split payments', { tenantId, invoiceId, count: splits?.length });

    if (!splits || !Array.isArray(splits)) {
      throw new ValidationError('Splits array is required');
    }

    const errors: string[] = [];
    let totalPercentage = 0;

    // Validate each split
    splits.forEach((split, index) => {
      if (!split.provider_name) {
        errors.push(`Split ${index + 1}: Provider name is required`);
      }
      if (!split.split_percentage || split.split_percentage <= 0) {
        errors.push(`Split ${index + 1}: Split percentage must be greater than 0`);
      }
      if (split.split_percentage > 100) {
        errors.push(`Split ${index + 1}: Split percentage cannot exceed 100%`);
      }
      totalPercentage += split.split_percentage || 0;
    });

    // Check total percentage
    if (totalPercentage > 100) {
      errors.push(`Total split percentage exceeds 100% (${totalPercentage}%)`);
    }

    const valid = errors.length === 0;

    res.json({
      valid,
      totalPercentage,
      errors
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/invoices/:invoiceId/pdf
 * @desc Download invoice PDF
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId/pdf',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    logger.info('Downloading invoice PDF', { tenantId, invoiceId });

    // Check invoice exists
    const invoices = await query<{ invoice_number: string; pdf_generated: boolean }>(`
      SELECT invoice_number, pdf_generated
      FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];

    // Generate PDF (or regenerate if needed)
    const pdfBuffer = await generateInvoicePDF(parseInt(tenantId), parseInt(invoiceId));

    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF');
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/send
 * @desc Manually send a draft invoice via email
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/send',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { to_email, cc_email } = req.body;

    logger.info('Manually sending invoice', { tenantId, invoiceId, to_email });

    // Check invoice exists and is draft
    const invoices = await query<{
      invoice_status: string;
      email: string;
      invoice_number: string;
    }>(`
      SELECT invoice_status, email, invoice_number
      FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];

    // Use provided email or fallback to customer email
    const recipientEmail = to_email || invoice.email;

    if (!recipientEmail) {
      throw new ValidationError('No recipient email provided');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new ValidationError('Invalid email address format');
    }

    // Validate CC email if provided
    if (cc_email && !emailRegex.test(cc_email)) {
      throw new ValidationError('Invalid CC email address format');
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(parseInt(tenantId), parseInt(invoiceId));

    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF');
    }

    // Send email
    const success = await sendInvoiceEmail(
      parseInt(tenantId),
      parseInt(invoiceId),
      recipientEmail,
      cc_email,
      pdfBuffer
    );

    if (success) {
      // Update invoice status to sent
      await query(`
        UPDATE tenant_invoices
        SET invoice_status = 'sent',
            email_sent = true,
            email_sent_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND invoice_id = $2
      `, [tenantId, invoiceId]);

      res.json({
        success: true,
        message: 'Invoice sent successfully',
        sent_to: recipientEmail
      });
    } else {
      throw new Error('Failed to send invoice email');
    }
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId
 * @desc Update invoice details
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const {
      customer_name,
      email,
      paying_organisation,
      invoice_date,
      due_date,
      description
    } = req.body;

    logger.info('Updating invoice', { tenantId, invoiceId });

    const updated = await query(`
      UPDATE tenant_invoices
      SET
        customer_name = COALESCE($3, customer_name),
        email = COALESCE($4, email),
        paying_organisation = COALESCE($5, paying_organisation),
        invoice_date = COALESCE($6, invoice_date),
        due_date = COALESCE($7, due_date),
        description = COALESCE($8, description),
        updated_at = NOW()
      WHERE tenant_id = $1 AND invoice_id = $2
      RETURNING *
    `, [
      tenantId,
      invoiceId,
      customer_name,
      email,
      paying_organisation,
      invoice_date,
      due_date,
      description
    ]);

    if (updated.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    res.json(updated[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/invoices/:invoiceId/line-items
 * @desc Add line item to invoice
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/line-items',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { description, quantity, unit_price, metadata } = req.body;

    if (!description || !quantity || !unit_price) {
      throw new ValidationError('description, quantity, and unit_price are required');
    }

    logger.info('Adding line item', { tenantId, invoiceId });

    const total_price = quantity * unit_price;

    const lineItem = await query(`
      INSERT INTO tenant_invoice_line_items (
        tenant_id, invoice_id, description, quantity, unit_price, total_price, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [tenantId, invoiceId, description, quantity, unit_price, total_price, metadata ? JSON.stringify(metadata) : null]);

    // Recalculate invoice total
    const totals = await query<{ total: number }>(`
      SELECT SUM(total_price) as total
      FROM tenant_invoice_line_items
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    const newTotal: number = Number(totals[0]?.total || 0);

    await query(`
      UPDATE tenant_invoices
      SET total_amount = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId, newTotal]);

    res.status(201).json(lineItem[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/invoices/:invoiceId/line-items/:lineItemId
 * @desc Update line item
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/invoices/:invoiceId/line-items/:lineItemId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId, lineItemId } = req.params;
    const { description, quantity, unit_price } = req.body;

    logger.info('Updating line item', { tenantId, invoiceId, lineItemId });

    const total_price = (quantity || 1) * (unit_price || 0);

    const updated = await query(`
      UPDATE tenant_invoice_line_items
      SET
        description = COALESCE($4, description),
        quantity = COALESCE($5, quantity),
        unit_price = COALESCE($6, unit_price),
        total_price = $7
      WHERE tenant_id = $1 AND invoice_id = $2 AND line_item_id = $3
      RETURNING *
    `, [tenantId, invoiceId, lineItemId, description, quantity, unit_price, total_price]);

    if (updated.length === 0) {
      throw new NotFoundError('Line item not found');
    }

    // Recalculate invoice total
    const totals = await query<{ total: number }>(`
      SELECT SUM(total_price) as total
      FROM tenant_invoice_line_items
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    const newTotal: number = Number(totals[0]?.total || 0);

    await query(`
      UPDATE tenant_invoices
      SET total_amount = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId, newTotal]);

    res.json(updated[0]);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/invoices/:invoiceId/line-items/:lineItemId
 * @desc Delete line item
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/invoices/:invoiceId/line-items/:lineItemId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, invoiceId, lineItemId } = req.params;

    logger.info('Deleting line item', { tenantId, invoiceId, lineItemId });

    const deleted = await query(`
      DELETE FROM tenant_invoice_line_items
      WHERE tenant_id = $1 AND invoice_id = $2 AND line_item_id = $3
      RETURNING *
    `, [tenantId, invoiceId, lineItemId]);

    if (deleted.length === 0) {
      throw new NotFoundError('Line item not found');
    }

    // Recalculate invoice total
    const totals = await query<{ total: number }>(`
      SELECT SUM(total_price) as total
      FROM tenant_invoice_line_items
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    const newTotal: number = Number(totals[0]?.total || 0);

    await query(`
      UPDATE tenant_invoices
      SET total_amount = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId, newTotal]);

    res.json({ message: 'Line item deleted successfully' });
  })
);

export default router;
