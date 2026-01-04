import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { GlobeIcon, HeartIcon, BarChartIcon, SparklesIcon, SproutIcon } from '../icons/BusIcons';

/**
 * Cooperative Commonwealth Fund Tracker
 *
 * Shows the cumulative impact of surplus contributions to the broader
 * cooperative movement. Demonstrates cooperative principle:
 * "Cooperation among cooperatives"
 */

interface CommonwealthFund {
  totalContributed: number;
  totalDistributed: number;
  currentBalance: number;
}

interface CommonwealthContribution {
  contributionId: number;
  amount: number;
  surplusTotal: number;
  percentage: number;
  contributedAt: string;
}

interface CommonwealthStats {
  tripsContributed: number;
  monthlyAverage: number;
}

export default function CooperativeCommonwealthTracker() {
  const { tenant } = useTenant();
  const [fund, setFund] = useState<CommonwealthFund | null>(null);
  const [recentContributions, setRecentContributions] = useState<CommonwealthContribution[]>([]);
  const [stats, setStats] = useState<CommonwealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchCommonwealthFund = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `/api/tenants/${tenant.tenant_id}/commonwealth-fund`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch commonwealth fund');
        }

        const data = await response.json();
        setFund(data.fund);
        setRecentContributions(data.recentContributions || []);
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCommonwealthFund();
  }, [tenant?.tenant_id]);

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading commonwealth fund...</p>
      </div>
    );
  }

  if (error || !fund) {
    return (
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '1rem',
        color: '#991b1b'
      }}>
        {error || 'No commonwealth fund data available'}
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: 'white',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
          <GlobeIcon size={32} color="white" />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          Cooperative Commonwealth Fund
        </h3>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
          Building a stronger cooperative movement together
        </p>
      </div>

      {/* Fund Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: '#e5e7eb'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Contributed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
            {formatCurrency(fund.totalContributed || 0)}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Balance
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(fund.currentBalance || 0)}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Monthly Average
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
            {formatCurrency(stats?.monthlyAverage || 0)}
          </div>
        </div>
      </div>

      {/* About the Fund */}
      <div style={{ padding: '1.5rem', background: '#faf5ff', borderTop: '1px solid #e9d5ff' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b21a8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HeartIcon size={16} color="#a855f7" />
          What is the Cooperative Commonwealth?
        </h4>
        <p style={{ fontSize: '0.8125rem', color: '#581c87', lineHeight: 1.6, margin: 0 }}>
          When our bus services generate surplus (more passengers than break-even), a portion is contributed
          to the broader cooperative movement. This fund supports other cooperatives, mutual aid networks,
          and community wealth-building initiatives. Together, we build a solidarity economy that prioritizes
          people and planet over profit.
        </p>
      </div>

      {/* Recent Contributions */}
      {recentContributions.length > 0 && (
        <div style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChartIcon size={16} color="#111827" />
            Recent Contributions
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentContributions.slice(0, 5).map((contribution) => (
              <div
                key={contribution.contributionId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {formatCurrency(contribution.amount)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                    {contribution.percentage}% of £{contribution.surplusTotal.toFixed(2)} surplus
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
                  {new Date(contribution.contributedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>

          {stats && stats.tripsContributed > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f0fdf4',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#047857',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <SparklesIcon size={16} color="#047857" />
              <span><strong>{stats.tripsContributed} trips</strong> have contributed to the cooperative commonwealth this month</span>
            </div>
          )}
        </div>
      )}

      {/* No contributions yet */}
      {recentContributions.length === 0 && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
            <SproutIcon size={48} color="#9ca3af" />
          </div>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>
            No contributions yet. Surplus from fully-booked trips will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
