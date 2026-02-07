import { Router, Response } from 'express';
import { query, queryWithTenant } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceLineSchema,
  recordPaymentSchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
  batchInvoiceSchema,
  billingRateSchema,
  localAuthorityConfigSchema,
  creditNoteSchema,
  sendInvoiceSchema,
} from '../../schemas/invoice.schemas';
import { AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { logger } from '../../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errorTypes';

const router = Router();

/**
 * Invoice Routes for Home Care Co-operative System
 *
 * Handles billing, invoicing, and payment tracking.
 */

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(tenantId: number): Promise<string> {
  const result = await query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1 as next_num
     FROM tenant_invoices
     WHERE tenant_id = $1 AND invoice_number LIKE 'INV-%'`,
    [tenantId]
  );
  const nextNum = result.rows[0].next_num;
  return `INV-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Calculate billing for visits in a period
 */
async function calculateVisitBilling(
  tenantId: number,
  clientId: number,
  periodStart: string,
  periodEnd: string
): Promise<any[]> {
  // Get completed visits in period
  const visits = await queryWithTenant<any>(
    tenantId,
    `SELECT v.id, v.scheduled_date, v.actual_start_time, v.actual_end_time,
            v.miles_claimed, v.status,
            c.funding_source
     FROM tenant_visits v
     JOIN tenant_clients c ON v.client_id = c.id AND c.tenant_id = v.tenant_id
     WHERE v.client_id = $2
       AND v.scheduled_date >= $3
       AND v.scheduled_date <= $4
       AND v.status = 'completed'
       AND v.id NOT IN (
         SELECT DISTINCT visit_id FROM tenant_invoice_lines WHERE visit_id IS NOT NULL
       )
     ORDER BY v.scheduled_date`,
    [clientId, periodStart, periodEnd]
  );

  const lineItems = [];

  for (const visit of visits) {
    // Calculate duration
    const startParts = visit.actual_start_time.split(':');
    const endParts = visit.actual_end_time.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    // Determine rate type based on day/time
    const visitDate = new Date(visit.scheduled_date);
    const dayOfWeek = visitDate.getDay();
    const hour = parseInt(startParts[0]);

    let rateType = 'standard';
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      rateType = 'weekend';
    } else if (hour >= 20 || hour < 7) {
      rateType = 'evening';
    }

    // Get applicable rate
    const rates = await queryWithTenant<any>(
      tenantId,
      `SELECT hourly_rate FROM tenant_billing_rates
       WHERE tenant_id = $1
         AND rate_type = $2
         AND is_active = true
         AND effective_from <= $3
         AND (effective_to IS NULL OR effective_to >= $3)
         AND (client_id IS NULL OR client_id = $4)
         AND (funding_source IS NULL OR funding_source = $5)
       ORDER BY client_id NULLS LAST, funding_source NULLS LAST
       LIMIT 1`,
      [rateType, visit.scheduled_date, clientId, visit.funding_source]
    );

    const hourlyRate = rates.length > 0 ? rates[0].hourly_rate : 1500; // Default 15.00
    const visitAmount = Math.round((durationMinutes / 60) * hourlyRate);

    // Mileage calculation
    let mileageAmount = 0;
    const mileageRate = 45; // 45p per mile
    if (visit.miles_claimed && visit.miles_claimed > 0) {
      mileageAmount = Math.round(visit.miles_claimed * mileageRate);
    }

    lineItems.push({
      visitId: visit.id,
      visitDate: visit.scheduled_date,
      description: `Care visit on ${new Date(visit.scheduled_date).toLocaleDateString('en-GB')}`,
      hours,
      minutes,
      rateType,
      unitRate: hourlyRate,
      amount: visitAmount,
      mileage: visit.miles_claimed || 0,
      mileageRate,
      mileageAmount,
      totalAmount: visitAmount + mileageAmount,
    });
  }

  return lineItems;
}

/**
 * GET /tenants/:tenantId/invoices
 * List invoices with filtering and pagination
 */
router.get(
  '/tenants/:tenantId/invoices',
  validateQuery(listInvoicesQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      fundingSource,
      clientId,
      localAuthorityId,
      dateFrom,
      dateTo,
      overdue,
      sortBy = 'issue_date',
      sortOrder = 'desc',
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

    if (fundingSource) {
      whereClause += ` AND i.funding_source = $${paramIndex}`;
      params.push(fundingSource);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (localAuthorityId) {
      whereClause += ` AND i.local_authority_id = $${paramIndex}`;
      params.push(localAuthorityId);
      paramIndex++;
    }

    if (dateFrom) {
      whereClause += ` AND i.issue_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClause += ` AND i.issue_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (overdue === 'true') {
      whereClause += ` AND i.due_date < NOW() AND i.status NOT IN ('paid', 'cancelled')`;
    }

    // Sort mapping
    const sortColumns: Record<string, string> = {
      invoice_number: 'i.invoice_number',
      issue_date: 'i.issue_date',
      due_date: 'i.due_date',
      total_amount: 'i.total_amount',
      status: 'i.status',
    };
    const sortColumn = sortColumns[sortBy as string] || 'i.issue_date';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM tenant_invoices i WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get invoices
    const invoices = await query(
      `SELECT i.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              la.name as local_authority_name
       FROM tenant_invoices i
       LEFT JOIN tenant_clients c ON i.client_id = c.id AND c.tenant_id = i.tenant_id
       LEFT JOIN tenant_local_authorities la ON i.local_authority_id = la.id AND la.tenant_id = i.tenant_id
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      invoices: invoices.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /tenants/:tenantId/invoices/:invoiceId
 * Get single invoice with line items
 */
router.get(
  '/tenants/:tenantId/invoices/:invoiceId',
  validateParams(invoiceIdParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;

    // Get invoice
    const invoices = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT i.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              c.address as client_address,
              c.email as client_email,
              la.name as local_authority_name,
              la.billing_address as la_billing_address
       FROM tenant_invoices i
       LEFT JOIN tenant_clients c ON i.client_id = c.id AND c.tenant_id = i.tenant_id
       LEFT JOIN tenant_local_authorities la ON i.local_authority_id = la.id AND la.tenant_id = i.tenant_id
       WHERE i.id = $2`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];

    // Get line items
    const lineItems = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT * FROM tenant_invoice_lines WHERE invoice_id = $2 ORDER BY visit_date, id`,
      [invoiceId]
    );

    // Get payments
    const payments = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT p.*, u.first_name as received_by_first_name, u.last_name as received_by_last_name
       FROM tenant_payments p
       LEFT JOIN tenant_users u ON p.received_by = u.id
       WHERE p.invoice_id = $2
       ORDER BY p.payment_date DESC`,
      [invoiceId]
    );

    // Get credit notes
    const creditNotes = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT cn.*, u.first_name as issued_by_first_name, u.last_name as issued_by_last_name
       FROM tenant_credit_notes cn
       LEFT JOIN tenant_users u ON cn.issued_by = u.id
       WHERE cn.invoice_id = $2
       ORDER BY cn.issued_date DESC`,
      [invoiceId]
    );

    res.json({
      invoice,
      lineItems: lineItems,
      payments: payments,
      creditNotes: creditNotes,
    });
  })
);

/**
 * POST /tenants/:tenantId/invoices
 * Create a new invoice
 */
router.post(
  '/tenants/:tenantId/invoices',
  validateBody(createInvoiceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.userId;
    const {
      clientId,
      localAuthorityId,
      periodStart,
      periodEnd,
      dueDate,
      purchaseOrderNumber,
      notes,
      autoGenerateLines = true,
    } = req.body;

    // Validate client or local authority exists
    let billingName = '';
    let billingAddress = '';
    let billingEmail = '';
    let fundingSource = 'self_funded';

    if (clientId) {
      const clients = await queryWithTenant<any>(
        Number(tenantId),
        'SELECT * FROM tenant_clients WHERE id = $2',
        [clientId]
      );
      if (clients.length === 0) {
        throw new ValidationError('Client not found');
      }
      const client = clients[0];
      billingName = `${client.first_name} ${client.last_name}`;
      billingAddress = `${client.address}, ${client.city}, ${client.postcode}`;
      billingEmail = client.email || '';
      fundingSource = client.funding_source || 'self_funded';
    } else if (localAuthorityId) {
      const las = await queryWithTenant<any>(
        Number(tenantId),
        'SELECT * FROM tenant_local_authorities WHERE id = $2',
        [localAuthorityId]
      );
      if (las.length === 0) {
        throw new ValidationError('Local authority not found');
      }
      const la = las[0];
      billingName = la.name;
      billingAddress = la.billing_address;
      billingEmail = la.contact_email || '';
      fundingSource = 'local_authority';
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(Number(tenantId));

    // Calculate due date (default 30 days)
    const calculatedDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice
    const result = await query(
      `INSERT INTO tenant_invoices (
        tenant_id, invoice_number, client_id, local_authority_id,
        billing_name, billing_address, billing_email,
        period_start, period_end, issue_date, due_date,
        subtotal, tax_amount, total_amount, paid_amount, outstanding_amount,
        status, funding_source, purchase_order_number, notes,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 0, 0, 0, 0, 0, 'draft', $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        invoiceNumber,
        clientId || null,
        localAuthorityId || null,
        billingName,
        billingAddress,
        billingEmail,
        periodStart,
        periodEnd,
        calculatedDueDate,
        fundingSource,
        purchaseOrderNumber || null,
        notes || null,
        userId,
      ]
    );

    const invoice = result.rows[0];

    // Auto-generate line items from visits
    if (autoGenerateLines && clientId) {
      const lineItems = await calculateVisitBilling(Number(tenantId), clientId, periodStart, periodEnd);

      let subtotal = 0;
      for (const item of lineItems) {
        await query(
          `INSERT INTO tenant_invoice_lines (
            tenant_id, invoice_id, visit_id, visit_date, description,
            hours, minutes, rate_type, unit_rate, amount,
            mileage, mileage_rate, mileage_amount, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            tenantId,
            invoice.id,
            item.visitId,
            item.visitDate,
            item.description,
            item.hours,
            item.minutes,
            item.rateType,
            item.unitRate,
            item.amount,
            item.mileage,
            item.mileageRate,
            item.mileageAmount,
          ]
        );
        subtotal += item.totalAmount;
      }

      // Update invoice totals
      await query(
        `UPDATE tenant_invoices
         SET subtotal = $3, total_amount = $3, outstanding_amount = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, invoice.id, subtotal]
      );

      invoice.subtotal = subtotal;
      invoice.total_amount = subtotal;
      invoice.outstanding_amount = subtotal;
    }

    logger.info('Invoice created', {
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber,
      clientId,
      localAuthorityId,
      userId,
    });

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  })
);

