/**
 * Provider Routes - TypeScript Backend
 * Handles provider management, statistics, and invoice generation
 */

import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { ValidationError } from '../utils/errorTypes';

const router: Router = express.Router();

/**
 * GET /api/tenants/:tenantId/providers/stats
 * Get provider statistics and customer groupings
 */
router.get(
  '/tenants/:tenantId/providers/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    // Get all customers with their schedules and payment info
    const customersResult = await query<any>(`
      SELECT
        customer_id,
        name,
        address,
        phone,
        paying_org,
        has_split_payment,
        provider_split,
        schedule
      FROM tenant_customers
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    const customers = customersResult.map((customer: any) => ({
      ...customer,
      provider_split: typeof customer.provider_split === 'string' ?
        JSON.parse(customer.provider_split || '{}') : (customer.provider_split || {}),
      schedule: typeof customer.schedule === 'string' ?
        JSON.parse(customer.schedule || '{}') : (customer.schedule || {})
    }));

    // Group customers by provider
    const providers: Record<string, any> = {};
    let totalWeeklyRevenue = 0;
    let totalCustomers = 0;
    let selfPayCount = 0;

    customers.forEach(customer => {
      totalCustomers++;

      // Calculate weekly cost for this customer
      let customerWeeklyAmount = 0;
      let customerRouteCount = 0;

      if (customer.schedule) {
        Object.values(customer.schedule).forEach((day: any) => {
          if (day && day.destination) {
            const dailyPrice = day.daily_price || day.dailyPrice || day.price || 0;
            customerWeeklyAmount += parseFloat(dailyPrice);
            customerRouteCount++;
          }
        });
      }

      totalWeeklyRevenue += customerWeeklyAmount;

      if (customer.has_split_payment && customer.provider_split) {
        // Handle split payment customers
        Object.entries(customer.provider_split).forEach(([provider, config]: [string, any]) => {
          if (!providers[provider]) {
            providers[provider] = {
              customers: [],
              weeklyAmount: 0,
              totalRoutes: 0,
              type: 'split'
            };
          }

          const providerAmount = (customerWeeklyAmount * (config.percentage || 0)) / 100;
          const applicableDays = config.applicableDays || [];
          const providerRoutes = applicableDays.length;

          providers[provider].customers.push({
            id: customer.customer_id,
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            weeklyAmount: providerAmount,
            routeCount: providerRoutes,
            schedule: customer.schedule,
            splitPayment: true,
            splitPercentage: config.percentage
          });

          providers[provider].weeklyAmount += providerAmount;
          providers[provider].totalRoutes += providerRoutes;
        });
      } else {
        // Handle single provider customers
        const provider = customer.paying_org || 'Unknown';

        if (!providers[provider]) {
          providers[provider] = {
            customers: [],
            weeklyAmount: 0,
            totalRoutes: 0,
            type: 'single'
          };
        }

        providers[provider].customers.push({
          id: customer.customer_id,
          name: customer.name,
          address: customer.address,
          phone: customer.phone,
          weeklyAmount: customerWeeklyAmount,
          routeCount: customerRouteCount,
          schedule: customer.schedule,
          splitPayment: false
        });

        providers[provider].weeklyAmount += customerWeeklyAmount;
        providers[provider].totalRoutes += customerRouteCount;

        if (provider === 'Self-Pay') {
          selfPayCount++;
        }
      }
    });

    // Calculate statistics
    const totalProviders = Object.keys(providers).length;
    const largestProvider = Object.entries(providers)
      .reduce((max, [name, data]: [string, any]) =>
        data.weeklyAmount > (providers[max] || {weeklyAmount: 0}).weeklyAmount ? name : max,
        Object.keys(providers)[0] || 'None');

    const averagePerProvider = totalProviders > 0 ? totalWeeklyRevenue / totalProviders : 0;

    res.json({
      stats: {
        totalProviders,
        totalCustomers,
        totalWeeklyRevenue,
        totalMonthlyRevenue: totalWeeklyRevenue * 4.33,
        largestProvider: largestProvider || 'N/A',
        averagePerProvider,
        selfPayCount
      },
      providers,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/tenants/:tenantId/providers/directory
 * Get provider directory (all providers from tenant_providers table)
 */
router.get(
  '/tenants/:tenantId/providers/directory',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    const result = await query(`
      SELECT
        provider_id,
        name,
        type,
        billing_day,
        billing_frequency,
        invoice_email,
        cc_email,
        auto_send,
        payment_terms_days,
        late_payment_fee_percentage,
        send_reminders,
        reminder_days_before_due,
        reminder_days_after_due_1st,
        reminder_days_after_due_2nd,
        reminder_days_after_due_3rd,
        contact_name,
        contact_phone,
        invoice_notes,
        is_active,
        created_at,
        updated_at
      FROM tenant_providers
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY
        CASE WHEN name = 'Self-Pay' THEN 0 ELSE 1 END,
        name ASC
    `, [tenantId]);

    if (result.length === 0) {
      console.warn(`⚠️ Tenant ${tenantId} has no providers in tenant_providers table`);
    }

    res.json(result);
  })
);

/**
 * POST /api/tenants/:tenantId/providers/directory
 * Add new provider to directory
 */
router.post(
  '/tenants/:tenantId/providers/directory',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      name,
      type,
      billing_day,
      billing_frequency,
      invoice_email,
      cc_email,
      auto_send,
      payment_terms_days,
      late_payment_fee_percentage,
      send_reminders,
      reminder_days_before_due,
      reminder_days_after_due_1st,
      reminder_days_after_due_2nd,
      reminder_days_after_due_3rd,
      contact_name,
      contact_phone,
      invoice_notes
    } = req.body;

    if (!name || !type) {
      throw new ValidationError('Provider name and type are required');
    }

    // Check if provider already exists
    const existingResult = await query(`
      SELECT provider_id, is_active FROM tenant_providers
      WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
    `, [tenantId, name]);

    if (existingResult.length > 0) {
      const existing = existingResult[0];

      // If provider exists but is inactive, reactivate it
      if (!existing.is_active) {
        await query(`
          UPDATE tenant_providers
          SET is_active = true,
              type = $1,
              billing_day = $2,
              billing_frequency = $3,
              invoice_email = $4,
              cc_email = $5,
              auto_send = $6,
              payment_terms_days = $7,
              late_payment_fee_percentage = $8,
              send_reminders = $9,
              reminder_days_before_due = $10,
              reminder_days_after_due_1st = $11,
              reminder_days_after_due_2nd = $12,
              reminder_days_after_due_3rd = $13,
              contact_name = $14,
              contact_phone = $15,
              invoice_notes = $16,
              updated_at = CURRENT_TIMESTAMP
          WHERE provider_id = $17
        `, [
          type,
          billing_day || null,
          billing_frequency || 'monthly',
          invoice_email || null,
          cc_email || null,
          auto_send !== undefined ? auto_send : false,
          payment_terms_days || 30,
          late_payment_fee_percentage || 0,
          send_reminders !== undefined ? send_reminders : true,
          reminder_days_before_due || 7,
          reminder_days_after_due_1st || 3,
          reminder_days_after_due_2nd || 14,
          reminder_days_after_due_3rd || 30,
          contact_name || null,
          contact_phone || null,
          invoice_notes || null,
          existing.provider_id
        ]);

        res.json({
          message: 'Provider reactivated successfully',
          providerId: existing.provider_id,
          reactivated: true
        });
        return;
      }

      res.status(409).json({ error: 'Provider with this name already exists' });
      return;
    }

    // Insert new provider
    const result = await query(`
      INSERT INTO tenant_providers (
        tenant_id, name, type,
        billing_day, billing_frequency,
        invoice_email, cc_email, auto_send,
        payment_terms_days, late_payment_fee_percentage,
        send_reminders,
        reminder_days_before_due,
        reminder_days_after_due_1st,
        reminder_days_after_due_2nd,
        reminder_days_after_due_3rd,
        contact_name, contact_phone, invoice_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      tenantId, name, type,
      billing_day || 1,
      billing_frequency || 'monthly',
      invoice_email,
      cc_email,
      auto_send || false,
      payment_terms_days || 30,
      late_payment_fee_percentage || 0,
      send_reminders !== false,
      reminder_days_before_due || 7,
      reminder_days_after_due_1st || 3,
      reminder_days_after_due_2nd || 14,
      reminder_days_after_due_3rd || 30,
      contact_name,
      contact_phone,
      invoice_notes
    ]);

    console.log(`✅ Provider "${name}" created for tenant ${tenantId}`);
    res.status(201).json(result[0]);
  })
);

