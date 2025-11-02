import { TrainingOverview } from '../../types';

interface Props {
  overview: TrainingOverview;
}

/**
 * Training Statistics Cards - Matching Permits design exactly
 */
function TrainingStatsCards({ overview }: Props) {
  return (
    <div className="training-stats-grid">
      {/* Compliant Drivers - Green */}
      <div className="stat-card stat-card-green">
        <h4 className="stat-value">{overview.driverCompliance.fullyCompliant}</h4>
        <small className="stat-label">Fully Compliant</small>
      </div>

      {/* Expiring Soon - Orange */}
      <div className="stat-card stat-card-orange">
        <h4 className="stat-value">{overview.alerts.expiringSoon}</h4>
        <small className="stat-label">Expiring Soon</small>
      </div>

      {/* Non-Compliant - Red */}
      <div className="stat-card stat-card-red">
        <h4 className="stat-value">
          {overview.driverCompliance.totalDrivers - overview.driverCompliance.fullyCompliant}
        </h4>
        <small className="stat-label">Non-Compliant</small>
      </div>

      {/* Total Drivers - Blue */}
      <div className="stat-card stat-card-blue">
        <h4 className="stat-value">{overview.driverCompliance.totalDrivers}</h4>
        <small className="stat-label">Total Drivers</small>
      </div>
    </div>
  );
}

export default TrainingStatsCards;
