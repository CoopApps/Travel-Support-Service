import React, { useState } from 'react';
import { invoiceApi } from '../../services/api';
import type { InvoiceListItem, PaymentMethod } from '../../types/invoice.types';

interface Props {
  invoice: InvoiceListItem;
  tenantId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Record Payment Modal
 * Form for recording payments on invoices
 */
export const RecordPaymentModal: React.FC<Props> = ({ invoice, tenantId, onClose, onSuccess }) => {
  const balance = invoice.amount - invoice.amountPaid;

  const [formData, setFormData] = useState({
    amount: balance,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer' as PaymentMethod,
    reference_number: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'direct_debit', label: 'Direct Debit' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (formData.amount > balance) {
      setError(`Payment amount cannot exceed the balance (${formatCurrency(balance)})`);
      return;
    }

    setSubmitting(true);

    try {
      await invoiceApi.recordPayment(tenantId, invoice.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payment');
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Invoice Info */}
          <div className="invoice-info-box">
            <div className="info-row">
              <span className="info-label">Invoice:</span>
              <span className="info-value"><strong>{invoice.number}</strong></span>
            </div>
            <div className="info-row">
              <span className="info-label">Customer:</span>
              <span className="info-value">{invoice.customerName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Amount:</span>
              <span className="info-value">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Already Paid:</span>
              <span className="info-value" style={{ color: '#388E3C' }}>
                {formatCurrency(invoice.amountPaid)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Outstanding Balance:</span>
              <span className="info-value" style={{ color: '#F57C00' }}>
                <strong>{formatCurrency(balance)}</strong>
              </span>
            </div>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Payment Amount */}
            <div className="form-group">
              <label htmlFor="amount" className="required">Payment Amount</label>
              <input
                type="number"
                id="amount"
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                min="0.01"
                step="0.01"
                max={balance}
                required
              />
              <small className="form-hint">
                Maximum: {formatCurrency(balance)}
              </small>
            </div>

            {/* Payment Date */}
            <div className="form-group">
              <label htmlFor="payment_date" className="required">Payment Date</label>
              <input
                type="date"
                id="payment_date"
                className="form-input"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label htmlFor="payment_method" className="required">Payment Method</label>
              <select
                id="payment_method"
                className="form-select"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                required
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Number */}
            <div className="form-group">
              <label htmlFor="reference_number">Reference Number</label>
              <input
                type="text"
                id="reference_number"
                className="form-input"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Transaction reference, cheque number, etc."
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="form-textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional payment notes..."
              />
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