/**
 * PUT /api/tenants/:tenantId/providers/directory/:providerId
 * Update provider (including invoice settings)
 */
router.put(
  '/tenants/:tenantId/providers/directory/:providerId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, providerId } = req.params;
    const {
      name,
      type,
      billing_day,
      billing_frequency,
      invoice_email,
      cc_email,
      auto_send,
      payment_terms_days,
      late_payment_fee_percentage,
      send_reminders,
      reminder_days_before_due,
      reminder_days_after_due_1st,
      reminder_days_after_due_2nd,
      reminder_days_after_due_3rd,
      contact_name,
      contact_phone,
      invoice_notes
    } = req.body;

    // Check if provider exists
    const existingResult = await query(`
      SELECT provider_id FROM tenant_providers
      WHERE tenant_id = $1 AND provider_id = $2
    `, [tenantId, providerId]);

    if (existingResult.length === 0) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    // If name is being changed, check for conflicts
    if (name) {
      const conflictResult = await query(`
        SELECT provider_id FROM tenant_providers
        WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND provider_id != $3
      `, [tenantId, name, providerId]);

      if (conflictResult.length > 0) {
        res.status(409).json({ error: 'Another provider with this name already exists' });
        return;
      }
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [tenantId, providerId];
    let paramCount = 2;

    const addUpdate = (field: string, value: any) => {
      if (value !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push(value);
      }
    };

    addUpdate('name', name);
    addUpdate('type', type);
    addUpdate('billing_day', billing_day);
    addUpdate('billing_frequency', billing_frequency);
    addUpdate('invoice_email', invoice_email);
    addUpdate('cc_email', cc_email);
    addUpdate('auto_send', auto_send);
    addUpdate('payment_terms_days', payment_terms_days);
    addUpdate('late_payment_fee_percentage', late_payment_fee_percentage);
    addUpdate('send_reminders', send_reminders);
    addUpdate('reminder_days_before_due', reminder_days_before_due);
    addUpdate('reminder_days_after_due_1st', reminder_days_after_due_1st);
    addUpdate('reminder_days_after_due_2nd', reminder_days_after_due_2nd);
    addUpdate('reminder_days_after_due_3rd', reminder_days_after_due_3rd);
    addUpdate('contact_name', contact_name);
    addUpdate('contact_phone', contact_phone);
    addUpdate('invoice_notes', invoice_notes);

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await query(`
      UPDATE tenant_providers
      SET ${updates.join(', ')}
      WHERE tenant_id = $1 AND provider_id = $2
      RETURNING *
    `, values);

    console.log(`✅ Provider ${providerId} updated for tenant ${tenantId}`);
    res.json(result[0]);
  })
);

