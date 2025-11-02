import React from 'react';
import type { ProviderData, Provider } from '../../types';

interface ProvidersTableProps {
  providers: Record<string, ProviderData>;
  directory: Provider[];
  onViewDetails: (providerName: string) => void;
  onEditSettings: (providerId: number) => void;
  onGenerateInvoice: (providerName: string) => void;
}

/**
 * Providers Table
 * Displays all providers with customer counts, revenue, and actions
 */
function ProvidersTable({
  providers,
  directory,
  onViewDetails,
  onEditSettings,
  onGenerateInvoice
}: ProvidersTableProps) {
  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Sort providers: Self-Pay first, then others by weekly amount (descending)
  const sortedProviders = Object.entries(providers).sort(
    ([nameA, a], [nameB, b]) => {
      // Self-Pay always first
      if (nameA === 'Self-Pay') return -1;
      if (nameB === 'Self-Pay') return 1;
      // Sort others by weekly amount
      return (b.weeklyAmount || 0) - (a.weeklyAmount || 0);
    }
  );

  if (sortedProviders.length === 0) {
    return null; // Empty state is handled by ProvidersPage
  }

  return (
    <div className="providers-table-container">
      <table className="providers-table">
        <thead>
          <tr>
            <th>Provider Name</th>
            <th style={{ textAlign: 'center' }}>Customers</th>
            <th style={{ textAlign: 'center' }}>Weekly Routes</th>
            <th>Weekly Amount</th>
            <th>Monthly Estimate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedProviders.map(([name, data], index) => {
            const isSelfPay = name === 'Self-Pay';
            const isFirstProviderAfterSelfPay = index === 1 && sortedProviders[0][0] === 'Self-Pay';

            // Find provider settings from directory (skip for Self-Pay)
            const providerSettings = !isSelfPay ? directory.find(p => p.name === name) : null;
            const hasInvoiceSettings = providerSettings && providerSettings.invoice_email;
            const autoSendEnabled = providerSettings && providerSettings.auto_send;

            return (
              <tr key={name} style={isSelfPay ? {
                background: '#fafafa',
                borderBottom: '3px solid #dee2e6'
              } : isFirstProviderAfterSelfPay ? {
                borderTop: '16px solid #f5f5f5'
              } : undefined}>
                <td>
                  <div className="provider-name-cell">
                    <div>
                      <strong style={{ color: isSelfPay ? 'var(--gray-700)' : 'var(--primary-600)' }}>
                        {name}
                      </strong>
                      {isSelfPay && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                          Individual payments (not a provider)
                        </div>
                      )}
                      {!isSelfPay && data.type === 'split' && (
                        <div style={{ fontSize: '12px', color: '#7b1fa2' }}>
                          Split payments included
                        </div>
                      )}
                    </div>
                    {!isSelfPay && providerSettings && (
                      hasInvoiceSettings ? (
                        <span
                          className="provider-invoice-badge provider-invoice-badge-configured"
                          title="Invoice automation configured"
                        >
                          {autoSendEnabled ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                              AUTO
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                              SET
                            </>
                          )}
                        </span>
                      ) : (
                        <span
                          className="provider-invoice-badge provider-invoice-badge-warning"
                          title="Invoice settings not configured"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                          </svg>
                          CONFIG
                        </span>
                      )
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <strong>{data.customers.length}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {data.totalRoutes || 0}
                </td>
                <td>
                  <strong style={{ color: '#28a745' }}>{formatCurrency(data.weeklyAmount || 0)}</strong>
                </td>
                <td>
                  <strong style={{ color: '#17a2b8' }}>{formatCurrency((data.weeklyAmount || 0) * 4.33)}</strong>
                </td>
                <td>
                  {isSelfPay ? (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--gray-600)',
                      fontStyle: 'italic',
                      textAlign: 'left'
                    }}>
                      Informational only
                    </div>
                  ) : (
                    <div className="provider-actions">
                      {providerSettings && (
                        <button
                          className={`btn btn-sm ${hasInvoiceSettings ? 'btn-secondary' : 'btn-warning'}`}
                          onClick={() => onEditSettings(providerSettings.provider_id)}
                          title={hasInvoiceSettings ? 'Edit invoice settings' : 'Configure invoice settings'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                          </svg>
                        </button>
                      )}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onViewDetails(name)}
                        title="View details"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onGenerateInvoice(name)}
                        title="Generate invoice"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ProvidersTable;
