import React from 'react';
import { FuelCardStats as FuelCardStatsType } from '../../types/fuelCard.types';
import './FuelCardStats.css';

interface FuelCardStatsProps {
  stats: FuelCardStatsType | null;
  loading?: boolean;
}

const FuelCardStats: React.FC<FuelCardStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="fuel-card-stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card stat-card-loading">
            <h4 className="stat-value">...</h4>
            <small className="stat-label">Loading...</small>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="fuel-card-stats-grid">
      <div className="stat-card stat-card-blue">
        <h4 className="stat-value">{stats.activeCards || 0}</h4>
        <small className="stat-label">Active Cards</small>
        <small className="stat-subtitle">{stats.totalCards || 0} total cards</small>
      </div>

      <div className="stat-card stat-card-green">
        <h4 className="stat-value">£{(stats.monthTotal || 0).toFixed(2)}</h4>
        <small className="stat-label">This Month</small>
        <small className="stat-subtitle">{stats.transactionsThisMonth || 0} transactions</small>
      </div>

      <div className="stat-card stat-card-orange">
        <h4 className="stat-value">{stats.avgMPG || 0} MPG</h4>
        <small className="stat-label">Fleet Average</small>
        <small className="stat-subtitle">Miles per gallon</small>
      </div>

      <div className="stat-card stat-card-purple">
        <h4 className="stat-value">{(stats.monthLitres || 0).toFixed(1)}L</h4>
        <small className="stat-label">Litres This Month</small>
        <small className="stat-subtitle">Total fuel consumed</small>
      </div>
    </div>
  );
};

export default FuelCardStats;