/**
 * DELETE /api/tenants/:tenantId/providers/directory/:providerId
 * Delete provider from directory (soft delete)
 */
router.delete(
  '/tenants/:tenantId/providers/directory/:providerId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, providerId } = req.params;

    // Check if any customers are using this provider
    const providerResult = await query(`
      SELECT name FROM tenant_providers
      WHERE tenant_id = $1 AND provider_id = $2
    `, [tenantId, providerId]);

    if (providerResult.length === 0) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    const providerName = providerResult[0].name;

    const customersUsingProvider = await query<any>(`
      SELECT COUNT(*) as count FROM tenant_customers
      WHERE tenant_id = $1 AND paying_org = $2 AND is_active = true
    `, [tenantId, providerName]);

    const customerCount = parseInt(customersUsingProvider[0].count);

    if (customerCount > 0) {
      res.status(409).json({
        error: `Cannot delete provider - ${customerCount} customer(s) are using this provider`,
        customerCount
      });
      return;
    }

    // Soft delete the provider
    await query(`
      UPDATE tenant_providers
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND provider_id = $2
    `, [tenantId, providerId]);

    res.json({
      message: 'Provider deleted successfully',
      providerName
    });
  })
);

/**
 * GET /api/tenants/:tenantId/providers/:providerName/details
 * Get detailed provider information
 */
