/**
 * Invoice Reminder Scheduler Service
 *
 * Automatically schedules reminders for invoices based on:
 * - Invoice due dates
 * - Current payment status
 * - Tenant reminder configuration
 * - Multi-tier reminder system (pre-due, overdue 1st/2nd/3rd, final warning)
 */

import { query } from '../config/database';

interface TenantReminderConfig {
  tenant_id: number;
  reminders_enabled: boolean;
  default_pre_due_days: number;
  default_overdue_1st_days: number;
  default_overdue_2nd_days: number;
  default_overdue_3rd_days: number;
  default_final_warning_days: number;
}

interface Invoice {
  invoice_id: number;
  tenant_id: number;
  due_date: Date;
  total_amount: number;
  amount_paid: number;
  status: string;
}

interface ExistingReminder {
  reminder_type: string;
  status: string;
}

/**
 * Get tenant reminder configuration or return defaults
 */
async function getTenantReminderConfig(tenantId: number): Promise<TenantReminderConfig> {
  const configs = await query<TenantReminderConfig>(`
    SELECT * FROM tenant_invoice_reminder_config
    WHERE tenant_id = $1
  `, [tenantId]);

  if (configs.length === 0) {
    // Return default configuration
    return {
      tenant_id: tenantId,
      reminders_enabled: true,
      default_pre_due_days: 7,
      default_overdue_1st_days: 7,
      default_overdue_2nd_days: 14,
      default_overdue_3rd_days: 21,
      default_final_warning_days: 28
    };
  }

  return configs[0];
}

/**
 * Get invoices that need reminder scheduling
 * Returns unpaid and partially paid invoices that are not cancelled or archived
 */
async function getInvoicesNeedingReminders(): Promise<Invoice[]> {
  const invoices = await query<Invoice>(`
    SELECT
      invoice_id,
      tenant_id,
      due_date,
      total_amount,
      amount_paid,
      status
    FROM tenant_invoices
    WHERE status IN ('unpaid', 'partially_paid')
    AND archived = FALSE
    AND due_date IS NOT NULL
    ORDER BY tenant_id, due_date
  `);

  return invoices;
}

/**
 * Get existing reminders for an invoice
 */
async function getExistingReminders(invoiceId: number): Promise<ExistingReminder[]> {
  const reminders = await query<ExistingReminder>(`
    SELECT reminder_type, status
    FROM tenant_invoice_reminders
    WHERE invoice_id = $1
    AND status IN ('pending', 'sent')
  `, [invoiceId]);

  return reminders;
}

/**
 * Calculate the scheduled date for a reminder type
 */
function calculateScheduledDate(
  dueDate: Date,
  reminderType: string,
  config: TenantReminderConfig
): Date {
  const date = new Date(dueDate);

  switch (reminderType) {
    case 'pre_due':
      // Schedule X days before due date
      date.setDate(date.getDate() - config.default_pre_due_days);
      break;
    case 'overdue_1st':
      // Schedule X days after due date
      date.setDate(date.getDate() + config.default_overdue_1st_days);
      break;
    case 'overdue_2nd':
      // Schedule X days after due date
      date.setDate(date.getDate() + config.default_overdue_2nd_days);
      break;
    case 'overdue_3rd':
      // Schedule X days after due date
      date.setDate(date.getDate() + config.default_overdue_3rd_days);
      break;
    case 'final_warning':
      // Schedule X days after due date
      date.setDate(date.getDate() + config.default_final_warning_days);
      break;
  }

  return date;
}

/**
 * Schedule a reminder for an invoice
 */
async function scheduleReminder(
  invoice: Invoice,
  reminderType: string,
  scheduledDate: Date
): Promise<void> {
  try {
    // Insert the reminder
    const result = await query<{ reminder_id: number }>(`
      INSERT INTO tenant_invoice_reminders (
        tenant_id,
        invoice_id,
        reminder_type,
        scheduled_date,
        status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING reminder_id
    `, [
      invoice.tenant_id,
      invoice.invoice_id,
      reminderType,
      scheduledDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
    ]);

    const reminderId = result[0].reminder_id;

    // Log the scheduling event
    await query(`
      INSERT INTO tenant_invoice_reminder_log (
        tenant_id,
        invoice_id,
        reminder_id,
        event_type,
        reminder_type,
        success,
        created_at
      ) VALUES ($1, $2, $3, 'scheduled', $4, true, CURRENT_TIMESTAMP)
    `, [
      invoice.tenant_id,
      invoice.invoice_id,
      reminderId,
      reminderType
    ]);

    console.log(`✅ Scheduled ${reminderType} reminder for invoice ${invoice.invoice_id} (tenant ${invoice.tenant_id})`);
  } catch (error) {
    console.error(`❌ Failed to schedule ${reminderType} reminder for invoice ${invoice.invoice_id}:`, error);

    // Log the failure
    await query(`
      INSERT INTO tenant_invoice_reminder_log (
        tenant_id,
        invoice_id,
        event_type,
        reminder_type,
        success,
        error_message,
        created_at
      ) VALUES ($1, $2, 'scheduled', $3, false, $4, CURRENT_TIMESTAMP)
    `, [
      invoice.tenant_id,
      invoice.invoice_id,
      reminderType,
      (error as Error).message
    ]);
  }
}

