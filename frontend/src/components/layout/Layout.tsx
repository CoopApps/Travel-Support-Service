import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';
import { ServiceToggleCompact } from './ServiceToggleCompact';
import { useServiceContext } from '../../contexts/ServiceContext';
import './Layout.css';

/**
 * Main Layout Component - Matching Legacy Design
 *
 * Provides consistent layout with navigation and header.
 * Dark slate sidebar with blue accents, professional SaaS aesthetic.
 */

function Layout() {
  const { tenant } = useTenant();
  const location = useLocation();
  const { activeService } = useServiceContext();

  // Get subscription tier display name
  const getTierDisplayName = (tier: string | undefined) => {
    if (!tier) return 'Standard Edition';
    return tier.charAt(0).toUpperCase() + tier.slice(1) + ' Edition';
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="logo-text">{tenant?.company_name || 'Travel Support'}</div>
              <div className="logo-subtitle">{getTierDisplayName(tenant?.subscription_tier)}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">{activeService === 'bus' ? 'Bus Operations' : 'Core Operations'}</div>
            {/* Dashboard is service-aware - same route for both */}
            <NavItem to="/dashboard" label="Dashboard" icon="home" active={location.pathname === '/dashboard'} />

            {activeService === 'bus' ? (
              /* Bus-specific modules */
              <>
                <NavItem to="/bus/routes" label="Routes" icon="map" active={location.pathname === '/bus/routes'} />
                <NavItem to="/bus/timetables" label="Timetables" icon="calendar" active={location.pathname === '/bus/timetables'} />
                <NavItem to="/bus/bookings" label="Bookings" icon="users" active={location.pathname === '/bus/bookings'} />
                <NavItem to="/bus/seats" label="Seat Assignment" icon="grid" active={location.pathname === '/bus/seats'} />
                <NavItem to="/bus/communications" label="Communications" icon="mail" active={location.pathname === '/bus/communications'} />
                <NavItem to="/bus/analytics" label="Analytics" icon="chart" active={location.pathname === '/bus/analytics'} />
                <NavItem to="/bus/compliance" label="Section 22 Compliance" icon="shield" active={location.pathname === '/bus/compliance'} />
              </>
            ) : (
              /* Transport-specific modules */
              <>
                <NavItem to="/schedules" label="Schedules" icon="calendar" active={location.pathname === '/schedules'} />
                <NavItem to="/customers" label="Customers" icon="users" active={location.pathname === '/customers'} />
              </>
            )}
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Resources</div>
            <NavItem to="/drivers" label="Drivers" icon="user" active={location.pathname === '/drivers'} />
            <NavItem to="/vehicles" label="Vehicles" icon="truck" active={location.pathname === '/vehicles'} />
            <NavItem to="/fuel-cards" label="Fuel Cards" icon="fuel" active={location.pathname === '/fuel-cards'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Compliance & Safety</div>
            <NavItem to="/training" label="Training" icon="training" active={location.pathname === '/training'} />
            <NavItem to="/permits" label="Permits" icon="permits" active={location.pathname === '/permits'} />
            <NavItem to="/safeguarding" label="Safeguarding" icon="shield" active={location.pathname === '/safeguarding'} />
            <NavItem to="/documents" label="Documents" icon="file" active={location.pathname === '/documents'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Finance</div>
            <NavItem to="/invoices" label="Invoices" icon="invoice" active={location.pathname === '/invoices'} />
            <NavItem to="/payroll" label="Payroll" icon="money" active={location.pathname === '/payroll'} />
            <NavItem to="/providers" label="Providers" icon="briefcase" active={location.pathname === '/providers'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Activities & Leave</div>
            <NavItem to="/social-outings" label="Social Outings" icon="activity" active={location.pathname === '/social-outings'} />
            <NavItem to="/holidays" label="Holidays" icon="sun" active={location.pathname === '/holidays'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Communications</div>
            <NavItem to="/driver-messages" label="Driver Messages" icon="mail" active={location.pathname === '/driver-messages'} />
            <NavItem to="/customer-messages" label="Customer Messages" icon="mail" active={location.pathname === '/customer-messages'} />
            <NavItem to="/feedback" label="Feedback & Support" icon="feedback" active={location.pathname === '/feedback'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Company Admin</div>
            <NavItem to="/admin" label="Administration" icon="settings" active={location.pathname === '/admin'} />
            <NavItem to="/admin/route-proposals" label="Route Proposals" icon="vote" active={location.pathname === '/admin/route-proposals'} />
            <NavItem to="/admin/settings" label="Settings" icon="cog" active={location.pathname === '/admin/settings'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Admin Tools</div>
            <NavItem to="/driver-dashboard-admin" label="Driver Activity" icon="activity" active={location.pathname === '/driver-dashboard-admin'} />
            <NavItem to="/customer-dashboard-admin" label="Customer Activity" icon="activity" active={location.pathname === '/customer-dashboard-admin'} />
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item">
            <div className="nav-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span>Help & Support</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--gray-900)' }}>
              {tenant?.company_name || 'Travel Support System'}
            </h4>
          </div>

          <div className="header-actions" id="headerActions">
            <ServiceToggleCompact />
            <NotificationBell />
            <UserDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
}

function NavItem({ to, label, icon, active, disabled }: NavItemProps) {
  const iconPaths = {
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    truck: 'M16 3h3l3 6v7h-2M1 16h14M15 16h-1M1 10h14M5 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
    activity: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    fuel: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77z',
    sun: 'M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
    mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
    invoice: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    permits: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 12l2 2 4-4',
    training: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    money: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 10h2M16 14h2M16 18h2M8 10h2M8 14h2M8 18h2',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    feedback: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7',
    cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16',
    vote: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    chart: 'M18 20V10M12 20V4M6 20v-6',
  };

  const className = `nav-item${active ? ' active' : ''}${disabled ? ' disabled' : ''}`;

  if (disabled) {
    return (
      <div className={className}>
        <div className="nav-icon">
          <svg viewBox="0 0 24 24">
            <path d={iconPaths[icon as keyof typeof iconPaths]} />
          </svg>
        </div>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link to={to} className={className}>
      <div className="nav-icon">
        <svg viewBox="0 0 24 24">
          <path d={iconPaths[icon as keyof typeof iconPaths]} />
        </svg>
      </div>
      <span>{label}</span>
    </Link>
  );
}

export default Layout;