router.get(
  '/tenants/:tenantId/providers/:providerName/details',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, providerName } = req.params;

    // Get customers for this provider
    const customersResult = await query(`
      SELECT
        customer_id,
        name,
        address,
        phone,
        email,
        paying_org,
        has_split_payment,
        provider_split,
        schedule,
        created_at
      FROM tenant_customers
      WHERE tenant_id = $1 AND is_active = true
        AND (paying_org = $2 OR (has_split_payment = true AND provider_split::text LIKE '%' || $2 || '%'))
      ORDER BY name ASC
    `, [tenantId, providerName]);

    const customers = customersResult.map(customer => {
      const schedule = typeof customer.schedule === 'string' ?
        JSON.parse(customer.schedule || '{}') : (customer.schedule || {});
      const providerSplit = typeof customer.provider_split === 'string' ?
        JSON.parse(customer.provider_split || '{}') : (customer.provider_split || {});

      let customerWeeklyAmount = 0;
      let customerRouteCount = 0;
      let routeDistribution: Record<string, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

      Object.entries(schedule).forEach(([day, dayData]: [string, any]) => {
        if (dayData && dayData.destination) {
          const dailyPrice = dayData.daily_price || dayData.dailyPrice || dayData.price || 0;
          customerWeeklyAmount += parseFloat(dailyPrice);
          customerRouteCount++;
          routeDistribution[day] = 1;
        }
      });

      // Adjust for split payment
      if (customer.has_split_payment && providerSplit[providerName]) {
        const percentage = providerSplit[providerName].percentage || 0;
        customerWeeklyAmount = (customerWeeklyAmount * percentage) / 100;
      }

      return {
        id: customer.customer_id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        weeklyAmount: customerWeeklyAmount,
        routeCount: customerRouteCount,
        schedule: schedule,
        routeDistribution: routeDistribution,
        splitPayment: customer.has_split_payment,
        splitPercentage: customer.has_split_payment && providerSplit[providerName] ?
          providerSplit[providerName].percentage : null,
        createdAt: customer.created_at
      };
    });

    const totalWeeklyAmount = customers.reduce((sum, c) => sum + c.weeklyAmount, 0);
    const totalRoutes = customers.reduce((sum, c) => sum + c.routeCount, 0);

    // Calculate route distribution across all customers
    const aggregatedRouteDistribution: Record<string, number> = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
    customers.forEach(customer => {
      Object.entries(customer.routeDistribution).forEach(([day, count]) => {
        aggregatedRouteDistribution[day] += count;
      });
    });

    res.json({
      providerName,
      summary: {
        totalCustomers: customers.length,
        totalRoutes,
        weeklyAmount: totalWeeklyAmount,
        monthlyEstimate: totalWeeklyAmount * 4.33,
        annualProjection: totalWeeklyAmount * 52,
        averagePerCustomer: customers.length > 0 ? totalWeeklyAmount / customers.length : 0
      },
      routeDistribution: aggregatedRouteDistribution,
      customers: customers.sort((a, b) => b.weeklyAmount - a.weeklyAmount),
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/tenants/:tenantId/providers/:providerName/invoice
 * Generate provider invoice data
 */
router.get(
  '/tenants/:tenantId/providers/:providerName/invoice',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, providerName } = req.params;
    const { weekStart } = req.query;

    // Get customers for this provider (same query as provider details)
    const customersResult = await query(`
      SELECT
        customer_id,
        name,
        address,
        phone,
        paying_org,
        has_split_payment,
        provider_split,
        schedule
      FROM tenant_customers
      WHERE tenant_id = $1 AND is_active = true
        AND (paying_org = $2 OR (has_split_payment = true AND provider_split::text LIKE '%' || $2 || '%'))
      ORDER BY name ASC
    `, [tenantId, providerName]);

    const invoiceData: any = {
      providerName,
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceNumber: `PRV-${Date.now()}`,
      servicePeriod: weekStart || 'Current Week',
      customers: [],
      totals: {
        totalCustomers: 0,
        totalRoutes: 0,
        totalAmount: 0
      }
    };

    customersResult.forEach((customer: any) => {
      const schedule = typeof customer.schedule === 'string' ?
        JSON.parse(customer.schedule || '{}') : (customer.schedule || {});
      const providerSplit = typeof customer.provider_split === 'string' ?
        JSON.parse(customer.provider_split || '{}') : (customer.provider_split || {});

      let customerWeeklyAmount = 0;
      let customerRouteCount = 0;

      Object.values(schedule).forEach((day: any) => {
        if (day && day.destination) {
          const dailyPrice = day.daily_price || day.dailyPrice || day.price || 0;
          customerWeeklyAmount += parseFloat(dailyPrice);
          customerRouteCount++;
        }
      });

      // Adjust for split payment
      if (customer.has_split_payment && providerSplit[providerName]) {
        const percentage = providerSplit[providerName].percentage || 0;
        customerWeeklyAmount = (customerWeeklyAmount * percentage) / 100;
      }

      invoiceData.customers.push({
        name: customer.name,
        address: customer.address,
        routeCount: customerRouteCount,
        weeklyAmount: customerWeeklyAmount
      });

      invoiceData.totals.totalCustomers++;
      invoiceData.totals.totalRoutes += customerRouteCount;
      invoiceData.totals.totalAmount += customerWeeklyAmount;
    });

    res.json(invoiceData);
  })
);

