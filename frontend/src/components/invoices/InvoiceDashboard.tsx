import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../services/api';
import type { InvoiceListItem, InvoiceStats } from '../../types/invoice.types';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { SendInvoiceModal } from './SendInvoiceModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import {
  FileTextIcon,
  AlertTriangleIcon,
  SendIcon,
  ClockIcon,
  CheckIcon,
  EyeIcon,
  DownloadIcon,
  EditIcon,
  MailIcon
} from './InvoiceIcons';
import './InvoiceDashboard.css';

interface Props {
  tenantId: number;
}

/**
 * Invoice Management Dashboard
 * Modern, clean interface for invoice overview and management
 */
export const InvoiceDashboard: React.FC<Props> = ({ tenantId }) => {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceListItem[]>([]);
  const [draftInvoices, setDraftInvoices] = useState<InvoiceListItem[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<InvoiceListItem[]>([]);
  const [recentlySent, setRecentlySent] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [tenantId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, allInvoices] = await Promise.all([
        invoiceApi.getStats(tenantId),
        invoiceApi.getInvoices(tenantId, { archived: false })
      ]);

      setStats(statsData);

      // Sort by date descending
      const sorted = [...allInvoices].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Recent invoices (last 5)
      setRecentInvoices(sorted.slice(0, 5));

      // Draft invoices (need approval)
      setDraftInvoices(sorted.filter(inv => inv.status === 'draft'));

      // Overdue invoices
      setOverdueInvoices(sorted.filter(inv => inv.status === 'overdue'));

      // Recently sent invoices (sent in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      setRecentlySent(
        sorted.filter(inv =>
          inv.status === 'sent' &&
          inv.emailSent &&
          new Date(inv.updatedAt) > sevenDaysAgo
        ).slice(0, 5)
      );

    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const blob = await invoiceApi.downloadPDF(tenantId, invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download PDF');
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

  const getStatusBadge = (status: string) => {
    const classes = {
      draft: 'badge badge-secondary',
      sent: 'badge badge-info',
      paid: 'badge badge-success',
      overdue: 'badge badge-danger',
      cancelled: 'badge badge-muted'
    };
    return <span className={classes[status as keyof typeof classes] || 'badge'}>{status}</span>;
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard...</div>;
  }

  return (
    <div className="invoice-dashboard">
      {/* Key Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af', marginBottom: '2px', lineHeight: 1.2 }}>{stats.totalInvoices}</div>
            <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85, marginTop: '2px' }}>Total Invoices</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', lineHeight: 1.3 }}>All time records</div>
          </div>
          <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#166534', marginBottom: '2px', lineHeight: 1.2 }}>{formatCurrency(stats.totalPaid)}</div>
            <div style={{ fontSize: '10px', color: '#166534', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85, marginTop: '2px' }}>Paid</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', lineHeight: 1.3 }}>Collected revenue</div>
          </div>
          <div style={{ background: '#ffedd5', padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#c2410c', marginBottom: '2px', lineHeight: 1.2 }}>{formatCurrency(stats.totalPending)}</div>
            <div style={{ fontSize: '10px', color: '#c2410c', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85, marginTop: '2px' }}>Pending</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', lineHeight: 1.3 }}>Awaiting payment</div>
          </div>
          <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#7e22ce', marginBottom: '2px', lineHeight: 1.2 }}>{formatCurrency(stats.totalOverdue)}</div>
            <div style={{ fontSize: '10px', color: '#7e22ce', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85, marginTop: '2px' }}>Overdue</div>
            <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', lineHeight: 1.3 }}>{stats.totalOverdue > 0 ? 'Requires attention' : 'No overdue invoices'}</div>
          </div>
        </div>
      )}

      {/* Pending Approval Section */}
      {draftInvoices.length > 0 && (
        <div className="dashboard-section pending-approval-section">
          <div className="section-header">
            <h3>
              <FileTextIcon size={24} />
              Pending Approval
              <span className="count-badge">{draftInvoices.length}</span>
            </h3>
            <p className="section-description">Draft invoices waiting for review and approval</p>
          </div>
          <div className="invoice-cards">
            {draftInvoices.map(invoice => (
              <div key={invoice.id} className="invoice-card draft-card">
                <div className="card-header">
                  <div className="card-title">
                    <strong>{invoice.number}</strong>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="card-amount">{formatCurrency(invoice.amount)}</div>
                </div>
                <div className="card-body">
                  <div className="card-detail">
                    <span className="label">Customer:</span>
                    <span className="value">{invoice.customerName}</span>
                  </div>
                  <div className="card-detail">
                    <span className="label">Period:</span>
                    <span className="value">
                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </span>
                  </div>
                  <div className="card-detail">
                    <span className="label">Due Date:</span>
                    <span className="value">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setSendingInvoiceId(invoice.id)}
                    title="Send Invoice"
                  >
                    <SendIcon size={16} />
                    Send
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setEditingInvoiceId(invoice.id)}
                    title="Edit Invoice"
                  >
                    <EditIcon size={16} />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleDownloadPDF(invoice.id, invoice.number)}
                    title="Download PDF"
                  >
                    <DownloadIcon size={16} />
                    PDF
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    title="View Details"
                  >
                    <EyeIcon size={16} />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Invoices Section */}
      {overdueInvoices.length > 0 && (
        <div className="dashboard-section overdue-section">
          <div className="section-header">
            <h3>
              <AlertTriangleIcon size={24} />
              Overdue Invoices
              <span className="count-badge alert">{overdueInvoices.length}</span>
            </h3>
            <p className="section-description">Invoices past their due date requiring follow-up</p>
          </div>
          <div className="invoice-list-compact">
            {overdueInvoices.slice(0, 5).map(invoice => (
              <div
                key={invoice.id}
                className="invoice-row overdue-row"
              >
                <div className="row-left" onClick={() => setSelectedInvoiceId(invoice.id)}>
                  <div className="invoice-number">{invoice.number}</div>
                  <div className="invoice-customer">{invoice.customerName}</div>
                </div>
                <div className="row-center" onClick={() => setSelectedInvoiceId(invoice.id)}>
                  <div className="invoice-amount">{formatCurrency(invoice.amount)}</div>
                  <div className="invoice-due">Due: {formatDate(invoice.dueDate)}</div>
                </div>
                <div className="row-right">
                  <button
                    className="btn-icon"
                    onClick={() => handleDownloadPDF(invoice.id, invoice.number)}
                    title="Download PDF"
                  >
                    <DownloadIcon size={18} />
                  </button>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Sent Section */}
      {recentlySent.length > 0 && (
        <div className="dashboard-section recently-sent-section">
          <div className="section-header">
            <h3>
              <SendIcon size={24} />
              Recently Sent
              <span className="auto-badge">
                <CheckIcon size={14} />
                Auto-sent
              </span>
            </h3>
            <p className="section-description">Invoices automatically sent in the last 7 days</p>
          </div>
          <div className="invoice-list-compact">
            {recentlySent.map(invoice => (
              <div
                key={invoice.id}
                className="invoice-row sent-row"
              >
                <div className="row-left" onClick={() => setSelectedInvoiceId(invoice.id)}>
                  <div className="invoice-number">{invoice.number}</div>
                  <div className="invoice-customer">{invoice.customerName}</div>
                </div>
                <div className="row-center" onClick={() => setSelectedInvoiceId(invoice.id)}>
                  <div className="invoice-amount">{formatCurrency(invoice.amount)}</div>
                  <div className="invoice-sent">
                    Sent: {formatDate(invoice.updatedAt)}
                  </div>
                </div>
                <div className="row-right">
                  <button
                    className="btn-icon"
                    onClick={() => handleDownloadPDF(invoice.id, invoice.number)}
                    title="Download PDF"
                  >
                    <DownloadIcon size={18} />
                  </button>
                  {invoice.emailSent && (
                    <span className="email-badge">
                      <MailIcon size={14} />
                      Emailed
                    </span>
                  )}
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="dashboard-section recent-activity-section">
        <div className="section-header">
          <h3>
            <ClockIcon size={24} />
            Recent Invoices
          </h3>
          <p className="section-description">Latest invoice activity</p>
        </div>
        <div className="invoice-list-compact">
          {recentInvoices.map(invoice => (
            <div
              key={invoice.id}
              className="invoice-row"
            >
              <div className="row-left" onClick={() => setSelectedInvoiceId(invoice.id)}>
                <div className="invoice-number">{invoice.number}</div>
                <div className="invoice-customer">{invoice.customerName}</div>
              </div>
              <div className="row-center" onClick={() => setSelectedInvoiceId(invoice.id)}>
                <div className="invoice-amount">{formatCurrency(invoice.amount)}</div>
                <div className="invoice-date">Created: {formatDate(invoice.createdAt)}</div>
              </div>
              <div className="row-right">
                <button
                  className="btn-icon"
                  onClick={() => handleDownloadPDF(invoice.id, invoice.number)}
                  title="Download PDF"
                >
                  <DownloadIcon size={18} />
                </button>
                {invoice.isSplitPayment && <span className="split-badge">Split</span>}
                {invoice.emailSent && (
                  <span className="email-badge">
                    <MailIcon size={14} />
                  </span>
                )}
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          tenantId={tenantId}
          onClose={() => {
            setSelectedInvoiceId(null);
            loadDashboardData();
          }}
        />
      )}

      {/* Send Invoice Modal */}
      {sendingInvoiceId && (
        <SendInvoiceModal
          invoiceId={sendingInvoiceId}
          tenantId={tenantId}
          currentEmail={(draftInvoices.find(inv => inv.id === sendingInvoiceId) as any)?.email}
          onClose={() => setSendingInvoiceId(null)}
          onSuccess={loadDashboardData}
        />
      )}

      {/* Edit Invoice Modal */}
      {editingInvoiceId && (
        <EditInvoiceModal
          invoiceId={editingInvoiceId}
          tenantId={tenantId}
          onClose={() => setEditingInvoiceId(null)}
          onSuccess={loadDashboardData}
        />
      )}
    </div>
  );
};
