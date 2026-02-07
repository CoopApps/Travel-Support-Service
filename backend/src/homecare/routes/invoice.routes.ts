import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';

const router: Router = express.Router();

/**
 * Home Care Invoice Routes
 * Complete billing and invoicing system for care services
 * (Completely separate from travel support invoicing)
 */

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const result = await queryOne(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1 as next_num
     FROM tenant_homecare_invoices
     WHERE tenant_id = $1 AND invoice_number LIKE 'HC-INV-%'`,
    [tenantId]
  );
  const nextNum = result?.next_num || 1;
  return `HC-INV-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Calculate billing for visits in a period
 */
async function calculateVisitBilling(
  tenantId: string,
  clientId: number,
  periodStart: string,
  periodEnd: string
): Promise<any[]> {
  // Get completed visits in period that haven't been invoiced
  const visits = await query(
    `SELECT
      v.visit_id,
      v.scheduled_start,
      v.scheduled_end,
      v.actual_start,
      v.actual_end,
      v.mileage_claimed,
      c.funding_source
     FROM tenant_care_visits v
     JOIN tenant_care_clients c ON v.client_id = c.client_id AND v.tenant_id = c.tenant_id
     WHERE v.tenant_id = $1
       AND v.client_id = $2
       AND DATE(v.scheduled_start) >= $3
       AND DATE(v.scheduled_start) <= $4
       AND v.status = 'completed'
       AND v.visit_id NOT IN (
         SELECT DISTINCT visit_id FROM tenant_homecare_invoice_items
         WHERE tenant_id = $1 AND visit_id IS NOT NULL
       )
     ORDER BY v.scheduled_start`,
    [tenantId, clientId, periodStart, periodEnd]
  );

  const lineItems = [];

  for (const visit of visits) {
    // Calculate duration in minutes
    const scheduledStart = new Date(visit.scheduled_start);
    const scheduledEnd = new Date(visit.scheduled_end);
    const actualStart = visit.actual_start ? new Date(visit.actual_start) : scheduledStart;
    const actualEnd = visit.actual_end ? new Date(visit.actual_end) : scheduledEnd;

    const durationMs = actualEnd.getTime() - actualStart.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    // Determine rate type based on day/time
    const visitDate = new Date(visit.scheduled_start);
    const dayOfWeek = visitDate.getDay();
    const hour = visitDate.getHours();

    let rateType = 'standard';
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      rateType = 'weekend';
    } else if (hour >= 20 || hour < 7) {
      rateType = 'evening';
    }

    // Get applicable hourly rate (in pence)
    const rateResult = await queryOne(
      `SELECT hourly_rate FROM tenant_homecare_billing_rates
       WHERE tenant_id = $1
         AND rate_type = $2
         AND is_active = true
         AND effective_from <= $3
         AND (effective_to IS NULL OR effective_to >= $3)
         AND (funding_source IS NULL OR funding_source = $4)
       ORDER BY funding_source DESC NULLS LAST
       LIMIT 1`,
      [tenantId, rateType, visitDate, visit.funding_source]
    );

    const hourlyRate = rateResult?.hourly_rate || 1500; // Default £15.00 per hour
    const visitAmount = Math.round((durationMinutes / 60) * hourlyRate);

    // Mileage calculation
    let mileageAmount = 0;
    const mileageRate = 45; // 45p per mile
    if (visit.mileage_claimed && visit.mileage_claimed > 0) {
      mileageAmount = Math.round(visit.mileage_claimed * mileageRate);
    }

    lineItems.push({
      visitId: visit.visit_id,
      visitDate: visitDate.toISOString().split('T')[0],
      description: `Care visit on ${visitDate.toLocaleDateString('en-GB')} - ${hours}h ${minutes}m`,
      hours,
      minutes,
      rateType,
      hourlyRate,
      visitAmount,
      mileage: visit.mileage_claimed || 0,
      mileageRate,
      mileageAmount,
      totalAmount: visitAmount + mileageAmount
    });
  }

  return lineItems;
}

