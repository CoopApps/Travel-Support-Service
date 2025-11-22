import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import NotificationBell from './NotificationBell';
import UserDropdown from './UserDropdown';
import { ServiceToggleCompact } from './ServiceToggleCompact';
import { useServiceContext } from '../../contexts/ServiceContext';
import apiClient from '../../services/api';
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

  // Message counts for badges
  const [driverMessageCount, setDriverMessageCount] = useState(0);
  const [customerMessageCount, setCustomerMessageCount] = useState(0);

  // Fetch unread message counts
  useEffect(() => {
    const fetchMessageCounts = async () => {
      if (!tenant?.tenant_id) return;

      try {
        // Fetch driver messages (inbox - messages from drivers)
        const driverResponse = await apiClient.get(`/tenants/${tenant.tenant_id}/messages-from-drivers`);
        const driverMessages = driverResponse.data.messages || [];
        const unreadDriverCount = driverMessages.filter((m: any) => !m.read_at).length;
        setDriverMessageCount(unreadDriverCount);

        // Fetch customer messages (inbox - messages from customers)
        const customerResponse = await apiClient.get(`/tenants/${tenant.tenant_id}/customer-messages-inbox`);
        const customerMessages = customerResponse.data.messages || [];
        const unreadCustomerCount = customerMessages.filter((m: any) => !m.read_at).length;
        setCustomerMessageCount(unreadCustomerCount);
      } catch (err) {
        console.error('Failed to fetch message counts:', err);
      }
    };

    fetchMessageCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMessageCounts, 30000);
    return () => clearInterval(interval);
  }, [tenant?.tenant_id]);

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

            {activeService === 'bus' && (
              /* Bus-specific modules */
              <>
                <NavItem to="/bus/operations" label="Today's Operations" icon="activity" active={location.pathname === '/bus/operations'} />
                <NavItem to="/bus/routes" label="Routes" icon="map" active={location.pathname === '/bus/routes'} />
                <NavItem to="/bus/timetables" label="Timetables" icon="calendar" active={location.pathname === '/bus/timetables'} />
                <NavItem to="/bus/bookings" label="Bookings" icon="users" active={location.pathname === '/bus/bookings'} />
                <NavItem to="/bus/seats" label="Seat Assignment" icon="grid" active={location.pathname === '/bus/seats'} />
                <NavItem to="/bus/regular-passengers" label="Regular Passengers" icon="users" active={location.pathname === '/bus/regular-passengers'} />
                <NavItem to="/bus/analytics" label="Analytics" icon="chart" active={location.pathname === '/bus/analytics'} />
                <NavItem to="/bus/surplus-pool" label="Surplus Pool" icon="piggy-bank" active={location.pathname === '/bus/surplus-pool'} />
                <NavItem to="/bus/members" label="Cooperative Members" icon="users" active={location.pathname === '/bus/members'} />
                <NavItem to="/bus/dividends" label="Dividends" icon="money" active={location.pathname === '/bus/dividends'} />
                <NavItem to="/bus/compliance" label="Section 22 Compliance" icon="shield" active={location.pathname === '/bus/compliance'} />
              </>
            )}
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Compliance & Safety</div>
            <NavItem to="/training" label="Training" icon="training" active={location.pathname === '/training'} />
            <NavItem to="/permits" label="Permits" icon="permits" active={location.pathname === '/permits'} />
            <NavItem to="/safeguarding" label="Safeguarding" icon="shield" active={location.pathname === '/safeguarding'} />
            <NavItem to="/documents" label="Documents" icon="file" active={location.pathname === '/documents'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Operations</div>
            <NavItem to="/roster" label="Driver Roster" icon="user-check" active={location.pathname === '/roster'} />
            <NavItem to="/fuel-cards" label="Fuel Cards" icon="fuel" active={location.pathname === '/fuel-cards'} />
            <NavItem to="/payroll" label="Payroll" icon="money" active={location.pathname === '/payroll'} />
            <NavItem to="/admin" label="Company Admin" icon="cog" active={location.pathname === '/admin'} />
            <NavItem to="/holidays" label="Holidays" icon="sun" active={location.pathname === '/holidays'} />
            <NavItem to="/admin/settings" label="Settings" icon="settings" active={location.pathname === '/admin/settings'} />
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Support</div>
            <NavItem to="/feedback" label="Feedback" icon="feedback" active={location.pathname === '/feedback'} />
          </div>

          {activeService === 'bus' && (
            <div className="nav-section">
              <div className="nav-section-label">Bus Admin</div>
              <NavItem to="/admin/route-proposals" label="Route Proposals" icon="vote" active={location.pathname === '/admin/route-proposals'} />
            </div>
          )}
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
            {/* Quick Access Buttons */}
            <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <Link
                to="/schedules"
                className={`quick-nav-btn ${location.pathname === '/schedules' ? 'active' : ''}`}
                title="Schedules"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Schedules</span>
              </Link>

              <Link
                to="/customers"
                className={`quick-nav-btn ${location.pathname === '/customers' ? 'active' : ''}`}
                title="Customers"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Customers</span>
              </Link>

              <Link
                to="/drivers"
                className={`quick-nav-btn ${location.pathname === '/drivers' ? 'active' : ''}`}
                title="Drivers"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Drivers</span>
              </Link>

              <Link
                to="/vehicles"
                className={`quick-nav-btn ${location.pathname === '/vehicles' ? 'active' : ''}`}
                title="Vehicles"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path d="M16 8h3l3 6v4h-6" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span>Vehicles</span>
              </Link>

              <div style={{ width: '1px', height: '24px', background: 'var(--gray-300)', margin: '0 0.5rem' }} />

              <Link
                to="/driver-messages"
                className={`quick-nav-btn ${location.pathname === '/driver-messages' ? 'active' : ''}`}
                title="Driver Messages"
                style={{ position: 'relative' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Drivers</span>
                {driverMessageCount > 0 && (
                  <span className="message-badge">{driverMessageCount > 99 ? '99+' : driverMessageCount}</span>
                )}
              </Link>

              <Link
                to="/customer-messages"
                className={`quick-nav-btn ${location.pathname === '/customer-messages' ? 'active' : ''}`}
                title="Customer Messages"
                style={{ position: 'relative' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Customers</span>
                {customerMessageCount > 0 && (
                  <span className="message-badge">{customerMessageCount > 99 ? '99+' : customerMessageCount}</span>
                )}
              </Link>

              <div style={{ width: '1px', height: '24px', background: 'var(--gray-300)', margin: '0 0.5rem' }} />

              <Link
                to="/invoices"
                className={`quick-nav-btn ${location.pathname === '/invoices' ? 'active' : ''}`}
                title="Invoices"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Invoices</span>
              </Link>

              <Link
                to="/social-outings"
                className={`quick-nav-btn ${location.pathname === '/social-outings' ? 'active' : ''}`}
                title="Outings"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Outings</span>
              </Link>

              <Link
                to="/providers"
                className={`quick-nav-btn ${location.pathname === '/providers' ? 'active' : ''}`}
                title="Providers"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span>Providers</span>
              </Link>
            </nav>
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
    'user-check': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4',
    ticket: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'piggy-bank': 'M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h6v2h4v-4.5c1-.5 1.5-1 1.5-2.5C22.5 6.5 20.5 5 19 5z',
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