/**
 * POST /tenants/:tenantId/invoices/:invoiceId/lines
 * Add line item to invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/lines',
  validateParams(invoiceIdParamSchema),
  validateBody(invoiceLineSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const { visitId, description, hours, minutes = 0, rateType, unitRate, mileage, mileageRate } = req.body;

    // Verify invoice exists and is editable
    const invoices = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT * FROM tenant_invoices WHERE id = $2',
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoices[0].status !== 'draft') {
      throw new ValidationError('Cannot add lines to non-draft invoice');
    }

    // Calculate amounts
    const durationHours = hours + minutes / 60;
    const amount = Math.round(durationHours * unitRate);
    const mileageAmount = mileage && mileageRate ? Math.round(mileage * mileageRate) : 0;

    // Insert line item
    const result = await query(
      `INSERT INTO tenant_invoice_lines (
        tenant_id, invoice_id, visit_id, description,
        hours, minutes, rate_type, unit_rate, amount,
        mileage, mileage_rate, mileage_amount, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        tenantId,
        invoiceId,
        visitId || null,
        description,
        hours,
        minutes,
        rateType,
        unitRate,
        amount,
        mileage || null,
        mileageRate || null,
        mileageAmount,
      ]
    );

    // Update invoice totals
    await query(
      `UPDATE tenant_invoices
       SET subtotal = subtotal + $3,
           total_amount = total_amount + $3,
           outstanding_amount = outstanding_amount + $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoiceId, amount + mileageAmount]
    );

    res.status(201).json({
      message: 'Line item added successfully',
      lineItem: result.rows[0],
    });
  })
);

/**
 * POST /tenants/:tenantId/invoices/:invoiceId/send
 * Mark invoice as sent
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/send',
  validateParams(invoiceIdParamSchema),
  validateBody(sendInvoiceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const userId = req.user!.userId;

    const invoices = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT * FROM tenant_invoices WHERE id = $2',
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoices[0].status !== 'draft' && invoices[0].status !== 'pending') {
      throw new ValidationError('Invoice has already been sent');
    }

    // Update status to sent
    await query(
      `UPDATE tenant_invoices
       SET status = 'sent', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoiceId]
    );

    // TODO: Implement actual email sending

    logger.info('Invoice sent', {
      tenantId,
      invoiceId,
      userId,
    });

    res.json({
      message: 'Invoice marked as sent',
    });
  })
);

/**
 * POST /tenants/:tenantId/invoices/:invoiceId/payments
 * Record a payment against an invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/payments',
  validateParams(invoiceIdParamSchema),
  validateBody(recordPaymentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const userId = req.user!.userId;
    const { amount, paymentMethod, paymentDate, reference, notes } = req.body;

    // Verify invoice exists
    const invoices = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT * FROM tenant_invoices WHERE id = $2',
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    const invoice = invoices[0];

    if (invoice.status === 'cancelled') {
      throw new ValidationError('Cannot record payment on cancelled invoice');
    }

    if (amount > invoice.outstanding_amount) {
      throw new ValidationError('Payment amount exceeds outstanding balance');
    }

    // Record payment
    const result = await query(
      `INSERT INTO tenant_payments (
        tenant_id, invoice_id, amount, payment_method, payment_date,
        reference, notes, received_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [tenantId, invoiceId, amount, paymentMethod, paymentDate, reference || null, notes || null, userId]
    );

    // Update invoice
    const newPaidAmount = invoice.paid_amount + amount;
    const newOutstanding = invoice.outstanding_amount - amount;
    const newStatus = newOutstanding <= 0 ? 'paid' : 'partial';

    await query(
      `UPDATE tenant_invoices
       SET paid_amount = $3,
           outstanding_amount = $4,
           status = $5,
           paid_date = CASE WHEN $5 = 'paid' THEN NOW() ELSE paid_date END,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoiceId, newPaidAmount, newOutstanding, newStatus]
    );

    logger.info('Payment recorded', {
      tenantId,
      invoiceId,
      paymentId: result.rows[0].id,
      amount,
      userId,
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.rows[0],
      invoiceStatus: newStatus,
      outstandingAmount: newOutstanding,
    });
  })
);

/**
 * POST /tenants/:tenantId/invoices/:invoiceId/credit-note
 * Issue a credit note against an invoice
 */
