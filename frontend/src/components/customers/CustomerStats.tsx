import { useEffect, useState } from 'react';
import './CustomerStats.css';

interface CustomerStats {
  total: number;
  active: number;
  destinations: number;
  splitPayment: number;
  withTimes: number;
  loginEnabled: number;
}

interface CustomerStatsProps {
  tenantId: number;
}

/**
 * Customer Statistics Cards - Matching Legacy Design
 *
 * Displays 6 stat cards with color-coded themes
 */
function CustomerStats({ tenantId }: CustomerStatsProps) {
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    destinations: 0,
    splitPayment: 0,
    withTimes: 0,
    loginEnabled: 0,
  });

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { customerApi } = await import('../../services/api');
        const data = await customerApi.getStats(tenantId);
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, [tenantId]);

  return (
    <div className="customer-stats-grid">
      <StatCard
        label="Total Customers"
        value={stats.total}
        subtitle={`${stats.active} Active • ${stats.total - stats.active} Inactive`}
        theme="blue"
      />
      <StatCard
        label="Active Customers"
        value={stats.active}
        subtitle="Currently receiving service"
        theme="green"
      />
      <StatCard
        label="Destinations"
        value={stats.destinations}
        subtitle="Unique locations"
        theme="orange"
      />
      <StatCard
        label="Split Payment Customers"
        value={stats.splitPayment}
        subtitle="Multiple payment sources"
        theme="purple"
      />
      <StatCard
        label="Customers with Times Set"
        value={stats.withTimes}
        subtitle="Scheduled pickup times"
        theme="teal"
      />
      <StatCard
        label="Login Enabled"
        value={stats.loginEnabled}
        subtitle="Portal access granted"
        theme="indigo"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
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

export default CustomerStats;
