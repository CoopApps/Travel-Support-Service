import { useState, useEffect } from 'react';
import { tenantApi } from '../../services/platform-admin-api';
import type { PlatformStats } from '../../types';

/**
 * Tenant Statistics Component
 * Displays platform-wide statistics
 */

function TenantStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await tenantApi.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: '1.25rem', animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: '40px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
            <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', width: '60%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Organisations',
      value: stats.totalTenants,
      color: '#3b82f6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z"/>
        </svg>
      ),
    },
    {
      label: 'Active',
      value: stats.activeTenants,
      color: '#10b981',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      label: 'Inactive',
      value: stats.inactiveTenants,
      color: '#ef4444',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      ),
    },
    {
      label: 'Monthly Revenue',
      value: `£${(stats.totalRevenue || 0).toFixed(2)}`,
      color: '#f59e0b',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {statCards.map((stat, index) => (
        <div key={index} className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.25rem', fontWeight: 500 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stat.value}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: `${stat.color}15`,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TenantStats;
