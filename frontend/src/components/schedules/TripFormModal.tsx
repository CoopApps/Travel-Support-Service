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

  // Return journey state
  const [createReturnJourney, setCreateReturnJourney] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  const [suggestedReturnTime, setSuggestedReturnTime] = useState<string | null>(null);

  // Smart driver suggestions state
  const [driverSuggestions, setDriverSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(true);

  // Reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderHistory, setReminderHistory] = useState<any[]>([]);
  const [showReminderHistory, setShowReminderHistory] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Get customer reliability info
   */
  const getSelectedCustomer = () => {
    if (formData.customer_id) {
      return customers.find(c => c.id.toString() === formData.customer_id.toString());
    }
    return null;
  };

  const selectedCustomer = getSelectedCustomer();

  // Check if customer has poor reliability
  const hasLowReliability = selectedCustomer &&
    selectedCustomer.total_trips_attempted &&
    selectedCustomer.total_trips_attempted >= 5 &&
    selectedCustomer.reliability_percentage !== undefined &&
    selectedCustomer.reliability_percentage < 80;

  /**
   * Auto-fill customer's home address when customer is selected
   * Also check for return journey time from customer's schedule
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

        // Check customer's schedule for return journey time
        if (customer.schedule && formData.trip_date) {
          const tripDate = new Date(formData.trip_date);
          const dayOfWeek = tripDate.getDay();
          const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const dayKey = dayNames[dayOfWeek];

          const daySchedule = customer.schedule[dayKey];

          if (daySchedule) {
            // Check for enhanced schedule with return_time
            if (daySchedule.return_time) {
              setSuggestedReturnTime(daySchedule.return_time);
              setReturnTime(daySchedule.return_time);
            }
            // Fallback: Calculate return time based on pickup time (add 5 hours)
            else if (formData.pickup_time) {
              const [hours, minutes] = formData.pickup_time.split(':');
              const returnHours = (parseInt(hours) + 5) % 24;
              const calculatedReturnTime = `${returnHours.toString().padStart(2, '0')}:${minutes}`;
              setSuggestedReturnTime(calculatedReturnTime);
              setReturnTime(calculatedReturnTime);
            }
          }
        }
      }
    }
  }, [formData.customer_id, formData.trip_date, formData.pickup_time, customers, isEdit]);

  /**
   * Check for conflicts when key fields change
   */
  /**
   * Enhanced conflict detection - checks vehicle MOT, driver hours, customer preferences, etc.
   */
  useEffect(() => {
    const checkConflicts = async () => {
      // Only check if we have the required fields
      if (!formData.trip_date || !formData.pickup_time || !formData.customer_id) {
        setConflicts([]);
        return;
      }

      // Get vehicle ID from driver's assigned vehicle or form data
      let vehicleId: number | undefined = undefined;
      if (formData.driver_id) {
        const selectedDriver = drivers.find(d => d.id.toString() === formData.driver_id.toString());
        vehicleId = selectedDriver?.current_vehicle_id || undefined;
      }

      setCheckingConflicts(true);
      try {
        const result = await tripApi.checkConflicts(tenantId, {
          driverId: formData.driver_id ? parseInt(formData.driver_id.toString()) : undefined,
          vehicleId,
          customerId: parseInt(formData.customer_id.toString()),
          tripDate: formData.trip_date,
          pickupTime: formData.pickup_time,
          returnTime: returnTime || undefined,
          requiresWheelchair: formData.requires_wheelchair
        });

        if (result.hasConflicts) {
          // Combine critical conflicts and warnings, but mark them with severity
          const allConflicts = [
            ...result.criticalConflicts.map(c => ({ ...c, severity: 'critical' as const })),
            ...result.warnings.map(w => ({ ...w, severity: 'warning' as const }))
          ];
          setConflicts(allConflicts);
          setShowConflictWarning(result.hasCriticalConflicts);
        } else {
          setConflicts([]);
          setShowConflictWarning(false);
        }
      } catch {
        // Error handled silently - don't block form submission on conflict check errors
      } finally {
        setCheckingConflicts(false);
      }
    };

    // Debounce conflict checking
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.driver_id, formData.trip_date, formData.pickup_time, formData.customer_id, formData.requires_wheelchair, returnTime, tenantId, drivers]);

  /**
   * Fetch smart driver suggestions when customer, date, time change
   */
  useEffect(() => {
    const fetchDriverSuggestions = async () => {
      // Only fetch suggestions for new trips with required data
      if (isEdit || !formData.customer_id || !formData.trip_date || !formData.pickup_time) {
        setDriverSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const response = await tripApi.suggestDriver(tenantId, {
          customerId: Number(formData.customer_id),
          tripDate: formData.trip_date,
          pickupTime: formData.pickup_time,
          requiresWheelchair: formData.requires_wheelchair,
          passengersCount: formData.passenger_count || 1
        });

        setDriverSuggestions(response.recommendations || []);
      } catch {
        // Error handled silently
        setDriverSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    // Debounce suggestions
    const timeoutId = setTimeout(fetchDriverSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.customer_id, formData.trip_date, formData.pickup_time, formData.requires_wheelchair, formData.passenger_count, tenantId, isEdit]);

  /**
   * Load reminder history when modal opens in edit mode
   */
  useEffect(() => {
    const loadHistory = async () => {
      if (isEdit && trip?.trip_id && token) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tenants/${tenantId}/reminders/history/${trip.trip_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            setReminderHistory(data.history || []);
          }
        } catch {
          // Error handled silently
        }
      }
    };

    loadHistory();
  }, [isEdit, trip?.trip_id, tenantId, token]);

  /**
   * Send reminder now
   */
  const sendReminder = async () => {
    if (!trip?.trip_id) return;

    setSendingReminder(true);
    setReminderMessage(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tenants/${tenantId}/reminders/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ tripId: trip.trip_id })
        }
      );

      const data = await response.json();

      if (data.success) {
        setReminderMessage({ type: 'success', text: 'Reminder sent successfully!' });
        // Reload history
        const historyResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tenants/${tenantId}/reminders/history/${trip.trip_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setReminderHistory(historyData.history || []);
        }
      } else {
        setReminderMessage({
          type: 'error',
          text: data.error || 'Failed to send reminder'
        });
      }
    } catch (err: any) {
      setReminderMessage({
        type: 'error',
        text: err.message || 'Failed to send reminder'
      });
    } finally {
      setSendingReminder(false);
    }
  };

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

    // Block submission if critical conflicts exist
    const hasCriticalConflicts = conflicts.some(c => c.severity === 'critical');
    if (hasCriticalConflicts) {
      setError('Cannot save trip: Critical conflicts must be resolved first');
      setShowConflictWarning(true);
      return;
    }

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
        // Create mode - build array of all trips to create (primary + carpooling passengers)
        const primaryCustomer = customers.find(c => c.id.toString() === formData.customer_id.toString());
        const tripsToCreate: any[] = [];

        // Primary passenger trip
        const primaryData = {
          ...baseData,
          customer_id: parseInt(formData.customer_id.toString()),
          pickup_location: formData.pickup_location || null,
          pickup_address: formData.pickup_address || null,
          requires_wheelchair: formData.requires_wheelchair,
          requires_escort: formData.requires_escort,
        };
        tripsToCreate.push(primaryData);

        // Additional passengers (carpooling)
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
              tripsToCreate.push(passengerData);
            }
          }
        }

        // Return journey for primary passenger (if enabled)
        if (createReturnJourney && returnTime) {
          const returnJourneyData = {
            ...baseData,
            customer_id: parseInt(formData.customer_id.toString()),
            pickup_time: returnTime,
            pickup_location: formData.destination || 'Destination', // Return from destination
            pickup_address: formData.destination_address || formData.destination,
            destination: 'Home',
            destination_address: formData.pickup_address || primaryCustomer?.address || null,
            notes: formData.notes ? `${formData.notes}\n\n↩️ Return Journey` : '↩️ Return Journey',
            requires_wheelchair: formData.requires_wheelchair,
            requires_escort: formData.requires_escort,
          };
          tripsToCreate.push(returnJourneyData);
        }

        // Create all trips in a single transaction
        await tripApi.bulkCreateTrips(tenantId, tripsToCreate);
      }

      onClose(true); // Close and refresh
    } catch (err: any) {
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
                              {conflict.category === 'vehicle' && '🚗 Vehicle Issue'}
                              {conflict.category === 'driver' && '👤 Driver Issue'}
                              {conflict.category === 'customer' && '👥 Customer Issue'}
                              {conflict.category === 'scheduling' && '📅 Scheduling Conflict'}
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
                      color: conflicts.filter(c => c.severity === 'critical').length > 0 ? '#991b1b' : '#78350f',
                      fontStyle: 'italic',
                      fontWeight: conflicts.filter(c => c.severity === 'critical').length > 0 ? 600 : 400
                    }}>
                      {conflicts.filter(c => c.severity === 'critical').length > 0
                        ? '❌ Cannot save trip: Critical conflicts must be resolved first'
                        : 'You can still save this trip, but please review the warnings above.'
                      }
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

                    {/* Reliability Warning */}
                    {hasLowReliability && selectedCustomer && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '16px' }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: 600,
                              color: '#856404',
                              marginBottom: '4px'
                            }}>
                              Low Reliability Customer
                            </div>
                            <div style={{ color: '#856404' }}>
                              {selectedCustomer.reliability_percentage?.toFixed(0)}% reliable
                              ({selectedCustomer.no_show_count || 0} no-shows in {selectedCustomer.total_trips_attempted || 0} trips)
                            </div>
                            {selectedCustomer.last_no_show_date && (
                              <div style={{
                                fontSize: '11px',
                                color: '#6c757d',
                                marginTop: '4px'
                              }}>
                                Last no-show: {new Date(selectedCustomer.last_no_show_date).toLocaleDateString()}
                              </div>
                            )}
                            <div style={{
                              fontSize: '12px',
                              color: '#856404',
                              marginTop: '6px',
                              fontStyle: 'italic'
                            }}>
                              💡 Consider calling before pickup
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

                  {/* Smart Driver Suggestions */}
                  {!isEdit && formData.customer_id && formData.trip_date && formData.pickup_time && showDriverSuggestions && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '8px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0369a1'
                        }}>
                          🎯 Recommended Drivers
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowDriverSuggestions(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            fontSize: '18px',
                            padding: '0 4px'
                          }}
                        >
                          ×
                        </button>
                      </div>

                      {loadingSuggestions ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '1rem',
                          justifyContent: 'center'
                        }}>
                          <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            Analyzing drivers...
                          </span>
                        </div>
                      ) : driverSuggestions.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {driverSuggestions.map((suggestion) => {
                            const getRecommendationColor = () => {
                              switch (suggestion.recommendation) {
                                case 'highly_recommended': return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
                                case 'recommended': return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
                                case 'acceptable': return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
                                default: return { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' };
                              }
                            };
                            const colors = getRecommendationColor();

                            return (
                              <div
                                key={suggestion.driverId}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, driver_id: suggestion.driverId }));
                                }}
                                style={{
                                  padding: '0.75rem',
                                  backgroundColor: 'white',
                                  borderRadius: '6px',
                                  border: `2px solid ${colors.border}`,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = 'none';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  marginBottom: '0.5rem'
                                }}>
                                  <div>
                                    <div style={{
                                      fontWeight: 600,
                                      fontSize: '14px',
                                      color: '#111827',
                                      marginBottom: '2px'
                                    }}>
                                      {suggestion.driverName}
                                      {suggestion.isRegularDriver && (
                                        <span style={{
                                          marginLeft: '6px',
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          backgroundColor: '#dbeafe',
                                          color: '#1e40af',
                                          fontSize: '10px',
                                          fontWeight: 600
                                        }}>
                                          REGULAR
                                        </span>
                                      )}
                                    </div>
                                    {suggestion.vehicle && (
                                      <div style={{
                                        fontSize: '11px',
                                        color: '#6b7280'
                                      }}>
                                        {suggestion.vehicle.registration} • {suggestion.vehicle.seats} seats
                                        {suggestion.vehicle.wheelchairAccessible && ' • ♿'}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end'
                                  }}>
                                    <div style={{
                                      fontSize: '20px',
                                      fontWeight: 700,
                                      color: colors.text
                                    }}>
                                      {suggestion.score}
                                    </div>
                                    <div style={{
                                      fontSize: '9px',
                                      color: '#6b7280',
                                      textTransform: 'uppercase'
                                    }}>
                                      {suggestion.completionRate.toFixed(0)}% completion
                                    </div>
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#4b5563',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}>
                                  {suggestion.reasons.slice(0, 3).map((reason: string, idx: number) => (
                                    <div key={idx}>• {reason}</div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '13px'
                        }}>
                          No driver recommendations available
                        </div>
                      )}
                    </div>
                  )}
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

              {/* Return Journey Section */}
              {!isEdit && suggestedReturnTime && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}>
                    <input
                      type="checkbox"
                      id="createReturnJourney"
                      checked={createReturnJourney}
                      onChange={(e) => setCreateReturnJourney(e.target.checked)}
                      disabled={loading}
                      style={{
                        width: '18px',
                        height: '18px',
                        marginTop: '2px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <label
                        htmlFor="createReturnJourney"
                        style={{
                          fontWeight: 600,
                          color: '#0369a1',
                          cursor: 'pointer',
                          marginBottom: '0.5rem',
                          display: 'block'
                        }}
                      >
                        ↩️ Create Return Journey
                      </label>
                      <div style={{
                        fontSize: '13px',
                        color: '#0c4a6e',
                        marginBottom: '0.75rem'
                      }}>
                        Automatically create a return trip from <strong>{formData.destination || 'destination'}</strong> back to Home
                      </div>

                      {createReturnJourney && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor="returnTime" style={{ fontSize: '13px', color: '#0c4a6e' }}>
                            Return Pickup Time
                          </label>
                          <input
                            id="returnTime"
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            disabled={loading}
                            style={{
                              marginTop: '0.25rem',
                              maxWidth: '200px'
                            }}
                          />
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '0.25rem'
                          }}>
                            💡 Suggested from customer's schedule
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Send Reminder Section (Edit Mode Only) */}
              {isEdit && trip?.trip_id && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: reminderMessage || (showReminderHistory && reminderHistory.length > 0) ? '1rem' : '0'
                    }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        Trip Reminder
                      </h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {reminderHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowReminderHistory(!showReminderHistory)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '13px',
                              background: 'white',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontWeight: 500
                            }}
                          >
                            {showReminderHistory ? 'Hide History' : `View History (${reminderHistory.length})`}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={sendReminder}
                          disabled={sendingReminder}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '13px',
                            background: sendingReminder ? '#d1d5db' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: sendingReminder ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {sendingReminder ? (
                            <>
                              <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }}></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                              Send Reminder Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Success/Error Message */}
                    {reminderMessage && (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: reminderMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                        border: `1px solid ${reminderMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
                        borderRadius: '6px',
                        marginBottom: showReminderHistory && reminderHistory.length > 0 ? '1rem' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {reminderMessage.type === 'success' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        )}
                        <span style={{
                          fontSize: '13px',
                          color: reminderMessage.type === 'success' ? '#065f46' : '#991b1b',
                          fontWeight: 500
                        }}>
                          {reminderMessage.text}
                        </span>
                      </div>
                    )}

                    {/* Reminder History */}
                    {showReminderHistory && reminderHistory.length > 0 && (
                      <div style={{
                        marginTop: reminderMessage ? '0' : '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: 'white'
                      }}>
                        <div style={{
                          padding: '0.75rem',
                          backgroundColor: '#f3f4f6',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Reminder History
                        </div>
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {reminderHistory.map((reminder: any, idx: number) => (
                            <div
                              key={reminder.reminder_id || idx}
                              style={{
                                padding: '0.75rem',
                                borderBottom: idx < reminderHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '1rem'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#111827',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  {reminder.reminder_type === 'sms' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                      <line x1="12" y1="18" x2="12.01" y2="18" />
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                      <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                  )}
                                  {reminder.reminder_type.toUpperCase()} to {reminder.recipient}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#6b7280',
                                  marginBottom: '4px'
                                }}>
                                  {new Date(reminder.sent_at).toLocaleString()}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor:
                                    reminder.delivery_status === 'sent' || reminder.delivery_status === 'delivered'
                                      ? '#d1fae5'
                                      : reminder.delivery_status === 'pending'
                                        ? '#fef3c7'
                                        : '#fee2e2',
                                  color:
                                    reminder.delivery_status === 'sent' || reminder.delivery_status === 'delivered'
                                      ? '#065f46'
                                      : reminder.delivery_status === 'pending'
                                        ? '#92400e'
                                        : '#991b1b',
                                  display: 'inline-block',
                                  fontWeight: 600
                                }}>
                                  {reminder.delivery_status?.toUpperCase() || 'UNKNOWN'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  disabled={loading || conflicts.some(c => c.severity === 'critical')}
                  style={{
                    background: conflicts.some(c => c.severity === 'critical') ? '#9ca3af' : '#10b981',
                    cursor: conflicts.some(c => c.severity === 'critical') ? 'not-allowed' : 'pointer'
                  }}
                  title={conflicts.some(c => c.severity === 'critical') ? 'Resolve critical conflicts before saving' : ''}
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
