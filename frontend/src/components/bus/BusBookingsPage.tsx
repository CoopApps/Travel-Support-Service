import React, { useEffect, useState } from 'react';
import { busBookingsApi, busTimetablesApi, BusBooking, BusTimetable } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import FareTransparencyCard from './FareTransparencyCard';
import { DynamicFareStructure } from '../../types/fare.types';
import { WarningIcon, WheelchairIcon, EyeIcon, EditIcon, BanIcon, ArrowDownIcon, TicketIcon } from '../icons/BusIcons';
import './BusBookingsPage.css';

interface BookingFormData {
  timetable_id: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  passenger_tier: 'adult' | 'child' | 'concessionary' | 'wheelchair' | 'companion';
  boarding_stop_id: string;
  alighting_stop_id: string;
  seat_number?: string;
  special_requirements?: string;
}

export default function BusBookingsPage() {
  const { tenant } = useTenant();
  const toast = useToast();
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Booking form state
  const [formData, setFormData] = useState<BookingFormData>({
    timetable_id: '',
    passenger_name: '',
    passenger_email: '',
    passenger_phone: '',
    passenger_tier: 'adult',
    boarding_stop_id: '',
    alighting_stop_id: '',
    seat_number: '',
    special_requirements: '',
  });
  const [fareQuote, setFareQuote] = useState<any>(null);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Calculate fare when timetable or passenger tier changes
  const calculateFare = async () => {
    if (!formData.timetable_id || !tenant?.tenant_id) {
      setFareQuote(null);
      return;
    }

    try {
      setCalculatingFare(true);
      const token = localStorage.getItem('token');

      // Get selected timetable details
      const selectedTimetable = timetables.find(t => t.timetable_id === parseInt(formData.timetable_id));
      if (!selectedTimetable) return;

      // Mock data for now - in production, get from route API
      const tripDistanceMiles = 15;
      const tripDurationHours = 1;
      const vehicleCapacity = selectedTimetable.vehicle_capacity || 16;
      const currentPassengers = selectedTimetable.current_bookings || 0;

      const response = await fetch(`/api/tenants/${tenant.tenant_id}/calculate-fare`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId: selectedTimetable.route_id,
          tripDistanceMiles,
          tripDurationHours,
          vehicleCapacity,
          currentPassengers: currentPassengers + 1, // Include this new passenger
          passengerTier: formData.passenger_tier,
        }),
      });

      if (!response.ok) throw new Error('Failed to calculate fare');

      const data = await response.json();
      setFareQuote(data.fareQuote);
    } catch (err: any) {
      console.error('Error calculating fare:', err);
      toast.error('Failed to calculate fare');
    } finally {
      setCalculatingFare(false);
    }
  };

  // Recalculate fare when timetable or passenger tier changes
  useEffect(() => {
    if (formData.timetable_id && formData.passenger_tier) {
      calculateFare();
    }
  }, [formData.timetable_id, formData.passenger_tier]);

  const handleCreateBooking = async () => {
    if (!tenant?.tenant_id || !fareQuote) return;

    // Validation
    if (!formData.passenger_name || !formData.passenger_email) {
      toast.error('Please fill in passenger name and email');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/tenants/${tenant.tenant_id}/bus-bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timetable_id: parseInt(formData.timetable_id),
          passenger_name: formData.passenger_name,
          passenger_email: formData.passenger_email,
          passenger_phone: formData.passenger_phone,
          passenger_tier: formData.passenger_tier,
          boarding_stop_id: formData.boarding_stop_id ? parseInt(formData.boarding_stop_id) : null,
          alighting_stop_id: formData.alighting_stop_id ? parseInt(formData.alighting_stop_id) : null,
          seat_number: formData.seat_number || null,
          special_requirements: formData.special_requirements || null,
          fare_amount: fareQuote.quotedFare,
          booking_status: 'pending',
          payment_status: 'unpaid',
        }),
      });

      if (!response.ok) throw new Error('Failed to create booking');

      const newBooking = await response.json();
      setBookings([newBooking, ...bookings]);
      setShowCreateModal(false);

      // Reset form
      setFormData({
        timetable_id: '',
        passenger_name: '',
        passenger_email: '',
        passenger_phone: '',
        passenger_tier: 'adult',
        boarding_stop_id: '',
        alighting_stop_id: '',
        seat_number: '',
        special_requirements: '',
      });
      setFareQuote(null);

      toast.success('Booking created successfully');
    } catch (err: any) {
      console.error('Error creating booking:', err);
      toast.error(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
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
          <div className="empty-icon">
            <TicketIcon size={48} color="#9ca3af" />
          </div>
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
                        <span className="wheelchair-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <WheelchairIcon size={14} />
                          Wheelchair
                        </span>
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
                      <div className="journey-arrow">
                        <ArrowDownIcon size={16} color="#6b7280" />
                      </div>
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
                      <button className="btn-icon" title="View Details">
                        <EyeIcon size={16} />
                      </button>
                      <button className="btn-icon" title="Edit">
                        <EditIcon size={16} />
                      </button>
                      {booking.booking_status === 'confirmed' && (
                        <button className="btn-icon danger" title="Cancel">
                          <BanIcon size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content booking-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TicketIcon size={24} />
                Create New Booking
              </h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>

              {/* Service Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Select Service
                </label>
                <select
                  className="form-control"
                  value={formData.timetable_id}
                  onChange={(e) => setFormData({ ...formData, timetable_id: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">Choose a service...</option>
                  {timetables.map((tt) => (
                    <option key={tt.timetable_id} value={tt.timetable_id}>
                      {tt.route_name} - {tt.departure_time} ({tt.current_bookings || 0}/{tt.vehicle_capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Passenger Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Passenger Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.passenger_name}
                    onChange={(e) => setFormData({ ...formData, passenger_name: e.target.value })}
                    placeholder="Full name"
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                {/* Passenger Tier */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Passenger Type
                  </label>
                  <select
                    className="form-control"
                    value={formData.passenger_tier}
                    onChange={(e) => setFormData({ ...formData, passenger_tier: e.target.value as any })}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="adult">Adult (100%)</option>
                    <option value="child">Child (50%)</option>
                    <option value="concessionary">Concessionary (50%)</option>
                    <option value="wheelchair">Wheelchair User (100%)</option>
                    <option value="companion">Companion (Free)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.passenger_email}
                    onChange={(e) => setFormData({ ...formData, passenger_email: e.target.value })}
                    placeholder="passenger@example.com"
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.passenger_phone}
                    onChange={(e) => setFormData({ ...formData, passenger_phone: e.target.value })}
                    placeholder="07XXX XXXXXX"
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Special Requirements */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Special Requirements
                </label>
                <textarea
                  className="form-control"
                  value={formData.special_requirements}
                  onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                  placeholder="Wheelchair access, assistance required, etc."
                  rows={3}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                />
              </div>

              {/* Fare Transparency Card */}
              {calculatingFare && (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p>Calculating transparent fare...</p>
                </div>
              )}

              {fareQuote && !calculatingFare && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <FareTransparencyCard
                    dynamicFare={fareQuote.dynamicFare}
                    quotedFare={fareQuote.quotedFare}
                    passengerTier={formData.passenger_tier}
                    fareReductionMessage={fareQuote.fareReductionMessage}
                    communityImpactMessage={fareQuote.communityImpactMessage}
                  />
                </div>
              )}

              {formData.timetable_id && !fareQuote && !calculatingFare && (
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <WarningIcon size={18} color="#f59e0b" />
                  <p style={{ margin: 0, color: '#92400e' }}>
                    Select passenger type to see transparent fare breakdown
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '0.625rem 1.25rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateBooking}
                disabled={!fareQuote || submitting || !formData.passenger_name || !formData.passenger_email}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: (!fareQuote || submitting) ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!fareQuote || submitting) ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {submitting ? 'Creating...' : `Confirm Booking ${fareQuote ? `- ${formatCurrency(fareQuote.quotedFare)}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
