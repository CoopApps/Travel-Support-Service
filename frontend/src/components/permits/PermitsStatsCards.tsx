import { PermitsStats } from '../../types';
import './PermitsStatsCards.css';

interface PermitsStatsCardsProps {
  stats: PermitsStats;
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  theme: 'green' | 'orange' | 'red' | 'blue';
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
 * Permits Statistics Cards
 * Displays driver permit compliance metrics in consistent card format matching Safeguarding design
 */
function PermitsStatsCards({ stats }: PermitsStatsCardsProps) {
  return (
    <div className="permits-stats-grid">
      <StatCard
        label="Fully Compliant"
        value={stats.drivers.compliant}
        subtitle="All permits valid"
        theme="green"
      />

      <StatCard
        label="Expiring Soon"
        value={stats.drivers.expiring}
        subtitle="Needs renewal"
        theme="orange"
      />

      <StatCard
        label="Non-Compliant"
        value={stats.drivers.expired + stats.drivers.missing}
        subtitle="Expired/missing"
        theme="red"
      />

      <StatCard
        label="Total Drivers"
        value={stats.drivers.total}
        subtitle="All drivers"
        theme="blue"
      />
    </div>
  );
}

export default PermitsStatsCards;
