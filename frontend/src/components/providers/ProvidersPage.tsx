import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import providersApi from '../../services/providersApi';
import ProviderStats from './ProviderStats';
import ProvidersTable from './ProvidersTable';
import ProviderDirectoryModal from './ProviderDirectoryModal';
import ProviderSettingsModal from './ProviderSettingsModal';
import ProviderDetailsModal from './ProviderDetailsModal';
import type { ProvidersStatsResponse, Provider, ProviderData } from '../../types';
import './Providers.css';

/**
 * Providers Page
 * Main page for managing providers, viewing statistics, and handling invoicing
 */
function ProvidersPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<ProvidersStatsResponse | null>(null);
  const [directory, setDirectory] = useState<Provider[]>([]);

  // Modal states
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedProviderName, setSelectedProviderName] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [stats, dir] = await Promise.all([
        providersApi.getProviderStats(tenantId),
        providersApi.getProviderDirectory(tenantId)
      ]);
      setStatsData(stats);
      setDirectory(dir);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (providerName: string) => {
    setSelectedProviderName(providerName);
    setShowDetailsModal(true);
  };

  const handleEditSettings = (providerId: number) => {
    setSelectedProviderId(providerId);
    setShowSettingsModal(true);
  };

  const handleGenerateInvoice = async (providerName: string) => {
    if (!tenantId) return;

    try {
      // Create invoice record in database
      const createResult = await providersApi.createProviderInvoice(tenantId, providerName, {
        period: 'Current Week'
      });

      toast.success(`Invoice ${createResult.invoiceNumber} created successfully`);

      // Get invoice data for display
      const invoiceData = await providersApi.getProviderInvoice(tenantId, providerName);

      // Open invoice in new window
      const invoiceWindow = window.open('', '_blank', 'width=800,height=600');
      if (!invoiceWindow) {
        toast.warning('Please allow popups to generate invoices');
        return;
      }

      invoiceWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${invoiceData.providerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            .invoice-title { color: #007bff; font-size: 28px; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #007bff; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            .total { background: #f8f9fa; font-weight: bold; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="invoice-title">PROVIDER INVOICE</h1>
            <p>Invoice Date: ${invoiceData.invoiceDate}</p>
            <p>Invoice Number: ${invoiceData.invoiceNumber}</p>
          </div>

          <div style="margin-bottom: 30px;">
            <strong>Bill To:</strong><br>
            ${invoiceData.providerName}<br>
            <br>
            <strong>Service Period:</strong> ${invoiceData.servicePeriod}<br>
            <strong>Total Customers:</strong> ${invoiceData.totals.totalCustomers}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Routes/Week</th>
                <th>Weekly Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.customers.map((customer, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${customer.name}</td>
                  <td>${customer.address || ''}</td>
                  <td style="text-align: center;">${customer.routeCount}</td>
                  <td style="text-align: right;">£${customer.weeklyAmount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total">
                <td colspan="3">Totals:</td>
                <td style="text-align: center;">${invoiceData.totals.totalRoutes}</td>
                <td style="text-align: right; font-size: 18px; color: #28a745;">
                  £${invoiceData.totals.totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 50px;">
            <p><strong>Payment Terms:</strong> Net 30 days</p>
            <p><strong>Monthly Total (4.33 weeks):</strong> £${(invoiceData.totals.totalAmount * 4.33).toFixed(2)}</p>
            <p>Thank you for your continued partnership!</p>
          </div>
        </body>
        </html>
      `);

      invoiceWindow.document.close();
      setTimeout(() => invoiceWindow.print(), 500);
    } catch (error) {
      toast.error('Failed to generate invoice');
    }
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="providers-loading">
        <div>Loading provider data...</div>
      </div>
    );
  }

  return (
    <div className="providers-container">
      {/* Header */}
      <div className="providers-header">
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Provider Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div className="providers-header-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setShowDirectoryModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Provider
          </button>
          <button className="btn btn-secondary" onClick={loadData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statsData && <ProviderStats stats={statsData.stats} />}

      {/* Providers Table or Empty State */}
      {statsData && Object.keys(statsData.providers).length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            No providers yet.
          </p>
          <button className="btn btn-primary" onClick={() => setShowDirectoryModal(true)}>
            Add Your First Provider
          </button>
        </div>
      ) : statsData ? (
        <div className="providers-and-directory-wrapper">
          <ProvidersTable
            providers={statsData.providers}
            directory={directory}
            onViewDetails={handleViewDetails}
            onEditSettings={handleEditSettings}
            onGenerateInvoice={handleGenerateInvoice}
          />

          {/* Provider Directory Management - shown below self-pay */}
          {directory.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div className="provider-directory-list">
            {directory.map((provider) => {
              const hasInvoiceSettings = provider.invoice_email && provider.invoice_email.length > 0;
              const isConfigured = hasInvoiceSettings && provider.auto_send !== null;

              // Get provider stats from statsData
              const providerStats = statsData.providers[provider.name];
              const customers = providerStats?.customers.length || 0;
              const weeklyRoutes = providerStats?.totalRoutes || 0;
              const weeklyAmount = providerStats?.weeklyAmount || 0;
              const monthlyAmount = weeklyAmount * 4.33;

              return (
                <div
                  key={provider.provider_id}
                  className="provider-directory-item"
                >
                  {/* Grid layout matching table columns */}
                  <div className="provider-grid-row">
                    {/* Provider Name column */}
                    <div className="provider-grid-cell-name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '16px', color: 'var(--primary-600)' }}>
                          {provider.name}
                        </strong>
                        <span className="provider-type-badge">{provider.type}</span>
                      </div>
                    </div>

                    {/* Customers column */}
                    <div className="provider-grid-cell-center">
                      <strong>{customers}</strong>
                    </div>

                    {/* Weekly Routes column */}
                    <div className="provider-grid-cell-center">
                      <strong>{weeklyRoutes}</strong>
                    </div>

                    {/* Weekly Amount column */}
                    <div className="provider-grid-cell">
                      <strong style={{ color: '#28a745' }}>£{weeklyAmount.toFixed(2)}</strong>
                    </div>

                    {/* Monthly Estimate column */}
                    <div className="provider-grid-cell">
                      <strong style={{ color: '#17a2b8' }}>£{monthlyAmount.toFixed(2)}</strong>
                    </div>

                    {/* Actions column */}
                    <div className="provider-grid-cell-actions">
                      <div>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedProviderId(provider.provider_id);
                            setShowDirectoryModal(true);
                          }}
                          title="Edit provider"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            if (!tenantId) return;
                            if (!confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
                              return;
                            }

                            try {
                              await providersApi.deleteProvider(tenantId, provider.provider_id);
                              loadData();
                              toast.success('Provider deleted successfully');
                            } catch (error) {
                              toast.error('Failed to delete provider');
                            }
                          }}
                          title="Delete provider"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Provider Settings Display */}
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem 1.5rem' }}>
                      <div>
                        <strong>Email:</strong>{' '}
                        <span style={{ color: hasInvoiceSettings ? 'var(--gray-900)' : 'var(--gray-500)' }}>
                          {provider.invoice_email || 'Not set'}
                        </span>
                      </div>
                      <div>
                        <strong>Contact:</strong>{' '}
                        <span style={{ color: provider.main_contact ? 'var(--gray-900)' : 'var(--gray-500)' }}>
                          {provider.main_contact || 'Not set'}
                        </span>
                      </div>
                      <div>
                        <strong>Phone:</strong>{' '}
                        <span style={{ color: provider.phone_number ? 'var(--gray-900)' : 'var(--gray-500)' }}>
                          {provider.phone_number || 'Not set'}
                        </span>
                      </div>
                      <div>
                        <strong>Auto-Send:</strong>{' '}
                        {provider.auto_send !== null ? (
                          <span style={{ color: provider.auto_send ? '#28a745' : '#dc3545', fontWeight: 600 }}>
                            {provider.auto_send ? 'Enabled' : 'Disabled'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--gray-500)' }}>Not configured</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {provider.notes && (
                    <div style={{ padding: '0.75rem 1rem', paddingTop: '0', fontSize: '13px' }}>
                      <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
                        <strong>Notes:</strong> {provider.notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Modals */}
      <ProviderDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => {
          setShowDirectoryModal(false);
          setSelectedProviderId(null);
        }}
        directory={directory}
        onRefresh={loadData}
        editProviderId={selectedProviderId}
      />

      {selectedProviderId && (
        <ProviderSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedProviderId(null);
          }}
          providerId={selectedProviderId}
          directory={directory}
          onRefresh={loadData}
        />
      )}

      {selectedProviderName && (
        <ProviderDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProviderName(null);
          }}
          providerName={selectedProviderName}
        />
      )}
    </div>
  );
}

export default ProvidersPage;
