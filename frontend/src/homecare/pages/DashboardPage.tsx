import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { dashboardApi, DashboardStats } from '../services/homecareApi';

function DashboardPage() {
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
        const response = await dashboardApi.getStats(tenantId);
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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
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

  return (
    <div style={{ padding: '1.5rem' }}>
        <h1 style={{ marginBottom: '1.5rem', color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Dashboard
        </h1>

        {/* Overview Stats */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
            Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                Active Clients
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.overview.active_clients || 0}
              </p>
              <Link to="/homecare/clients" style={{ color: '#0891b2', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none' }}>
                View all clients →
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                Active Carers
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.overview.active_carers || 0}
              </p>
              <Link to="/homecare/carers" style={{ color: '#0891b2', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none' }}>
                View all carers →
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                Total Visits
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.overview.total_visits || 0}
              </p>
              <Link to="/homecare/visits" style={{ color: '#0891b2', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none' }}>
                View visits →
              </Link>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                Revenue (This Month)
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {formatCurrency(stats?.overview.revenue_this_month || 0)}
              </p>
              <p style={{ fontSize: '12px', color: stats?.overview.revenue_growth_percentage && stats.overview.revenue_growth_percentage >= 0 ? '#10b981' : '#ef4444', marginTop: '0.5rem' }}>
                {stats?.overview.revenue_growth_percentage ? formatPercentage(stats.overview.revenue_growth_percentage) : '-'} vs last month
              </p>
            </div>
          </div>
        </div>

        {/* Visits Stats */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
            Visits
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem' }}>Today's Visits</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.visits.today || 0}
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem' }}>This Week</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.visits.this_week || 0}
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem' }}>Completed (Month)</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', margin: 0 }}>
                {stats?.visits.completed_this_month || 0}
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem' }}>Cancelled (Month)</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', margin: 0 }}>
                {stats?.visits.cancelled_this_month || 0}
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.5rem' }}>Completion Rate</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stats?.visits.completion_rate ? `${stats.visits.completion_rate.toFixed(1)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {stats?.alerts && (stats.alerts.expiring_dbs_checks > 0 || stats.alerts.expiring_documents > 0 || stats.alerts.overdue_invoices > 0 || stats.alerts.unassigned_visits > 0) && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
              Alerts
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {stats.alerts.expiring_dbs_checks > 0 && (
                <div className="card" style={{ padding: '1.25rem', background: '#fef3c7', border: '1px solid #fcd34d' }}>
                  <p style={{ color: '#92400e', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Expiring DBS Checks
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#92400e', margin: 0 }}>
                    {stats.alerts.expiring_dbs_checks}
                  </p>
                  <Link to="/homecare/carers" style={{ color: '#92400e', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>
                    Review carers →
                  </Link>
                </div>
              )}

              {stats.alerts.expiring_documents > 0 && (
                <div className="card" style={{ padding: '1.25rem', background: '#fef3c7', border: '1px solid #fcd34d' }}>
                  <p style={{ color: '#92400e', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Expiring Documents
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#92400e', margin: 0 }}>
                    {stats.alerts.expiring_documents}
                  </p>
                  <Link to="/homecare/documents" style={{ color: '#92400e', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>
                    Review documents →
                  </Link>
                </div>
              )}

              {stats.alerts.overdue_invoices > 0 && (
                <div className="card" style={{ padding: '1.25rem', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                  <p style={{ color: '#991b1b', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Overdue Invoices
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                    {stats.alerts.overdue_invoices}
                  </p>
                  <Link to="/homecare/invoices?status=overdue" style={{ color: '#991b1b', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>
                    Review invoices →
                  </Link>
                </div>
              )}

              {stats.alerts.unassigned_visits > 0 && (
                <div className="card" style={{ padding: '1.25rem', background: '#fee2e2', border: '1px solid #fca5a5' }}>
                  <p style={{ color: '#991b1b', fontSize: '12px', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Unassigned Visits
                  </p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                    {stats.alerts.unassigned_visits}
                  </p>
                  <Link to="/homecare/visits?status=scheduled" style={{ color: '#991b1b', fontSize: '12px', marginTop: '0.5rem', display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>
                    Assign carers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Link to="/homecare/clients" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Manage Clients</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>View and edit client records</p>
            </Link>

            <Link to="/homecare/carers" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Manage Carers</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>Staff and training records</p>
            </Link>

            <Link to="/homecare/visits" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Schedule Visits</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>Plan and assign visits</p>
            </Link>

            <Link to="/homecare/care-plans" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Care Plans</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>Manage care plans</p>
            </Link>

            <Link to="/homecare/documents" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Documents</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>Upload and manage documents</p>
            </Link>

            <Link to="/homecare/invoices" className="card" style={{ padding: '1rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'transform 0.15s' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px', fontWeight: 600 }}>Invoices</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>Billing and payments</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
