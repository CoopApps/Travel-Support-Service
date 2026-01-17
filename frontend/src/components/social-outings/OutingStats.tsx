import { useState, useEffect } from 'react';
import { OutingStats as OutingStatsType } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';

interface OutingStatsProps {
  tenantId: number;
  onStatsLoaded?: (stats: OutingStatsType) => void;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '10px', color: '#6b7280' }}>{subtitle}</div>}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', opacity: 0.5 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb' }}>...</div>
          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>Loading...</div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
      <StatCard
        label="Total Outings"
        value={stats.total.toString()}
        subtitle={`${stats.upcoming} Upcoming • ${stats.past} Past`}
        color="#2563eb"
      />
      <StatCard
        label="Upcoming"
        value={stats.upcoming.toString()}
        subtitle="Scheduled outings"
        color="#16a34a"
      />
      <StatCard
        label="Total Bookings"
        value={stats.total_bookings.toString()}
        subtitle="All confirmed bookings"
        color="#ea580c"
      />
      <StatCard
        label="Wheelchair Users"
        value={stats.wheelchair_users.toString()}
        subtitle="Require accessible vehicles"
        color="#9333ea"
      />
    </div>
  );
}

export default OutingStats;
