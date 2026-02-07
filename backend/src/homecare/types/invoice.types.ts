/**
 * Invoice and Billing Types for Home Care Co-operative System
 *
 * Handles billing for care visits, client invoicing, and local authority billing.
 */

/**
 * Funding source types
 */
export type FundingSource = 'self_funded' | 'local_authority' | 'nhs_chc' | 'mixed';

/**
 * Invoice status
 */
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled'
  | 'disputed';

/**
 * Payment method
 */
export type PaymentMethod =
  | 'bank_transfer'
  | 'direct_debit'
  | 'card'
  | 'cheque'
  | 'cash'
  | 'bacs'
  | 'other';

/**
 * Rate type for billing
 */
export type RateType =
  | 'standard'      // Normal weekday rate
  | 'evening'       // Evening rate
  | 'weekend'       // Saturday/Sunday
  | 'bank_holiday'  // Bank holiday rate
  | 'night'         // Night care rate
  | 'live_in'       // Live-in care rate
  | 'specialist';   // Specialist care rate

/**
 * Billing rate configuration
 */
export interface BillingRate {
  id: number;
  tenantId: number;
  name: string;
  rateType: RateType;
  hourlyRate: number;        // In pence
  minimumCharge?: number;    // Minimum charge in pence
  fundingSource?: FundingSource;
  clientId?: number;         // For client-specific rates
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice entity
 */
export interface Invoice {
  id: number;
  tenantId: number;
  invoiceNumber: string;

  // Billing recipient
  clientId?: number;
  localAuthorityId?: number;
  billingName: string;
  billingAddress: string;
  billingEmail?: string;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Amounts (in pence)
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;

  // Dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;

  // Status
  status: InvoiceStatus;
  fundingSource: FundingSource;

  // Reference
  purchaseOrderNumber?: string;
  localAuthorityRef?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  tenantId: number;

  // Visit reference
  visitId?: number;
  visitDate?: Date;

  // Description
  description: string;
  careType?: string;

  // Quantity
  hours: number;
  minutes: number;

  // Rates (in pence)
  rateType: RateType;
  unitRate: number;
  amount: number;

  // Additional charges
  mileage?: number;
  mileageRate?: number;
  mileageAmount?: number;

  createdAt: Date;
}

/**
 * Payment record
 */
export interface Payment {
  id: number;
  tenantId: number;
  invoiceId: number;
  amount: number;           // In pence
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  reference?: string;
  notes?: string;
  receivedBy: number;
  createdAt: Date;
}

/**
 * Local authority billing configuration
 */
export interface LocalAuthorityConfig {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress: string;
  paymentTerms: number;      // Days
  invoiceFormat?: string;
  requiresPurchaseOrder: boolean;
  rates: {
    rateType: RateType;
    hourlyRate: number;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create invoice request
 */
export interface CreateInvoiceRequest {
  clientId?: number;
  localAuthorityId?: number;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  autoGenerateLines?: boolean;
}

/**
 * Add invoice line request
 */
export interface AddInvoiceLineRequest {
  visitId?: number;
  description: string;
  hours: number;
  minutes?: number;
  rateType: RateType;
  unitRate: number;
  mileage?: number;
  mileageRate?: number;
}

/**
 * Record payment request
 */
export interface RecordPaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
}

/**
 * Invoice list query parameters
 */
export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  fundingSource?: FundingSource;
  clientId?: number;
  localAuthorityId?: number;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  sortBy?: 'invoice_number' | 'issue_date' | 'due_date' | 'total_amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Billing summary for dashboard
 */
export interface BillingSummary {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
  invoicedThisMonth: number;
  byFundingSource: {
    source: FundingSource;
    outstanding: number;
    overdue: number;
  }[];
  recentPayments: Payment[];
  overdueInvoices: Invoice[];
}

/**
 * Client billing summary
 */
export interface ClientBillingSummary {
  clientId: number;
  clientName: string;
  fundingSource: FundingSource;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  lastInvoiceDate?: Date;
  lastPaymentDate?: Date;
}

/**
 * Visit billing calculation
 */
export interface VisitBillingCalculation {
  visitId: number;
  visitDate: Date;
  clientId: number;
  duration: {
    hours: number;
    minutes: number;
  };
  rateType: RateType;
  hourlyRate: number;
  visitAmount: number;
  mileage?: number;
  mileageRate?: number;
  mileageAmount?: number;
  totalAmount: number;
}

/**
 * Batch invoice generation request
 */
export interface BatchInvoiceRequest {
  fundingSource: FundingSource;
  periodStart: string;
  periodEnd: string;
  clientIds?: number[];
  localAuthorityId?: number;
  groupBy?: 'client' | 'local_authority';
}

/**
 * Credit note
 */
export interface CreditNote {
  id: number;
  tenantId: number;
  creditNoteNumber: string;
  invoiceId: number;
  amount: number;
  reason: string;
  issuedBy: number;
  issuedDate: Date;
  createdAt: Date;
}
