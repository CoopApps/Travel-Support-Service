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

function CustomerStats({ tenantId }: CustomerStatsProps) {
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    destinations: 0,
    splitPayment: 0,
    withTimes: 0,
    loginEnabled: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { customerApi } = await import('../../services/api');
        const data = await customerApi.getStats(tenantId);
        setStats(data);
      } catch {
        // Error handled silently
      }
    };
    fetchStats();
  }, [tenantId]);

  return (
    <div className="customer-stats-grid">
      <StatCard
        label="Total Customers"
        value={stats.total}
        subtitle="All registered customers"
        theme="blue"
      />
      <StatCard
        label="Active Customers"
        value={stats.active}
        subtitle="Currently using service"
        theme="green"
      />
      <StatCard
        label="Destinations"
        value={stats.destinations}
        subtitle="Unique destination addresses"
        theme="orange"
      />
      <StatCard
        label="Split Payment"
        value={stats.splitPayment}
        subtitle="Multiple payers configured"
        theme="purple"
      />
      <StatCard
        label="Times Set"
        value={stats.withTimes}
        subtitle="Specific pickup/drop-off times"
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

export default CustomerStats;
