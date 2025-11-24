import React, { useState } from 'react';
import { invoiceApi } from '../../services/api';
import './BulkGenerateModal.css';

interface Props {
  tenantId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewData {
  period: {
    start_date: string;
    end_date: string;
  };
  defaultRate: number;
  invoiceCount: number;
  totalEstimated: number;
  preview: Array<{
    customerId: number;
    customerName: string;
    email: string;
    payingOrg: string;
    tripCount: number;
    estimatedAmount: number;
  }>;
}

/**
 * Bulk Invoice Generation Modal
 * Allows generating multiple invoices for a billing period
 */
export const BulkGenerateModal: React.FC<Props> = ({ tenantId, onClose, onSuccess }) => {
  const [step, setStep] = useState<'config' | 'preview' | 'generating'>('config');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [defaultRate, setDefaultRate] = useState('25.00');
  const [dueDays, setDueDays] = useState('30');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load preview data
   */
  const handlePreview = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await invoiceApi.bulkPreview(tenantId, {
        start_date: startDate,
        end_date: endDate,
        default_rate: parseFloat(defaultRate)
      });

      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load preview'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate invoices
   */
  const handleGenerate = async () => {
    if (!preview) return;

    setStep('generating');
    setLoading(true);
    setError(null);

    try {
      await invoiceApi.bulkGenerate(tenantId, {
        start_date: startDate,
        end_date: endDate,
        default_rate: parseFloat(defaultRate),
        due_days: parseInt(dueDays),
        description: description || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to generate invoices'));
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container bulk-generate-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            {step === 'config' && 'Bulk Invoice Generation'}
            {step === 'preview' && 'Preview Invoices'}
            {step === 'generating' && 'Generating Invoices...'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Step 1: Configuration */}
          {step === 'config' && (
            <div className="config-step">
              <p className="step-description">
                Generate invoices for all customers who had completed trips during the selected period.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="start_date">Billing Period Start *</label>
                  <input
                    type="date"
                    id="start_date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">Billing Period End *</label>
                  <input
                    type="date"
                    id="end_date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="default_rate">Default Rate per Trip (£) *</label>
                  <input
                    type="number"
                    id="default_rate"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="form-input"
                    step="0.01"
                    min="0"
                    required
                  />
                  <small className="form-hint">
                    Each trip will be charged at this rate
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="due_days">Payment Terms (Days) *</label>
                  <input
                    type="number"
                    id="due_days"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    className="form-input"
                    min="1"
                    required
                  />
                  <small className="form-hint">
                    Invoices will be due this many days after generation
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Invoice Description (Optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                  rows={2}
                  placeholder="Transport services for..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <div className="preview-step">
              <div className="preview-summary">
                <div className="summary-card">
                  <span className="summary-label">Billing Period</span>
                  <span className="summary-value">
                    {formatDate(preview.period.start_date)} - {formatDate(preview.period.end_date)}
                  </span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Invoices to Generate</span>
                  <span className="summary-value">{preview.invoiceCount}</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Total Estimated</span>
                  <span className="summary-value highlight">
                    {formatCurrency(preview.totalEstimated)}
                  </span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Rate per Trip</span>
                  <span className="summary-value">{formatCurrency(preview.defaultRate)}</span>
                </div>
              </div>

              <div className="preview-list">
                <h3>Invoice Preview</h3>
                <div className="preview-table">
                  <div className="preview-table-header">
                    <div className="preview-col-customer">Customer</div>
                    <div className="preview-col-paying">Paying Org</div>
                    <div className="preview-col-trips">Trips</div>
                    <div className="preview-col-amount">Amount</div>
                  </div>
                  <div className="preview-table-body">
                    {preview.preview.map((item) => (
                      <div key={item.customerId} className="preview-row">
                        <div className="preview-col-customer">
                          <strong>{item.customerName}</strong>
                          <small>{item.email}</small>
                        </div>
                        <div className="preview-col-paying">{item.payingOrg}</div>
                        <div className="preview-col-trips">{item.tripCount}</div>
                        <div className="preview-col-amount">
                          {formatCurrency(item.estimatedAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {preview.invoiceCount === 0 && (
                <div className="info-message">
                  No customers with completed trips found for the selected period.
                </div>
              )}
            </div>
          )}

          {/* Generating State */}
          {step === 'generating' && (
            <div className="generating-step">
              <div className="loading-spinner"></div>
              <p>Generating {preview?.invoiceCount} invoices...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step === 'config' && (
            <>
              <button className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={loading || !startDate || !endDate}
              >
                {loading ? 'Loading...' : 'Preview Invoices'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button className="btn btn-outline" onClick={() => setStep('config')}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading || !preview || preview.invoiceCount === 0}
              >
                Generate {preview?.invoiceCount} Invoice{preview?.invoiceCount !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
