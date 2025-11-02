import { PermitsStats } from '../../types';

interface PermitsStatsCardsProps {
  stats: PermitsStats;
}

function PermitsStatsCards({ stats }: PermitsStatsCardsProps) {
  return (
    <div className="permits-stats-grid">
      <div className="stat-card stat-card-green">
        <h4 className="stat-value">{stats.drivers.compliant}</h4>
        <small className="stat-label">Fully Compliant</small>
      </div>

      <div className="stat-card stat-card-orange">
        <h4 className="stat-value">{stats.drivers.expiring}</h4>
        <small className="stat-label">Expiring Soon</small>
      </div>

      <div className="stat-card stat-card-red">
        <h4 className="stat-value">{stats.drivers.expired + stats.drivers.missing}</h4>
        <small className="stat-label">Non-Compliant</small>
      </div>

      <div className="stat-card stat-card-blue">
        <h4 className="stat-value">{stats.drivers.total}</h4>
        <small className="stat-label">Total Drivers</small>
      </div>
    </div>
  );
}

export default PermitsStatsCards;
