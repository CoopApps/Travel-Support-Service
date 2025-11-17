/**
 * Member Dividend History Component
 *
 * Displays dividend payment history for cooperative members (customers or drivers).
 * Shows:
 * - Timeline of dividend distributions received
 * - Payment status (paid/pending)
 * - Patronage contribution to each distribution
 * - Summary totals
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DividendRecord {
  dividend_id: number;
  distribution_id: number;
  member_type: 'customer' | 'driver';
  patronage_value: number;
  patronage_percentage: number;
  dividend_amount: number;
  payment_status: 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  period_start: string;
  period_end: string;
  gross_surplus: number;
  dividend_pool: number;
  eligible_members: number;
  total_patronage: number;
  distributed_at?: string;
}

interface DividendSummary {
  total_distributions: number;
  total_dividends: number;
  total_paid: number;
  total_pending: number;
  total_patronage: number;
  member_type: 'customer' | 'driver';
}

interface MemberDividendHistoryProps {
  memberId: number;
  memberType: 'customer' | 'driver';
  tenantId: number;
  limit?: number;
}

export const MemberDividendHistory: React.FC<MemberDividendHistoryProps> = ({
  memberId,
  memberType,
  tenantId,
  limit = 12,
}) => {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [summary, setSummary] = useState<DividendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDividendHistory();
  }, [memberId, memberType, tenantId, limit]);

  const fetchDividendHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const endpoint =
        memberType === 'customer'
          ? `/api/tenants/${tenantId}/customers/${memberId}/dividends`
          : `/api/tenants/${tenantId}/drivers/${memberId}/dividends`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit },
      });

      setDividends(response.data.dividends || []);
      setSummary(response.data.summary || null);
    } catch (err: any) {
      console.error('Error fetching dividend history:', err);
      setError(err.response?.data?.error || 'Failed to load dividend history');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: { bg: '#d4edda', color: '#155724', text: '✓ Paid' },
      pending: { bg: '#fff3cd', color: '#856404', text: '⏳ Pending' },
      cancelled: { bg: '#f8d7da', color: '#721c24', text: '✗ Cancelled' },
    };

    const style = styles[status as keyof typeof styles] || styles.pending;

    return (
      <span
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 500,
          background: style.bg,
          color: style.color,
        }}
      >
        {style.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading dividend history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (dividends.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>💰</div>
        <h5 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>No Dividend History</h5>
        <p style={{ color: '#adb5bd', fontSize: '14px' }}>
          {memberType === 'customer'
            ? 'You have not received any dividends yet. Keep using the service to earn patronage!'
            : 'You have not received any dividends yet. Keep providing service to earn patronage!'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '0.5rem', fontWeight: 500 }}>Total Dividends</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#212529' }}>{formatCurrency(summary.total_dividends)}</div>
            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '0.25rem' }}>
              {summary.total_distributions} distributions
            </div>
          </div>

          <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
            <div style={{ fontSize: '12px', color: '#155724', marginBottom: '0.5rem', fontWeight: 500 }}>Paid Out</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#155724' }}>{formatCurrency(summary.total_paid)}</div>
          </div>

          <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
            <div style={{ fontSize: '12px', color: '#856404', marginBottom: '0.5rem', fontWeight: 500 }}>Pending</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#856404' }}>{formatCurrency(summary.total_pending)}</div>
          </div>

          <div style={{ background: '#e7f3ff', padding: '1rem', borderRadius: '8px', border: '1px solid #b8daff' }}>
            <div style={{ fontSize: '12px', color: '#004085', marginBottom: '0.5rem', fontWeight: 500 }}>Total Patronage</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#004085' }}>{summary.total_patronage}</div>
            <div style={{ fontSize: '11px', color: '#004085', marginTop: '0.25rem' }}>
              {memberType === 'driver' ? 'trips driven' : 'trips taken'}
            </div>
          </div>
        </div>
      )}

      {/* Dividend History Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
          <h6 style={{ margin: 0, fontWeight: 600 }}>Dividend History</h6>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Period
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Patronage
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Share %
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Dividend Amount
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                  Payment Date
                </th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((dividend) => (
                <tr key={dividend.dividend_id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>
                      {formatDate(dividend.period_start)} - {formatDate(dividend.period_end)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '0.25rem' }}>
                      {dividend.eligible_members} members | {formatCurrency(dividend.dividend_pool)} pool
                    </div>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 500 }}>{dividend.patronage_value}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {memberType === 'driver' ? 'trips driven' : 'trips taken'}
                    </div>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{ fontWeight: 500 }}>{dividend.patronage_percentage.toFixed(2)}%</span>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#28a745' }}>
                      {formatCurrency(dividend.dividend_amount)}
                    </span>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {getStatusBadge(dividend.payment_status)}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    {dividend.payment_date ? (
                      <>
                        <div style={{ fontSize: '14px' }}>{formatDate(dividend.payment_date)}</div>
                        {dividend.payment_method && (
                          <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '0.25rem' }}>
                            via {dividend.payment_method.replace('_', ' ')}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '12px', color: '#6c757d' }}>
        <strong>ℹ️ About Dividends:</strong> As a cooperative member, you receive dividends based on your patronage (
        {memberType === 'driver' ? 'trips driven' : 'trips taken'}). The more you{' '}
        {memberType === 'driver' ? 'contribute to the service' : 'use the service'}, the larger your share of the surplus.
      </div>
    </div>
  );
};

export default MemberDividendHistory;
