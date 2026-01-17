import { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dashboardApi, DashboardOverview } from '../../services/dashboardApi';
import { tripApi } from '../../services/api';

/**
 * Notification Bell Component
 *
 * Displays real-time alerts and notifications from the comprehensive dashboard API
 * Shows all actionable tasks and critical alerts
 */

interface CapacityAlertSummary {
  total_alerts: number;
  total_empty_seats: number;
  total_potential_revenue: number;
}

function NotificationBell() {
  const { tenantId } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [capacityAlerts, setCapacityAlerts] = useState<CapacityAlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const capacityCount = capacityAlerts?.total_alerts || 0;
  const count = (dashboard?.summary?.totalTasks || 0) + capacityCount;
  const hasCritical = (dashboard?.summary?.criticalTasks || 0) > 0;

  // Fetch notifications - memoized to prevent recreating on every render
  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Fetch dashboard and capacity alerts in parallel
      const today = new Date().toISOString().split('T')[0];
      const [dashboardData, capacityData] = await Promise.all([
        dashboardApi.getOverview(tenantId),
        tripApi.getCapacityAlerts(tenantId, { date: today }).catch(() => ({ summary: null }))
      ]);
      setDashboard(dashboardData);
      setCapacityAlerts(capacityData.summary || null);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Auto-refresh notifications every 5 minutes (300 seconds)
  useEffect(() => {
    if (!tenantId) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial fetch
    fetchNotifications();

    // Set up new interval
    intervalRef.current = setInterval(fetchNotifications, 300000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications(); // Refresh when opening
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="icon-button"
        onClick={toggleDropdown}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="notification-badge" style={{ background: hasCritical ? '#dc3545' : '#ffc107' }}>
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            {count > 0 && <span className="text-muted">({count})</span>}
          </div>

          <div className="notification-dropdown-content">
            {loading ? (
              <div className="notification-item">
                <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '1rem auto' }}></div>
              </div>
            ) : count === 0 ? (
              <div className="notification-item text-center">
                <div style={{ color: 'var(--gray-500)', padding: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" style={{ opacity: 0.3, margin: '0 auto 0.5rem' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div>No new notifications</div>
                </div>
              </div>
            ) : (
              <>
                {/* Critical Alerts */}
                {dashboard?.tasks.expiredLicenses && dashboard.tasks.expiredLicenses.count > 0 && (
                  <div className="notification-item notification-critical">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expired Licenses</div>
                      <div className="notification-message">{dashboard.tasks.expiredLicenses.count} driver license{dashboard.tasks.expiredLicenses.count !== 1 ? 's' : ''} expired</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiredInsurance && dashboard.tasks.expiredInsurance.count > 0 && (
                  <div className="notification-item notification-critical">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expired Insurance</div>
                      <div className="notification-message">{dashboard.tasks.expiredInsurance.count} vehicle{dashboard.tasks.expiredInsurance.count !== 1 ? 's' : ''} with expired insurance</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiredMots && dashboard.tasks.expiredMots.count > 0 && (
                  <div className="notification-item notification-critical">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expired MOTs</div>
                      <div className="notification-message">{dashboard.tasks.expiredMots.count} vehicle{dashboard.tasks.expiredMots.count !== 1 ? 's' : ''} with expired MOT</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.safeguardingReports && dashboard.tasks.safeguardingReports.count > 0 && (
                  <div className="notification-item notification-critical">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Safeguarding Reports</div>
                      <div className="notification-message">{dashboard.tasks.safeguardingReports.count} report{dashboard.tasks.safeguardingReports.count !== 1 ? 's' : ''} pending review</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.overdueInvoices && dashboard.tasks.overdueInvoices.count > 0 && (
                  <div className="notification-item notification-critical">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 9h6v6H9z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Overdue Invoices</div>
                      <div className="notification-message">{dashboard.tasks.overdueInvoices.count} invoice{dashboard.tasks.overdueInvoices.count !== 1 ? 's' : ''} overdue</div>
                    </div>
                  </div>
                )}

                {/* Approvals */}
                {dashboard?.tasks.pendingLeaveRequests && dashboard.tasks.pendingLeaveRequests.count > 0 && (
                  <div className="notification-item notification-warning">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Leave Requests</div>
                      <div className="notification-message">{dashboard.tasks.pendingLeaveRequests.count} request{dashboard.tasks.pendingLeaveRequests.count !== 1 ? 's' : ''} pending approval</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.pendingTimesheets && dashboard.tasks.pendingTimesheets.count > 0 && (
                  <div className="notification-item notification-warning">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Timesheets</div>
                      <div className="notification-message">{dashboard.tasks.pendingTimesheets.count} timesheet{dashboard.tasks.pendingTimesheets.count !== 1 ? 's' : ''} pending approval</div>
                    </div>
                  </div>
                )}

                {/* Operational Alerts */}
                {dashboard?.tasks.expiringLicenses && dashboard.tasks.expiringLicenses.count > 0 && (
                  <div className="notification-item notification-warning">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expiring Licenses</div>
                      <div className="notification-message">{dashboard.tasks.expiringLicenses.count} driver license{dashboard.tasks.expiringLicenses.count !== 1 ? 's' : ''} expiring within 30 days</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiringInsurance && dashboard.tasks.expiringInsurance.count > 0 && (
                  <div className="notification-item notification-warning">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expiring Insurance</div>
                      <div className="notification-message">{dashboard.tasks.expiringInsurance.count} vehicle{dashboard.tasks.expiringInsurance.count !== 1 ? 's' : ''} with insurance expiring within 30 days</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiringMots && dashboard.tasks.expiringMots.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expiring MOTs</div>
                      <div className="notification-message">{dashboard.tasks.expiringMots.count} MOT{dashboard.tasks.expiringMots.count !== 1 ? 's' : ''} expiring within 30 days</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiringTraining && dashboard.tasks.expiringTraining.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expiring Training</div>
                      <div className="notification-message">{dashboard.tasks.expiringTraining.count} training certificate{dashboard.tasks.expiringTraining.count !== 1 ? 's' : ''} expiring soon</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.expiringPermits && dashboard.tasks.expiringPermits.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Expiring Permits</div>
                      <div className="notification-message">{dashboard.tasks.expiringPermits.count} permit{dashboard.tasks.expiringPermits.count !== 1 ? 's' : ''} expiring soon</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.unassignedJourneys && dashboard.tasks.unassignedJourneys.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
                        <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Unassigned Journeys</div>
                      <div className="notification-message">{dashboard.tasks.unassignedJourneys.count} customer{dashboard.tasks.unassignedJourneys.count !== 1 ? 's' : ''} need driver assignment</div>
                    </div>
                  </div>
                )}

                {/* Capacity Alerts - Revenue Opportunities */}
                {capacityAlerts && capacityAlerts.total_alerts > 0 && (
                  <div className="notification-item notification-warning">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Capacity Opportunities</div>
                      <div className="notification-message">
                        {capacityAlerts.total_empty_seats} empty seat{capacityAlerts.total_empty_seats !== 1 ? 's' : ''} today
                        {capacityAlerts.total_potential_revenue > 0 && (
                          <span style={{ color: '#10b981', fontWeight: 600 }}> (+£{capacityAlerts.total_potential_revenue.toFixed(0)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.customerHolidays && dashboard.tasks.customerHolidays.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Customer Holidays</div>
                      <div className="notification-message">{dashboard.tasks.customerHolidays.count} customer{dashboard.tasks.customerHolidays.count !== 1 ? 's' : ''} on holiday</div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {dashboard?.tasks.driverMessages && dashboard.tasks.driverMessages.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Driver Messages</div>
                      <div className="notification-message">{dashboard.tasks.driverMessages.count} unread message{dashboard.tasks.driverMessages.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.customerMessages && dashboard.tasks.customerMessages.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Customer Messages</div>
                      <div className="notification-message">{dashboard.tasks.customerMessages.count} unread message{dashboard.tasks.customerMessages.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}

                {dashboard?.tasks.outingSuggestions && dashboard.tasks.outingSuggestions.count > 0 && (
                  <div className="notification-item notification-info">
                    <div className="notification-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div className="notification-content">
                      <div className="notification-type">Social Outing Suggestions</div>
                      <div className="notification-message">{dashboard.tasks.outingSuggestions.count} new suggestion{dashboard.tasks.outingSuggestions.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {count > 0 && (
            <div className="notification-dropdown-footer">
              <button className="btn btn-link btn-sm">View All Notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