/**
 * Process a single invoice for reminder scheduling
 */
async function processInvoice(invoice: Invoice, config: TenantReminderConfig): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  // Get existing reminders
  const existingReminders = await getExistingReminders(invoice.invoice_id);
  const existingReminderTypes = new Set(existingReminders.map(r => r.reminder_type));

  // Determine which reminders should exist for this invoice
  const remindersToSchedule: string[] = [];

  // Always check for pre_due if invoice is not overdue
  const dueDate = new Date(invoice.due_date);
  const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff >= 0) {
    // Invoice not yet due - schedule pre_due if not already scheduled
    if (!existingReminderTypes.has('pre_due')) {
      const preDueDate = calculateScheduledDate(dueDate, 'pre_due', config);
      if (preDueDate <= today || preDueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        // Only schedule if pre-due date is today or within next 7 days
        remindersToSchedule.push('pre_due');
      }
    }
  } else {
    // Invoice is overdue - determine which overdue reminders to schedule
    const daysOverdue = Math.abs(daysDiff);

    // Check overdue_1st
    if (daysOverdue >= config.default_overdue_1st_days && !existingReminderTypes.has('overdue_1st')) {
      remindersToSchedule.push('overdue_1st');
    }

    // Check overdue_2nd
    if (daysOverdue >= config.default_overdue_2nd_days && !existingReminderTypes.has('overdue_2nd')) {
      remindersToSchedule.push('overdue_2nd');
    }

    // Check overdue_3rd
    if (daysOverdue >= config.default_overdue_3rd_days && !existingReminderTypes.has('overdue_3rd')) {
      remindersToSchedule.push('overdue_3rd');
    }

    // Check final_warning
    if (daysOverdue >= config.default_final_warning_days && !existingReminderTypes.has('final_warning')) {
      remindersToSchedule.push('final_warning');
    }
  }

  // Schedule all missing reminders
  for (const reminderType of remindersToSchedule) {
    const scheduledDate = calculateScheduledDate(dueDate, reminderType, config);
    await scheduleReminder(invoice, reminderType, scheduledDate);
  }
}

/**
 * Main scheduler function - processes all invoices and schedules reminders
 */
export async function runReminderScheduler(): Promise<void> {
  console.log('🔄 Starting reminder scheduler...');

  const startTime = Date.now();
  let processedCount = 0;
  let scheduledCount = 0;
  let errorCount = 0;

  try {
    // Get all invoices that need reminders
    const invoices = await getInvoicesNeedingReminders();
    console.log(`📋 Found ${invoices.length} invoices to process`);

    // Group invoices by tenant for efficient config loading
    const invoicesByTenant = new Map<number, Invoice[]>();
    for (const invoice of invoices) {
      if (!invoicesByTenant.has(invoice.tenant_id)) {
        invoicesByTenant.set(invoice.tenant_id, []);
      }
      invoicesByTenant.get(invoice.tenant_id)!.push(invoice);
    }

    // Process each tenant's invoices
    for (const [tenantId, tenantInvoices] of invoicesByTenant) {
      try {
        // Get tenant config
        const config = await getTenantReminderConfig(tenantId);

        // Skip if reminders are disabled for this tenant
        if (!config.reminders_enabled) {
          console.log(`⏭️  Skipping tenant ${tenantId} - reminders disabled`);
          continue;
        }

        console.log(`\n📊 Processing ${tenantInvoices.length} invoices for tenant ${tenantId}`);

        // Process each invoice
        for (const invoice of tenantInvoices) {
          try {
            const beforeCount = await query<{ count: number }>(`
              SELECT COUNT(*) as count FROM tenant_invoice_reminders WHERE invoice_id = $1
            `, [invoice.invoice_id]);

            await processInvoice(invoice, config);

            const afterCount = await query<{ count: number }>(`
              SELECT COUNT(*) as count FROM tenant_invoice_reminders WHERE invoice_id = $1
            `, [invoice.invoice_id]);

            const newReminders = afterCount[0].count - beforeCount[0].count;
            if (newReminders > 0) {
              scheduledCount += newReminders;
            }

            processedCount++;
          } catch (error) {
            console.error(`❌ Error processing invoice ${invoice.invoice_id}:`, error);
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing tenant ${tenantId}:`, error);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Reminder scheduler completed in ${duration}ms`);
    console.log(`   📊 Processed: ${processedCount} invoices`);
    console.log(`   📅 Scheduled: ${scheduledCount} new reminders`);
    console.log(`   ❌ Errors: ${errorCount}`);

  } catch (error) {
    console.error('❌ Reminder scheduler failed:', error);
    throw error;
  }
}

/**
 * Run the scheduler on a schedule (can be called by cron job or manual trigger)
 */
export async function startScheduler(intervalHours: number = 24): Promise<void> {
  console.log(`🚀 Starting reminder scheduler with ${intervalHours}h interval`);

  // Run immediately on start
  await runReminderScheduler();

  // Then run on interval
  setInterval(async () => {
    await runReminderScheduler();
  }, intervalHours * 60 * 60 * 1000);
}
