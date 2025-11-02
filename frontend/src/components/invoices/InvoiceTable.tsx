import React from 'react';
import type { InvoiceListItem, InvoiceStatus } from '../../types/invoice.types';
import { MailIcon, AlertTriangleIcon } from './InvoiceIcons';

interface Props {
  invoices: InvoiceListItem[];
  showArchived: boolean;
  onViewDetails: (invoice: InvoiceListItem) => void;
  onRecordPayment: (invoice: InvoiceListItem) => void;
  onStatusUpdate: (invoiceId: number, status: InvoiceStatus) => void;
  onArchive: (invoiceId: number) => void;
  onUnarchive: (invoiceId: number) => void;
  onDelete: (invoiceId: number) => void;
}

/**
 * Invoice Table Component
 * Displays list of invoices with actions
 */
export const InvoiceTable: React.FC<Props> = ({
  invoices,
  showArchived,
  onViewDetails,
  onRecordPayment,
  onStatusUpdate,
  onArchive,
  onUnarchive,
  onDelete
}) => {
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

  const getStatusBadgeClass = (status: InvoiceStatus) => {
    const baseClass = 'status-badge';
    switch (status) {
      case 'paid':
        return `${baseClass} status-paid`;
      case 'sent':
        return `${baseClass} status-sent`;
      case 'overdue':
        return `${baseClass} status-overdue`;
      case 'draft':
        return `${baseClass} status-draft`;
      case 'cancelled':
        return `${baseClass} status-cancelled`;
      default:
        return baseClass;
    }
  };

  const getTypeBadge = (invoice: InvoiceListItem) => {
    if (invoice.isSplitPayment) {
      return <span className="type-badge type-split">Split</span>;
    }
    if (invoice.type === 'provider') {
      return <span className="type-badge type-provider">Provider</span>;
    }
    return <span className="type-badge type-standard">Standard</span>;
  };

  const isOverdue = (invoice: InvoiceListItem) => {
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    return dueDate < today && invoice.status !== 'paid' && invoice.status !== 'cancelled';
  };

  if (invoices.length === 0) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <h3>No Invoices Found</h3>
        <p>There are no invoices matching your current filters.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Customer</th>
            <th>Paying Org</th>
            <th>Type</th>
            <th>Date</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(invoice => {
            const balance = invoice.amount - invoice.amountPaid;
            const isInvoiceOverdue = isOverdue(invoice);

            return (
              <tr key={invoice.id} className={isInvoiceOverdue ? 'row-overdue' : ''}>
                <td>
                  <strong>{invoice.number}</strong>
                  {invoice.emailSent && (
                    <span className="email-sent-badge" title="Email sent">
                      <MailIcon size={14} />
                    </span>
                  )}
                </td>
                <td>{invoice.customerName}</td>
                <td>{invoice.payingOrg}</td>
                <td>{getTypeBadge(invoice)}</td>
                <td>{formatDate(invoice.date)}</td>
                <td className={isInvoiceOverdue ? 'text-danger' : ''}>
                  {formatDate(invoice.dueDate)}
                  {isInvoiceOverdue && (
                    <span className="overdue-icon" title="Overdue">
                      <AlertTriangleIcon size={14} />
                    </span>
                  )}
                </td>
                <td>{formatCurrency(invoice.amount)}</td>
                <td style={{ color: invoice.amountPaid > 0 ? '#388E3C' : undefined }}>
                  {formatCurrency(invoice.amountPaid)}
                </td>
                <td style={{ color: balance > 0 ? '#F57C00' : '#388E3C' }}>
                  <strong>{formatCurrency(balance)}</strong>
                </td>
                <td>
                  <span className={getStatusBadgeClass(invoice.status)}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewDetails(invoice)}
                      title="View Details"
                    >
                      View
                    </button>

                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && !showArchived && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onRecordPayment(invoice)}
                        title="Record Payment"
                      >
                        Payment
                      </button>
                    )}

                    {invoice.status === 'draft' && !showArchived && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onDelete(invoice.id)}
                        title="Delete Draft"
                      >
                        Delete
                      </button>
                    )}

                    {!showArchived && invoice.status !== 'draft' && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onArchive(invoice.id)}
                        title="Archive Invoice"
                      >
                        Archive
                      </button>
                    )}

                    {showArchived && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onUnarchive(invoice.id)}
                        title="Unarchive Invoice"
                      >
                        Unarchive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
