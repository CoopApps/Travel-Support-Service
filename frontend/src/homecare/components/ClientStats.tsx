import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dashboardApi } from '../services/homecareApi';
import './ClientStats.css';

interface ClientStatsProps {
  refresh?: number;
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo' | 'red' | 'amber';
}

function StatCard({ label, value, subtitle, theme }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}

function ClientStats({ refresh = 0 }: ClientStatsProps) {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    archived: 0,
    needsAssessment: 0,
    highRisk: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getStats(tenantId);
        const overview = response.data?.overview;

        setStats({
          total: overview?.active_clients + (overview?.archived_clients || 0) || 0,
          active: overview?.active_clients || 0,
          archived: overview?.archived_clients || 0,
          needsAssessment: overview?.clients_needing_assessment || 0,
          highRisk: overview?.high_risk_clients || 0,
        });
      } catch (err) {
        console.error('Failed to load client stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tenantId, refresh]);

  if (loading) {
    return (
      <div className="client-stats-skeleton">
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
        <div className="stat-card skeleton"></div>
      </div>
    );
  }

  return (
    <div className="client-stats">
      <StatCard
        label="Total Clients"
        value={stats.total}
        subtitle="All clients"
        theme="blue"
      />
      <StatCard
        label="Active"
        value={stats.active}
        subtitle="Currently receiving care"
        theme="green"
      />
      <StatCard
        label="Archived"
        value={stats.archived}
        subtitle="Inactive clients"
        theme="purple"
      />
      {stats.needsAssessment > 0 && (
        <StatCard
          label="Needs Assessment"
          value={stats.needsAssessment}
          subtitle="Requires review"
          theme="amber"
        />
      )}
      {stats.highRisk > 0 && (
        <StatCard
          label="High Risk"
          value={stats.highRisk}
          subtitle="Requires attention"
          theme="red"
        />
      )}
    </div>
  );
}

export default ClientStats;
