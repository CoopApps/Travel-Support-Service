import React from 'react';
import type { ProviderStats } from '../../types';

interface ProviderStatsProps {
  stats: ProviderStats;
}

function ProviderStatsComponent({ stats }: ProviderStatsProps) {
  const formatCurrency = (amount: number) => {
    return '£' + amount.toFixed(2);
  };

  const formatProviderName = (name: string | undefined) => {
    if (!name || name === 'N/A') return 'N/A';
    if (name.length > 15) return name.substring(0, 15) + '...';
    return name;
  };

  return (
    <div className="provider-stats-grid">
      <div className="stat-card stat-card-blue">
        <div className="stat-value">{stats.totalProviders || 0}</div>
        <div className="stat-label">Active Providers</div>
        <div className="stat-subtitle">Registered funding sources</div>
      </div>

      <div className="stat-card stat-card-purple">
        <div className="stat-value">{stats.totalCustomers || 0}</div>
        <div className="stat-label">Funded Customers</div>
        <div className="stat-subtitle">Customers with provider funding</div>
      </div>

      <div className="stat-card stat-card-green">
        <div className="stat-value">{formatCurrency(stats.totalWeeklyRevenue || 0)}</div>
        <div className="stat-label">Weekly Revenue</div>
        <div className="stat-subtitle">Provider-funded services</div>
      </div>

      <div className="stat-card stat-card-orange">
        <div className="stat-value">{formatCurrency(stats.totalMonthlyRevenue || 0)}</div>
        <div className="stat-label">Monthly Revenue</div>
        <div className="stat-subtitle">Avg 4.33 weeks</div>
      </div>

      <div className="stat-card stat-card-gold">
        <div className="stat-value" title={stats.largestProvider || 'N/A'}>
          {formatProviderName(stats.largestProvider)}
        </div>
        <div className="stat-label">Largest Provider</div>
        <div className="stat-subtitle">By customer count</div>
      </div>
    </div>
  );
}

export default ProviderStatsComponent;
