/**
 * Invoice System Type Definitions
 * Complete type definitions for the invoice management system
 */

// ============================================================================
// INVOICE ENUMS
// ============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'standard' | 'provider' | 'split';
export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'direct_debit' | 'cheque' | 'other';
export type EmailDeliveryStatus = 'sent' | 'failed' | 'bounced' | 'pending';
export type ReminderType = 'pre_due' | 'overdue_1st' | 'overdue_2nd' | 'overdue_3rd' | 'final_warning';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type EmailTemplateType = 'invoice' | 'reminder' | 'overdue' | 'final_warning' | 'payment_received';
export type AlertType = 'overdue' | 'payment_received' | 'reminder_sent' | 'provider_unpaid' | 'customer_partial_paid';
export type TargetUserType = 'admin' | 'customer' | 'driver';
export type BillingFrequency = 'weekly' | 'fortnightly' | 'monthly';

// ============================================================================
// INVOICE INTERFACES
// ============================================================================

export interface Invoice {
    invoice_id: number;
    tenant_id: number;
    invoice_number: string;

    // Customer/Provider info
    customer_id?: number | null;
    customer_name: string;
    paying_org: string;

    // Dates
    invoice_date: Date;
    due_date: Date;
    period_start: Date;
    period_end: Date;

    // Amounts
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    amount_paid: number;

    // Status and type
    invoice_status: InvoiceStatus;
    invoice_type: InvoiceType;

    // Split payment
    is_split_payment: boolean;
    split_provider?: string | null;
    split_percentage?: number | null;

    // Email tracking
    email_sent: boolean;
    email_sent_at?: Date | null;

    // Notes and metadata
    notes?: string | null;
    archived: boolean;
    archived_at?: Date | null;
    archived_by?: number | null;

    // Audit
    created_by?: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface InvoiceLineItem {
    line_item_id: number;
    tenant_id: number;
    invoice_id: number;

    line_number: number;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;

    service_date?: Date | null;
    trip_id?: number | null;

    // Split payment details
    provider_name?: string | null;
    provider_percentage?: number | null;

    created_at: Date;
}

export interface PaymentRecord {
    payment_id: number;
    tenant_id: number;
    invoice_id: number;

    payment_amount: number;
    payment_date: Date;
    payment_method: PaymentMethod;
    reference_number?: string | null;

    notes?: string | null;

    processed_by?: number | null;
    created_at: Date;
}

export interface InvoiceEmail {
    email_id: number;
    tenant_id: number;
    invoice_id?: number | null;

    recipient_email: string;
    cc_emails?: string | null;
    subject: string;
    body?: string | null;

    delivery_status: EmailDeliveryStatus;
    error_message?: string | null;
    email_type?: string | null;

    sent_at: Date;
}

export interface InvoiceReminder {
    reminder_id: number;
    tenant_id: number;
    invoice_id: number;

    reminder_type: ReminderType;
    scheduled_date: Date;

    status: ReminderStatus;
    sent_at?: Date | null;
    error_message?: string | null;

    created_at: Date;
}

export interface EmailTemplate {
    id: number;
    tenant_id: number;

    name: string;
    subject: string;
    body_html?: string | null;
    body_text?: string | null;

    template_type?: EmailTemplateType | null;
    is_active: boolean;

    created_at: Date;
    updated_at: Date;
}

export interface InvoiceSettings {
    tenant_id: number;

    default_payment_terms_days: number;
    invoice_prefix: string;

    auto_generate_enabled: boolean;
    auto_send_enabled: boolean;

    organization_invoice_days: Record<string, number>; // { "Provider Name": day_of_month }

    // Cancellation policies
    cancellation_charge_hours: number;
    partial_cancellation_hours: number;
    partial_cancellation_percentage: number;
    no_show_charge_percentage: number;

    updated_at: Date;
}

export interface InvoiceAlert {
    alert_id: number;
    tenant_id: number;
    invoice_id: number;

    alert_type: AlertType;
    alert_message: string;

    target_user_type?: TargetUserType | null;
    target_user_id?: number | null;

    is_read: boolean;
    read_at?: Date | null;

