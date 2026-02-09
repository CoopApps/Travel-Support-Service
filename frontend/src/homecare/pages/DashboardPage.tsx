import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { homecareDashboardApi, DashboardStats } from '../services/homecareApi';
import './DashboardPage.css';

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo' | 'red' | 'amber';
  link?: string;
}

function StatCard({ label, value, subtitle, theme, link }: StatCardProps) {
  const card = (
    <div className={'stat-card stat-card-' + theme}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );

  if (link) {
    return <Link to={link} style={{ textDecoration: 'none' }}>{card}</Link>;
  }
  return card;
}

function HomecareDashboard() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await homecareDashboardApi.getStats(tenantId);
        setStats(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load dashboard stats');
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [tenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  const overview = stats?.overview || {};
  const visits = stats?.visits || {};
  const alerts = stats?.alerts || {};

  // Calculate completion rate
  const completionRate = visits.completion_rate || 0;

  return (
    <div className="homecare-dashboard">
      <div className="homecare-dashboard-header">
        <h1 className="homecare-dashboard-title">Home Care Dashboard</h1>
      </div>

      {/* Overview Stats - Colored Cards */}
      <div className="homecare-stats-grid">
        <StatCard
          label="Active Clients"
          value={overview.active_clients || 0}
          subtitle="Currently receiving care"
          theme="blue"
          link="/homecare/clients"
        />
        <StatCard
          label="Active Carers"
          value={overview.active_carers || 0}
          subtitle="Available staff"
          theme="green"
          link="/homecare/carers"
        />
        <StatCard
          label="Today's Visits"
          value={visits.today || 0}
          subtitle="Scheduled for today"
          theme="purple"
          link="/homecare/visits"
        />
        <StatCard
          label="Completed Visits"
          value={visits.completed_this_month || 0}
          subtitle="This month"
          theme="teal"
        />
        <StatCard
          label="Completion Rate"
          value={formatPercentage(completionRate)}
          subtitle="Visit completion"
          theme="indigo"
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(overview.revenue_this_month || 0)}
          subtitle="Current month"
          theme="orange"
          link="/homecare/invoices"
        />
      </div>

      {/* Alerts Section */}
      {(alerts.expiring_dbs_checks || alerts.expiring_documents || alerts.overdue_invoices || alerts.unassigned_visits || alerts.clients_needing_assessment || alerts.high_risk_clients) && (
        <div className="homecare-alerts-section">
          <h2 className="homecare-section-title">Alerts & Actions Required</h2>
          <div className="homecare-alerts-grid">
            {(alerts.expiring_dbs_checks || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fcd34d' }}>
                <p style={{ color: '#92400e', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  Expiring DBS Checks
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#92400e', margin: '0 0 8px 0' }}>
                  {alerts.expiring_dbs_checks}
                </p>
                <Link to="/homecare/carers" style={{ color: '#92400e', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Review carers &rarr;
                </Link>
              </div>
            )}

            {(alerts.expiring_documents || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fcd34d' }}>
                <p style={{ color: '#92400e', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  Expiring Documents
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#92400e', margin: '0 0 8px 0' }}>
                  {alerts.expiring_documents}
                </p>
                <Link to="/homecare/documents" style={{ color: '#92400e', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Review documents &rarr;
                </Link>
              </div>
            )}

            {(alerts.overdue_invoices || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <p style={{ color: '#991b1b', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  Overdue Invoices
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
                  {alerts.overdue_invoices}
                </p>
                <Link to="/homecare/invoices?status=overdue" style={{ color: '#991b1b', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Review invoices &rarr;
                </Link>
              </div>
            )}

            {(alerts.unassigned_visits || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <p style={{ color: '#991b1b', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  Unassigned Visits
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
                  {alerts.unassigned_visits}
                </p>
                <Link to="/homecare/visits?status=scheduled" style={{ color: '#991b1b', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Assign carers &rarr;
                </Link>
              </div>
            )}

            {(alerts.clients_needing_assessment || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#dbeafe', border: '1px solid #93c5fd' }}>
                <p style={{ color: '#1e3a8a', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  Need Assessment
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 8px 0' }}>
                  {alerts.clients_needing_assessment}
                </p>
                <Link to="/homecare/clients" style={{ color: '#1e3a8a', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Review clients &rarr;
                </Link>
              </div>
            )}

            {(alerts.high_risk_clients || 0) > 0 && (
              <div className="card" style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                <p style={{ color: '#991b1b', fontSize: '12px', marginBottom: '8px', fontWeight: 500 }}>
                  High Risk Clients
                </p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
                  {alerts.high_risk_clients}
                </p>
                <Link to="/homecare/clients" style={{ color: '#991b1b', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  Review clients &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="homecare-quick-actions">
        <h2 className="homecare-section-title">Quick Actions</h2>
        <div className="homecare-actions-grid">
          <Link to="/homecare/clients" className="homecare-action-card">
            <h4 className="homecare-action-title">Manage Clients</h4>
            <p className="homecare-action-description">View and edit client records</p>
          </Link>

          <Link to="/homecare/carers" className="homecare-action-card">
            <h4 className="homecare-action-title">Manage Carers</h4>
            <p className="homecare-action-description">Staff and training records</p>
          </Link>

          <Link to="/homecare/visits" className="homecare-action-card">
            <h4 className="homecare-action-title">Schedule Visits</h4>
            <p className="homecare-action-description">Plan and assign visits</p>
          </Link>

          <Link to="/homecare/care-plans" className="homecare-action-card">
            <h4 className="homecare-action-title">Care Plans</h4>
            <p className="homecare-action-description">Manage care plans</p>
          </Link>

          <Link to="/homecare/documents" className="homecare-action-card">
            <h4 className="homecare-action-title">Documents</h4>
            <p className="homecare-action-description">Upload and manage documents</p>
          </Link>

          <Link to="/homecare/invoices" className="homecare-action-card">
            <h4 className="homecare-action-title">Invoices</h4>
            <p className="homecare-action-description">Billing and payments</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomecareDashboard;