router.post(
  '/tenants/:tenantId/invoices/:invoiceId/credit-note',
  validateParams(invoiceIdParamSchema),
  validateBody(creditNoteSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, invoiceId } = req.params;
    const userId = req.user!.userId;
    const { amount, reason } = req.body;

    // Verify invoice exists
    const invoices = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT * FROM tenant_invoices WHERE id = $2',
      [invoiceId]
    );

    if (invoices.length === 0) {
      throw new NotFoundError('Invoice not found');
    }

    if (amount > invoices[0].outstanding_amount) {
      throw new ValidationError('Credit note amount exceeds outstanding balance');
    }

    // Generate credit note number
    const cnResult = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 4) AS INTEGER)), 0) + 1 as next_num
       FROM tenant_credit_notes WHERE tenant_id = $1`,
      [tenantId]
    );
    const creditNoteNumber = `CN-${String(cnResult.rows[0].next_num).padStart(6, '0')}`;

    // Create credit note
    const result = await query(
      `INSERT INTO tenant_credit_notes (
        tenant_id, credit_note_number, invoice_id, amount, reason,
        issued_by, issued_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [tenantId, creditNoteNumber, invoiceId, amount, reason, userId]
    );

    // Update invoice
    await query(
      `UPDATE tenant_invoices
       SET outstanding_amount = outstanding_amount - $3,
           total_amount = total_amount - $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoiceId, amount]
    );

    logger.info('Credit note issued', {
      tenantId,
      invoiceId,
      creditNoteId: result.rows[0].id,
      amount,
      userId,
    });

    res.status(201).json({
      message: 'Credit note issued successfully',
      creditNote: result.rows[0],
    });
  })
);

/**
 * GET /tenants/:tenantId/billing/summary
 * Get billing summary for dashboard
 */
router.get(
  '/tenants/:tenantId/billing/summary',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Total outstanding
    const outstandingResult = await query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total
       FROM tenant_invoices
       WHERE tenant_id = $1 AND status NOT IN ('paid', 'cancelled')`,
      [tenantId]
    );

    // Total overdue
    const overdueResult = await query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total
       FROM tenant_invoices
       WHERE tenant_id = $1
         AND status NOT IN ('paid', 'cancelled')
         AND due_date < NOW()`,
      [tenantId]
    );

    // Paid this month
    const paidThisMonthResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM tenant_payments
       WHERE tenant_id = $1
         AND payment_date >= DATE_TRUNC('month', NOW())`,
      [tenantId]
    );

    // Invoiced this month
    const invoicedThisMonthResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM tenant_invoices
       WHERE tenant_id = $1
         AND issue_date >= DATE_TRUNC('month', NOW())`,
      [tenantId]
    );

    // By funding source
    const byFundingResult = await query(
      `SELECT funding_source,
              COALESCE(SUM(outstanding_amount), 0) as outstanding,
              COALESCE(SUM(CASE WHEN due_date < NOW() THEN outstanding_amount ELSE 0 END), 0) as overdue
       FROM tenant_invoices
       WHERE tenant_id = $1 AND status NOT IN ('paid', 'cancelled')
       GROUP BY funding_source`,
      [tenantId]
    );

    // Recent payments
    const recentPayments = await query(
      `SELECT p.*, i.invoice_number
       FROM tenant_payments p
       JOIN tenant_invoices i ON p.invoice_id = i.id
       WHERE p.tenant_id = $1
       ORDER BY p.payment_date DESC
       LIMIT 10`,
      [tenantId]
    );

    // Overdue invoices
    const overdueInvoices = await query(
      `SELECT i.*, c.first_name, c.last_name
       FROM tenant_invoices i
       LEFT JOIN tenant_clients c ON i.client_id = c.id
       WHERE i.tenant_id = $1
         AND i.status NOT IN ('paid', 'cancelled')
         AND i.due_date < NOW()
       ORDER BY i.due_date ASC
       LIMIT 10`,
      [tenantId]
    );

    res.json({
      summary: {
        totalOutstanding: parseInt(outstandingResult.rows[0].total, 10),
        totalOverdue: parseInt(overdueResult.rows[0].total, 10),
        paidThisMonth: parseInt(paidThisMonthResult.rows[0].total, 10),
        invoicedThisMonth: parseInt(invoicedThisMonthResult.rows[0].total, 10),
        byFundingSource: byFundingResult.rows,
        recentPayments: recentPayments.rows,
        overdueInvoices: overdueInvoices.rows,
      },
    });
  })
);

/**
 * GET /tenants/:tenantId/billing/rates
 * Get billing rates
 */
router.get(
  '/tenants/:tenantId/billing/rates',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const rates = await query(
      `SELECT * FROM tenant_billing_rates
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY rate_type, funding_source, client_id NULLS FIRST`,
      [tenantId]
    );

    res.json({
      rates: rates.rows,
    });
  })
);

/**
 * POST /tenants/:tenantId/billing/rates
 * Create billing rate
 */
router.post(
  '/tenants/:tenantId/billing/rates',
  validateBody(billingRateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { name, rateType, hourlyRate, minimumCharge, fundingSource, clientId, effectiveFrom, effectiveTo } = req.body;

    const result = await query(
      `INSERT INTO tenant_billing_rates (
        tenant_id, name, rate_type, hourly_rate, minimum_charge,
        funding_source, client_id, effective_from, effective_to,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        name,
        rateType,
        hourlyRate,
        minimumCharge || null,
        fundingSource || null,
        clientId || null,
        effectiveFrom,
        effectiveTo || null,
      ]
    );

    res.status(201).json({
      message: 'Billing rate created successfully',
      rate: result.rows[0],
    });
  })
);

