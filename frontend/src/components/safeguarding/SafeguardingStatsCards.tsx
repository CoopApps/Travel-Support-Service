import React from 'react';

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
  value: string;
  subtitle?: string;
  theme: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <h4 className="stat-value">{value}</h4>
      <small className="stat-label">{label}</small>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}

/**
 * Safeguarding Statistics Cards
 * Displays key safeguarding metrics in consistent card format
 */
export default function SafeguardingStatsCards({ stats }: Props) {
  return (
    <div className="stats-grid">
      <StatCard
        label="Total Reports"
        value={stats.total.toString()}
        theme="gray"
      />

      <StatCard
        label="Critical (Open)"
        value={stats.critical.toString()}
        subtitle={stats.critical > 0 ? 'Immediate action required' : undefined}
        theme="red"
      />

      <StatCard
        label="High Priority (Open)"
        value={stats.high.toString()}
        theme="orange"
      />

      <StatCard
        label="Pending Review"
        value={stats.pending.toString()}
        theme="yellow"
      />

      <StatCard
        label="Resolved"
        value={stats.resolved.toString()}
        theme="green"
      />
    </div>
  );
}
