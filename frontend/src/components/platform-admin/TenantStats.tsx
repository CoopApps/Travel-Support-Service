import { useState, useEffect } from 'react';
import { tenantApi } from '../../services/platform-admin-api';
import type { PlatformStats } from '../../types';

/**
 * Tenant Stats Component
 *
 * Displays platform statistics cards
 */

function TenantStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await tenantApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: '1rem', minHeight: '90px' }}>
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ marginBottom: '1.5rem', padding: '0.75rem', fontSize: '13px' }}>
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* Total Tenants */}
      <div className="card" style={{
        padding: '1rem',
        borderLeft: '3px solid #3b82f6',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '0.3rem' }}>
          Total Tenants
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '0.3rem' }}>
          {stats.total}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          All registered organizations
        </div>
      </div>

      {/* Active Tenants */}
      <div className="card" style={{
        padding: '1rem',
        borderLeft: '3px solid #10b981',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '0.3rem' }}>
          Active Tenants
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '0.3rem' }}>
          {stats.active}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          Currently operational
        </div>
      </div>

      {/* Inactive Tenants */}
      <div className="card" style={{
        padding: '1rem',
        borderLeft: '3px solid #ef4444',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '0.3rem' }}>
          Inactive Tenants
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '0.3rem' }}>
          {stats.inactive}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          Suspended or cancelled
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="card" style={{
        padding: '1rem',
        borderLeft: '3px solid #f59e0b',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '0.3rem' }}>
          Monthly Revenue
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '0.3rem' }}>
          £{(stats.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          After co-op discounts
        </div>
      </div>

      {/* Organization Type Breakdown - Full Width */}
      <div className="card" style={{ padding: '1rem', gridColumn: '1 / -1' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-800)' }}>
          Organization Type Breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(stats.byOrgType || {}).map(([orgType, data]: [string, any]) => {
            const orgTypeLabels: Record<string, string> = {
              charity: 'Charity',
              cic: 'CIC',
              third_sector: 'Third Sector',
              cooperative: 'Co-operative',
              cooperative_commonwealth: 'Commonwealth',
            };
            const orgTypeColors: Record<string, string> = {
              charity: '#6b7280',
              cic: '#3b82f6',
              third_sector: '#8b5cf6',
              cooperative: '#10b981',
              cooperative_commonwealth: '#f59e0b',
            };
            return (
              <div key={orgType} style={{
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '6px',
                borderLeft: `3px solid ${orgTypeColors[orgType] || '#6b7280'}`,
              }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>
                  {orgTypeLabels[orgType] || orgType}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
                  {data.count}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px' }}>
                  £{data.revenue?.toFixed(0)}/mo revenue
                </div>
                {data.avgDiscount > 0 && (
                  <div style={{ fontSize: '9px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                    Avg discount: {data.avgDiscount.toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TenantStats;
