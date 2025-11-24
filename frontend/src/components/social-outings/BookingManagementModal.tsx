import { useState, useEffect } from 'react';
import { SocialOuting, OutingBooking, Customer, AvailabilityCheck } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';
import { customerApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface BookingManagementModalProps {
  outing: SocialOuting;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Booking Management Modal
 *
 * Manage bookings for a social outing with availability checking and conflict detection
 */
function BookingManagementModal({ outing, onClose }: BookingManagementModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<OutingBooking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add booking state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityCheck | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId, outing.id]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [bookingsData, customersData] = await Promise.all([
        socialOutingsApi.getBookings(tenantId, outing.id),
        customerApi.getCustomers(tenantId, { limit: 1000 })
      ]);

      setBookings(bookingsData);
      // Handle both CustomerListResponse and Customer[] formats
      const customers = 'customers' in customersData ? customersData.customers : customersData;
      setCustomers(customers || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Check customer availability when selected
  useEffect(() => {
    if (selectedCustomerId && tenantId) {
      checkCustomerAvailability(selectedCustomerId);
    } else {
      setAvailabilityCheck(null);
    }
  }, [selectedCustomerId, tenantId]);

  const checkCustomerAvailability = async (customerId: number) => {
    if (!tenantId) return;

    setCheckingAvailability(true);
    try {
      const availability = await socialOutingsApi.checkCustomerAvailability(
        tenantId,
        customerId,
        outing.outing_date
      );
      setAvailabilityCheck(availability);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityCheck(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleAddBooking = async () => {
    if (!tenantId || !selectedCustomerId) return;

    setSubmitting(true);
    setError(null);

    try {
      await socialOutingsApi.createBooking(tenantId, outing.id, {
        customer_id: selectedCustomerId,
        special_requirements: specialRequirements || undefined,
        dietary_requirements: dietaryRequirements || undefined
      });

      // Reset form
      setShowAddForm(false);
      setSelectedCustomerId(null);
      setSpecialRequirements('');
      setDietaryRequirements('');
      setAvailabilityCheck(null);

      // Refresh bookings
      fetchData();
    } catch (err: any) {
      console.error('Error adding booking:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to add booking'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (booking: OutingBooking) => {
    if (!tenantId) return;

    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // User clicked cancel

    try {
      await socialOutingsApi.cancelBooking(tenantId, outing.id, booking.id, reason || undefined);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  // Filter out already booked customers
  const bookedCustomerIds = bookings
    .filter(b => b.booking_status === 'confirmed')
    .map(b => b.customer_id);
  const availableCustomers = customers.filter(c => !bookedCustomerIds.includes(c.customer_id));

  // Check if outing is full
  const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
  const isFull = confirmedBookings >= outing.max_passengers;

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={() => onClose(false)}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 600 }}>
                Manage Bookings
              </h2>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                {outing.name} • {formatDate(outing.outing_date)}
              </p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                <span>{confirmedBookings}/{outing.max_passengers} passengers</span>
                {isFull && <span style={{ color: '#dc2626', fontWeight: 600 }}>FULLY BOOKED</span>}
              </div>
            </div>
            <button
              onClick={() => onClose(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '1.5rem' }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Add Booking Section */}
            {!showAddForm && !isFull && (
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
                style={{ marginBottom: '1.5rem' }}
              >
                + Add Passenger
              </button>
            )}

            {showAddForm && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                border: '1px solid var(--gray-200)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
                  Add Passenger
                </h3>

                <div className="form-group">
                  <label htmlFor="customer">Select Customer *</label>
                  <select
                    id="customer"
                    value={selectedCustomerId || ''}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                  >
                    <option value="">-- Select a customer --</option>
                    {availableCustomers.map(customer => (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.name}
                        {customer.accessibility_needs?.wheelchairUser && ' (Wheelchair User)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability Check */}
                {checkingAvailability && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', borderRadius: '4px', marginBottom: '1rem' }}>
                    Checking availability...
                  </div>
                )}

                {availabilityCheck && !availabilityCheck.available && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    <strong>Conflict Detected:</strong> {availabilityCheck.reason}
                    <br />
                    <small>You can still proceed with the booking if needed.</small>
                  </div>
                )}

                {availabilityCheck && availabilityCheck.available && (
                  <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                    Customer is available for this date
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="special_requirements">Special Requirements</label>
                  <textarea
                    id="special_requirements"
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    rows={2}
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dietary_requirements">Dietary Requirements</label>
                  <input
                    type="text"
                    id="dietary_requirements"
                    value={dietaryRequirements}
                    onChange={(e) => setDietaryRequirements(e.target.value)}
                    placeholder="e.g., Vegetarian, Gluten-free, Allergies"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddBooking}
                    disabled={!selectedCustomerId || submitting}
                  >
                    {submitting ? 'Adding...' : 'Add Booking'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedCustomerId(null);
                      setSpecialRequirements('');
                      setDietaryRequirements('');
                      setAvailabilityCheck(null);
                      setError(null);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bookings List */}
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Current Bookings ({confirmedBookings})
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                No bookings yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookings
                  .filter(b => b.booking_status === 'confirmed')
                  .map(booking => {
                    const customerData = (booking.customer_data || {}) as any;
                    const isWheelchairUser = customerData.accessibility_needs?.wheelchairUser || false;

                    return (
                      <div
                        key={booking.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '6px',
                          backgroundColor: 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '15px' }}>
                                {booking.customer_name || customerData.name || 'Unknown'}
                              </strong>
                              {isWheelchairUser && (
                                <span className="badge badge-purple">Wheelchair User</span>
                              )}
                            </div>
                            {booking.customer_phone && (
                              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                                {booking.customer_phone}
                              </div>
                            )}
                            {booking.special_requirements && (
                              <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginTop: '0.5rem' }}>
                                <strong>Special Requirements:</strong> {booking.special_requirements}
                              </div>
                            )}
                            {booking.dietary_requirements && (
                              <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                                <strong>Dietary:</strong> {booking.dietary_requirements}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleCancelBooking(booking)}
                            style={{ marginLeft: '1rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Cancelled Bookings */}
            {bookings.some(b => b.booking_status === 'cancelled') && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                  Cancelled Bookings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {bookings
                    .filter(b => b.booking_status === 'cancelled')
                    .map(booking => {
                      const customerData = (booking.customer_data || {}) as any;
                      return (
                        <div
                          key={booking.id}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid var(--gray-200)',
                            borderRadius: '6px',
                            backgroundColor: '#fafafa',
                            opacity: 0.7
                          }}
                        >
                          <div style={{ fontSize: '13px' }}>
                            <strong>{booking.customer_name || customerData.name || 'Unknown'}</strong>
                            {booking.cancellation_reason && ` - ${booking.cancellation_reason}`}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f9fafb',
            }}
          >
            <button className="btn btn-secondary" onClick={() => onClose(true)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default BookingManagementModal;
