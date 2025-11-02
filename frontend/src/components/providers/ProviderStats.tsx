import React from 'react';
import type { ProviderStats } from '../../types';

interface ProviderStatsProps {
  stats: ProviderStats;
}

/**
 * Provider Statistics Cards
 * Shows key metrics matching other modules styling
 */
function ProviderStatsComponent({ stats }: ProviderStatsProps) {
  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Truncate long provider names for display
  const formatProviderName = (name: string | undefined) => {
    if (!name || name === 'N/A') return 'N/A';
    if (name.length > 15) return name.substring(0, 15) + '...';
    return name;
  };

  return (
    <div className="provider-stats-grid">
      {/* Card 1: Active Providers */}
      <div className="stat-card stat-card-blue">
        <h4 className="stat-value">{stats.totalProviders || 0}</h4>
        <small className="stat-label">Active Providers</small>
      </div>

      {/* Card 2: Funded Customers */}
      <div className="stat-card stat-card-purple">
        <h4 className="stat-value">{stats.totalCustomers || 0}</h4>
        <small className="stat-label">Funded Customers</small>
      </div>

      {/* Card 3: Weekly Revenue */}
      <div className="stat-card stat-card-green">
        <h4 className="stat-value">{formatCurrency(stats.totalWeeklyRevenue || 0)}</h4>
        <small className="stat-label">Weekly Revenue</small>
      </div>

      {/* Card 4: Monthly Revenue */}
      <div className="stat-card stat-card-orange">
        <h4 className="stat-value">{formatCurrency(stats.totalMonthlyRevenue || 0)}</h4>
        <small className="stat-label">Monthly Revenue</small>
      </div>

      {/* Card 5: Largest Provider */}
      <div className="stat-card stat-card-gold">
        <h4 className="stat-value" title={stats.largestProvider || 'N/A'}>
          {formatProviderName(stats.largestProvider)}
        </h4>
        <small className="stat-label">Largest Provider</small>
      </div>
    </div>
  );
}

export default ProviderStatsComponent;
