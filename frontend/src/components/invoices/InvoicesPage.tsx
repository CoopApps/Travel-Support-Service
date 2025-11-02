import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTenant } from '../../context/TenantContext';
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
    } catch (err: any) {
      console.error('Failed to fetch invoice stats:', err);
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
      console.error('Failed to fetch invoices:', err);
      setError(err.response?.data?.error || 'Failed to load invoices');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update invoice status');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive invoice');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to unarchive invoice');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete invoice');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Invoice Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <button
          className="btn btn-success"
          onClick={() => setShowBulkGenerateModal(true)}
        >
          <PlusIcon size={16} />
          Generate Invoices
        </button>
      </div>

      {/* View Toggle Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}
          >
            <FileTextIcon size={14} style={{ marginRight: '6px' }} />
            Dashboard
          </button>
          <button
            className={`tab ${viewMode === 'archive' ? 'active' : ''}`}
            onClick={() => setViewMode('archive')}
          >
            <FileTextIcon size={14} style={{ marginRight: '6px' }} />
            Archive
          </button>
        </div>
        {viewMode === 'archive' && (
          <div className="tab-actions">
            <button
              className={`btn btn-sm ${showArchived ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
          </div>
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
