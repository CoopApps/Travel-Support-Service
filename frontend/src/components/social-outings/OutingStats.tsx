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
  const getBackgroundColor = (textColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#2563eb': '#dbeafe', // blue
      '#16a34a': '#dcfce7', // green
      '#ea580c': '#ffedd5', // orange
      '#9333ea': '#f3e8ff'  // purple
    };
    return colorMap[textColor] || '#f9fafb';
  };

  const getDarkerColor = (textColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#2563eb': '#1e40af', // blue
      '#16a34a': '#166534', // green
      '#ea580c': '#c2410c', // orange
      '#9333ea': '#7e22ce'  // purple
    };
    return colorMap[textColor] || textColor;
  };

  return (
    <div style={{ background: getBackgroundColor(color), padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: getDarkerColor(color), marginBottom: '2px', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '10px', color: getDarkerColor(color), fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', opacity: 0.85, marginTop: '2px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', lineHeight: 1.3 }}>{subtitle}</div>}
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
        <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px', minHeight: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>...</div>
          <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: 500, textTransform: 'uppercase' }}>Loading...</div>
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
