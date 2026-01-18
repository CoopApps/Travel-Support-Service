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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1rem' }}>
      <StatCard
        label="Total Drivers"
        value={stats.summary.total.toString()}
        subtitle={`${stats.summary.contracted} Contracted • ${stats.summary.freelance} Freelance`}
        color="#2563eb"
      />
      <StatCard
        label="Contracted Weekly"
        value={formatCurrency(stats.financial.contractedWeekly)}
        subtitle="Fixed + allowances"
        color="#16a34a"
      />
      <StatCard
        label="Freelance Est."
        value={formatCurrency(stats.financial.freelanceEst)}
        subtitle={stats.summary.freelance === 0 ? 'No freelance' : 'Estimated weekly'}
        color="#ea580c"
      />
      <StatCard
        label="Fuel Costs"
        value={formatCurrency(stats.financial.fuelCosts)}
        subtitle="Allowances + cards"
        color="#9333ea"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}

function getBackgroundColor(color: string): string {
  const colorMap: { [key: string]: string } = {
    '#2563eb': '#dbeafe', // blue
    '#16a34a': '#dcfce7', // green
    '#ea580c': '#ffedd5', // orange
    '#9333ea': '#f3e8ff'  // purple
  };
  return colorMap[color] || '#f9fafb';
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div style={{ padding: '12px', borderRadius: '6px', background: getBackgroundColor(color) }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '10px', color: '#6b7280' }}>{subtitle}</div>}
    </div>
  );
}

export default DriverStats;
