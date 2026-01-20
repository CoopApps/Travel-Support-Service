import React from 'react';
import type { InvoiceStats } from '../../types/invoice.types';
import './InvoiceStatsCards.css';

interface Props {
  stats: InvoiceStats;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'violet' | 'cyan';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
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
    <div className="invoice-stats-grid">
      <StatCard
        label="Total Invoices"
        value={stats.totalInvoices.toString()}
        theme="blue"
      />

      <StatCard
        label="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        theme="green"
      />

      <StatCard
        label="Total Pending"
        value={formatCurrency(stats.totalPending)}
        theme="orange"
      />

      <StatCard
        label="Overdue"
        value={stats.totalOverdue.toString()}
        subtitle={stats.totalOverdue > 0 ? 'Requires attention' : undefined}
        theme="purple"
      />

      <StatCard
        label="Collection Rate"
        value={`${stats.collectionRate}%`}
        theme="violet"
      />

      <StatCard
        label="Avg Days to Pay"
        value={`${stats.avgDaysToPay} days`}
        theme="cyan"
      />
    </div>
  );
};
