import { useEffect, useState } from 'react';
import './DriverStats.css';

interface DriverStatsData {
  summary: {
    total: number;
    contracted: number;
    freelance: number;
    employed: number;
  };
  financial: {
    contractedWeekly: number;
    freelanceEst: number;
    fuelCosts: number;
  };
}

interface DriverStatsProps {
  tenantId: number;
  onStatsLoaded?: (stats: any) => void;
}

/**
 * Driver Statistics Cards - Matching Customer Module Design
 *
 * Displays 4 stat cards with color-coded themes
 */
function DriverStats({ tenantId, onStatsLoaded }: DriverStatsProps) {
  const [stats, setStats] = useState<DriverStatsData>({
    summary: {
      total: 0,
      contracted: 0,
      freelance: 0,
      employed: 0,
    },
    financial: {
      contractedWeekly: 0,
      freelanceEst: 0,
      fuelCosts: 0,
    },
  });

  // Fetch real stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { driverApi } = await import('../../services/api');
        const data = await driverApi.getEnhancedStats(tenantId);
        setStats(data);
        if (onStatsLoaded) {
          onStatsLoaded(data);
        }
      } catch {
        // Error handled silently
      }
    };
    fetchStats();
  }, [tenantId]);

  const formatCurrency = (value: number): string => {
    return `£${value.toFixed(2)}`;
  };

  return (
    <div className="driver-stats-grid">
      <StatCard
        label="Total Drivers"
        value={stats.summary.total.toString()}
        subtitle={`${stats.summary.contracted} Contracted • ${stats.summary.freelance} Freelance`}
        theme="blue"
      />
      <StatCard
        label="Contracted Weekly"
        value={formatCurrency(stats.financial.contractedWeekly)}
        subtitle="Fixed + allowances"
        theme="green"
      />
      <StatCard
        label="Freelance Est."
        value={formatCurrency(stats.financial.freelanceEst)}
        subtitle={stats.summary.freelance === 0 ? 'No freelance' : 'Estimated weekly'}
        theme="orange"
      />
      <StatCard
        label="Fuel Costs"
        value={formatCurrency(stats.financial.fuelCosts)}
        subtitle="Allowances + cards"
        theme="purple"
      />
    </div>
  );
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

export default DriverStats;
