/**
 * Email Templates for Invoice Reminders
 *
 * Professional HTML email templates for different reminder types:
 * - Pre-due: Friendly reminder before invoice due date
 * - Overdue 1st: First overdue notice (polite)
 * - Overdue 2nd: Second overdue notice (firm)
 * - Overdue 3rd: Third overdue notice (urgent)
 * - Final Warning: Final notice before escalation
 */

export interface InvoiceEmailData {
  invoiceNumber: string;
  customerName: string;
  companyName: string;
  dueDate: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  invoiceDate: string;
  daysOverdue?: number;
  paymentLink?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Base email HTML structure with styling
 */
function getEmailWrapper(content: string, companyName: string, companyLogo?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #2563eb;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header img {
      max-width: 200px;
      height: auto;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .invoice-details {
      background-color: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .invoice-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .invoice-details td {
      padding: 8px 0;
    }
    .invoice-details .label {
      font-weight: 600;
      color: #64748b;
      width: 40%;
    }
    .invoice-details .value {
      color: #1e293b;
    }
    .amount-due {
      font-size: 28px;
      font-weight: 700;
      color: #dc2626;
      text-align: center;
      padding: 20px;
      background-color: #fef2f2;
      border-radius: 8px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .alert {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert.urgent {
      background-color: #fee2e2;
      border-left-color: #dc2626;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}">` : ''}
      <h1>${companyName}</h1>
    </div>
    ${content}
    <div class="footer">
      <p>This is an automated reminder from ${companyName}</p>
      <p>If you have already made this payment, please disregard this notice.</p>
      <p>For questions, please contact our accounts team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Pre-Due Date Reminder (7 days before due)
 * Friendly reminder that payment is coming due soon
 */
export function generatePreDueTemplate(data: InvoiceEmailData, companyName: string, companyLogo?: string): EmailTemplate {
  const content = `
    <div class="content">
      <h2 style="color: #1e293b; margin-top: 0;">Payment Reminder</h2>
      <p>Dear ${data.customerName},</p>
      <p>This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> will be due soon.</p>

      <div class="invoice-details">
        <table>
          <tr>
            <td class="label">Invoice Number:</td>
            <td class="value">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Invoice Date:</td>
            <td class="value">${data.invoiceDate}</td>
          </tr>
          <tr>
            <td class="label">Due Date:</td>
            <td class="value"><strong>${data.dueDate}</strong></td>
          </tr>
          <tr>
            <td class="label">Total Amount:</td>
            <td class="value">${data.totalAmount}</td>
          </tr>
          ${data.amountPaid !== '$0.00' ? `
          <tr>
            <td class="label">Amount Paid:</td>
            <td class="value">${data.amountPaid}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">Amount Due:</td>
            <td class="value"><strong>${data.amountDue}</strong></td>
          </tr>
        </table>
      </div>

      <p>To avoid any late fees or service interruptions, please ensure payment is received by the due date.</p>

      ${data.paymentLink ? `
      <div style="text-align: center;">
        <a href="${data.paymentLink}" class="button">Make Payment</a>
      </div>
      ` : ''}

      <p>Thank you for your prompt attention to this matter.</p>
      <p>Best regards,<br>${companyName} Accounts Team</p>
    </div>
  `;

  const text = `
Payment Reminder

Dear ${data.customerName},

This is a friendly reminder that invoice ${data.invoiceNumber} will be due soon.

Invoice Number: ${data.invoiceNumber}
Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}
Amount Due: ${data.amountDue}

To avoid any late fees or service interruptions, please ensure payment is received by the due date.

${data.paymentLink ? `Make payment: ${data.paymentLink}` : ''}

Thank you for your prompt attention to this matter.

Best regards,
${companyName} Accounts Team
  `.trim();

  return {
    subject: `Payment Reminder: Invoice ${data.invoiceNumber} Due ${data.dueDate}`,
    html: getEmailWrapper(content, companyName, companyLogo),
    text
  };
}

/**
 * First Overdue Notice (7 days after due date)
 * Polite notice that payment is overdue
 */
export function generateFirstOverdueTemplate(data: InvoiceEmailData, companyName: string, companyLogo?: string): EmailTemplate {
  const content = `
    <div class="content">
      <h2 style="color: #dc2626; margin-top: 0;">Payment Overdue Notice</h2>
      <p>Dear ${data.customerName},</p>
      <p>Our records indicate that invoice <strong>${data.invoiceNumber}</strong> is now ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue.</p>

      <div class="amount-due">
        Amount Due: ${data.amountDue}
      </div>

      <div class="invoice-details">
        <table>
          <tr>
            <td class="label">Invoice Number:</td>
            <td class="value">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Original Due Date:</td>
            <td class="value">${data.dueDate}</td>
          </tr>
          <tr>
            <td class="label">Days Overdue:</td>
            <td class="value"><strong style="color: #dc2626;">${data.daysOverdue} days</strong></td>
          </tr>
          <tr>
            <td class="label">Total Amount:</td>
            <td class="value">${data.totalAmount}</td>
          </tr>
          ${data.amountPaid !== '$0.00' ? `
          <tr>
            <td class="label">Amount Paid:</td>
            <td class="value">${data.amountPaid}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p>If you have already sent payment, please disregard this notice. Otherwise, please arrange payment at your earliest convenience to avoid any late fees or service disruptions.</p>

      ${data.paymentLink ? `
      <div style="text-align: center;">
        <a href="${data.paymentLink}" class="button">Pay Now</a>
      </div>
      ` : ''}

      <p>If you are experiencing difficulties making this payment, please contact us to discuss payment arrangements.</p>
      <p>Best regards,<br>${companyName} Accounts Team</p>
    </div>
  `;

  const text = `
Payment Overdue Notice

Dear ${data.customerName},

Our records indicate that invoice ${data.invoiceNumber} is now ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} overdue.

AMOUNT DUE: ${data.amountDue}

Invoice Number: ${data.invoiceNumber}
Original Due Date: ${data.dueDate}
Days Overdue: ${data.daysOverdue} days

If you have already sent payment, please disregard this notice. Otherwise, please arrange payment at your earliest convenience.

${data.paymentLink ? `Pay now: ${data.paymentLink}` : ''}

If you are experiencing difficulties making this payment, please contact us to discuss payment arrangements.

Best regards,
${companyName} Accounts Team
  `.trim();

  return {
    subject: `OVERDUE: Invoice ${data.invoiceNumber} - Payment Required`,
    html: getEmailWrapper(content, companyName, companyLogo),
    text
  };
}

/**
 * Second Overdue Notice (14 days after due date)
 * Firm reminder with more urgency
 */
export function generateSecondOverdueTemplate(data: InvoiceEmailData, companyName: string, companyLogo?: string): EmailTemplate {
  const content = `
    <div class="content">
      <h2 style="color: #dc2626; margin-top: 0;">Second Overdue Notice</h2>

      <div class="alert">
        <strong>URGENT:</strong> This invoice is significantly overdue and requires immediate attention.
      </div>

      <p>Dear ${data.customerName},</p>
      <p>Despite our previous reminder, invoice <strong>${data.invoiceNumber}</strong> remains unpaid and is now <strong>${data.daysOverdue} days overdue</strong>.</p>

      <div class="amount-due">
        AMOUNT DUE: ${data.amountDue}
      </div>

      <div class="invoice-details">
        <table>
          <tr>
            <td class="label">Invoice Number:</td>
            <td class="value">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Original Due Date:</td>
            <td class="value">${data.dueDate}</td>
          </tr>
          <tr>
            <td class="label">Days Overdue:</td>
            <td class="value"><strong style="color: #dc2626; font-size: 18px;">${data.daysOverdue} days</strong></td>
          </tr>
        </table>
      </div>

      <p><strong>Immediate payment is required to avoid:</strong></p>
      <ul>
        <li>Late payment fees</li>
        <li>Suspension of services</li>
        <li>Referral to collections</li>
        <li>Impact on credit rating</li>
      </ul>

      ${data.paymentLink ? `
      <div style="text-align: center;">
        <a href="${data.paymentLink}" class="button">Pay Now</a>
      </div>
      ` : ''}

      <p><strong>If payment has been sent:</strong> Please contact us immediately with payment confirmation.</p>
      <p><strong>If you need to discuss payment arrangements:</strong> Contact us today to avoid further action.</p>

      <p>Regards,<br>${companyName} Accounts Team</p>
    </div>
  `;

  const text = `
SECOND OVERDUE NOTICE - URGENT

Dear ${data.customerName},

Despite our previous reminder, invoice ${data.invoiceNumber} remains unpaid and is now ${data.daysOverdue} days overdue.

AMOUNT DUE: ${data.amountDue}

Invoice Number: ${data.invoiceNumber}
Original Due Date: ${data.dueDate}
Days Overdue: ${data.daysOverdue} days

IMMEDIATE PAYMENT IS REQUIRED TO AVOID:
- Late payment fees
- Suspension of services
- Referral to collections
- Impact on credit rating

${data.paymentLink ? `Pay now: ${data.paymentLink}` : ''}

If payment has been sent, please contact us immediately with confirmation.
If you need to discuss payment arrangements, contact us today.

Regards,
${companyName} Accounts Team
  `.trim();

  return {
    subject: `URGENT: Second Overdue Notice - Invoice ${data.invoiceNumber}`,
    html: getEmailWrapper(content, companyName, companyLogo),
    text
  };
}

/**
 * Third Overdue Notice (21 days after due date)
 * Very firm with clear consequences
 */
export function generateThirdOverdueTemplate(data: InvoiceEmailData, companyName: string, companyLogo?: string): EmailTemplate {
  const content = `
    <div class="content">
      <h2 style="color: #dc2626; margin-top: 0;">Third Overdue Notice</h2>

      <div class="alert urgent">
        <strong>CRITICAL:</strong> This account is seriously overdue. Immediate action required to avoid escalation.
      </div>

      <p>Dear ${data.customerName},</p>
      <p>Invoice <strong>${data.invoiceNumber}</strong> is now <strong>${data.daysOverdue} days overdue</strong> and has not been paid despite multiple reminders.</p>

      <div class="amount-due">
        OUTSTANDING: ${data.amountDue}
      </div>

      <div class="invoice-details">
        <table>
          <tr>
            <td class="label">Invoice Number:</td>
            <td class="value">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Original Due Date:</td>
            <td class="value">${data.dueDate}</td>
          </tr>
          <tr>
            <td class="label">Days Overdue:</td>
            <td class="value"><strong style="color: #dc2626; font-size: 20px;">${data.daysOverdue} days</strong></td>
          </tr>
        </table>
      </div>

      <p><strong style="color: #dc2626;">This is your final opportunity to settle this account before we:</strong></p>
      <ul style="color: #dc2626; font-weight: 600;">
        <li>Suspend all services immediately</li>
        <li>Apply maximum late payment fees</li>
        <li>Refer the account to our collections department</li>
        <li>Report to credit bureaus</li>
        <li>Initiate legal proceedings</li>
      </ul>

      ${data.paymentLink ? `
      <div style="text-align: center;">
        <a href="${data.paymentLink}" class="button" style="background-color: #dc2626;">Pay Immediately</a>
      </div>
      ` : ''}

      <p><strong>You must take action within 48 hours:</strong></p>
      <ul>
        <li>Pay the outstanding amount in full, OR</li>
        <li>Contact us immediately to arrange payment</li>
      </ul>

      <p>Failure to respond will result in immediate escalation.</p>

      <p>Regards,<br>${companyName} Accounts Team</p>
    </div>
  `;

  const text = `
THIRD OVERDUE NOTICE - CRITICAL

Dear ${data.customerName},

Invoice ${data.invoiceNumber} is now ${data.daysOverdue} days overdue and has not been paid despite multiple reminders.

OUTSTANDING AMOUNT: ${data.amountDue}

Invoice Number: ${data.invoiceNumber}
Original Due Date: ${data.dueDate}
Days Overdue: ${data.daysOverdue} days

THIS IS YOUR FINAL OPPORTUNITY TO SETTLE THIS ACCOUNT BEFORE WE:
- Suspend all services immediately
- Apply maximum late payment fees
- Refer the account to collections
- Report to credit bureaus
- Initiate legal proceedings

${data.paymentLink ? `Pay immediately: ${data.paymentLink}` : ''}

YOU MUST TAKE ACTION WITHIN 48 HOURS:
- Pay the outstanding amount in full, OR
- Contact us immediately to arrange payment

Failure to respond will result in immediate escalation.

Regards,
${companyName} Accounts Team
  `.trim();

  return {
    subject: `CRITICAL: Third Overdue Notice - Immediate Action Required - Invoice ${data.invoiceNumber}`,
    html: getEmailWrapper(content, companyName, companyLogo),
    text
  };
}

/**
 * Final Warning (28+ days after due date)
 * Last notice before collections/legal action
 */
export function generateFinalWarningTemplate(data: InvoiceEmailData, companyName: string, companyLogo?: string): EmailTemplate {
  const content = `
    <div class="content">
      <h2 style="color: #7c2d12; margin-top: 0; background-color: #fef2f2; padding: 15px; border-left: 6px solid #dc2626;">
        FINAL NOTICE BEFORE LEGAL ACTION
      </h2>

      <div class="alert urgent">
        <strong>FINAL WARNING:</strong> This is the last notice before this account is handed to collections and legal proceedings commence.
      </div>

      <p>Dear ${data.customerName},</p>
      <p>We have made multiple attempts to contact you regarding the outstanding payment for invoice <strong>${data.invoiceNumber}</strong>, which is now <strong>${data.daysOverdue} days overdue</strong>.</p>

      <div class="amount-due" style="font-size: 32px;">
        FINAL DEMAND: ${data.amountDue}
      </div>

      <div class="invoice-details" style="border-left-color: #dc2626;">
        <table>
          <tr>
            <td class="label">Invoice Number:</td>
            <td class="value">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Original Due Date:</td>
            <td class="value">${data.dueDate}</td>
          </tr>
          <tr>
            <td class="label">Days Overdue:</td>
            <td class="value"><strong style="color: #dc2626; font-size: 24px;">${data.daysOverdue} days</strong></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fef2f2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="color: #7c2d12; margin-top: 0;">IMMEDIATE ACTION REQUIRED</h3>
        <p style="margin: 0;"><strong>Unless full payment is received within 7 days, we will:</strong></p>
        <ul style="color: #7c2d12; margin-bottom: 0;">
          <li><strong>Immediately suspend all services</strong></li>
          <li><strong>Refer this account to a collections agency</strong></li>
          <li><strong>Add collections fees to the outstanding balance</strong></li>
          <li><strong>Report to credit bureaus (affecting your credit score)</strong></li>
          <li><strong>Commence legal proceedings for debt recovery</strong></li>
          <li><strong>Pursue recovery of all legal costs and fees</strong></li>
        </ul>
      </div>

      ${data.paymentLink ? `
      <div style="text-align: center; background-color: #fee2e2; padding: 20px; border-radius: 8px;">
        <p style="font-size: 18px; font-weight: 600; color: #7c2d12; margin: 0 0 15px 0;">Pay now to avoid collections:</p>
        <a href="${data.paymentLink}" class="button" style="background-color: #dc2626; font-size: 18px;">MAKE PAYMENT NOW</a>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p><strong style="font-size: 16px;">This is your absolute final opportunity to resolve this matter.</strong></p>
        <p>Contact our accounts team immediately if:</p>
        <ul>
          <li>Payment has already been sent (provide proof)</li>
          <li>You dispute this invoice (provide details)</li>
          <li>You need to discuss immediate payment arrangements</li>
        </ul>
        <p style="color: #dc2626; font-weight: 600;">Failure to respond within 7 days will result in automatic referral to collections.</p>
      </div>

      <p>Regards,<br>${companyName} Accounts Team</p>
    </div>
  `;

  const text = `
═══════════════════════════════════════════════════════
   FINAL NOTICE BEFORE LEGAL ACTION
═══════════════════════════════════════════════════════

Dear ${data.customerName},

We have made multiple attempts to contact you regarding the outstanding payment for invoice ${data.invoiceNumber}, which is now ${data.daysOverdue} days overdue.

FINAL DEMAND: ${data.amountDue}

Invoice Number: ${data.invoiceNumber}
Original Due Date: ${data.dueDate}
Days Overdue: ${data.daysOverdue} days

═══════════════════════════════════════════════════════
   IMMEDIATE ACTION REQUIRED
═══════════════════════════════════════════════════════

UNLESS FULL PAYMENT IS RECEIVED WITHIN 7 DAYS, WE WILL:

✗ Immediately suspend all services
✗ Refer this account to a collections agency
✗ Add collections fees to the outstanding balance
✗ Report to credit bureaus (affecting your credit score)
✗ Commence legal proceedings for debt recovery
✗ Pursue recovery of all legal costs and fees

${data.paymentLink ? `PAY NOW TO AVOID COLLECTIONS: ${data.paymentLink}` : ''}

═══════════════════════════════════════════════════════

This is your absolute final opportunity to resolve this matter.

Contact our accounts team immediately if:
- Payment has already been sent (provide proof)
- You dispute this invoice (provide details)
- You need to discuss immediate payment arrangements

Failure to respond within 7 days will result in automatic referral to collections.

Regards,
${companyName} Accounts Team
  `.trim();

  return {
    subject: `FINAL NOTICE: Legal Action Pending - Invoice ${data.invoiceNumber} - ${data.amountDue} Outstanding`,
    html: getEmailWrapper(content, companyName, companyLogo),
    text
  };
}

/**
 * Main function to generate email template based on reminder type
 */
export function generateReminderEmail(
  reminderType: string,
  invoiceData: InvoiceEmailData,
  companyName: string,
  companyLogo?: string
): EmailTemplate {
  switch (reminderType) {
    case 'pre_due':
      return generatePreDueTemplate(invoiceData, companyName, companyLogo);
    case 'overdue_1st':
      return generateFirstOverdueTemplate(invoiceData, companyName, companyLogo);
    case 'overdue_2nd':
      return generateSecondOverdueTemplate(invoiceData, companyName, companyLogo);
    case 'overdue_3rd':
      return generateThirdOverdueTemplate(invoiceData, companyName, companyLogo);
    case 'final_warning':
      return generateFinalWarningTemplate(invoiceData, companyName, companyLogo);
    default:
      throw new Error(`Unknown reminder type: ${reminderType}`);
  }
}
