import cron from 'node-cron';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { generateInvoicePDF } from './pdfGenerator';
import { sendInvoiceEmail } from './emailService';

/**
 * Automated Invoice Generation Service
 *
 * Runs daily to check if any providers have their billing day today
 * and generates invoices automatically based on provider settings.
 */

interface Provider {
  provider_id: number;
  name: string;
  billing_day: number;
  billing_frequency: 'weekly' | 'fortnightly' | 'monthly';
  auto_send: boolean;
  invoice_email: string;
  cc_email: string;
  payment_terms_days: number;
  send_reminders: boolean;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  email: string;
  trip_count: number;
  trips: string; // JSON string from JSON_AGG
}

/**
 * Main scheduler function
 * Runs at 2 AM every day
 */
export function startInvoiceAutomationScheduler() {
  // Run at 2 AM every day
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running automated invoice generation check');
    await processAutomatedInvoices();
  });

  logger.info('Invoice automation scheduler started (runs daily at 2 AM)');
}

/**
 * Process automated invoices for all tenants
 */
async function processAutomatedInvoices() {
  try {
    // Get all active tenants
    const tenants = await query<{ tenant_id: number; company_name: string }>(`
      SELECT tenant_id, company_name
      FROM tenants
      WHERE is_active = true
    `);

    for (const tenant of tenants) {
      try {
        await processInvoicesForTenant(tenant.tenant_id);
      } catch (error) {
        logger.error('Failed to process invoices for tenant', {
          tenantId: tenant.tenant_id,
          tenantName: tenant.company_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Automated invoice generation completed', {
      tenantsProcessed: tenants.length
    });
  } catch (error) {
    logger.error('Fatal error in automated invoice generation', { error });
  }
}

/**
 * Process invoices for a specific tenant
 */
async function processInvoicesForTenant(tenantId: number) {
  const today = new Date();
  const dayOfMonth = today.getDate();

  // Get providers whose billing day is today
  const providers = await query<Provider>(`
    SELECT
      provider_id, name, billing_day, billing_frequency,
      auto_send, invoice_email, cc_email, payment_terms_days,
      send_reminders
    FROM tenant_providers
    WHERE tenant_id = $1
      AND is_active = true
      AND billing_day = $2
      AND invoice_email IS NOT NULL
      AND invoice_email != ''
  `, [tenantId, dayOfMonth]);

  if (providers.length === 0) {
    logger.debug('No providers with billing day today', { tenantId, dayOfMonth });
    return;
  }

  logger.info('Processing invoices for providers', {
    tenantId,
    providerCount: providers.length,
    providers: providers.map(p => p.name)
  });

  for (const provider of providers) {
    await generateInvoicesForProvider(tenantId, provider);
  }
}

/**
 * Generate invoices for a specific provider
 */
async function generateInvoicesForProvider(tenantId: number, provider: Provider) {
  try {
    // Calculate billing period based on frequency
    const { startDate, endDate } = calculateBillingPeriod(provider.billing_frequency);

    logger.info('Generating invoices for provider', {
      tenantId,
      providerId: provider.provider_id,
      providerName: provider.name,
      period: { start: startDate, end: endDate }
    });

    // Get customers with completed trips in the billing period
    const customers = await query<Customer>(`
      SELECT
        c.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email,
        COUNT(DISTINCT s.schedule_id) as trip_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'schedule_id', s.schedule_id,
            'date', s.date,
            'pickup_time', s.pickup_time,
            'destination', s.destination,
            'trip_rate', COALESCE(s.trip_rate, 25.00)
          ) ORDER BY s.date, s.pickup_time
        ) FILTER (WHERE s.schedule_id IS NOT NULL) as trips
      FROM tenant_customers c
      INNER JOIN tenant_schedules s ON s.customer_id = c.customer_id
        AND s.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1
        AND c.active = true
        AND c.paying_organisation = $2
        AND s.date BETWEEN $3 AND $4
        AND s.status = 'completed'
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email
      HAVING COUNT(DISTINCT s.schedule_id) > 0
    `, [tenantId, provider.name, startDate, endDate]);

    if (customers.length === 0) {
      logger.info('No customers with trips for provider', {
        tenantId,
        providerId: provider.provider_id,
        providerName: provider.name
      });
      return;
    }

    logger.info('Found customers to invoice', {
      tenantId,
      providerName: provider.name,
      customerCount: customers.length
    });

    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + provider.payment_terms_days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    let generatedCount = 0;
    let emailedCount = 0;

    for (const customer of customers) {
      try {
        const trips = JSON.parse(customer.trips || '[]');

        // Calculate total amount from individual trip rates
        let totalAmount = trips.reduce((sum: number, trip: any) => {
          return sum + (parseFloat(trip.trip_rate) || 25.00);
        }, 0);

        // Get social outing bookings for this customer in the billing period
        const outingBookings = await query<{
          booking_id: number;
          outing_name: string;
          outing_date: string;
          cost_per_person: number;
        }>(`
          SELECT
            b.id as booking_id,
            o.name as outing_name,
            o.outing_date,
            o.cost_per_person
          FROM tenant_outing_bookings b
          INNER JOIN tenant_social_outings o ON b.outing_id = o.id
            AND b.tenant_id = o.tenant_id
          WHERE b.tenant_id = $1
            AND b.customer_id = $2
            AND b.booking_status = 'confirmed'
            AND o.outing_date BETWEEN $3 AND $4
          ORDER BY o.outing_date ASC
        `, [tenantId, customer.customer_id, startDate, endDate]);

        // Add social outing costs to total
        outingBookings.forEach(outing => {
          totalAmount += parseFloat(String(outing.cost_per_person)) || 0;
        });

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(tenantId);

        // Build description based on what's included
        let description = `Transport services for period ${startDate} to ${endDate}`;
        if (outingBookings.length > 0) {
          description += ` (includes ${trips.length} trip${trips.length !== 1 ? 's' : ''} and ${outingBookings.length} social outing${outingBookings.length !== 1 ? 's' : ''})`;
        } else if (trips.length > 0) {
          description += ` (${trips.length} trip${trips.length !== 1 ? 's' : ''})`;
        }

        // Create invoice
        const invoiceResult = await query<{ invoice_id: number }>(`
          INSERT INTO tenant_invoices (
            tenant_id, customer_id, customer_name, email,
            paying_organisation, invoice_number, invoice_date,
            period_start, period_end, due_date,
            total_amount, amount_paid, invoice_status,
            description, auto_generated, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, 0, $12, $13, true, NOW(), NOW()
          )
          RETURNING invoice_id
        `, [
          tenantId,
          customer.customer_id,
          customer.customer_name,
          customer.email,
          provider.name,
          invoiceNumber,
          invoiceDate,
          startDate,
          endDate,
          dueDate,
          totalAmount,
          provider.auto_send ? 'sent' : 'draft', // Status based on auto_send setting
          description
        ]);

        const invoiceId = invoiceResult[0].invoice_id;

        // Create line items for trips
        for (const trip of trips) {
          const tripRate = parseFloat(trip.trip_rate) || 25.00;
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
            tripRate,
            tripRate,
            JSON.stringify({ schedule_id: trip.schedule_id, date: trip.date, type: 'trip' })
          ]);
        }

        // Create line items for social outings
        for (const outing of outingBookings) {
          const outingCost = parseFloat(String(outing.cost_per_person)) || 0;
          await query(`
            INSERT INTO tenant_invoice_line_items (
              tenant_id, invoice_id, description,
              quantity, unit_price, total_price,
              metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            tenantId,
            invoiceId,
            `Social Outing: ${outing.outing_name} on ${outing.outing_date}`,
            1,
            outingCost,
            outingCost,
            JSON.stringify({
              booking_id: outing.booking_id,
              outing_date: outing.outing_date,
              type: 'social_outing'
            })
          ]);
        }

        generatedCount++;

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(tenantId, invoiceId);

        // If auto_send is enabled, send the invoice immediately
        if (provider.auto_send && pdfBuffer) {
          try {
            await sendInvoiceEmail(
              tenantId,
              invoiceId,
              provider.invoice_email,
              provider.cc_email || undefined,
              pdfBuffer
            );
            emailedCount++;

            // Mark invoice as emailed
            await query(`
              UPDATE tenant_invoices
              SET email_sent = true, email_sent_at = NOW()
              WHERE invoice_id = $1 AND tenant_id = $2
            `, [invoiceId, tenantId]);

            logger.info('Invoice generated and emailed', {
              tenantId,
              invoiceId,
              invoiceNumber,
              customerName: customer.customer_name,
              email: provider.invoice_email
            });
          } catch (emailError) {
            logger.error('Failed to email invoice', {
              tenantId,
              invoiceId,
              error: emailError instanceof Error ? emailError.message : 'Unknown error'
            });
          }
        } else {
          logger.info('Invoice generated (requires approval)', {
            tenantId,
            invoiceId,
            invoiceNumber,
            customerName: customer.customer_name
          });
        }
      } catch (customerError) {
        logger.error('Failed to generate invoice for customer', {
          tenantId,
          customerId: customer.customer_id,
          customerName: customer.customer_name,
          error: customerError instanceof Error ? customerError.message : 'Unknown error'
        });
      }
    }

    logger.info('Invoice generation completed for provider', {
      tenantId,
      providerName: provider.name,
      generatedCount,
      emailedCount
    });
  } catch (error) {
    logger.error('Failed to generate invoices for provider', {
      tenantId,
      providerId: provider.provider_id,
      providerName: provider.name,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Calculate billing period based on frequency
 */
function calculateBillingPeriod(frequency: 'weekly' | 'fortnightly' | 'monthly'): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (frequency) {
    case 'weekly':
      // Last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      break;

    case 'fortnightly':
      // Last 14 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 14);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      break;

    case 'monthly':
    default:
      // Previous month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

/**
 * Generate sequential invoice number
 */
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

/**
 * Manual trigger for testing/override
 */
export async function triggerInvoiceGeneration() {
  logger.info('Manual invoice generation triggered');
  await processAutomatedInvoices();
}
