import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dashboardApi } from '../services/homecareApi';
import './ClientStats.css';

interface ClientStatsProps {
  refresh?: number;
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
      </div>
    );
  }

  return (
    <div className="client-stats">
      <div className="stat-card">
        <div className="stat-label">Total Clients</div>
        <div className="stat-value">{stats.total}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Active</div>
        <div className="stat-value stat-success">{stats.active}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Archived</div>
        <div className="stat-value stat-muted">{stats.archived}</div>
      </div>
      {stats.needsAssessment > 0 && (
        <div className="stat-card stat-warning-card">
          <div className="stat-label">Needs Assessment</div>
          <div className="stat-value stat-warning">{stats.needsAssessment}</div>
        </div>
      )}
      {stats.highRisk > 0 && (
        <div className="stat-card stat-danger-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value stat-danger">{stats.highRisk}</div>
        </div>
      )}
    </div>
  );
}

export default ClientStats;
