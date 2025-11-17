import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import { driverDashboardApi } from '../services/driverDashboardApi';
import { tripApi } from '../services/api';
import TripContextMenu from '../components/driver/TripContextMenu';
import DriverStats from '../components/driver/DriverStats';
import HolidayRequestModal from '../components/driver/HolidayRequestModal';
import SafeguardingReportModal from '../components/driver/SafeguardingReportModal';
import HoursSubmissionModal from '../components/driver/HoursSubmissionModal';
import FuelCostsSubmissionModal from '../components/driver/FuelCostsSubmissionModal';
import EmergencyContactsModal from '../components/driver/EmergencyContactsModal';
import TripHistoryModal from '../components/driver/TripHistoryModal';
import MessagesModal from '../components/driver/MessagesModal';
import DocumentsModal from '../components/driver/DocumentsModal';
import PWAInstallPrompt from '../components/driver/PWAInstallPrompt';
import PWAMetaTags from '../components/driver/PWAMetaTags';
import CooperativeMemberWidget from '../components/dashboard/CooperativeMemberWidget';
import MemberDividendHistory from '../components/dividends/MemberDividendHistory';
import './DriverDashboard.css';

/**
 * Driver Dashboard - Stage 5
 *
 * Professional driver-facing dashboard with:
 * - Key metrics and statistics
 * - Today's and tomorrow's schedules side by side
 * - Weekly schedule overview
 * - Quick action buttons for common tasks
 */
