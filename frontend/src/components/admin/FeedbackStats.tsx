import React, { useState, useEffect } from 'react';
import { feedbackApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface FeedbackStatsData {
  total_feedback: number;
  pending: number;
  acknowledged: number;
  investigating: number;
  resolved: number;
  closed: number;
  complaints: number;
  feedback: number;
  compliments: number;
  suggestions: number;
  critical: number;
  high_severity: number;
  last_7_days: number;
  last_30_days: number;
  avg_satisfaction_rating?: number;
}

function FeedbackStats() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<FeedbackStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchStats();
    }
  }, [tenantId]);

  const fetchStats = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const data = await feedbackApi.getStats(tenantId);
      setStats(data);
    } catch (err) {
      console.error('Error fetching feedback stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card" style={{ minHeight: '100px' }}>
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const activeCases = stats.pending + stats.acknowledged + stats.investigating;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      {/* Total Feedback */}
      <div className="stat-card">
        <div className="stat-label" style={{ color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 500 }}>
          Total Feedback
        </div>
        <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '0.5rem' }}>
          {stats.total_feedback}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          {stats.last_7_days} in last 7 days
        </div>
      </div>

      {/* Active Cases */}
      <div className="stat-card">
        <div className="stat-label" style={{ color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 500 }}>
          Active Cases
        </div>
        <div className="stat-value" style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: activeCases > 0 ? '#f59e0b' : 'var(--gray-900)',
          marginTop: '0.5rem'
        }}>
          {activeCases}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          Pending resolution
        </div>
      </div>

      {/* Complaints */}
      <div className="stat-card">
        <div className="stat-label" style={{ color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 500 }}>
          Complaints
        </div>
        <div className="stat-value" style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: stats.complaints > 0 ? '#ef4444' : 'var(--gray-900)',
          marginTop: '0.5rem'
        }}>
          {stats.complaints}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          {stats.critical} critical
        </div>
      </div>

      {/* Satisfaction */}
      <div className="stat-card">
        <div className="stat-label" style={{ color: 'var(--gray-600)', fontSize: '0.875rem', fontWeight: 500 }}>
          Avg. Satisfaction
        </div>
        <div className="stat-value" style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#10b981',
          marginTop: '0.5rem'
        }}>
          {stats.avg_satisfaction_rating ? stats.avg_satisfaction_rating.toFixed(1) : 'N/A'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          Out of 5.0
        </div>
      </div>
    </div>
  );
}

export default FeedbackStats;
