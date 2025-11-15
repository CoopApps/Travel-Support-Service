import React, { useEffect, useState } from 'react';
import { busBookingsApi, busTimetablesApi, BusBooking, BusTimetable } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import './BusBookingsPage.css';

export default function BusBookingsPage() {
  const { tenant } = useTenant();
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [todaysData, upcomingData, timetablesData] = await Promise.all([
          busBookingsApi.getBookings(tenant.tenant_id, { service_date: today }),
          busBookingsApi.getBookings(tenant.tenant_id, { start_date: today, end_date: nextWeek }),
          busTimetablesApi.getTodaysServices(tenant.tenant_id)
        ]);

        setBookings(filter === 'today' ? todaysData : upcomingData);
        setTimetables(timetablesData);
      } catch (err: any) {
        console.error('Failed to load bookings:', err);
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenant?.tenant_id, filter]);

  const getFilteredBookings = () => {
    let filtered = bookings;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.booking_status === statusFilter);
    }

    return filtered;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'no_show':
        return 'status-no-show';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'payment-paid';
      case 'unpaid':
        return 'payment-unpaid';
      case 'refunded':
        return 'payment-refunded';
      default:
        return '';
    }
  };

  const filteredBookings = getFilteredBookings();
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.booking_status === 'confirmed').length,
    pending: bookings.filter(b => b.booking_status === 'pending').length,
    cancelled: bookings.filter(b => b.booking_status === 'cancelled').length
  };

  if (loading) {
    return (
      <div className="bus-bookings-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus-bookings-page">
        <div className="error-state">
          <h2>Error Loading Bookings</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-bookings-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Bus Bookings</h1>
          <p className="page-subtitle">Manage passenger reservations</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={timetables.length === 0}
        >
          <span>+</span>
          New Booking
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="stat-card confirmed">
          <div className="stat-value">{stats.confirmed}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-value">{stats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="page-filters">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            Today
          </button>
          <button
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Next 7 Days
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Bookings
          </button>
        </div>

        <div className="filter-group">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎫</div>
          <h2>No Bookings Found</h2>
          <p>
            {filter === 'today'
              ? 'No bookings scheduled for today.'
              : 'No bookings found matching your filters.'}
          </p>
          {timetables.length === 0 ? (
            <p className="empty-hint">Create timetables first to enable bookings.</p>
          ) : (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Create First Booking
            </button>
          )}
        </div>
      ) : (
        <div className="bookings-table">
          <table>
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Passenger</th>
                <th>Service Date</th>
                <th>Route</th>
                <th>Journey</th>
                <th>Seat</th>
                <th>Fare</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.booking_id}>
                  <td>
                    <div className="booking-ref">{booking.booking_reference}</div>
                  </td>
                  <td>
                    <div className="passenger-info">
                      <div className="passenger-name">{booking.passenger_name}</div>
                      {booking.passenger_phone && (
                        <div className="passenger-contact">{booking.passenger_phone}</div>
                      )}
                      {booking.requires_wheelchair_space && (
                        <span className="wheelchair-badge">♿ Wheelchair</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="service-date">{formatDate(booking.service_date)}</div>
                  </td>
                  <td>
                    <div className="route-info-compact">
                      {booking.route_number ? (
                        <>
                          <span className="route-badge-sm">{booking.route_number}</span>
                          <span className="route-name-sm">{booking.route_name}</span>
                        </>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="journey-info">
                      <div className="stop-name">{booking.boarding_stop_name || 'N/A'}</div>
                      <div className="journey-arrow">↓</div>
                      <div className="stop-name">{booking.alighting_stop_name || 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="seat-number">
                      {booking.seat_number || <span className="text-muted">Unassigned</span>}
                    </div>
                  </td>
                  <td>
                    <div className="fare-amount">{formatCurrency(booking.fare_amount)}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(booking.booking_status)}`}>
                      {booking.booking_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`payment-badge ${getPaymentBadgeClass(booking.payment_status)}`}>
                      {booking.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">👁️</button>
                      <button className="btn-icon" title="Edit">✏️</button>
                      {booking.booking_status === 'confirmed' && (
                        <button className="btn-icon danger" title="Cancel">🚫</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Booking</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Booking creation form will be implemented here.</p>
              <p>You can select service, passenger details, boarding/alighting stops, and seat assignment.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary">Create Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