/**
 * POST /api/tenants/:tenantId/providers/:providerName/invoice
 * Generate and save provider invoice with database record
 */
router.post(
  '/tenants/:tenantId/providers/:providerName/invoice',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, providerName } = req.params;
    const { weekStart, weekEnd, period } = req.body;
    const userId = (req as any).userId;

    // Get customers for this provider
    const customersResult = await query(`
      SELECT
        customer_id,
        name,
        address,
        phone,
        paying_org,
        has_split_payment,
        provider_split,
        schedule
      FROM tenant_customers
      WHERE tenant_id = $1 AND is_active = true
        AND (paying_org = $2 OR (has_split_payment = true AND provider_split::text LIKE '%' || $2 || '%'))
      ORDER BY name ASC
    `, [tenantId, providerName]);

    let totalAmount = 0;
    const lineItems: any[] = [];
    let lineNumber = 1;

    customersResult.forEach((customer: any) => {
      const schedule = typeof customer.schedule === 'string' ?
        JSON.parse(customer.schedule || '{}') : (customer.schedule || {});
      const providerSplit = typeof customer.provider_split === 'string' ?
        JSON.parse(customer.provider_split || '{}') : (customer.provider_split || {});

      let customerWeeklyAmount = 0;
      let customerRouteCount = 0;

      Object.values(schedule).forEach((day: any) => {
        if (day && day.destination) {
          const dailyPrice = day.daily_price || day.dailyPrice || day.price || 0;
          customerWeeklyAmount += parseFloat(dailyPrice);
          customerRouteCount++;
        }
      });

      // Adjust for split payment
      if (customer.has_split_payment && providerSplit[providerName]) {
        const percentage = providerSplit[providerName].percentage || 0;
        customerWeeklyAmount = (customerWeeklyAmount * percentage) / 100;
      }

      if (customerWeeklyAmount > 0) {
        lineItems.push({
          lineNumber: lineNumber++,
          description: `${customer.name} - ${customerRouteCount} routes/week`,
          quantity: 1,
          unitPrice: customerWeeklyAmount,
          lineTotal: customerWeeklyAmount,
          providerName: providerName
        });

        totalAmount += customerWeeklyAmount;
      }
    });

    // Generate invoice number
    const invoiceNumber = `PRV-${tenantId}-${Date.now()}`;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const periodStart = weekStart || invoiceDate.toISOString().split('T')[0];
    const periodEnd = weekEnd || invoiceDate.toISOString().split('T')[0];

    // Create invoice record
    const invoiceResult = await query(`
      INSERT INTO tenant_invoices (
        tenant_id, invoice_number, customer_name, paying_org,
        invoice_date, due_date, period_start, period_end,
        subtotal, tax_amount, total_amount, invoice_status,
        invoice_type, notes, payment_terms_days, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING invoice_id
    `, [
      tenantId,
      invoiceNumber,
      providerName,
      providerName,
      invoiceDate,
      dueDate,
      periodStart,
      periodEnd,
      totalAmount,
      0,
      totalAmount,
      'sent',
      'provider',
      period || 'Weekly service',
      30,
      userId
    ]);

    const invoiceId = invoiceResult[0].invoice_id;

    // Create line items
    for (const item of lineItems) {
      await query(`
        INSERT INTO tenant_invoice_line_items (
          tenant_id, invoice_id, line_number, description,
          quantity, unit_price, line_total, provider_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        tenantId,
        invoiceId,
        item.lineNumber,
        item.description,
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        item.providerName
      ]);
    }

    res.json({
      success: true,
      invoiceId,
      invoiceNumber,
      totalAmount,
      lineItemCount: lineItems.length,
      message: 'Provider invoice created successfully'
    });
  })
);

export default router;
