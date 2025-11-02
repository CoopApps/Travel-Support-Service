/**
 * Email Sending Service for Invoice Reminders
 *
 * Handles actual email delivery using nodemailer
 * Integrates with email templates and logs all sends
 */

import nodemailer from 'nodemailer';
import { query } from '../config/database';
import { generateReminderEmail, InvoiceEmailData } from './emailTemplates';
import { logger } from '../utils/logger';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Get email configuration from environment or tenant config
function getEmailConfig(): EmailConfig {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };
}

/**
 * Create nodemailer transporter
 */
function createTransporter() {
  const config = getEmailConfig();

  if (!config.auth.user || !config.auth.pass) {
    logger.warn('SMTP credentials not configured - emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: {
      rejectUnauthorized: false // For development - should be true in production
    }
  });
}

/**
 * Send a reminder email
 */
export async function sendReminderEmail(
  reminderId: number,
  tenantId: number,
  invoiceId: number,
  reminderType: string,
  recipientEmail: string,
  invoiceData: InvoiceEmailData,
  companyName: string,
  fromEmail?: string,
  fromName?: string,
  ccEmails?: string[],
  companyLogo?: string
): Promise<{ success: boolean; error?: string; providerResponse?: string }> {

  try {
    // Generate email content
    const emailTemplate = generateReminderEmail(
      reminderType,
      invoiceData,
      companyName,
      companyLogo
    );

    // Check if SMTP is configured
    const transporter = createTransporter();
    if (!transporter) {
      // Log but don't fail - allows system to work without email configured
      logger.warn('Email not sent - SMTP not configured', {
        reminderId,
        invoiceId,
        recipientEmail
      });

      await logReminderEmail(
        tenantId,
        invoiceId,
        reminderId,
        reminderType,
        'sent', // Mark as sent for development
        recipientEmail,
        ccEmails,
        false,
        'SMTP not configured - email simulation mode',
        null
      );

      return {
        success: false,
        error: 'SMTP not configured'
      };
    }

    // Send email
    const info = await transporter.sendMail({
      from: fromEmail && fromName ? `"${fromName}" <${fromEmail}>` : fromEmail || process.env.SMTP_USER,
      to: recipientEmail,
      cc: ccEmails?.join(', '),
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html
    });

    logger.info('Reminder email sent successfully', {
      reminderId,
      invoiceId,
      recipientEmail,
      messageId: info.messageId
    });

    // Log success
    await logReminderEmail(
      tenantId,
      invoiceId,
      reminderId,
      reminderType,
      'sent',
      recipientEmail,
      ccEmails,
      true,
      null,
      JSON.stringify({ messageId: info.messageId, response: info.response })
    );

    return {
      success: true,
      providerResponse: info.messageId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Failed to send reminder email', {
      reminderId,
      invoiceId,
      recipientEmail,
      error: errorMessage
    });

    // Log failure
    await logReminderEmail(
      tenantId,
      invoiceId,
      reminderId,
      reminderType,
      'failed',
      recipientEmail,
      ccEmails,
      false,
      errorMessage,
      null
    );

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Log reminder email attempt to database
 */
async function logReminderEmail(
  tenantId: number,
  invoiceId: number,
  reminderId: number,
  reminderType: string,
  eventType: string,
  recipientEmail: string,
  ccEmails?: string[],
  success?: boolean,
  errorMessage?: string | null,
  providerResponse?: string | null
): Promise<void> {
  try {
    await query(`
      INSERT INTO tenant_invoice_reminder_log (
        tenant_id,
        invoice_id,
        reminder_id,
        event_type,
        reminder_type,
        recipient_email,
        cc_emails,
        success,
        error_message,
        email_provider_response,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `, [
      tenantId,
      invoiceId,
      reminderId,
      eventType,
      reminderType,
      recipientEmail,
      ccEmails ? ccEmails.join(', ') : null,
      success,
      errorMessage,
      providerResponse
    ]);
  } catch (error) {
    logger.error('Failed to log reminder email', {
      reminderId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Send invoice email with PDF attachment
 */
export async function sendInvoiceEmail(
  tenantId: number,
  invoiceId: number,
  toEmail: string,
  ccEmail?: string,
  pdfBuffer?: Buffer
): Promise<boolean> {
  try {
    logger.info('Sending invoice email', {
      tenantId,
      invoiceId,
      toEmail
    });

    // Fetch invoice data
    const invoices = await query<{
      invoice_number: string;
      invoice_date: string;
      due_date: string;
      customer_name: string;
      paying_organisation: string;
      total_amount: number;
      amount_paid: number;
    }>(`
      SELECT
        invoice_number, invoice_date, due_date,
        customer_name, paying_organisation,
        total_amount, amount_paid
      FROM tenant_invoices
      WHERE tenant_id = $1 AND invoice_id = $2
    `, [tenantId, invoiceId]);

    if (invoices.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoices[0];

    // Fetch tenant info
    const tenants = await query<{
      company_name: string;
      email: string;
    }>(`
      SELECT company_name, email
      FROM tenants
      WHERE tenant_id = $1
    `, [tenantId]);

    const tenant = tenants[0] || {
      company_name: 'Travel Support',
      email: 'noreply@travelsupport.com'
    };

    // Create transporter
    const transporter = createTransporter();
    if (!transporter) {
      logger.warn('Email not sent - SMTP not configured');
      return false;
    }

    // Format data
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    const amountDue = invoice.total_amount - invoice.amount_paid;

    // Generate email content
    const subject = `Invoice ${invoice.invoice_number} from ${tenant.company_name}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976D2; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
    .amount-due { background: #e3f2fd; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 32px; font-weight: 700; color: #1976D2; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tenant.company_name}</h1>
    <p>New Invoice</p>
  </div>
  <div class="content">
    <p>Dear ${invoice.customer_name},</p>
    <p>Please find attached your invoice for transport services.</p>
    <div class="invoice-details">
      <div class="detail-row"><strong>Invoice Number:</strong> ${invoice.invoice_number}</div>
      <div class="detail-row"><strong>Invoice Date:</strong> ${formatDate(invoice.invoice_date)}</div>
      <div class="detail-row"><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</div>
      <div class="detail-row"><strong>Bill To:</strong> ${invoice.paying_organisation}</div>
    </div>
    <div class="amount-due">${formatCurrency(amountDue)}</div>
    <p>📎 <strong>PDF Invoice Attached</strong></p>
    <p>Please reference invoice number <strong>${invoice.invoice_number}</strong> with your payment.</p>
    <p>Thank you for your business!</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${tenant.company_name}</p>
  </div>
</body>
</html>
    `;

    // Send email
    const mailOptions: any = {
      from: `${tenant.company_name} <${tenant.email}>`,
      to: toEmail,
      subject,
      html,
      attachments: pdfBuffer ? [{
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    };

    if (ccEmail) {
      mailOptions.cc = ccEmail;
    }

    const info = await transporter.sendMail(mailOptions);

    logger.info('Invoice email sent successfully', {
      tenantId,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      toEmail,
      messageId: info.messageId
    });

    return true;
  } catch (error) {
    logger.error('Failed to send invoice email', {
      tenantId,
      invoiceId,
      toEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Process pending reminders and send emails
 * Should be called by a scheduled job
 */
export async function processPendingReminders(): Promise<void> {
  logger.info('Processing pending reminders for email sending');

  try {
    // Get all pending reminders that are scheduled for today or earlier
    const pendingReminders = await query<{
      reminder_id: number;
      tenant_id: number;
      invoice_id: number;
      reminder_type: string;
      scheduled_date: Date;
    }>(`
      SELECT
        reminder_id,
        tenant_id,
        invoice_id,
        reminder_type,
        scheduled_date
      FROM tenant_invoice_reminders
      WHERE status = 'pending'
      AND scheduled_date <= CURRENT_DATE
      ORDER BY scheduled_date, tenant_id, invoice_id
    `);

    logger.info(`Found ${pendingReminders.length} pending reminders to process`);

    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of pendingReminders) {
      try {
        // Get invoice details
        const invoices = await query<{
          invoice_number: string;
          customer_id: number;
          due_date: Date;
          total_amount: number;
          amount_paid: number;
          invoice_date: Date;
        }>(`
          SELECT
            invoice_number,
            customer_id,
            due_date,
            total_amount,
            amount_paid,
            invoice_date
          FROM tenant_invoices
          WHERE invoice_id = $1
          AND tenant_id = $2
        `, [reminder.invoice_id, reminder.tenant_id]);

        if (invoices.length === 0) {
          logger.warn('Invoice not found for reminder', {
            reminderId: reminder.reminder_id,
            invoiceId: reminder.invoice_id
          });
          continue;
        }

        const invoice = invoices[0];

        // Get customer details
        const customers = await query<{
          name: string;
          email: string;
        }>(`
          SELECT name, email
          FROM tenant_customers
          WHERE customer_id = $1
          AND tenant_id = $2
        `, [invoice.customer_id, reminder.tenant_id]);

        if (customers.length === 0 || !customers[0].email) {
          logger.warn('Customer not found or has no email for reminder', {
            reminderId: reminder.reminder_id,
            customerId: invoice.customer_id
          });

          // Mark reminder as failed
          await query(`
            UPDATE tenant_invoice_reminders
            SET status = 'failed', error_message = 'Customer email not found'
            WHERE reminder_id = $1
          `, [reminder.reminder_id]);

          failedCount++;
          continue;
        }

        const customer = customers[0];

        // Get tenant config
        const configs = await query<{
          from_email: string;
          from_name: string;
          include_company_logo: boolean;
          include_payment_link: boolean;
        }>(`
          SELECT
            from_email,
            from_name,
            include_company_logo,
            include_payment_link
          FROM tenant_invoice_reminder_config
          WHERE tenant_id = $1
        `, [reminder.tenant_id]);

        const config = configs[0] || {
          from_email: undefined,
          from_name: undefined,
          include_company_logo: false,
          include_payment_link: false
        };

        // Get tenant name
        const tenants = await query<{ company_name: string }>(`
          SELECT company_name
          FROM tenants
          WHERE tenant_id = $1
        `, [reminder.tenant_id]);

        const companyName = tenants[0]?.company_name || 'Travel Support';

        // Calculate days overdue
        const daysOverdue = reminder.reminder_type !== 'pre_due'
          ? Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        // Prepare invoice data for email
        const invoiceData: InvoiceEmailData = {
          invoiceNumber: invoice.invoice_number,
          customerName: customer.name,
          companyName,
          dueDate: new Date(invoice.due_date).toLocaleDateString(),
          totalAmount: `$${invoice.total_amount.toFixed(2)}`,
          amountPaid: `$${invoice.amount_paid.toFixed(2)}`,
          amountDue: `$${(invoice.total_amount - invoice.amount_paid).toFixed(2)}`,
          invoiceDate: new Date(invoice.invoice_date).toLocaleDateString(),
          daysOverdue,
          paymentLink: config.include_payment_link ? `https://example.com/pay/${invoice.invoice_number}` : undefined
        };

        // Send the email
        const result = await sendReminderEmail(
          reminder.reminder_id,
          reminder.tenant_id,
          reminder.invoice_id,
          reminder.reminder_type,
          customer.email,
          invoiceData,
          companyName,
          config.from_email,
          config.from_name,
          undefined, // cc emails
          config.include_company_logo ? 'https://example.com/logo.png' : undefined
        );

        // Update reminder status
        if (result.success) {
          await query(`
            UPDATE tenant_invoice_reminders
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP
            WHERE reminder_id = $1
          `, [reminder.reminder_id]);
          sentCount++;
        } else {
          await query(`
            UPDATE tenant_invoice_reminders
            SET status = 'failed', error_message = $2
            WHERE reminder_id = $1
          `, [reminder.reminder_id, result.error]);
          failedCount++;
        }

      } catch (error) {
        logger.error('Error processing reminder', {
          reminderId: reminder.reminder_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Mark as failed
        await query(`
          UPDATE tenant_invoice_reminders
          SET status = 'failed', error_message = $2
          WHERE reminder_id = $1
        `, [reminder.reminder_id, error instanceof Error ? error.message : 'Unknown error']);

        failedCount++;
      }
    }

    logger.info('Reminder processing completed', {
      total: pendingReminders.length,
      sent: sentCount,
      failed: failedCount
    });

  } catch (error) {
    logger.error('Failed to process pending reminders', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
