import React from 'react';
import type { InvoiceStats } from '../../types/invoice.types';

interface Props {
  stats: InvoiceStats;
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '10px', color: '#6b7280' }}>{subtitle}</div>}
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '1rem' }}>
      <StatCard
        label="Total Invoices"
        value={stats.totalInvoices.toString()}
        color="#2563eb"
      />

      <StatCard
        label="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        color="#16a34a"
      />

      <StatCard
        label="Total Pending"
        value={formatCurrency(stats.totalPending)}
        color="#ea580c"
      />

      <StatCard
        label="Overdue"
        value={stats.totalOverdue.toString()}
        subtitle={stats.totalOverdue > 0 ? 'Requires attention' : undefined}
        color="#9333ea"
      />

      <StatCard
        label="Collection Rate"
        value={`${stats.collectionRate}%`}
        color="#7c3aed"
      />

      <StatCard
        label="Avg Days to Pay"
        value={`${stats.avgDaysToPay} days`}
        color="#0891b2"
      />
    </div>
  );
};
