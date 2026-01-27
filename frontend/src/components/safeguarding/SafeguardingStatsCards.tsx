interface SafeguardingStats {
  total: number;
  critical: number;
  high: number;
  pending: number;
  resolved: number;
}

interface Props {
  stats: SafeguardingStats;
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  theme: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
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

/**
 * Safeguarding Statistics Cards
 * Displays key safeguarding metrics in consistent card format matching Drivers/Customers design
 */
export default function SafeguardingStatsCards({ stats }: Props) {
  return (
    <div className="stat-card-grid">
      <StatCard
        label="Total Reports"
        value={stats.total}
        subtitle="All submissions"
        theme="blue"
      />

      <StatCard
        label="Critical"
        value={stats.critical}
        subtitle="Immediate action"
        theme="red"
      />

      <StatCard
        label="High Priority"
        value={stats.high}
        subtitle="Needs attention"
        theme="orange"
      />

      <StatCard
        label="Resolved"
        value={stats.resolved}
        subtitle="Closed/resolved"
        theme="green"
      />
    </div>
  );
}
