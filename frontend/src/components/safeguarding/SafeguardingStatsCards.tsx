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
  theme: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue';
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
 * Displays key safeguarding metrics in consistent card format
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
        label="Critical (Open)"
        value={stats.critical}
        subtitle="Immediate action required"
        theme="red"
      />

      <StatCard
        label="High Priority (Open)"
        value={stats.high}
        subtitle="Needs attention"
        theme="orange"
      />

      <StatCard
        label="Pending Review"
        value={stats.pending}
        subtitle="Under assessment"
        theme="yellow"
      />

      <StatCard
        label="Resolved"
        value={stats.resolved}
        subtitle="Closed or resolved"
        theme="green"
      />
    </div>
  );
}
