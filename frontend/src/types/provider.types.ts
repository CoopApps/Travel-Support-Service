/**
 * Provider Type Definitions
 */

export interface Provider {
  provider_id: number;
  tenant_id: number;
  name: string;
  type: 'Individual' | 'Local Authority' | 'Healthcare' | 'Care Organization';
  billing_day?: number;
  billing_frequency?: 'weekly' | 'fortnightly' | 'monthly';
  invoice_email?: string;
  cc_email?: string;
  auto_send?: boolean;
  payment_terms_days?: number;
  late_payment_fee_percentage?: number;
  send_reminders?: boolean;
  reminder_days_before_due?: number;
  reminder_days_after_due_1st?: number;
  reminder_days_after_due_2nd?: number;
  reminder_days_after_due_3rd?: number;
  contact_name?: string;
  contact_phone?: string;
  invoice_notes?: string;
  // Additional contact fields
  main_contact?: string;
  phone_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderDto {
  name: string;
  type: 'Individual' | 'Local Authority' | 'Healthcare' | 'Care Organization';
  billing_day?: number;
  billing_frequency?: 'weekly' | 'fortnightly' | 'monthly';
  invoice_email?: string;
  cc_email?: string;
  auto_send?: boolean;
  payment_terms_days?: number;
  late_payment_fee_percentage?: number;
  send_reminders?: boolean;
  reminder_days_before_due?: number;
  reminder_days_after_due_1st?: number;
  reminder_days_after_due_2nd?: number;
  reminder_days_after_due_3rd?: number;
  contact_name?: string;
  contact_phone?: string;
  invoice_notes?: string;
}

export interface UpdateProviderDto extends Partial<CreateProviderDto> {}

export interface ProviderStats {
  totalProviders: number;
  totalCustomers: number;
  totalWeeklyRevenue: number;
  totalMonthlyRevenue: number;
  largestProvider: string;
  averagePerProvider: number;
  selfPayCount: number;
}

export interface ProviderCustomerInfo {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  weeklyAmount: number;
  routeCount: number;
  schedule: Record<string, any>;
  splitPayment: boolean;
  splitPercentage?: number;
}

export interface ProviderData {
  customers: ProviderCustomerInfo[];
  weeklyAmount: number;
  totalRoutes: number;
  type: 'single' | 'split';
}

export interface ProvidersStatsResponse {
  stats: ProviderStats;
  providers: Record<string, ProviderData>;
  timestamp: string;
}

export interface RouteDistribution {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface ProviderDetailsSummary {
  totalCustomers: number;
  totalRoutes: number;
  weeklyAmount: number;
  monthlyEstimate: number;
  annualProjection: number;
  averagePerCustomer: number;
}

export interface ProviderDetailsResponse {
  providerName: string;
  summary: ProviderDetailsSummary;
  routeDistribution: RouteDistribution;
  customers: ProviderCustomerInfo[];
  timestamp: string;
}

export interface InvoiceCustomer {
  name: string;
  address?: string;
  routeCount: number;
  weeklyAmount: number;
}

export interface InvoiceTotals {
  totalCustomers: number;
  totalRoutes: number;
  totalAmount: number;
}

export interface ProviderInvoiceData {
  providerName: string;
  invoiceDate: string;
  invoiceNumber: string;
  servicePeriod: string;
  customers: InvoiceCustomer[];
  totals: InvoiceTotals;
}

// Alias for ProviderDetailsResponse
export type ProviderDetails = ProviderDetailsResponse;
