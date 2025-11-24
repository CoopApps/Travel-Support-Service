import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../services/api';
import type { InvoiceDetail } from '../../types/invoice.types';
import { SplitPaymentManager } from './SplitPaymentManager';
import './SplitPaymentManager.css';

interface Props {
  invoiceId: number;
  tenantId: number;
  onClose: () => void;
}

/**
 * Invoice Detail Modal
 * Displays full invoice details including line items
 */
export const InvoiceDetailModal: React.FC<Props> = ({ invoiceId, tenantId, onClose }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId, tenantId]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await invoiceApi.getInvoice(tenantId, invoiceId);
      setInvoice(data);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load invoice details'));
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
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'status-badge-large status-paid';
      case 'sent':
        return 'status-badge-large status-sent';
      case 'overdue':
        return 'status-badge-large status-overdue';
      case 'draft':
        return 'status-badge-large status-draft';
      case 'cancelled':
        return 'status-badge-large status-cancelled';
      default:
        return 'status-badge-large';
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <div className="loading-state">Loading invoice details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Error</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="error-message">{error || 'Invoice not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Invoice Details</h2>
            <p className="invoice-number">{invoice.number}</p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="invoice-detail-container">
            {/* Header Section */}
            <div className="invoice-header-section">
              <div className="invoice-header-left">
                <div className="detail-group">
                  <label>Customer</label>
                  <div className="detail-value"><strong>{invoice.customerName}</strong></div>
                </div>
                <div className="detail-group">
                  <label>Paying Organization</label>
                  <div className="detail-value">{invoice.payingOrg}</div>
                </div>
                {invoice.isSplitPayment && invoice.splitProvider && (
                  <div className="detail-group">
                    <label>Split Payment</label>
                    <div className="detail-value">
                      {invoice.splitProvider} ({invoice.splitPercentage}%)
                    </div>
                  </div>
                )}
              </div>

              <div className="invoice-header-right">
                <div className="detail-group">
                  <label>Status</label>
                  <div><span className={getStatusClass(invoice.status)}>{invoice.status}</span></div>
                </div>
                <div className="detail-group">
                  <label>Type</label>
                  <div className="detail-value">{invoice.type}</div>
                </div>
              </div>
            </div>

            {/* Dates Section */}
            <div className="invoice-dates-section">
              <div className="date-box">
                <label>Invoice Date</label>
                <div className="date-value">{formatDate(invoice.date)}</div>
              </div>
              <div className="date-box">
                <label>Due Date</label>
                <div className="date-value">{formatDate(invoice.dueDate)}</div>
              </div>
              <div className="date-box">
                <label>Period</label>
                <div className="date-value">
                  {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="invoice-items-section">
              <h3>Line Items</h3>
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Service Date</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.lineNumber}</td>
                      <td>
                        {item.description}
                        {item.providerName && (
                          <div className="item-provider">
                            <small>{item.providerName} ({item.providerPercentage}%)</small>
                          </div>
                        )}
                      </td>
                      <td>{item.serviceDate ? formatDate(item.serviceDate) : '-'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td><strong>{formatCurrency(item.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="invoice-totals-section">
              <div className="totals-box">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="total-row">
                    <span>Tax:</span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="total-row total-main">
                  <span>Total Amount:</span>
                  <span><strong>{formatCurrency(invoice.totalAmount)}</strong></span>
                </div>
                <div className="total-row" style={{ color: '#388E3C' }}>
                  <span>Amount Paid:</span>
                  <span><strong>{formatCurrency(invoice.amountPaid)}</strong></span>
                </div>
                <div className="total-row total-balance" style={{ color: invoice.amountPaid >= invoice.totalAmount ? '#388E3C' : '#F57C00' }}>
                  <span>Balance Due:</span>
                  <span><strong>{formatCurrency(invoice.totalAmount - invoice.amountPaid)}</strong></span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="invoice-notes-section">
                <h3>Notes</h3>
                <p className="notes-text">{invoice.notes}</p>
              </div>
            )}

            {/* Split Payment Manager */}
            {(invoice.type === 'split' || invoice.isSplitPayment) && (
              <SplitPaymentManager
                invoiceId={invoice.id}
                tenantId={tenantId}
                invoiceAmount={invoice.totalAmount}
                onUpdate={loadInvoice}
              />
            )}

            {/* Email Status */}
            {invoice.emailSent && (
              <div className="invoice-email-status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email sent
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