    created_at: Date;
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateInvoiceRequest {
    type: 'individual' | 'provider';
    customer_id?: number;
    provider?: string;
    period_start: string;
    period_end: string;
    due_date: string;
    is_split_payment?: boolean;
    use_trip_records?: boolean;
    notes?: string;
}

export interface CreateSplitInvoiceRequest {
    customer_id: number;
    period_start: string;
    period_end: string;
    due_date: string;
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

export interface BulkUpdateInvoicesRequest {
    invoice_ids: number[];
    status: InvoiceStatus;
}

export interface BulkEmailInvoicesRequest {
    invoice_ids: number[];
    subject: string;
    message: string;
    attach_pdf?: boolean;
    template_id?: number;
}

export interface BatchGenerateInvoicesRequest {
    period_start: string;
    period_end: string;
    due_date: string;
    provider_filter?: string;
}

export interface ExportInvoicesRequest {
    format: 'csv' | 'pdf' | 'excel';
    filters?: {
        status?: InvoiceStatus;
        type?: InvoiceType;
        provider?: string;
        start_date?: string;
        end_date?: string;
    };
    invoice_ids?: number[];
}

export interface InvoiceStatsResponse {
    totalInvoices: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    collectionRate: number;
    avgDaysToPay: number;
    splitPaymentInvoices: number;
}

export interface InvoiceDetailResponse extends Omit<Invoice, 'created_at' | 'updated_at' | 'invoice_date' | 'due_date' | 'period_start' | 'period_end'> {
    id: number;
    number: string;
    customerName: string;
    payingOrg: string;
    date: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    amountPaid: number;
    status: InvoiceStatus;
    type: InvoiceType;
    isSplitPayment: boolean;
    splitProvider?: string;
    splitPercentage?: number;
    notes?: string;
    items: InvoiceLineItemResponse[];
}

export interface InvoiceLineItemResponse {
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
    tripStatus?: string;
    actualPickupTime?: string;
    actualDropoffTime?: string;
    cancellationReason?: string;
    cancellationNoticeHours?: number;
}

export interface InvoiceListResponse {
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

export interface CreateInvoiceResponse {
    message: string;
    invoice: {
        id: number;
        number: string;
        customerName: string;
        payingOrg: string;
        totalAmount: number;
        lineItemsCreated: number;
        basedOnTripRecords?: boolean;
        tripsIncluded?: number;
    };
}

export interface PaymentRecordResponse {
    message: string;
    newAmountPaid: number;
    newStatus: InvoiceStatus;
    fullyPaid: boolean;
}

// ============================================================================
// PROVIDER-SPECIFIC INVOICE SETTINGS (from tenant_providers table)
// ============================================================================

export interface ProviderInvoiceSettings {
    provider_id: number;
    tenant_id: number;
    name: string;
    billing_day: number;
    billing_frequency: BillingFrequency;
    invoice_email?: string | null;
    cc_email?: string | null;
    auto_send: boolean;
    payment_terms_days: number;
    late_payment_fee_percentage?: number | null;
    send_reminders: boolean;
    reminder_days_before_due?: number | null;
    reminder_days_after_due_1st?: number | null;
    reminder_days_after_due_2nd?: number | null;
    reminder_days_after_due_3rd?: number | null;
}

// ============================================================================
// SPLIT PAYMENT INTERFACES
// ============================================================================

export type SplitPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface InvoiceSplitPayment {
    split_payment_id: number;
    tenant_id: number;
    invoice_id: number;

    // Provider details
    provider_name: string;
    provider_id?: number | null;

    // Split details
    split_percentage: number; // 0-100
    split_amount: number;

    // Payment tracking for this provider's portion
    amount_paid: number;
    payment_status: SplitPaymentStatus;

    // Notes
    notes?: string | null;

    // Audit
    created_at: Date;
    updated_at: Date;
    created_by?: number | null;
}

export interface SplitPaymentRecord {
    split_payment_record_id: number;
    tenant_id: number;
    invoice_id: number;
    split_payment_id: number;

    // Payment details
    payment_amount: number;
    payment_date: Date;
    payment_method: PaymentMethod;
    reference_number?: string | null;

    // Provider information
    paid_by_provider: string;

    // Notes
    notes?: string | null;

    // Audit
    processed_by?: number | null;
    created_at: Date;
}

// ============================================================================
// SPLIT PAYMENT REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateSplitPaymentRequest {
    provider_name: string;
    provider_id?: number;
    split_percentage: number; // 0-100
    notes?: string;
}

export interface UpdateSplitPaymentRequest {
    provider_name?: string;
    split_percentage?: number;
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

export interface SplitPaymentResponse {
    id: number;
    providerName: string;
    providerId?: number;
    splitPercentage: number;
    splitAmount: number;
    amountPaid: number;
    amountOutstanding: number;
    paymentStatus: SplitPaymentStatus;
    notes?: string;
    payments: SplitPaymentRecordResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface SplitPaymentRecordResponse {
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
    providers: SplitPaymentResponse[];
}

export interface BulkCreateSplitPaymentsRequest {
    splits: Array<{
        provider_name: string;
        provider_id?: number;
        split_percentage: number;
    }>;
}

export interface ValidateSplitPaymentsRequest {
    splits: Array<{
        provider_name: string;
        split_percentage: number;
    }>;
}

export interface ValidateSplitPaymentsResponse {
    valid: boolean;
    totalPercentage: number;
    errors: string[];
}
