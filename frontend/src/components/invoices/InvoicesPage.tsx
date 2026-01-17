import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { invoiceApi } from '../../services/api';
import type { InvoiceListItem, InvoiceStats, InvoiceFilters, InvoiceStatus } from '../../types/invoice.types';
import { InvoiceFiltersBar } from './InvoiceFiltersBar';
import { InvoiceStatsCards } from './InvoiceStatsCards';
import { InvoiceTable } from './InvoiceTable';
import { RecordPaymentModal } from './RecordPaymentModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceDashboard } from './InvoiceDashboard';
import { BulkGenerateModal } from './BulkGenerateModal';
import { FileTextIcon, PlusIcon } from './InvoiceIcons';
import './Invoices.css';

/**
 * Invoices Page Component
 * Main invoice management interface with stats, filters, and invoice listing
 */
export const InvoicesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { tenant } = useTenant();
  const toast = useToast();
  const tenantId = user?.tenantId;

  // State
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceListItem[]>([]);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: '',
    type: '',
    provider: '',
    start_date: '',
    end_date: '',
    archived: false,
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);

  // View state
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'archive'>('dashboard');

  /**
   * Fetch invoice statistics
   */
  const fetchStats = async () => {
    if (!tenantId) return;

    try {
      const data = await invoiceApi.getStats(tenantId);
      setStats(data);
    } catch {
      // Error handled silently
    }
  };

  /**
   * Fetch invoices with current filters
   */
  const fetchInvoices = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const filterParams = {
        ...filters,
        archived: showArchived
      };

      const data = await invoiceApi.getInvoices(tenantId, filterParams);
      setInvoices(data);
      setFilteredInvoices(data);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load invoices'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search filter on invoices
   */
  useEffect(() => {
    if (!filters.search) {
      setFilteredInvoices(invoices);
      return;
    }

    const searchLower = filters.search.toLowerCase();
    const filtered = invoices.filter(invoice =>
      invoice.number.toLowerCase().includes(searchLower) ||
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.payingOrg.toLowerCase().includes(searchLower)
    );
    setFilteredInvoices(filtered);
  }, [filters.search, invoices]);

  /**
   * Load data on mount and when filters change
   */
  useEffect(() => {
    if (tenantId) {
      fetchStats();
      fetchInvoices();
    }
  }, [tenantId, showArchived, filters.status, filters.type, filters.provider, filters.start_date, filters.end_date]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: Partial<InvoiceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (invoiceId: number, newStatus: InvoiceStatus) => {
    if (!tenantId) return;

    try {
      await invoiceApi.updateStatus(tenantId, invoiceId, newStatus);
      await fetchInvoices();
      await fetchStats();
      toast.success('Invoice status updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update invoice status');
    }
  };

  /**
   * Handle record payment click
   */
  const handleRecordPayment = (invoice: InvoiceListItem) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  /**
   * Handle view details click
   */
  const handleViewDetails = (invoice: InvoiceListItem) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  /**
   * Handle archive invoice
   */
  const handleArchive = async (invoiceId: number) => {
    if (!tenantId) return;
    if (!confirm('Are you sure you want to archive this invoice?')) return;

    try {
      await invoiceApi.archiveInvoice(tenantId, invoiceId);
      await fetchInvoices();
      await fetchStats();
      toast.success('Invoice archived successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to archive invoice');
    }
  };

  /**
   * Handle unarchive invoice
   */
  const handleUnarchive = async (invoiceId: number) => {
    if (!tenantId) return;

    try {
      await invoiceApi.unarchiveInvoice(tenantId, invoiceId);
      await fetchInvoices();
      await fetchStats();
      toast.success('Invoice unarchived successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unarchive invoice');
    }
  };

  /**
   * Handle delete invoice
   */
  const handleDelete = async (invoiceId: number) => {
    if (!tenantId) return;
    if (!confirm('Are you sure you want to delete this draft invoice? This action cannot be undone.')) return;

    try {
      await invoiceApi.deleteInvoice(tenantId, invoiceId);
      await fetchInvoices();
      await fetchStats();
      toast.success('Invoice deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete invoice');
    }
  };

  /**
   * Handle payment recorded successfully
   */
  const handlePaymentRecorded = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    fetchInvoices();
    fetchStats();
  };

  /**
   * Handle bulk generation success
   */
  const handleBulkGenerateSuccess = () => {
    setShowBulkGenerateModal(false);
    fetchInvoices();
    fetchStats();
  };

  if (!tenantId) {
    return <div className="error-message">No tenant ID found</div>;
  }

  return (
    <div className="invoices-page">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowBulkGenerateModal(true)}
          style={{
            padding: '6px 12px',
            background: '#10b981',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          <PlusIcon size={14} />
          Generate Invoices
        </button>
      </div>

      {/* View Toggle - Pill Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('dashboard')}
            style={{
              padding: '5px 12px',
              background: viewMode === 'dashboard' ? 'white' : 'transparent',
              color: viewMode === 'dashboard' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'dashboard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileTextIcon size={14} />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('archive')}
            style={{
              padding: '5px 12px',
              background: viewMode === 'archive' ? 'white' : 'transparent',
              color: viewMode === 'archive' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileTextIcon size={14} />
            Archive
          </button>
        </div>
        {viewMode === 'archive' && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              padding: '5px 10px',
              background: showArchived ? '#3b82f6' : 'white',
              color: showArchived ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {viewMode === 'dashboard' ? (
          <InvoiceDashboard tenantId={tenantId} />
        ) : (
          <>
            {/* Stats Cards */}
            {stats && <InvoiceStatsCards stats={stats} />}

            {/* Filters */}
            <InvoiceFiltersBar
              filters={filters}
              onFilterChange={handleFilterChange}
              tenantId={tenantId}
            />

            {/* Invoice Table */}
            {loading ? (
              <div className="loading-state">Loading invoices...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <InvoiceTable
                invoices={filteredInvoices}
                showArchived={showArchived}
                onViewDetails={handleViewDetails}
                onRecordPayment={handleRecordPayment}
                onStatusUpdate={handleStatusUpdate}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          tenantId={tenantId}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}

      {showDetailModal && selectedInvoice && (
        <InvoiceDetailModal
          invoiceId={selectedInvoice.id}
          tenantId={tenantId}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {showBulkGenerateModal && (
        <BulkGenerateModal
          tenantId={tenantId}
          onClose={() => setShowBulkGenerateModal(false)}
          onSuccess={handleBulkGenerateSuccess}
        />
      )}
    </div>
  );
};
