import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../services/api';
import type { SplitPayment, SplitPaymentSummary, CreateSplitPaymentRequest, RecordSplitPaymentRequest, PaymentMethod } from '../../types/invoice.types';

interface Props {
  invoiceId: number;
  tenantId: number;
  invoiceAmount: number;
  onUpdate?: () => void;
}

/**
 * Split Payment Manager Component
 * Manages multiple provider splits for an invoice with individual payment tracking
 */
export const SplitPaymentManager: React.FC<Props> = ({ invoiceId, tenantId, invoiceAmount, onUpdate }) => {
  const [splits, setSplits] = useState<SplitPayment[]>([]);
  const [summary, setSummary] = useState<SplitPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add split form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSplit, setNewSplit] = useState<CreateSplitPaymentRequest>({
    provider_name: '',
    split_percentage: 0,
    notes: ''
  });

  // Record payment form state
  const [showPaymentForm, setShowPaymentForm] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState<Omit<RecordSplitPaymentRequest, 'split_payment_id'>>({
    payment_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    loadSplitPayments();
  }, [invoiceId, tenantId]);

  const loadSplitPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const [splitsData, summaryData] = await Promise.all([
        invoiceApi.getSplitPayments(tenantId, invoiceId),
        invoiceApi.getSplitPaymentSummary(tenantId, invoiceId)
      ]);

      setSplits(splitsData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load split payments'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await invoiceApi.createSplitPayment(tenantId, invoiceId, newSplit);
      setShowAddForm(false);
      setNewSplit({ provider_name: '', split_percentage: 0, notes: '' });
      await loadSplitPayments();
      onUpdate?.();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to add split payment'));
    }
  };

  const handleDeleteSplit = async (splitId: number) => {
    if (!confirm('Are you sure you want to delete this split payment?')) return;

    try {
      await invoiceApi.deleteSplitPayment(tenantId, invoiceId, splitId);
      await loadSplitPayments();
      onUpdate?.();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to delete split payment'));
    }
  };

  const handleRecordPayment = async (splitId: number) => {
    setError(null);

    try {
      await invoiceApi.recordSplitPayment(tenantId, invoiceId, splitId, {
        ...paymentData,
        split_payment_id: splitId
      });

      setShowPaymentForm(null);
      setPaymentData({
        payment_amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      await loadSplitPayments();
      onUpdate?.();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to record payment'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'badge-success';
      case 'partially_paid':
        return 'badge-warning';
      case 'overdue':
        return 'badge-danger';
      case 'unpaid':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  if (loading) {
    return <div className="loading-state">Loading split payments...</div>;
  }

  const remainingPercentage = 100 - (summary?.providers.reduce((sum, p) => sum + p.splitPercentage, 0) || 0);

  return (
    <div className="split-payment-manager">
      <div className="split-payment-header">
        <h3>Split Payment Tracking</h3>
        {summary && (
          <div className="split-summary-badges">
            <span className="badge badge-info">{summary.numProviders} Provider{summary.numProviders !== 1 ? 's' : ''}</span>
            <span className={`badge ${summary.allPaid ? 'badge-success' : 'badge-warning'}`}>
              {formatCurrency(summary.totalPaid)} / {formatCurrency(summary.totalSplitAmount)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Summary Card */}
      {summary && summary.numProviders > 0 && (
        <div className="split-summary-card">
          <div className="summary-grid">
            <div className="summary-item">
              <label>Total Split Amount</label>
              <div className="value">{formatCurrency(summary.totalSplitAmount)}</div>
            </div>
            <div className="summary-item">
              <label>Total Paid</label>
              <div className="value" style={{ color: '#388E3C' }}>{formatCurrency(summary.totalPaid)}</div>
            </div>
            <div className="summary-item">
              <label>Outstanding</label>
              <div className="value" style={{ color: summary.totalOutstanding > 0 ? '#F57C00' : '#388E3C' }}>
                {formatCurrency(summary.totalOutstanding)}
              </div>
            </div>
            <div className="summary-item">
              <label>Status</label>
              <div className="value">
                <span className={`badge ${summary.allPaid ? 'badge-success' : 'badge-warning'}`}>
                  {summary.allPaid ? 'All Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Payments List */}
      {splits.length > 0 && (
        <div className="splits-list">
          {splits.map((split) => (
            <div key={split.id} className="split-card">
              <div className="split-header">
                <div className="split-provider-info">
                  <h4>{split.providerName}</h4>
                  <span className={`badge ${getStatusClass(split.paymentStatus)}`}>
                    {split.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
                <button
                  className="btn-icon-danger"
                  onClick={() => handleDeleteSplit(split.id)}
                  title="Delete split"
                  disabled={split.payments.length > 0}
                >
                  ×
                </button>
              </div>

              <div className="split-details">
                <div className="detail-row">
                  <span>Split Percentage:</span>
                  <strong>{split.splitPercentage}%</strong>
                </div>
                <div className="detail-row">
                  <span>Split Amount:</span>
                  <strong>{formatCurrency(split.splitAmount)}</strong>
                </div>
                <div className="detail-row">
                  <span>Amount Paid:</span>
                  <strong style={{ color: '#388E3C' }}>{formatCurrency(split.amountPaid)}</strong>
                </div>
                <div className="detail-row">
                  <span>Outstanding:</span>
                  <strong style={{ color: split.amountOutstanding > 0 ? '#F57C00' : '#388E3C' }}>
                    {formatCurrency(split.amountOutstanding)}
                  </strong>
                </div>
              </div>

              {split.notes && (
                <div className="split-notes">
                  <small>{split.notes}</small>
                </div>
              )}

              {/* Payment Records */}
              {split.payments.length > 0 && (
                <div className="payment-records">
                  <strong>Payment History:</strong>
                  <ul>
                    {split.payments.map((payment) => (
                      <li key={payment.id}>
                        {formatCurrency(payment.paymentAmount)} - {new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                        ({payment.paymentMethod})
                        {payment.referenceNumber && <span> - Ref: {payment.referenceNumber}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Record Payment Form */}
              {showPaymentForm === split.id ? (
                <div className="payment-form">
                  <h5>Record Payment</h5>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        max={split.amountOutstanding}
                        value={paymentData.payment_amount}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_amount: parseFloat(e.target.value) })}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={paymentData.payment_date}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Method</label>
                      <select
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value as PaymentMethod })}
                        className="form-control"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="cash">Cash</option>
                        <option value="direct_debit">Direct Debit</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Reference Number</label>
                      <input
                        type="text"
                        value={paymentData.reference_number}
                        onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                      className="form-control"
                      rows={2}
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRecordPayment(split.id)}
                    >
                      Record Payment
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setShowPaymentForm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                split.amountOutstanding > 0 && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowPaymentForm(split.id)}
                  >
                    Record Payment
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Split Payment Form */}
      {showAddForm ? (
        <div className="add-split-form">
          <h4>Add Split Payment</h4>
          <form onSubmit={handleAddSplit}>
            <div className="form-group">
              <label>Provider Name *</label>
              <input
                type="text"
                value={newSplit.provider_name}
                onChange={(e) => setNewSplit({ ...newSplit, provider_name: e.target.value })}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Split Percentage * (Remaining: {remainingPercentage}%)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingPercentage}
                value={newSplit.split_percentage}
                onChange={(e) => setNewSplit({ ...newSplit, split_percentage: parseFloat(e.target.value) })}
                className="form-control"
                required
              />
              <small>Split Amount: {formatCurrency(invoiceAmount * (newSplit.split_percentage / 100))}</small>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={newSplit.notes}
                onChange={(e) => setNewSplit({ ...newSplit, notes: e.target.value })}
                className="form-control"
                rows={2}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Add Split
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSplit({ provider_name: '', split_percentage: 0, notes: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        remainingPercentage > 0 && (
          <button
            className="btn btn-outline btn-full-width"
            onClick={() => setShowAddForm(true)}
          >
            + Add Split Payment
          </button>
        )
      )}

      {splits.length === 0 && !showAddForm && (
        <div className="empty-state">
          <p>No split payments configured for this invoice.</p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            Configure Split Payments
          </button>
        </div>
      )}
    </div>
  );
};
