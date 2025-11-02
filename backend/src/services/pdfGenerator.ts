import puppeteer from 'puppeteer';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * PDF Invoice Generation Service
 * Generates professional PDF invoices using Puppeteer
 */

interface InvoiceData {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  email: string;
  paying_organisation: string;
  total_amount: number;
  amount_paid: number;
  invoice_status: string;
  period_start: string;
  period_end: string;
  description: string;
  is_split_payment: boolean;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TenantInfo {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  logo_url: string;
}

/**
 * Generate PDF invoice
 */
export async function generateInvoicePDF(
  tenantId: number,
  invoiceId: number
): Promise<Buffer | null> {
  try {
    logger.info('Generating PDF invoice', { tenantId, invoiceId });

    // Fetch invoice data
    const invoiceData = await fetchInvoiceData(tenantId, invoiceId);
    if (!invoiceData) {
      throw new Error('Invoice not found');
    }

    // Fetch line items
    const lineItems = await fetchLineItems(tenantId, invoiceId);

    // Fetch tenant info
    const tenantInfo = await fetchTenantInfo(tenantId);

    // Generate HTML
    const html = generateInvoiceHTML(invoiceData, lineItems, tenantInfo);

    // Convert HTML to PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();

    // Save PDF path to database
    const pdfFilename = `invoice-${invoiceData.invoice_number}.pdf`;
    await query(`
      UPDATE tenant_invoices
      SET pdf_generated = true, pdf_path = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND invoice_id = $3
    `, [pdfFilename, tenantId, invoiceId]);

    logger.info('PDF invoice generated successfully', {
      tenantId,
      invoiceId,
      invoiceNumber: invoiceData.invoice_number
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('Failed to generate PDF invoice', {
      tenantId,
      invoiceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Fetch invoice data from database
 */
async function fetchInvoiceData(
  tenantId: number,
  invoiceId: number
): Promise<InvoiceData | null> {
  const result = await query<InvoiceData>(`
    SELECT
      invoice_id, invoice_number, invoice_date, due_date,
      customer_name, email, paying_organisation,
      total_amount, amount_paid, invoice_status,
      period_start, period_end, description, is_split_payment
    FROM tenant_invoices
    WHERE tenant_id = $1 AND invoice_id = $2
  `, [tenantId, invoiceId]);

  return result[0] || null;
}

/**
 * Fetch line items
 */
async function fetchLineItems(tenantId: number, invoiceId: number): Promise<LineItem[]> {
  return await query<LineItem>(`
    SELECT description, quantity, unit_price, total_price
    FROM tenant_invoice_line_items
    WHERE tenant_id = $1 AND invoice_id = $2
    ORDER BY line_item_id ASC
  `, [tenantId, invoiceId]);
}

/**
 * Fetch tenant information
 */
async function fetchTenantInfo(tenantId: number): Promise<TenantInfo> {
  const result = await query<TenantInfo>(`
    SELECT
      company_name, email, phone,
      address, city, postcode, logo_url
    FROM tenants
    WHERE tenant_id = $1
  `, [tenantId]);

  return result[0] || {
    company_name: 'Travel Support',
    email: 'info@travelsupport.com',
    phone: '0114 123 4567',
    address: '',
    city: '',
    postcode: '',
    logo_url: ''
  };
}

/**
 * Generate HTML for invoice
 */
function generateInvoiceHTML(
  invoice: InvoiceData,
  lineItems: LineItem[],
  tenant: TenantInfo
): string {
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

  const subtotal = invoice.total_amount;
  const amountDue = invoice.total_amount - invoice.amount_paid;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1976D2;
    }

    .company-info {
      flex: 1;
    }

    .company-name {
      font-size: 24pt;
      font-weight: 700;
      color: #1976D2;
      margin-bottom: 8px;
    }

    .company-details {
      font-size: 10pt;
      color: #666;
      line-height: 1.4;
    }

    .invoice-title {
      text-align: right;
      flex: 1;
    }

    .invoice-title h1 {
      font-size: 32pt;
      color: #1976D2;
      margin-bottom: 5px;
    }

    .invoice-number {
      font-size: 12pt;
      color: #666;
    }

    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .details-section {
      flex: 1;
    }

    .details-section h3 {
      font-size: 10pt;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }

    .details-section p {
      font-size: 11pt;
      margin-bottom: 4px;
      color: #333;
    }

    .details-section strong {
      font-weight: 600;
    }

    .line-items {
      margin: 30px 0;
    }

    .line-items table {
      width: 100%;
      border-collapse: collapse;
    }

    .line-items thead {
      background: #f5f5f5;
    }

    .line-items th {
      text-align: left;
      padding: 12px 10px;
      font-size: 10pt;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #ddd;
    }

    .line-items th:last-child {
      text-align: right;
    }

    .line-items td {
      padding: 12px 10px;
      border-bottom: 1px solid #eee;
    }

    .line-items td:last-child {
      text-align: right;
      font-weight: 600;
    }

    .line-items tbody tr:hover {
      background: #fafafa;
    }

    .totals {
      margin-top: 30px;
      margin-left: auto;
      width: 300px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .totals-row.subtotal {
      font-size: 11pt;
    }

    .totals-row.total {
      font-size: 14pt;
      font-weight: 700;
      border-bottom: none;
      background: #e3f2fd;
      padding: 15px 10px;
      margin-top: 10px;
      color: #1976D2;
    }

    .totals-row.amount-due {
      font-size: 16pt;
      font-weight: 700;
      border-top: 3px solid #1976D2;
      border-bottom: none;
      padding: 15px 10px;
      margin-top: 5px;
    }

    .payment-info {
      margin-top: 50px;
      padding: 20px;
      background: #f9f9f9;
      border-left: 4px solid #1976D2;
    }

    .payment-info h3 {
      font-size: 12pt;
      margin-bottom: 10px;
      color: #1976D2;
    }

    .payment-info p {
      font-size: 10pt;
      line-height: 1.8;
      color: #555;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 9pt;
      color: #999;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-draft {
      background: #f5f5f5;
      color: #616161;
    }

    .status-sent {
      background: #e3f2fd;
      color: #1565c0;
    }

    .status-paid {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-overdue {
      background: #ffebee;
      color: #c62828;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${tenant.company_name}</div>
        <div class="company-details">
          ${tenant.address ? `${tenant.address}<br>` : ''}
          ${tenant.city ? `${tenant.city}, ` : ''}${tenant.postcode}<br>
          ${tenant.phone ? `Tel: ${tenant.phone}<br>` : ''}
          ${tenant.email ? `Email: ${tenant.email}` : ''}
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">${invoice.invoice_number}</div>
      </div>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="details-section">
        <h3>Bill To</h3>
        <p><strong>${invoice.paying_organisation}</strong></p>
        <p>Attn: ${invoice.customer_name}</p>
        ${invoice.email ? `<p>${invoice.email}</p>` : ''}
      </div>
      <div class="details-section" style="text-align: right;">
        <h3>Invoice Details</h3>
        <p><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
        <p><strong>Period:</strong> ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}</p>
        <p><span class="status-badge status-${invoice.invoice_status}">${invoice.invoice_status}</span></p>
      </div>
    </div>

    <!-- Description -->
    ${invoice.description ? `<p style="margin-bottom: 20px; font-size: 11pt; color: #666;">${invoice.description}</p>` : ''}

    <!-- Line Items -->
    <div class="line-items">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center; width: 80px;">Qty</th>
            <th style="text-align: right; width: 100px;">Unit Price</th>
            <th style="text-align: right; width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map(item => `
            <tr>
              <td>${item.description}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
              <td style="text-align: right;">${formatCurrency(item.total_price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row subtotal">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      ${invoice.amount_paid > 0 ? `
        <div class="totals-row">
          <span>Amount Paid:</span>
          <span>-${formatCurrency(invoice.amount_paid)}</span>
        </div>
      ` : ''}
      <div class="totals-row amount-due">
        <span>Amount Due:</span>
        <span>${formatCurrency(amountDue)}</span>
      </div>
    </div>

    <!-- Payment Information -->
    <div class="payment-info">
      <h3>Payment Information</h3>
      <p>
        <strong>Payment Terms:</strong> Net ${Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.invoice_date).getTime()) / (1000 * 60 * 60 * 24))} days<br>
        <strong>Payment Reference:</strong> ${invoice.invoice_number}<br>
        <br>
        Please ensure the invoice number is included with your payment.
        ${invoice.is_split_payment ? '<br><br><strong>Note:</strong> This invoice may be paid by multiple providers.' : ''}
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For queries regarding this invoice, please contact ${tenant.email || tenant.phone}</p>
    </div>
  </div>
</body>
</html>
  `;
}