/**
 * GET /api/homecare/tenants/:tenantId/invoices
 * List invoices with filtering and pagination
 */
router.get(
  '/tenants/:tenantId/invoices',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      funding_source,
      client_id,
      date_from,
      date_to,
      overdue,
      sort_by = 'issue_date',
      sort_order = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [tenantId];
    let paramIndex = 2;

    let whereClause = 'i.tenant_id = $1';

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (funding_source) {
      whereClause += ` AND i.funding_source = $${paramIndex}`;
      params.push(funding_source);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (date_from) {
      whereClause += ` AND i.issue_date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereClause += ` AND i.issue_date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    if (overdue === 'true') {
      whereClause += ` AND i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled')`;
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM tenant_homecare_invoices i WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.total || '0', 10);

    // Sort mapping
    const sortColumns: Record<string, string> = {
      invoice_number: 'i.invoice_number',
      issue_date: 'i.issue_date',
      due_date: 'i.due_date',
      total_amount: 'i.total_amount',
      status: 'i.status'
    };
    const sortColumn = sortColumns[sort_by as string] || 'i.issue_date';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get invoices
    const invoices = await query(
      `SELECT
        i.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name
      FROM tenant_homecare_invoices i
      LEFT JOIN tenant_care_clients c ON i.client_id = c.client_id AND i.tenant_id = c.tenant_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/invoices/:invoiceId
 * Get single invoice with line items and payments
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    // Get invoice
    const invoice = await queryOne(
      `SELECT
        i.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.address as client_address,
        c.postcode as client_postcode,
        c.email as client_email
      FROM tenant_homecare_invoices i
      LEFT JOIN tenant_care_clients c ON i.client_id = c.client_id AND i.tenant_id = c.tenant_id
      WHERE i.tenant_id = $1 AND i.invoice_id = $2`,
      [tenantId, invoiceId]
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Get line items
    const lineItems = await query(
      `SELECT * FROM tenant_homecare_invoice_items
       WHERE tenant_id = $1 AND invoice_id = $2
       ORDER BY visit_date, item_id`,
      [tenantId, invoiceId]
    );

    // Get payments
    const payments = await query(
      `SELECT
        p.*,
        u.first_name as received_by_first_name,
        u.last_name as received_by_last_name
       FROM tenant_homecare_payments p
       LEFT JOIN tenant_users u ON p.received_by = u.user_id AND p.tenant_id = u.tenant_id
       WHERE p.tenant_id = $1 AND p.invoice_id = $2
       ORDER BY p.payment_date DESC`,
      [tenantId, invoiceId]
    );

    res.json({
      invoice,
      lineItems,
      payments
    });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/invoices
 * Create a new invoice (auto-generates line items from visits)
 */
router.post(
  '/tenants/:tenantId/invoices',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.userId;
    const {
      client_id,
      period_start,
      period_end,
      due_date,
      purchase_order_number,
      notes,
      auto_generate_lines = true
    } = req.body;

    // Validate required fields
    if (!client_id || !period_start || !period_end) {
      throw new ValidationError('Client ID, period start, and period end are required');
    }

    // Get client details
    const client = await queryOne(
      `SELECT * FROM tenant_care_clients WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, client_id]
    );

    if (!client) {
      throw new ValidationError('Client not found');
    }

    const billingName = `${client.first_name} ${client.last_name}`;
    const billingAddress = `${client.address || ''}, ${client.city || ''}, ${client.postcode || ''}`.trim();
    const billingEmail = client.email || '';
    const fundingSource = client.funding_source || 'self_funded';

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(tenantId);

    // Calculate due date (default 30 days)
    const calculatedDueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice
    const invoice = await queryOne(
      `INSERT INTO tenant_homecare_invoices (
        tenant_id, invoice_number, client_id,
        billing_name, billing_address, billing_email,
        period_start, period_end, issue_date, due_date,
        subtotal, tax_amount, total_amount, paid_amount, outstanding_amount,
        status, funding_source, purchase_order_number, notes,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, 0, 0, 0, 0, 0, 'draft', $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        tenantId,
        invoiceNumber,
        client_id,
        billingName,
        billingAddress,
        billingEmail,
        period_start,
        period_end,
        calculatedDueDate,
        fundingSource,
        purchase_order_number || null,
        notes || null,
        userId
      ]
    );

    // Auto-generate line items from visits
    if (auto_generate_lines) {
      const lineItems = await calculateVisitBilling(tenantId, client_id, period_start, period_end);

      let subtotal = 0;
      for (const item of lineItems) {
        await query(
          `INSERT INTO tenant_homecare_invoice_items (
            tenant_id, invoice_id, visit_id, visit_date, description,
            hours, minutes, rate_type, hourly_rate, visit_amount,
            mileage, mileage_rate, mileage_amount, total_amount, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
          [
            tenantId,
            invoice.invoice_id,
            item.visitId,
            item.visitDate,
            item.description,
            item.hours,
            item.minutes,
            item.rateType,
            item.hourlyRate,
            item.visitAmount,
            item.mileage,
            item.mileageRate,
            item.mileageAmount,
            item.totalAmount
          ]
        );
        subtotal += item.totalAmount;
      }

      // Update invoice totals
      await query(
        `UPDATE tenant_homecare_invoices
         SET subtotal = $3, total_amount = $3, outstanding_amount = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND invoice_id = $2`,
        [tenantId, invoice.invoice_id, subtotal]
      );

      invoice.subtotal = subtotal;
      invoice.total_amount = subtotal;
      invoice.outstanding_amount = subtotal;
    }

    logger.info(`Created homecare invoice ${invoiceNumber} for tenant ${tenantId}`);
    res.status(201).json(invoice);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/invoices/:invoiceId/items
 * Add a line item to an invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/items',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const {
      visit_id,
      description,
      hours,
      minutes = 0,
      rate_type,
      hourly_rate,
      mileage,
      mileage_rate
    } = req.body;

    // Verify invoice exists and is editable
    const invoice = await queryOne(
      'SELECT invoice_id, status FROM tenant_homecare_invoices WHERE tenant_id = $1 AND invoice_id = $2',
      [tenantId, invoiceId]
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new ValidationError('Cannot add items to non-draft invoice');
    }

    // Calculate amounts (amounts in pence)
    const durationHours = hours + minutes / 60;
    const visitAmount = Math.round(durationHours * hourly_rate);
    const mileageAmount = mileage && mileage_rate ? Math.round(mileage * mileage_rate) : 0;
    const totalAmount = visitAmount + mileageAmount;

    // Insert line item
    const item = await queryOne(
      `INSERT INTO tenant_homecare_invoice_items (
        tenant_id, invoice_id, visit_id, description,
        hours, minutes, rate_type, hourly_rate, visit_amount,
        mileage, mileage_rate, mileage_amount, total_amount, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        tenantId,
        invoiceId,
        visit_id || null,
        description,
        hours,
        minutes,
        rate_type,
        hourly_rate,
        visitAmount,
        mileage || 0,
        mileage_rate || 0,
        mileageAmount,
        totalAmount
      ]
    );

    // Update invoice totals
    await query(
      `UPDATE tenant_homecare_invoices
       SET subtotal = subtotal + $3,
           total_amount = total_amount + $3,
           outstanding_amount = outstanding_amount + $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND invoice_id = $2`,
      [tenantId, invoiceId, totalAmount]
    );

    res.status(201).json(item);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/invoices/:invoiceId/send
 * Mark invoice as sent
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/send',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const userId = req.user!.userId;

    const invoice = await queryOne(
      'SELECT invoice_id, status FROM tenant_homecare_invoices WHERE tenant_id = $1 AND invoice_id = $2',
      [tenantId, invoiceId]
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new ValidationError('Invoice has already been sent');
    }

    // Update status to sent
    await query(
      `UPDATE tenant_homecare_invoices
       SET status = 'sent', sent_date = CURRENT_DATE, updated_at = NOW()
       WHERE tenant_id = $1 AND invoice_id = $2`,
      [tenantId, invoiceId]
    );

    logger.info(`Invoice ${invoiceId} sent by user ${userId}`);
    res.json({ message: 'Invoice marked as sent' });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/invoices/:invoiceId/payments
 * Record a payment against an invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/payments',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const userId = req.user!.userId;
    const { amount, payment_method, payment_date, reference, notes } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }

    // Get invoice
    const invoice = await queryOne(
      'SELECT * FROM tenant_homecare_invoices WHERE tenant_id = $1 AND invoice_id = $2',
      [tenantId, invoiceId]
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === 'cancelled') {
      throw new ValidationError('Cannot record payment on cancelled invoice');
    }

    if (amount > invoice.outstanding_amount) {
      throw new ValidationError('Payment amount exceeds outstanding balance');
    }

    // Record payment
    const payment = await queryOne(
      `INSERT INTO tenant_homecare_payments (
        tenant_id, invoice_id, amount, payment_method, payment_date,
        reference, notes, received_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        tenantId,
        invoiceId,
        amount,
        payment_method,
        payment_date || new Date().toISOString().split('T')[0],
        reference || null,
        notes || null,
        userId
      ]
    );

    // Update invoice
    const newPaidAmount = invoice.paid_amount + amount;
    const newOutstanding = invoice.outstanding_amount - amount;
    const newStatus = newOutstanding <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE tenant_homecare_invoices
       SET paid_amount = $3,
           outstanding_amount = $4,
           status = $5,
           paid_date = CASE WHEN $5 = 'paid' THEN CURRENT_DATE ELSE paid_date END,
           updated_at = NOW()
       WHERE tenant_id = $1 AND invoice_id = $2`,
      [tenantId, invoiceId, newPaidAmount, newOutstanding, newStatus]
    );

    logger.info(`Payment recorded for invoice ${invoiceId}: ${amount}p`);
    res.status(201).json({
      payment,
      invoiceStatus: newStatus,
      outstandingAmount: newOutstanding
    });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/invoices/:invoiceId/cancel
 * Cancel an invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/cancel',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { reason } = req.body;

    const invoice = await queryOne(
      'SELECT invoice_id, status FROM tenant_homecare_invoices WHERE tenant_id = $1 AND invoice_id = $2',
      [tenantId, invoiceId]
    );

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new ValidationError('Cannot cancel a paid invoice');
    }

    await query(
      `UPDATE tenant_homecare_invoices
       SET status = 'cancelled', cancellation_reason = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND invoice_id = $2`,
      [tenantId, invoiceId, reason || null]
    );

    logger.info(`Invoice ${invoiceId} cancelled`);
    res.json({ message: 'Invoice cancelled successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/billing/summary
 * Get billing summary for dashboard
 */
router.get(
  '/tenants/:tenantId/billing/summary',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Total outstanding
    const outstandingResult = await queryOne(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total
       FROM tenant_homecare_invoices
       WHERE tenant_id = $1 AND status NOT IN ('paid', 'cancelled')`,
      [tenantId]
    );

    // Total overdue
    const overdueResult = await queryOne(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total
       FROM tenant_homecare_invoices
       WHERE tenant_id = $1
         AND status NOT IN ('paid', 'cancelled')
         AND due_date < CURRENT_DATE`,
      [tenantId]
    );

    // Paid this month
    const paidThisMonthResult = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM tenant_homecare_payments
       WHERE tenant_id = $1
         AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    // Invoiced this month
    const invoicedThisMonthResult = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM tenant_homecare_invoices
       WHERE tenant_id = $1
         AND issue_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    // By funding source
    const byFundingResult = await query(
      `SELECT
        funding_source,
        COALESCE(SUM(outstanding_amount), 0) as outstanding,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN outstanding_amount ELSE 0 END), 0) as overdue
       FROM tenant_homecare_invoices
       WHERE tenant_id = $1 AND status NOT IN ('paid', 'cancelled')
       GROUP BY funding_source`,
      [tenantId]
    );

    // Recent payments
    const recentPayments = await query(
      `SELECT p.*, i.invoice_number
       FROM tenant_homecare_payments p
       JOIN tenant_homecare_invoices i ON p.invoice_id = i.invoice_id AND p.tenant_id = i.tenant_id
       WHERE p.tenant_id = $1
       ORDER BY p.payment_date DESC
       LIMIT 10`,
      [tenantId]
    );

    // Overdue invoices
    const overdueInvoices = await query(
      `SELECT i.*, c.first_name, c.last_name
       FROM tenant_homecare_invoices i
       LEFT JOIN tenant_care_clients c ON i.client_id = c.client_id AND i.tenant_id = c.tenant_id
       WHERE i.tenant_id = $1
         AND i.status NOT IN ('paid', 'cancelled')
         AND i.due_date < CURRENT_DATE
       ORDER BY i.due_date ASC
       LIMIT 10`,
      [tenantId]
    );

    res.json({
      summary: {
        totalOutstanding: parseInt(outstandingResult.total || '0', 10),
        totalOverdue: parseInt(overdueResult.total || '0', 10),
        paidThisMonth: parseInt(paidThisMonthResult.total || '0', 10),
        invoicedThisMonth: parseInt(invoicedThisMonthResult.total || '0', 10),
        byFundingSource: byFundingResult,
        recentPayments,
        overdueInvoices
      }
    });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/billing/rates
 * Get billing rates configuration
 */
router.get(
  '/tenants/:tenantId/billing/rates',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const rates = await query(
      `SELECT * FROM tenant_homecare_billing_rates
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY rate_type, funding_source NULLS FIRST`,
      [tenantId]
    );

    res.json({ rates });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/billing/rates
 * Create a billing rate
 */
router.post(
  '/tenants/:tenantId/billing/rates',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      name,
      rate_type,
      hourly_rate,
      funding_source,
      effective_from,
      effective_to
    } = req.body;

    // Validate required fields
    if (!name || !rate_type || !hourly_rate || !effective_from) {
      throw new ValidationError('Name, rate type, hourly rate, and effective from date are required');
    }

    const rate = await queryOne(
      `INSERT INTO tenant_homecare_billing_rates (
        tenant_id, name, rate_type, hourly_rate,
        funding_source, effective_from, effective_to,
        is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      RETURNING *`,
      [
        tenantId,
        name,
        rate_type,
        hourly_rate,
        funding_source || null,
        effective_from,
        effective_to || null
      ]
    );

    logger.info(`Created billing rate for tenant ${tenantId}: ${name}`);
    res.status(201).json(rate);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/billing/rates/:rateId
 * Update a billing rate
 */
router.put(
  '/tenants/:tenantId/billing/rates/:rateId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, rateId } = req.params;
    const { name, hourly_rate, effective_to, is_active } = req.body;

    const existing = await queryOne(
      'SELECT rate_id FROM tenant_homecare_billing_rates WHERE tenant_id = $1 AND rate_id = $2',
      [tenantId, rateId]
    );

    if (!existing) {
      throw new NotFoundError('Billing rate not found');
    }

    const rate = await queryOne(
      `UPDATE tenant_homecare_billing_rates SET
        name = COALESCE($3, name),
        hourly_rate = COALESCE($4, hourly_rate),
        effective_to = COALESCE($5, effective_to),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE tenant_id = $1 AND rate_id = $2
       RETURNING *`,
      [tenantId, rateId, name, hourly_rate, effective_to, is_active]
    );

    logger.info(`Updated billing rate ${rateId} for tenant ${tenantId}`);
    res.json(rate);
  })
);

export default router;