/**
 * GET /tenants/:tenantId/local-authorities
 * Get local authority configurations
 */
router.get(
  '/tenants/:tenantId/local-authorities',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    const authorities = await query(
      `SELECT * FROM tenant_local_authorities
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY name`,
      [tenantId]
    );

    res.json({
      localAuthorities: authorities.rows,
    });
  })
);

/**
 * POST /tenants/:tenantId/local-authorities
 * Create local authority configuration
 */
router.post(
  '/tenants/:tenantId/local-authorities',
  validateBody(localAuthorityConfigSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      name,
      code,
      contactEmail,
      contactPhone,
      billingAddress,
      paymentTerms,
      invoiceFormat,
      requiresPurchaseOrder,
      rates,
    } = req.body;

    const result = await query(
      `INSERT INTO tenant_local_authorities (
        tenant_id, name, code, contact_email, contact_phone,
        billing_address, payment_terms, invoice_format, requires_purchase_order,
        rates, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        name,
        code,
        contactEmail || null,
        contactPhone || null,
        billingAddress,
        paymentTerms,
        invoiceFormat || null,
        requiresPurchaseOrder,
        rates ? JSON.stringify(rates) : null,
      ]
    );

    res.status(201).json({
      message: 'Local authority created successfully',
      localAuthority: result.rows[0],
    });
  })
);

export default router;
