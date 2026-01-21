import React from 'react';
import type { InvoiceStats } from '../../types/invoice.types';
import './InvoiceStatsCards.css';

interface Props {
  stats: InvoiceStats;
}

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
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
        value={stats.totalInvoices}
        subtitle="All invoices"
        theme="blue"
      />
      <StatCard
        label="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        subtitle="Received payments"
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
        value={stats.totalOverdue}
        subtitle={stats.totalOverdue > 0 ? 'Requires attention' : 'None overdue'}
        theme="purple"
      />
      <StatCard
        label="Collection Rate"
        value={`${stats.collectionRate}%`}
        subtitle="Payment success rate"
        theme="teal"
      />
      <StatCard
        label="Avg Days to Pay"
        value={`${stats.avgDaysToPay} days`}
        subtitle="Average payment time"
        theme="indigo"
      />
    </div>
  );
};
