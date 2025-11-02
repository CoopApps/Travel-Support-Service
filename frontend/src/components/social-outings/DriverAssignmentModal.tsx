import { useState, useEffect } from 'react';
import { SocialOuting, OutingRota, OutingBooking, Driver, AvailabilityCheck } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';
import { driverApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface DriverAssignmentModalProps {
  outing: SocialOuting;
  onClose: (shouldRefresh: boolean) => void;
}

interface DriverWithVehicle extends Driver {
  make?: string;
  model?: string;
  registration?: string;
  wheelchair_accessible?: boolean;
  seats?: number;
}

/**
 * Driver Assignment Modal
 *
 * Assign drivers to social outing with availability checking and passenger assignments
 * Shows wheelchair accessible vehicles when needed
 */
function DriverAssignmentModal({ outing, onClose }: DriverAssignmentModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [rotas, setRotas] = useState<OutingRota[]>([]);
  const [bookings, setBookings] = useState<OutingBooking[]>([]);
  const [drivers, setDrivers] = useState<DriverWithVehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add driver state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
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
      const [rotasData, bookingsData, driversData] = await Promise.all([
        socialOutingsApi.getRotas(tenantId, outing.id),
        socialOutingsApi.getBookings(tenantId, outing.id),
        driverApi.getDrivers(tenantId, { limit: 1000 })
      ]);

      setRotas(rotasData);
      setBookings(bookingsData.filter(b => b.booking_status === 'confirmed'));

      // Drivers endpoint from social-outings routes includes vehicle info
      const driversWithVehicles = driversData.drivers || driversData;
      setDrivers(driversWithVehicles);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load driver assignments');
    } finally {
      setLoading(false);
    }
  };

  // Check driver availability when selected
  useEffect(() => {
    if (selectedDriverId && tenantId) {
      checkDriverAvailability(selectedDriverId);
    } else {
      setAvailabilityCheck(null);
    }
  }, [selectedDriverId, tenantId]);

  const checkDriverAvailability = async (driverId: number) => {
    if (!tenantId) return;

    setCheckingAvailability(true);
    try {
      const availability = await socialOutingsApi.checkDriverAvailability(
        tenantId,
        driverId,
        outing.outing_date,
        outing.departure_time
      );
      setAvailabilityCheck(availability);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityCheck(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleAddDriver = async () => {
    if (!tenantId || !selectedDriverId) return;

    setSubmitting(true);
    setError(null);

    try {
      await socialOutingsApi.createRota(tenantId, outing.id, {
        driver_id: selectedDriverId,
        role: 'driver'
      });

      // Reset form
      setShowAddForm(false);
      setSelectedDriverId(null);
      setAvailabilityCheck(null);

      // Refresh data
      fetchData();
    } catch (err: any) {
      console.error('Error assigning driver:', err);
      setError(err.response?.data?.error || 'Failed to assign driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDriver = async (rota: OutingRota) => {
    if (!tenantId) return;

    const confirmed = confirm(
      `Remove ${rota.driver_name || 'this driver'} from the outing?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await socialOutingsApi.deleteRota(tenantId, outing.id, rota.id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove driver');
    }
  };

  const handleTogglePassenger = async (rota: OutingRota, bookingId: number) => {
    if (!tenantId) return;

    const currentPassengers = rota.assigned_passengers || [];
    const newPassengers = currentPassengers.includes(bookingId)
      ? currentPassengers.filter(id => id !== bookingId)
      : [...currentPassengers, bookingId];

    try {
      await socialOutingsApi.updateRotaPassengers(tenantId, outing.id, rota.id, {
        assigned_passengers: newPassengers
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update passenger assignment');
    }
  };

  // Filter out already assigned drivers
  const assignedDriverIds = rotas.map(r => r.driver_id);
  const availableDrivers = drivers.filter(d => !assignedDriverIds.includes(d.driver_id));

  // Count wheelchair users
  const wheelchairUserCount = bookings.filter(
    b => b.customer_data?.accessibility_needs?.wheelchairUser
  ).length;

  // Count wheelchair accessible vehicles assigned
  const wheelchairVehiclesAssigned = rotas.filter(
    r => r.vehicle_data?.wheelchair_accessible
  ).length;

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
            maxWidth: '1000px',
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
                Driver Assignments
              </h2>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
                {outing.name} • {formatDate(outing.outing_date)}
              </p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '13px' }}>
                <span style={{ color: 'var(--gray-600)' }}>
                  {rotas.length} driver{rotas.length !== 1 ? 's' : ''} assigned
                </span>
                {wheelchairUserCount > 0 && (
                  <span style={{
                    color: wheelchairVehiclesAssigned >= wheelchairUserCount ? '#10b981' : '#dc2626',
                    fontWeight: 600
                  }}>
                    {wheelchairUserCount} wheelchair user{wheelchairUserCount !== 1 ? 's' : ''} •{' '}
                    {wheelchairVehiclesAssigned} accessible vehicle{wheelchairVehiclesAssigned !== 1 ? 's' : ''}
                  </span>
                )}
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

            {/* Wheelchair Alert */}
            {wheelchairUserCount > 0 && wheelchairVehiclesAssigned < wheelchairUserCount && (
              <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                <strong>Wheelchair Accessible Vehicles Needed:</strong> {wheelchairUserCount} wheelchair user
                {wheelchairUserCount !== 1 ? 's' : ''} booked but only {wheelchairVehiclesAssigned} accessible vehicle
                {wheelchairVehiclesAssigned !== 1 ? 's' : ''} assigned.
              </div>
            )}

            {/* Add Driver Section */}
            {!showAddForm && (
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
                style={{ marginBottom: '1.5rem' }}
              >
                + Assign Driver
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
                  Assign Driver
                </h3>

                <div className="form-group">
                  <label htmlFor="driver">Select Driver *</label>
                  <select
                    id="driver"
                    value={selectedDriverId || ''}
                    onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)}
                  >
                    <option value="">-- Select a driver --</option>
                    {availableDrivers.map(driver => {
                      const hasVehicle = driver.registration;
                      const isWheelchairAccessible = driver.wheelchair_accessible;
                      return (
                        <option key={driver.driver_id} value={driver.driver_id}>
                          {driver.name}
                          {hasVehicle && ` - ${driver.make} ${driver.model} (${driver.registration})`}
                          {isWheelchairAccessible && ' [Wheelchair Accessible]'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Driver Info */}
                {selectedDriverId && (() => {
                  const driver = availableDrivers.find(d => d.driver_id === selectedDriverId);
                  if (driver) {
                    return (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '4px',
                        marginBottom: '1rem',
                        fontSize: '13px'
                      }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>{driver.name}</strong>
                        </div>
                        {driver.registration ? (
                          <>
                            <div>Vehicle: {driver.make} {driver.model}</div>
                            <div>Registration: {driver.registration}</div>
                            {driver.seats && <div>Seats: {driver.seats}</div>}
                            {driver.wheelchair_accessible && (
                              <div style={{ color: '#10b981', fontWeight: 600, marginTop: '0.25rem' }}>
                                ✓ Wheelchair Accessible
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ color: '#f59e0b' }}>No vehicle assigned</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

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
                    <small>You can still proceed with the assignment if needed.</small>
                  </div>
                )}

                {availabilityCheck && availabilityCheck.available && (
                  <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                    Driver is available for this date
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddDriver}
                    disabled={!selectedDriverId || submitting}
                  >
                    {submitting ? 'Assigning...' : 'Assign Driver'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedDriverId(null);
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

            {/* Assigned Drivers List */}
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Assigned Drivers ({rotas.length})
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                Loading driver assignments...
              </div>
            ) : rotas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                No drivers assigned yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rotas.map(rota => {
                  const vehicleData = rota.vehicle_data || {};
                  const assignedPassengers = rota.assigned_passengers || [];

                  return (
                    <div
                      key={rota.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}
                    >
                      {/* Driver Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '15px' }}>{rota.driver_name}</strong>
                            {vehicleData.wheelchair_accessible && (
                              <span className="badge badge-green">Wheelchair Accessible</span>
                            )}
                          </div>
                          {vehicleData.registration && (
                            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                              {vehicleData.make} {vehicleData.model} • {vehicleData.registration}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveDriver(rota)}
                        >
                          Remove
                        </button>
                      </div>

                      {/* Passenger Assignment */}
                      {bookings.length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
                            Assigned Passengers ({assignedPassengers.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {bookings.map(booking => {
                              const isAssigned = assignedPassengers.includes(booking.id);
                              const isWheelchairUser = booking.customer_data?.accessibility_needs?.wheelchairUser || false;
                              const customerName = booking.customer_name || booking.customer_data?.name || 'Unknown';

                              return (
                                <label
                                  key={booking.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: isAssigned ? '#f0f9ff' : 'transparent',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => handleTogglePassenger(rota, booking.id)}
                                    style={{ width: 'auto' }}
                                  />
                                  <span style={{ flex: 1 }}>
                                    {customerName}
                                    {isWheelchairUser && (
                                      <span style={{ marginLeft: '0.5rem', color: '#8b5cf6', fontSize: '12px' }}>
                                        (Wheelchair User)
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

export default DriverAssignmentModal;
