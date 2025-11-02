import { VehicleStats as VehicleStatsType } from '../../types';
import './VehicleStats.css';

interface VehicleStatsProps {
  stats: VehicleStatsType;
  loading: boolean;
}

/**
 * Vehicle Statistics Cards - Matching Legacy Design
 *
 * Displays fleet statistics with color-coded themes
 */
function VehicleStats({ stats, loading }: VehicleStatsProps) {
  if (loading) {
    return (
      <div className="vehicle-stats-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="stat-card stat-card-loading">
            <h4 className="stat-value">-</h4>
            <small className="stat-label">Loading...</small>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(numAmount)) return '£0';
    return `£${numAmount.toFixed(0)}`;
  };

  return (
    <div className="vehicle-stats-grid">
      <StatCard
        label="Total Vehicles"
        value={stats.total}
        theme="blue"
      />
      <StatCard
        label="Company Owned"
        value={stats.owned}
        theme="green"
      />
      <StatCard
        label="Company Leased"
        value={stats.leased}
        theme="orange"
      />
      <StatCard
        label="Driver Owned"
        value={stats.personal}
        theme="purple"
      />
      <StatCard
        label="Wheelchair Accessible"
        value={stats.wheelchair_accessible}
        theme="teal"
      />
      <StatCard
        label="Monthly Costs"
        value={formatCurrency(stats.total_monthly_costs)}
        theme="indigo"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
}

function StatCard({ label, value, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <h4 className="stat-value">{value}</h4>
      <small className="stat-label">{label}</small>
    </div>
  );
}

export default VehicleStats;
