import { VehicleStats as VehicleStatsType } from '../../types';
import './VehicleStats.css';

interface VehicleStatsProps {
  stats: VehicleStatsType;
  loading: boolean;
}

function VehicleStats({ stats, loading }: VehicleStatsProps) {
  if (loading) {
    return (
      <div className="vehicle-stats-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="stat-card stat-card-loading">
            <div className="stat-value">-</div>
            <div className="stat-label">Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(numAmount)) return '£0';
    const fixed = numAmount.toFixed(0);
    return '£' + fixed;
  };

  return (
    <div className="vehicle-stats-grid">
      <StatCard
        label="Total Vehicles"
        value={stats.total}
        subtitle="All vehicles in fleet"
        theme="blue"
      />
      <StatCard
        label="Company Owned"
        value={stats.owned}
        subtitle="Owned outright"
        theme="green"
      />
      <StatCard
        label="Company Leased"
        value={stats.leased}
        subtitle="On lease agreements"
        theme="orange"
      />
      <StatCard
        label="Driver Owned"
        value={stats.personal}
        subtitle="Driver-provided vehicles"
        theme="purple"
      />
      <StatCard
        label="Wheelchair Accessible"
        value={stats.wheelchair_accessible}
        subtitle="WAV certified"
        theme="teal"
      />
      <StatCard
        label="Monthly Costs"
        value={formatCurrency(stats.total_monthly_costs)}
        subtitle="Lease + insurance + maintenance"
        theme="indigo"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={'stat-card stat-card-' + theme}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}

export default VehicleStats;
