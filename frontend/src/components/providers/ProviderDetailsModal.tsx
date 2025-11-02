import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import providersApi from '../../services/providersApi';
import type { ProviderDetails } from '../../types';
import Modal from '../common/Modal';

interface ProviderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
}

/**
 * Provider Details Modal
 * Shows detailed financial information and customer breakdown for a provider
 */
function ProviderDetailsModal({
  isOpen,
  onClose,
  providerName
}: ProviderDetailsModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProviderDetails | null>(null);

  useEffect(() => {
    if (isOpen && providerName && tenantId) {
      loadDetails();
    }
  }, [isOpen, providerName, tenantId]);

  const loadDetails = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await providersApi.getProviderDetails(tenantId, providerName);
      setDetails(data);
    } catch (error) {
      console.error('Error loading provider details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const getDayAbbreviation = (day: number) => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return days[day] || '';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Provider Details - ${providerName}`}>
      <div style={{ maxWidth: '900px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
            Loading provider details...
          </div>
        ) : !details ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
            Failed to load provider details
          </div>
        ) : (
          <>
            {/* Financial Summary */}
            <div className="provider-details-summary">
              <h4 style={{ margin: '0 0 1rem 0', color: '#0277bd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
                Financial Summary
              </h4>

              <div className="provider-details-summary-grid">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Weekly Revenue
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#388e3c' }}>
                    {formatCurrency(details.summary.totalWeeklyAmount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Monthly Revenue (4.33 weeks)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#f57c00' }}>
                    {formatCurrency(details.summary.totalWeeklyAmount * 4.33)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Annual Projection
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1976d2' }}>
                    {formatCurrency(details.summary.totalWeeklyAmount * 52)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Customers
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#7b1fa2' }}>
                    {details.summary.totalCustomers}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Distribution */}
            {details.routeDistribution && details.routeDistribution.length > 0 && (
              <div className="provider-route-distribution">
                <h4 style={{ margin: '0 0 1rem 0', color: '#388e3c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Route Distribution by Day
                </h4>

                <div className="provider-route-chart">
                  {details.routeDistribution.map((day) => {
                    const maxRoutes = Math.max(...details.routeDistribution.map(d => d.routeCount));
                    const heightPercent = (day.routeCount / maxRoutes) * 100;

                    return (
                      <div key={day.dayOfWeek} className="provider-route-bar">
                        <div className="provider-route-bar-label">{day.routeCount}</div>
                        <div
                          className="provider-route-bar-fill"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="provider-route-bar-day">
                          {getDayAbbreviation(day.dayOfWeek)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--gray-700)' }}>
                  <strong>Total Weekly Routes:</strong> {details.routeDistribution.reduce((sum, d) => sum + d.routeCount, 0)}
                </div>
              </div>
            )}

            {/* Customer List */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Customer Breakdown ({details.customers.length})
              </h4>

              {details.customers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)', background: '#f8f9fa', borderRadius: '6px' }}>
                  No customers assigned to this provider
                </div>
              ) : (
                <div className="provider-customer-list">
                  {details.customers
                    .sort((a, b) => (b.weeklyAmount || 0) - (a.weeklyAmount || 0))
                    .map((customer) => {
                      const daysActive = customer.schedule ? Object.values(customer.schedule).filter(Boolean).length : 0;

                      return (
                        <div key={customer.customerId} className="provider-customer-item">
                          <div className="provider-customer-header">
                            <div>
                              <strong style={{ fontSize: '15px', color: 'var(--gray-900)' }}>
                                {customer.customerName}
                              </strong>
                              {customer.address && (
                                <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                                  {customer.address}
                                </div>
                              )}
                            </div>
                            <div className="provider-customer-amount">
                              {formatCurrency(customer.weeklyAmount || 0)}
                              <div style={{ fontSize: '11px', color: 'var(--gray-600)', fontWeight: 400 }}>
                                per week
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '13px' }}>
                            <div>
                              <strong>Routes/Week:</strong> {customer.routeCount || 0}
                            </div>
                            <div>
                              <strong>Days Active:</strong> {daysActive}/7
                            </div>
                            {customer.splitPayment && (
                              <div style={{ color: '#7b1fa2' }}>
                                <strong>Split Payment:</strong> {customer.splitPercentage}%
                              </div>
                            )}
                          </div>

                          {/* Schedule Badges */}
                          {customer.schedule && (
                            <div className="provider-schedule-badges">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                <div
                                  key={day}
                                  className={`provider-schedule-badge ${
                                    customer.schedule![index] ? 'provider-schedule-badge-active' : 'provider-schedule-badge-inactive'
                                  }`}
                                  title={`${day}: ${customer.schedule![index] ? 'Active' : 'Inactive'}`}
                                >
                                  {day.charAt(0)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Additional Insights */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '14px', fontWeight: 600 }}>
                Key Insights
              </h5>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div>
                  <strong>Average per Customer:</strong> {formatCurrency(details.summary.totalWeeklyAmount / details.summary.totalCustomers)} per week
                </div>
                <div>
                  <strong>Total Routes:</strong> {details.customers.reduce((sum, c) => sum + (c.routeCount || 0), 0)} routes per week
                </div>
                {details.customers.some(c => c.splitPayment) && (
                  <div style={{ color: '#7b1fa2' }}>
                    <strong>Split Payment Customers:</strong> {details.customers.filter(c => c.splitPayment).length}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Close Button */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ProviderDetailsModal;
