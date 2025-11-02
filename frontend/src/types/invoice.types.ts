/**
 * Frontend Invoice Type Definitions
 * Matching backend invoice system types
 */

// ============================================================================
// INVOICE ENUMS
// ============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'provider' | 'split';
export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'direct_debit' | 'cheque' | 'other';

// ============================================================================
// INVOICE INTERFACES
// ============================================================================

export interface InvoiceStats {
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  avgDaysToPay: number;
  splitPaymentInvoices: number;
}

export interface InvoiceListItem {
  id: number;
  number: string;
  customerName: string;
  payingOrg: string;
  date: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  amountPaid: number;
  status: InvoiceStatus;
  type: InvoiceType;
  isSplitPayment: boolean;
  splitProvider?: string;
  splitPercentage?: number;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: number;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceDate?: string;
  providerName?: string;
  providerPercentage?: number;
  tripId?: number;
}

export interface InvoiceDetail extends InvoiceListItem {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  items: InvoiceLineItem[];
}

export interface RecordPaymentRequest {
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus;
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

export interface InvoiceFilters {
  status?: InvoiceStatus | '';
  type?: InvoiceType | '';
  provider?: string;
  start_date?: string;
  end_date?: string;
  archived?: boolean;
  search?: string;
}

// ============================================================================
// SPLIT PAYMENT INTERFACES
// ============================================================================

export type SplitPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface SplitPayment {
  id: number;
  providerName: string;
  providerId?: number;
  splitPercentage: number;
  splitAmount: number;
  amountPaid: number;
  amountOutstanding: number;
  paymentStatus: SplitPaymentStatus;
  notes?: string;
  payments: SplitPaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface SplitPaymentRecord {
  id: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  paidByProvider: string;
  notes?: string;
  processedBy?: number;
  createdAt: string;
}

export interface SplitPaymentSummary {
  totalInvoiceAmount: number;
  totalSplitAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  numProviders: number;
  allPaid: boolean;
  providers: SplitPayment[];
}

export interface CreateSplitPaymentRequest {
  provider_name: string;
  provider_id?: number;
  split_percentage: number;
  notes?: string;
}

export interface RecordSplitPaymentRequest {
  split_payment_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}
