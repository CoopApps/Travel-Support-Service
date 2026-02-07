import { useAuthStore } from '../store/authStore';
import { useTenant } from '../context/TenantContext';

/**
 * Dashboard Page (Placeholder)
 * Main dashboard for care co-operative staff
 */

function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { tenant } = useTenant();

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        padding: '1rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', color: 'var(--gray-900)' }}>
                {tenant?.company_name || 'Home Care'}
              </h1>
              <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)', fontSize: '12px' }}>
                Care Management Dashboard
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '13px' }}>
                {user?.full_name || user?.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-600)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--gray-900)' }}>
          Welcome, {user?.full_name || user?.username}!
        </h2>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Clients', value: '-', color: '#3b82f6' },
            { label: 'Carers', value: '-', color: '#10b981' },
            { label: "Today's Visits", value: '-', color: '#f59e0b' },
            { label: 'Alerts', value: '-', color: '#ef4444' },
          ].map((stat, index) => (
            <div key={index} className="card" style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: '12px', marginBottom: '0.25rem' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>Coming Soon</div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
            Dashboard Under Construction
          </h3>
          <p style={{ color: 'var(--gray-600)', maxWidth: '500px', margin: '0 auto' }}>
            The full dashboard with client management, carer scheduling, visit tracking,
            and co-operative governance features is coming soon.
          </p>
        </div>

        {/* Quick Links Placeholder */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Manage Clients', description: 'View and edit client records' },
              { label: 'Manage Carers', description: 'Staff and training records' },
              { label: 'Schedule Visits', description: 'Plan and assign visits' },
              { label: 'View Rota', description: 'Weekly staff schedule' },
            ].map((action, index) => (
              <div key={index} className="card" style={{ padding: '1rem', cursor: 'not-allowed', opacity: 0.6 }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '14px' }}>{action.label}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-600)' }}>{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
