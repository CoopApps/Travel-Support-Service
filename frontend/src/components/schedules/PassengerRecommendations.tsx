/**
 * Passenger Recommendations Component
 *
 * Displays intelligent passenger recommendations for carpooling based on:
 * - Geographic proximity (postcode matching)
 * - Shared destinations
 * - Similar pickup times
 * - Route optimization (optional Google Maps)
 */

import { useState, useEffect } from 'react';
import { tripApi } from '../../services/api';

interface PassengerRecommendation {
  customerId: number;
  customerName: string;
  phone: string;
  address: string;
  postcode: string;
  destination: string;
  pickupTime: string;
  score: number;
  reasoning: string[];
  sharedDestination: boolean;
  detourMinutes?: number;
  requiresWheelchair: boolean;
  requiresEscort: boolean;
  isRegularDriver: boolean;
}

interface PassengerRecommendationsProps {
  tenantId: number;
  driverId?: string | number;
  destination: string;
  pickupTime: string;
  tripDate: string;
  selectedPassengers?: number[];
  onSelectPassenger?: (customerId: number) => void;
}

function PassengerRecommendations({
  tenantId,
  driverId,
  destination,
  pickupTime,
  tripDate,
  selectedPassengers = [],
  onSelectPassenger
}: PassengerRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PassengerRecommendation[]>([]);
  const [error, setError] = useState('');
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);

  useEffect(() => {
    if (destination && pickupTime && tripDate) {
      fetchRecommendations();
    }
  }, [tenantId, driverId, destination, pickupTime, tripDate, useGoogleMaps]);

  const fetchRecommendations = async () => {
    if (!destination || !pickupTime || !tripDate) return;

    setLoading(true);
    setError('');

    try {
      const response = await tripApi.getPassengerRecommendations(tenantId, {
        driverId: driverId ? Number(driverId) : undefined,
        destination,
        pickupTime,
        tripDate,
        includeGoogleMaps: useGoogleMaps
      });

      setRecommendations(response.recommendations || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Orange
    return '#6b7280'; // Gray
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent Match';
    if (score >= 50) return 'Good Match';
    return 'Fair Match';
  };

  if (!destination || !pickupTime || !tripDate) {
    return null; // Don't show if required fields missing
  }

  return (
    <div style={{
      border: '1px solid var(--gray-200)',
      borderRadius: '8px',
      padding: '1rem',
      backgroundColor: 'var(--gray-50)',
      marginBottom: '1.5rem'
    }}>
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
          color: 'var(--gray-900)'
        }}>
          💡 Recommended Passengers for Carpooling
        </h3>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          color: 'var(--gray-600)'
        }}>
          <input
            type="checkbox"
            checked={useGoogleMaps}
            onChange={(e) => setUseGoogleMaps(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Use Google Maps
        </label>
      </div>

      <p style={{
        fontSize: '13px',
        color: 'var(--gray-600)',
        marginBottom: '1rem'
      }}>
        Based on proximity, shared destinations, and time windows
      </p>

      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          gap: '0.5rem'
        }}>
          <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }}></div>
          <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
            Finding compatible passengers...
          </span>
        </div>
      ) : error ? (
        <div className="alert alert-error" style={{ fontSize: '13px' }}>
          {error}
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--gray-500)',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
          <div>No compatible passengers found for this route</div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {recommendations.map((rec) => {
            const isSelected = selectedPassengers.includes(rec.customerId);
            return (
            <div
              key={rec.customerId}
              style={{
                border: isSelected ? '2px solid #10b981' : '1px solid var(--gray-200)',
                borderLeft: `4px solid ${isSelected ? '#10b981' : getScoreColor(rec.score)}`,
                borderRadius: '6px',
                padding: '0.875rem',
                backgroundColor: isSelected ? '#d1fae5' : 'white',
                cursor: onSelectPassenger ? 'pointer' : 'default',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onClick={() => onSelectPassenger?.(rec.customerId)}
              onMouseEnter={(e) => {
                if (onSelectPassenger) {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Header with name and score */}
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
                    color: 'var(--gray-900)',
                    marginBottom: '4px'
                  }}>
                    {rec.customerName}
                    {rec.isRegularDriver && (
                      <span style={{
                        marginLeft: '8px',
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
                    {isSelected && (
                      <span style={{
                        marginLeft: '8px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600
                      }}>
                        ✓ SELECTED
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--gray-500)'
                  }}>
                    {rec.phone}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end'
                }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: getScoreColor(rec.score)
                  }}>
                    {rec.score}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    color: 'var(--gray-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {getScoreLabel(rec.score)}
                  </div>
                </div>
              </div>

              {/* Location details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '4px 8px',
                fontSize: '12px',
                marginBottom: '0.5rem',
                color: 'var(--gray-700)'
              }}>
                <div style={{ fontWeight: 600 }}>From:</div>
                <div>{rec.address || 'Unknown'} {rec.postcode && `(${rec.postcode})`}</div>

                <div style={{ fontWeight: 600 }}>To:</div>
                <div>
                  {rec.destination}
                  {rec.sharedDestination && (
                    <span style={{
                      marginLeft: '6px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      SAME DESTINATION
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 600 }}>Time:</div>
                <div>{rec.pickupTime}</div>

                {rec.detourMinutes !== undefined && (
                  <>
                    <div style={{ fontWeight: 600 }}>Detour:</div>
                    <div style={{
                      color: rec.detourMinutes < 5 ? '#10b981' : rec.detourMinutes < 10 ? '#f59e0b' : '#dc2626'
                    }}>
                      +{rec.detourMinutes} min
                    </div>
                  </>
                )}
              </div>

              {/* Requirements badges */}
              <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '0.5rem'
              }}>
                {rec.requiresWheelchair && (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    ♿ Wheelchair
                  </span>
                )}
                {rec.requiresEscort && (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    fontSize: '10px',
                    fontWeight: 600
                  }}>
                    👤 Escort
                  </span>
                )}
              </div>

              {/* Reasoning */}
              <div style={{
                fontSize: '11px',
                color: 'var(--gray-600)',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--gray-100)'
              }}>
                {rec.reasoning.map((reason, idx) => (
                  <div key={idx} style={{ marginBottom: '2px' }}>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

export default PassengerRecommendations;
