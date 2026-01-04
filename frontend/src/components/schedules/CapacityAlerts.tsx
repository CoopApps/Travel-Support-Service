/**
 * Capacity Alerts Component
 *
 * Displays alerts for underutilized vehicles and identifies revenue opportunities
 * by showing empty seats and recommending compatible passengers
 */

import { useState, useEffect } from 'react';
import { tripApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CapacityAlert {
  trip_group_key: string;
  driver_id: number;
  driver_name: string;
  vehicle: {
    id: number;
    registration: string;
    make: string;
    model: string;
    capacity: number;
    wheelchair_accessible: boolean;
  };
  trip_details: {
    pickup_time: string;
    destination: string;
    destination_address: string;
    trip_ids: number[];
  };
  capacity: {
    total_seats: number;
    occupied_seats: number;
    empty_seats: number;
    utilization_percentage: number;
  };
  revenue: {
    average_trip_price: number;
    potential_additional_revenue: number;
  };
  current_passengers: Array<{
    customer_id: number;
    customer_name: string;
    price: number;
  }>;
  recommended_passengers: Array<{
    customer_id: number;
    customer_name: string;
    address: string;
    postcode: string;
    phone: string;
    destination: string;
    pickup_time: string;
    time_diff_minutes: number;
    mobility_requirements: string;
  }>;
  severity: 'high' | 'medium' | 'low';
}

interface CapacityAlertsSummary {
  total_alerts: number;
  total_empty_seats: number;
  total_potential_revenue: number;
  average_utilization: number;
}

interface CapacityAlertsProps {
  date: string;
  driverId?: number;
  onAddPassenger?: (customerId: number, alertKey: string) => void;
}

function CapacityAlerts({ date, driverId, onAddPassenger }: CapacityAlertsProps) {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [summary, setSummary] = useState<CapacityAlertsSummary | null>(null);
  const [error, setError] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const tenantId = useAuthStore((state) => state.tenantId);

  useEffect(() => {
    if (date && tenantId) {
      fetchCapacityAlerts();
    }
  }, [date, driverId, tenantId]);

  const fetchCapacityAlerts = async () => {
    if (!date || !tenantId) return;

    setLoading(true);
    setError('');

    try {
      const response = await tripApi.getCapacityAlerts(tenantId, {
        date,
        driverId
      });

      setAlerts(response.alerts || []);
      setSummary(response.summary);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load capacity alerts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = (key: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedAlerts(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#dc2626'; // Red
      case 'medium': return '#f59e0b'; // Orange
      case 'low': return '#6b7280'; // Gray
      default: return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority';
      case 'low': return 'Low Priority';
      default: return 'Priority';
    }
  };

  if (loading) {
    return (
      <div style={{
        border: '1px solid var(--gray-200)',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: 'var(--gray-50)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }}></div>
          <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
            Analyzing vehicle capacity...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ marginBottom: '1.5rem', fontSize: '13px' }}>
        {error}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null; // Don't show if no alerts
  }

  return (
    <div style={{
      border: '2px solid #fbbf24',
      borderRadius: '8px',
      padding: '1rem',
      backgroundColor: '#fffbeb',
      marginBottom: '1.5rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          margin: 0,
          color: '#92400e'
        }}>
          💰 Revenue Opportunity Alerts
        </h3>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #fbbf24'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
              Total Alerts
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>
              {summary.total_alerts}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
              Empty Seats
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400e' }}>
              {summary.total_empty_seats}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
              Potential Revenue
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
              £{summary.total_potential_revenue.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {alerts.map((alert) => {
          const isExpanded = expandedAlerts.has(alert.trip_group_key);
          return (
            <div
              key={alert.trip_group_key}
              style={{
                border: '1px solid var(--gray-200)',
                borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                borderRadius: '6px',
                backgroundColor: 'white',
                overflow: 'hidden'
              }}
            >
              {/* Alert Header - Always Visible */}
              <div
                style={{
                  padding: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => toggleAlert(alert.trip_group_key)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--gray-900)'
                    }}>
                      {alert.driver_name} - {alert.vehicle.registration}
                    </div>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: getSeverityColor(alert.severity) + '20',
                      color: getSeverityColor(alert.severity),
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {getSeverityLabel(alert.severity)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '12px',
                    color: 'var(--gray-600)',
                    marginBottom: '8px'
                  }}>
                    {alert.trip_details.pickup_time} → {alert.trip_details.destination}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '12px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--gray-500)' }}>Capacity:</span>{' '}
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>
                        {alert.capacity.occupied_seats}/{alert.capacity.total_seats}
                      </span>{' '}
                      <span style={{ color: 'var(--gray-500)' }}>
                        ({alert.capacity.utilization_percentage}%)
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--gray-500)' }}>Empty:</span>{' '}
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {alert.capacity.empty_seats} seats
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--gray-500)' }}>Potential:</span>{' '}
                      <span style={{ fontWeight: 600, color: '#10b981' }}>
                        +£{alert.revenue.potential_additional_revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '18px',
                  color: 'var(--gray-400)',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▼
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  padding: '0 0.875rem 0.875rem 0.875rem',
                  borderTop: '1px solid var(--gray-100)'
                }}>
                  {/* Vehicle Details */}
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: '4px',
                    marginBottom: '0.75rem',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--gray-900)' }}>
                      Vehicle Details
                    </div>
                    <div style={{ color: 'var(--gray-600)' }}>
                      {alert.vehicle.make} {alert.vehicle.model} • {alert.vehicle.capacity} seats
                      {alert.vehicle.wheelchair_accessible && ' • ♿ Wheelchair Accessible'}
                    </div>
                  </div>

                  {/* Current Passengers */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      marginBottom: '6px',
                      color: 'var(--gray-700)'
                    }}>
                      Current Passengers ({alert.current_passengers.length})
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {alert.current_passengers.map((passenger, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '12px',
                            color: 'var(--gray-600)',
                            padding: '4px 8px',
                            backgroundColor: 'var(--gray-50)',
                            borderRadius: '3px'
                          }}
                        >
                          {passenger.customer_name} - £{passenger.price.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Passengers */}
                  {alert.recommended_passengers.length > 0 ? (
                    <div>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '12px',
                        marginBottom: '6px',
                        color: 'var(--gray-700)'
                      }}>
                        💡 Recommended Passengers ({alert.recommended_passengers.length})
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        {alert.recommended_passengers.map((passenger) => (
                          <div
                            key={passenger.customer_id}
                            style={{
                              border: '1px solid #d1fae5',
                              borderRadius: '4px',
                              padding: '8px',
                              backgroundColor: '#f0fdf4',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '4px'
                            }}>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                                  {passenger.customer_name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                                  {passenger.phone}
                                </div>
                              </div>
                              <div style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: passenger.time_diff_minutes <= 10 ? '#10b981' : '#f59e0b',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 600
                              }}>
                                ±{passenger.time_diff_minutes}min
                              </div>
                            </div>
                            <div style={{ color: 'var(--gray-600)', marginBottom: '4px' }}>
                              From: {passenger.address} {passenger.postcode}
                            </div>
                            <div style={{ color: 'var(--gray-600)', marginBottom: '6px' }}>
                              To: {passenger.destination} at {passenger.pickup_time}
                            </div>
                            {onAddPassenger && (
                              <button
                                onClick={() => onAddPassenger(passenger.customer_id, alert.trip_group_key)}
                                style={{
                                  padding: '4px 10px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                + Add Passenger
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '1rem',
                      textAlign: 'center',
                      color: 'var(--gray-500)',
                      fontSize: '12px',
                      backgroundColor: 'var(--gray-50)',
                      borderRadius: '4px'
                    }}>
                      No compatible passengers found for this route
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CapacityAlerts;
