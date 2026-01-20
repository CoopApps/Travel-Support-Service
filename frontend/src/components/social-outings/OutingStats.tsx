import { useState, useEffect } from 'react';
import { OutingStats as OutingStatsType } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';
import './OutingStats.css';

interface OutingStatsProps {
  tenantId: number;
  onStatsLoaded?: (stats: OutingStatsType) => void;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  theme: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}

/**
 * Outing Stats Component
 *
 * Displays key statistics for social outings
 */
function OutingStats({ tenantId, onStatsLoaded }: OutingStatsProps) {
  const [stats, setStats] = useState<OutingStatsType>({
    total: 0,
    upcoming: 0,
    past: 0,
    total_bookings: 0,
    wheelchair_users: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await socialOutingsApi.getOutingStats(tenantId);
      setStats(data);
      if (onStatsLoaded) {
        onStatsLoaded(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="outing-stats-grid">
        <div className="stat-card stat-card-blue" style={{ opacity: 0.5 }}>
          <div className="stat-value">...</div>
          <div className="stat-label">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="outing-stats-grid">
      <StatCard
        label="Total Outings"
        value={stats.total.toString()}
        subtitle={`${stats.upcoming} Upcoming • ${stats.past} Past`}
        theme="blue"
      />
      <StatCard
        label="Upcoming"
        value={stats.upcoming.toString()}
        subtitle="Scheduled outings"
        theme="green"
      />
      <StatCard
        label="Total Bookings"
        value={stats.total_bookings.toString()}
        subtitle="All confirmed bookings"
        theme="orange"
      />
      <StatCard
        label="Wheelchair Users"
        value={stats.wheelchair_users.toString()}
        subtitle="Require accessible vehicles"
        theme="purple"
      />
    </div>
  );
}

export default OutingStats;
