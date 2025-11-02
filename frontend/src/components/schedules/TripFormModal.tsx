import { useState, useEffect, FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { tripApi } from '../../services/api';
import { Trip, Customer, Driver, ServerTime } from '../../types';
import PassengerRecommendations from './PassengerRecommendations';

interface TripFormModalProps {
  trip: Trip | null;
  tenantId: number;
  customers: Customer[];
  drivers: Driver[];
  serverTime: ServerTime | null;
  onClose: (refresh?: boolean) => void;
}

/**
 * Trip Form Modal
 *
 * Modal form for creating and editing trips (both ad-hoc and regular)
 */
function TripFormModal({ trip, tenantId, customers, drivers, serverTime, onClose }: TripFormModalProps) {
  const isEdit = !!trip?.trip_id; // Only edit mode if we have a trip_id
  const token = useAuthStore(state => state.token);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: trip?.customer_id || '',
    driver_id: trip?.driver_id || '',
    trip_date: trip?.trip_date || serverTime?.formatted_date || '',
    trip_type: trip?.trip_type || 'adhoc', // Default to adhoc if not specified
    pickup_time: trip?.pickup_time || '09:00',
    pickup_location: trip?.pickup_location || '',
    pickup_address: trip?.pickup_address || '',
    destination: trip?.destination || '',
    destination_address: trip?.destination_address || '',
    status: trip?.status || 'scheduled',
    urgent: trip?.urgent || false,
    price: trip?.price || '',
    notes: trip?.notes || '',
    passenger_count: trip?.passenger_count || 1,
    requires_wheelchair: trip?.requires_wheelchair || false,
    requires_escort: trip?.requires_escort || false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalPassengers, setAdditionalPassengers] = useState<number[]>([]); // Track selected passengers for carpooling
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  /**
   * Auto-fill customer's home address when customer is selected
   */
  useEffect(() => {
    if (formData.customer_id && !isEdit) {
      const customer = customers.find(c => c.id.toString() === formData.customer_id.toString());
      if (customer) {
        setFormData(prev => ({
          ...prev,
          pickup_location: prev.pickup_location || 'Home',
          pickup_address: prev.pickup_address || customer.address || '',
        }));
      }
    }
  }, [formData.customer_id, customers, isEdit]);

  /**
   * Check for conflicts when key fields change
   */
  useEffect(() => {
    const checkConflicts = async () => {
      // Only check if we have the required fields
      if (!formData.driver_id || !formData.trip_date || !formData.pickup_time || !formData.customer_id) {
        setConflicts([]);
        return;
      }

      setCheckingConflicts(true);
      try {
        const response = await fetch(`/api/tenants/${tenantId}/trips/check-conflicts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            driverId: parseInt(formData.driver_id.toString()),
            customerId: parseInt(formData.customer_id.toString()),
            tripDate: formData.trip_date,
            pickupTime: formData.pickup_time,
            excludeTripId: trip?.trip_id // Exclude current trip if editing
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.hasConflicts) {
            setConflicts(result.conflicts);
            setShowConflictWarning(true);
          } else {
            setConflicts([]);
            setShowConflictWarning(false);
          }
        }
      } catch (err) {
        console.error('Error checking conflicts:', err);
        // Don't block form submission on conflict check errors
      } finally {
        setCheckingConflicts(false);
      }
    };

    // Debounce conflict checking
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.driver_id, formData.trip_date, formData.pickup_time, formData.customer_id, tenantId, trip?.trip_id, token]);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * Handle selecting a passenger from recommendations
   */
  const handleSelectPassenger = (customerId: number) => {
    if (additionalPassengers.includes(customerId)) {
      // Remove if already selected
      setAdditionalPassengers(prev => prev.filter(id => id !== customerId));
    } else {
      // Add to selection
      setAdditionalPassengers(prev => [...prev, customerId]);
    }
  };

  /**
   * Handle form submit - Create trips for primary + all additional passengers
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const baseData = {
        driver_id: formData.driver_id ? parseInt(formData.driver_id.toString()) : null,
        trip_date: formData.trip_date,
        pickup_time: formData.pickup_time,
        destination: formData.destination,
        destination_address: formData.destination_address || null,
        trip_type: formData.trip_type as 'adhoc' | 'regular',
        status: formData.status,
        urgent: formData.urgent,
        price: formData.price ? parseFloat(formData.price.toString()) : null,
        notes: formData.notes || null,
        passenger_count: 1, // Each trip is for 1 passenger
      };

      if (isEdit && trip) {
        // Edit mode - just update the single trip
        const data = {
          ...baseData,
          customer_id: parseInt(formData.customer_id.toString()),
          pickup_location: formData.pickup_location || null,
          pickup_address: formData.pickup_address || null,
          requires_wheelchair: formData.requires_wheelchair,
          requires_escort: formData.requires_escort,
        };
        await tripApi.updateTrip(tenantId, trip.trip_id, data);
      } else {
        // Create mode - create trip for primary passenger
        const primaryCustomer = customers.find(c => c.id.toString() === formData.customer_id.toString());
        const primaryData = {
          ...baseData,
          customer_id: parseInt(formData.customer_id.toString()),
          pickup_location: formData.pickup_location || null,
          pickup_address: formData.pickup_address || null,
          requires_wheelchair: formData.requires_wheelchair,
          requires_escort: formData.requires_escort,
        };
        await tripApi.createTrip(tenantId, primaryData);

        // Create trips for all additional passengers (carpooling)
        if (additionalPassengers.length > 0) {
          const additionalNotes = formData.notes
            ? `${formData.notes}\n\n🚗 Carpooling with ${primaryCustomer?.name || 'primary passenger'}`
            : `🚗 Carpooling with ${primaryCustomer?.name || 'primary passenger'}`;

          for (const passengerId of additionalPassengers) {
            const passenger = customers.find(c => c.id === passengerId);
            if (passenger) {
              const passengerData = {
                ...baseData,
                customer_id: passengerId,
                pickup_location: 'Home',
                pickup_address: passenger.address || null,
                notes: additionalNotes,
                requires_wheelchair: false, // These come from customer record
                requires_escort: false,
              };
              await tripApi.createTrip(tenantId, passengerData);
            }
          }
        }
      }

      onClose(true); // Close and refresh
    } catch (err: any) {
      console.error('Error saving trip:', err);
      const errorMessage = err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || 'Failed to save trip';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
        onClick={() => onClose()}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>
              {isEdit ? 'Edit Journey' : 'Create Ad-hoc Journey'}
            </h2>
            <button
              onClick={() => onClose()}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {/* Conflict Warnings */}
              {checkingConflicts && (
                <div style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Checking for conflicts...</span>
                </div>
              )}

              {showConflictWarning && conflicts.length > 0 && (
                <div style={{
                  marginBottom: '1rem',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#fffbeb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      color: '#92400e',
                      fontSize: '14px'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      {conflicts.filter(c => c.severity === 'critical').length > 0 ? 'Critical Conflicts Detected' : 'Warnings Detected'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConflictWarning(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#92400e',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        padding: '0'
                      }}
                      title="Hide warnings"
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ padding: '1rem', background: '#fef3c7' }}>
                    {conflicts.map((conflict, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem',
                          background: conflict.severity === 'critical' ? '#fee2e2' : '#ffffff',
                          border: `1px solid ${conflict.severity === 'critical' ? '#ef4444' : '#d1d5db'}`,
                          borderRadius: '4px',
                          marginBottom: idx < conflicts.length - 1 ? '0.5rem' : 0
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '16px',
                            marginTop: '2px'
                          }}>
                            {conflict.severity === 'critical' ? '🔴' : '⚠️'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: conflict.severity === 'critical' ? '#991b1b' : '#92400e',
                              marginBottom: '4px'
                            }}>
                              {conflict.type === 'driver_overlap' && 'Driver Time Conflict'}
                              {conflict.type === 'driver_leave' && 'Driver On Leave'}
                              {conflict.type === 'vehicle_mot' && 'Vehicle MOT Issue'}
                              {conflict.type === 'customer_overlap' && 'Customer Overlap'}
                              {conflict.type === 'customer_holiday' && 'Customer On Holiday'}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#4b5563'
                            }}>
                              {conflict.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{
                      marginTop: '0.75rem',
                      fontSize: '12px',
                      color: '#78350f',
                      fontStyle: 'italic'
                    }}>
                      You can still save this trip, but please review the conflicts above.
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Journey Details
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="customer_id">Customer *</label>
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="driver_id">Driver</label>
                    <select
                      id="driver_id"
                      name="driver_id"
                      value={formData.driver_id}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map(driver => (
                        <option key={driver.driver_id} value={driver.driver_id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trip_date">Date *</label>
                    <input
                      id="trip_date"
                      name="trip_date"
                      type="date"
                      value={formData.trip_date}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pickup_time">Pickup Time *</label>
                    <input
                      id="pickup_time"
                      name="pickup_time"
                      type="time"
                      value={formData.pickup_time}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Location Details
                </h3>

                <div className="form-group">
                  <label htmlFor="pickup_location">Pickup Location</label>
                  <input
                    id="pickup_location"
                    name="pickup_location"
                    type="text"
                    value={formData.pickup_location}
                    onChange={handleChange}
                    placeholder="e.g., Customer's Home"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pickup_address">Pickup Address</label>
                  <input
                    id="pickup_address"
                    name="pickup_address"
                    type="text"
                    value={formData.pickup_address}
                    onChange={handleChange}
                    placeholder="Full address"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="destination">Destination *</label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Hospital, Shopping Centre"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="destination_address">Destination Address</label>
                  <input
                    id="destination_address"
                    name="destination_address"
                    type="text"
                    value={formData.destination_address}
                    onChange={handleChange}
                    placeholder="Full address"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Trip Options */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Trip Options
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="price">Price (£)</label>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="passenger_count">Passengers</label>
                    <input
                      id="passenger_count"
                      name="passenger_count"
                      type="number"
                      min="1"
                      max="8"
                      value={formData.passenger_count}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="urgent"
                      checked={formData.urgent}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span style={{ fontSize: '14px' }}>Urgent Journey</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="requires_wheelchair"
                      checked={formData.requires_wheelchair}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span style={{ fontSize: '14px' }}>Wheelchair Required</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="requires_escort"
                      checked={formData.requires_escort}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span style={{ fontSize: '14px' }}>Escort Required</span>
                  </label>
                </div>
              </div>

              {/* Passenger Recommendations (Only for new trips, not edits) */}
              {!isEdit && formData.destination && formData.pickup_time && formData.trip_date && showRecommendations && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                      💰 Add More Passengers (Increase Revenue)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowRecommendations(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.875rem',
                        color: 'var(--gray-500)',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Hide
                    </button>
                  </div>

                  <PassengerRecommendations
                    tenantId={tenantId}
                    driverId={formData.driver_id}
                    destination={formData.destination}
                    pickupTime={formData.pickup_time}
                    tripDate={formData.trip_date}
                    selectedPassengers={additionalPassengers}
                    onSelectPassenger={handleSelectPassenger}
                  />

                  {/* Selected Passengers Summary */}
                  {additionalPassengers.length > 0 && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#d1fae5',
                      border: '2px solid #10b981',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#065f46',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '20px' }}>✅</span>
                        {additionalPassengers.length} Additional Passenger{additionalPassengers.length > 1 ? 's' : ''} Selected
                      </div>
                      <div style={{ fontSize: '13px', color: '#065f46' }}>
                        {additionalPassengers.map(passengerId => {
                          const passenger = customers.find(c => c.id === passengerId);
                          return (
                            <div key={passengerId} style={{
                              padding: '6px 8px',
                              background: 'white',
                              borderRadius: '4px',
                              marginBottom: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 600 }}>{passenger?.name}</span>
                              <button
                                type="button"
                                onClick={() => handleSelectPassenger(passengerId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: '18px',
                                  padding: '0 4px'
                                }}
                                title="Remove passenger"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #10b981',
                        fontSize: '12px',
                        color: '#047857'
                      }}>
                        💡 <strong>Total trips to create:</strong> {1 + additionalPassengers.length} (1 primary + {additionalPassengers.length} carpooling)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!showRecommendations && !isEdit && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowRecommendations(true)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    💡 Show Carpooling Recommendations
                  </button>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Any additional notes or special requirements..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onClose()}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ background: '#10b981' }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                      {additionalPassengers.length > 0
                        ? `Creating ${1 + additionalPassengers.length} Trips...`
                        : 'Saving...'
                      }
                    </div>
                  ) : (
                    isEdit
                      ? 'Update Journey'
                      : additionalPassengers.length > 0
                        ? `💰 Create ${1 + additionalPassengers.length} Trips (Carpooling)`
                        : 'Create Journey'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default TripFormModal;
