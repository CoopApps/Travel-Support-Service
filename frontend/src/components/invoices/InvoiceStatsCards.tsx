import React from 'react';
import type { InvoiceStats } from '../../types/invoice.types';

interface Props {
  stats: InvoiceStats;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
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
 * Invoice Statistics Cards
 * Displays key invoice metrics in card format
 */
export const InvoiceStatsCards: React.FC<Props> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="stats-grid">
      <StatCard
        label="Total Invoices"
        value={stats.totalInvoices.toString()}
        subtitle="All time records"
        theme="blue"
      />

      <StatCard
        label="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        subtitle="Collected revenue"
        theme="green"
      />

      <StatCard
        label="Total Pending"
        value={formatCurrency(stats.totalPending)}
        subtitle="Awaiting payment"
        theme="orange"
      />

      <StatCard
        label="Overdue"
        value={stats.totalOverdue.toString()}
        subtitle={stats.totalOverdue > 0 ? 'Requires attention' : 'No overdue invoices'}
        theme="purple"
      />

      <StatCard
        label="Collection Rate"
        value={`${stats.collectionRate}%`}
        subtitle="Payment success rate"
        theme="indigo"
      />

      <StatCard
        label="Avg Days to Pay"
        value={`${stats.avgDaysToPay} days`}
        subtitle="Average collection time"
        theme="teal"
      />
    </div>
  );
};
