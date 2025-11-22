import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import { customerDashboardApi } from '../services/customerDashboardApi';
import CustomerMessagesModal from '../components/customer/CustomerMessagesModal';
import SocialOutingsModal from '../components/customer/SocialOutingsModal';
import CustomerFeedbackModal from '../components/customer/CustomerFeedbackModal';
import CustomerBusServicesModal from '../components/customer/CustomerBusServicesModal';
import CooperativeMemberWidget from '../components/dashboard/CooperativeMemberWidget';
import MemberDividendHistory from '../components/dividends/MemberDividendHistory';
import './CustomerDashboard.css';

/**
 * Customer Dashboard - Modern Customer Portal
 *
 * Matches driver dashboard styling with:
 * - Same header design
 * - 7-day schedule view
 * - Stats cards
 * - Messaging function
 * - SVG icons (no emojis)
 */
function CustomerDashboard() {
  const navigate = useNavigate();
  const { tenantId, tenant } = useTenant();
  const { user, logout: authLogout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Customer info
  const customerId = user?.customerId || user?.customer_id;

  // Dashboard data
  const [overview, setOverview] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Modal states
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showJourneyRequestModal, setShowJourneyRequestModal] = useState(false);
  const [showSocialOutingsModal, setShowSocialOutingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDividendHistoryModal, setShowDividendHistoryModal] = useState(false);
  const [showBusServicesModal, setShowBusServicesModal] = useState(false);

  // Journey request form
  const [destination, setDestination] = useState('');
  const [journeyDate, setJourneyDate] = useState('');
  const [journeyTime, setJourneyTime] = useState('');
  const [journeyNotes, setJourneyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!user || user.role !== 'customer') {
      navigate('/login');
      return;
    }

    if (!customerId) {
      setError('No customer ID found');
      return;
    }

    loadDashboardData();
  }, [tenantId, customerId]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load overview
      const overviewData = await customerDashboardApi.getOverview(tenantId!, customerId);
      setOverview(overviewData);

      // Load bookings (next 7 days for schedule view)
      const bookingsData = await customerDashboardApi.getBookings(tenantId!, customerId, 7);
      setBookings(bookingsData.bookings || []);

      // Load profile
      const profileData = await customerDashboardApi.getProfile(tenantId!, customerId);
      setProfile(profileData);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      const errorMessage =
        err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to load dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitJourneyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await customerDashboardApi.submitJourneyRequest(tenantId!, customerId, {
        destination,
        date: journeyDate,
        time: journeyTime,
        type: 'ad-hoc',
        notes: journeyNotes,
      });

      // Reset form
      setDestination('');
      setJourneyDate('');
      setJourneyTime('');
      setJourneyNotes('');
      setShowJourneyRequestModal(false);

      // Reload data
      loadDashboardData();

      alert('Journey request submitted successfully!');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || 'Failed to submit journey request';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  // Group bookings by date for 7-day view
  const getBookingsByDate = () => {
    const bookingMap: { [key: string]: any[] } = {};
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      bookingMap[dateStr] = [];
    }

    bookings.forEach(booking => {
      const dateStr = booking.date;
      if (bookingMap[dateStr]) {
        bookingMap[dateStr].push(booking);
      }
    });

    return bookingMap;
  };

  const formatDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  };

  const formatDayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const bookingsByDate = getBookingsByDate();
  const dateKeys = Object.keys(bookingsByDate).sort();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc3545' }}>Error Loading Dashboard</h2>
          <p style={{ color: 'var(--gray-700)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Company Header Bar - Same as Driver Dashboard */}
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
              Customer Portal
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

      {/* Welcome Section */}
      <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
          Welcome back, {overview?.customerInfo?.name || 'Customer'}
        </h1>
        <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '14px' }}>
          Your journey schedule and information
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ margin: '0 1.5rem 1rem', padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33' }}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ padding: '0 1.5rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Blue Card - Weekly Journeys */}
        <div className="stat-card-modern" style={{ background: '#e3f2fd', borderColor: '#bbdefb' }}>
          <div className="stat-icon-modern" style={{ background: '#bbdefb', color: '#1976d2' }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div className="stat-value-modern" style={{ color: '#1976d2' }}>{overview?.stats?.weeklyJourneys || 0}</div>
            <div className="stat-label-modern" style={{ color: '#1976d2' }}>Weekly Journeys</div>
          </div>
        </div>

        {/* Green Card - Total Journeys */}
        <div className="stat-card-modern" style={{ background: '#e8f5e9', borderColor: '#c8e6c9' }}>
          <div className="stat-icon-modern" style={{ background: '#c8e6c9', color: '#388e3c' }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="stat-value-modern" style={{ color: '#388e3c' }}>{overview?.stats?.totalJourneys || 0}</div>
            <div className="stat-label-modern" style={{ color: '#388e3c' }}>Total Journeys</div>
          </div>
        </div>

        {/* Orange Card - Weekly Cost */}
        <div className="stat-card-modern" style={{ background: '#fff3e0', borderColor: '#ffe0b2' }}>
          <div className="stat-icon-modern" style={{ background: '#ffe0b2', color: '#f57c00' }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <div className="stat-value-modern" style={{ color: '#f57c00' }}>£{overview?.stats?.totalWeeklyCost?.toFixed(2) || '0.00'}</div>
            <div className="stat-label-modern" style={{ color: '#f57c00' }}>Weekly Cost</div>
          </div>
        </div>

        {/* Purple Card - Days Active */}
        <div className="stat-card-modern" style={{ background: '#f3e5f5', borderColor: '#e1bee7' }}>
          <div className="stat-icon-modern" style={{ background: '#e1bee7', color: '#7b1fa2' }}>
            <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div className="stat-value-modern" style={{ color: '#7b1fa2' }}>{overview?.stats?.daysActive || 0}</div>
            <div className="stat-label-modern" style={{ color: '#7b1fa2' }}>Days Active</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="quick-action-btn" onClick={() => setShowJourneyRequestModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Request Journey
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/customer/route-proposals')}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Route Proposals
          </button>
          <button className="quick-action-btn" onClick={() => setShowSocialOutingsModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Social Outings
          </button>
          <button className="quick-action-btn" onClick={() => setShowMessagesModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Messages
          </button>
          <button className="quick-action-btn" onClick={() => setShowFeedbackModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Feedback & Support
          </button>
          <button className="quick-action-btn" onClick={() => setShowDividendHistoryModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            My Dividends
          </button>
          <button className="quick-action-btn" onClick={() => setShowBusServicesModal(true)}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <circle cx="7" cy="16" r="2" />
              <circle cx="17" cy="16" r="2" />
              <path d="M5 10h14" />
            </svg>
            Bus Services
          </button>
        </div>
      </div>

      {/* Cooperative Member Widget */}
      {!loading && tenantId && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <CooperativeMemberWidget tenantId={tenantId} memberType="customer" />
        </div>
      )}

      {/* 7-Day Schedule View */}
      <div style={{ padding: '0 1.5rem 2rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
          Your Schedule (Next 7 Days)
        </h2>
        <div className="schedule-grid-7day">
          {dateKeys.map(dateStr => {
            const dayBookings = bookingsByDate[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div key={dateStr} className={`schedule-day-column ${isToday ? 'today' : ''}`}>
                <div className="day-header">
                  <div className="day-name">{formatDayOfWeek(dateStr)}</div>
                  <div className="day-date">{formatDayDate(dateStr)}</div>
                </div>
                <div className="day-trips">
                  {dayBookings.length > 0 ? (
                    dayBookings.map(booking => (
                      <div key={booking.id} className="journey-card">
                        <div className="journey-time">{booking.time}</div>
                        <div className="journey-destination">{booking.destination}</div>
                        {booking.driver && (
                          <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                              <circle cx="12" cy="8" r="4" />
                              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                            </svg>
                            {booking.driver}
                          </div>
                        )}
                        {booking.returnTime && (
                          <div className="journey-return">Return: {booking.returnTime}</div>
                        )}
                        <div className="journey-price">£{booking.price?.toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-trips">No journeys</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Journey Request Modal */}
      {showJourneyRequestModal && (
        <div className="modal-overlay" onClick={() => setShowJourneyRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Ad-hoc Journey</h2>
              <button className="modal-close" onClick={() => setShowJourneyRequestModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitJourneyRequest}>
                <div className="form-group">
                  <label htmlFor="destination">Destination *</label>
                  <input
                    id="destination"
                    type="text"
                    className="form-control"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter destination"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="journeyDate">Date *</label>
                    <input
                      id="journeyDate"
                      type="date"
                      className="form-control"
                      value={journeyDate}
                      onChange={(e) => setJourneyDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="journeyTime">Time *</label>
                    <input
                      id="journeyTime"
                      type="time"
                      className="form-control"
                      value={journeyTime}
                      onChange={(e) => setJourneyTime(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="journeyNotes">Notes (Optional)</label>
                  <textarea
                    id="journeyNotes"
                    className="form-control"
                    value={journeyNotes}
                    onChange={(e) => setJourneyNotes(e.target.value)}
                    placeholder="Any special requirements or notes"
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowJourneyRequestModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessagesModal && (
        <CustomerMessagesModal
          tenantId={tenantId!}
          customerId={customerId}
          onClose={() => setShowMessagesModal(false)}
        />
      )}

      {/* Social Outings Modal */}
      {showSocialOutingsModal && (
        <SocialOutingsModal
          tenantId={tenantId!}
          customerId={customerId}
          onClose={() => setShowSocialOutingsModal(false)}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <CustomerFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmitted={() => {
            // Optional: refresh dashboard data if needed
          }}
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
                memberId={customerId}
                memberType="customer"
                tenantId={tenantId!}
                limit={12}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bus Services Modal */}
      {showBusServicesModal && (
        <CustomerBusServicesModal
          tenantId={tenantId!}
          customerId={customerId}
          onClose={() => setShowBusServicesModal(false)}
        />
      )}
    </div>
  );
}

export default CustomerDashboard;