function DriverDashboard() {
  const navigate = useNavigate();
  const { tenantId, tenant } = useTenant();
  const { user, logout: authLogout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Driver info
  const driverId = user?.driverId || user?.driver_id;
  const isFreelance = user?.employmentType === 'freelance';

  // Dashboard data
  const [overview, setOverview] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [tomorrowSchedule, setTomorrowSchedule] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);

  // Modal states
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showSafeguardingModal, setShowSafeguardingModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showEmergencyContactsModal, setShowEmergencyContactsModal] = useState(false);
  const [showTripHistoryModal, setShowTripHistoryModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showDividendHistoryModal, setShowDividendHistoryModal] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    trip: any | null;
    position: { x: number; y: number };
  } | null>(null);

  // Safety check
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to.</p>
      </div>
    );
  }

  // Load data
  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/login');
      return;
    }

    if (!driverId) {
      setError('No driver ID found');
      return;
    }

    loadDashboardData();
  }, [tenantId, driverId]);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-driver.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }
  }, []);

  const loadUnreadMessageCount = async () => {
    try {
      const data = await driverDashboardApi.getUnreadMessageCount(tenantId!, driverId);
      setUnreadMessageCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load unread message count:', err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load overview
      const overviewData = await driverDashboardApi.getOverview(tenantId!, driverId);
      setOverview(overviewData);
      setAlerts(overviewData.recentAlerts || []);

      // Load today's schedule
      const today = new Date().toISOString().split('T')[0];
      const todayData = await driverDashboardApi.getSchedule(tenantId!, driverId, today, today);
      setTodaySchedule(todayData.schedules || []);

      // Load tomorrow's schedule
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      const tomorrowData = await driverDashboardApi.getSchedule(tenantId!, driverId, tomorrowDate, tomorrowDate);
      setTomorrowSchedule(tomorrowData.schedules || []);

      // Load weekly schedule (next 7 days)
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndDate = weekEnd.toISOString().split('T')[0];
      const weeklyData = await driverDashboardApi.getSchedule(tenantId!, driverId, today, weekEndDate);
      setWeeklySchedule(weeklyData.schedules || []);

      // Load holidays
      const holidaysData = await driverDashboardApi.getHolidays(tenantId!, driverId);
      setHolidays(holidaysData);

      // Load unread message count
      await loadUnreadMessageCount();
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      const errorMessage = err.response?.data?.error?.message
        || err.response?.data?.message
        || err.message
        || 'Failed to load dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (trip: any, newStatus: string) => {
    try {
      await tripApi.updateTrip(tenantId!, trip.trip_id, { status: newStatus });
      await loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update trip status');
    }
  };

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  // Group weekly schedules by date
  const getSchedulesByDate = () => {
    const scheduleMap: { [key: string]: any[] } = {};
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      scheduleMap[dateStr] = [];
    }

    weeklySchedule.forEach(schedule => {
      const dateStr = schedule.assignment_date;
      if (scheduleMap[dateStr]) {
        scheduleMap[dateStr].push(schedule);
      }
    });

    return scheduleMap;
  };

  // Render trip card
  const renderTripCard = (trip: any, showContextMenu: boolean = true) => {
    const navAddress = trip.customer_address || trip.destination || '';
    const googleMapsUrl = navAddress
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navAddress)}`
      : null;

    return (
      <div
        key={trip.assignment_id}
        className="trip-card"
        onContextMenu={showContextMenu ? (e) => {
          e.preventDefault();
          setContextMenu({
            trip,
            position: { x: e.clientX, y: e.clientY }
          });
        } : undefined}
      >
        <div className="trip-customer-name">{trip.customer_name || 'Customer'}</div>

        {trip.customer_address && (
          <div className="trip-detail">
            {trip.customer_address}
          </div>
        )}

        {trip.customer_phone && (
          <div className="trip-detail">
            {trip.customer_phone}
          </div>
        )}

        {(trip.mobility_requirements || trip.driver_notes) && (
          <div className="trip-notes">
            {trip.mobility_requirements && (
              <div className="note-item">
                <strong>Mobility:</strong> {trip.mobility_requirements}
              </div>
            )}
            {trip.driver_notes && (
              <div className="note-item">
                <strong>Note:</strong> {trip.driver_notes}
              </div>
            )}
          </div>
        )}

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-navigate"
          >
            Navigate
          </a>
        )}

        {showContextMenu && (
          <div className="trip-hint">Right-click to update status</div>
        )}
      </div>
    );
  };

  const schedulesByDate = getSchedulesByDate();
  const dateKeys = Object.keys(schedulesByDate).sort();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* PWA Meta Tags */}
      <PWAMetaTags />

      {/* Company Header Bar */}
      <div style={{
        background: 'var(--primary)',
        color: 'white',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'var(--primary-accent)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
              {tenant?.company_name || 'Travel Support'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.2, marginTop: '2px' }}>
              Driver Portal{isFreelance && ' • Freelance'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'var(--primary-accent)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-accent)'}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Welcome Section */}
        <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            Welcome back, {overview?.driver?.name || 'Driver'}
          </h1>
          <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '14px' }}>
            Your schedule and trip information
          </p>
        </div>

      {/* Statistics Cards */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <DriverStats
          tripStats={overview?.tripStats}
          todaySchedules={overview?.metrics?.todaySchedules}
          upcomingSchedules={overview?.metrics?.upcomingSchedules}
          pendingHolidays={overview?.metrics?.pendingHolidays}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="quick-action-btn"
            onClick={() => setShowEmergencyContactsModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Emergency Contacts
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowTripHistoryModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Trip History
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowMessagesModal(true)}
            style={{ position: 'relative' }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Messages
            {unreadMessageCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#dc3545',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '20px',
                textAlign: 'center',
                lineHeight: '1.2',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {unreadMessageCount}
              </span>
            )}
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowDocumentsModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Documents
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowHolidayModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {isFreelance ? 'Request Time Off' : 'Request Holiday'}
          </button>
          <button
            className="quick-action-btn"
            onClick={() => setShowSafeguardingModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Report Safeguarding
          </button>
          {isFreelance && (
            <>
              <button
                className="quick-action-btn"
                onClick={() => setShowHoursModal(true)}
              >
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Submit Hours
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setShowFuelModal(true)}
              >
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Submit Fuel Costs
              </button>
            </>
          )}
          <button
            className="quick-action-btn"
            onClick={() => setShowDividendHistoryModal(true)}
          >
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            My Dividends
          </button>
        </div>
      </div>

      {/* Cooperative Member Widget */}
      {!loading && tenantId && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <CooperativeMemberWidget tenantId={tenantId} memberType="driver" />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <div className="alert alert-error">
            {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading schedule...</p>
        </div>
      ) : (
        <>
          {/* Today & Tomorrow Schedule (Side by Side) */}
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
            {/* Today's Schedule */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '16px', margin: 0 }}>
                  Today ({new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })})
                </h3>
              </div>
              <div className="card-body">
                {todaySchedule.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                    No trips scheduled
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {todaySchedule.map((trip: any) => renderTripCard(trip))}
                  </div>
                )}
              </div>
            </div>

            {/* Tomorrow's Schedule */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '16px', margin: 0 }}>
                  Tomorrow ({(() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                  })()})
                </h3>
              </div>
              <div className="card-body">
                {tomorrowSchedule.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                    No trips scheduled
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tomorrowSchedule.map((trip: any) => renderTripCard(trip))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Weekly Overview */}
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '16px', margin: 0 }}>Week Overview</h3>
              </div>
              <div className="card-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.5rem'
              }}>
                {dateKeys.map((dateStr) => {
                  const date = new Date(dateStr + 'T00:00:00');
                  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const schedules = schedulesByDate[dateStr];
                  const count = schedules.length;
                  const isToday = dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={dateStr}
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        border: isToday ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                        borderRadius: '8px',
                        background: count > 0 ? '#f0fdf4' : 'white'
                      }}
                    >
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isToday ? 'var(--primary)' : 'var(--gray-700)',
                        marginBottom: '4px'
                      }}>
                        {dayName}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                        marginBottom: '8px'
                      }}>
                        {dayNum}
                      </div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: count > 0 ? '#10b981' : 'var(--gray-400)'
                      }}>
                        {count}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--gray-600)',
                        marginTop: '4px'
                      }}>
                        {count === 1 ? 'trip' : 'trips'}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Recent Alerts</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {alerts.map((alert: any, index: number) => (
                      <div
                        key={index}
                        className={`alert-item alert-${alert.type || 'info'}`}
                      >
                        {alert.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TripContextMenu
          trip={contextMenu.trip}
          position={contextMenu.position}
          onStatusChange={handleStatusChange}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modals */}
      {showEmergencyContactsModal && (
        <EmergencyContactsModal
          tenantId={tenantId!}
          onClose={() => setShowEmergencyContactsModal(false)}
        />
      )}

      {showTripHistoryModal && (
        <TripHistoryModal
          tenantId={tenantId!}
          driverId={driverId}
          onClose={() => setShowTripHistoryModal(false)}
        />
      )}

      {showMessagesModal && (
        <MessagesModal
          tenantId={tenantId!}
          driverId={driverId}
          onClose={() => {
            setShowMessagesModal(false);
            loadUnreadMessageCount(); // Refresh unread count when modal closes
          }}
        />
      )}

      {showDocumentsModal && (
        <DocumentsModal
          tenantId={tenantId!}
          onClose={() => setShowDocumentsModal(false)}
        />
      )}

      {showHolidayModal && (
        <HolidayRequestModal
          tenantId={tenantId!}
          driverId={driverId}
          balance={holidays?.balance}
          isFreelance={isFreelance}
          onClose={() => setShowHolidayModal(false)}
          onSuccess={loadDashboardData}
        />
      )}

      {showSafeguardingModal && (
        <SafeguardingReportModal
          tenantId={tenantId!}
          driverId={driverId}
          onClose={() => setShowSafeguardingModal(false)}
          onSuccess={loadDashboardData}
        />
      )}

      {showHoursModal && (
        <HoursSubmissionModal
          tenantId={tenantId!}
          driverId={driverId}
          onClose={() => setShowHoursModal(false)}
          onSuccess={loadDashboardData}
        />
      )}

      {showFuelModal && (
        <FuelCostsSubmissionModal
          tenantId={tenantId!}
          driverId={driverId}
          onClose={() => setShowFuelModal(false)}
          onSuccess={loadDashboardData}
        />
      )}

      {/* Dividend History Modal */}
      {showDividendHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowDividendHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
            <div className="modal-header">
              <h2>My Dividend History</h2>
              <button className="modal-close" onClick={() => setShowDividendHistoryModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <MemberDividendHistory
                memberId={driverId}
                memberType="driver"
                tenantId={tenantId!}
                limit={12}
              />
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

export default DriverDashboard;
