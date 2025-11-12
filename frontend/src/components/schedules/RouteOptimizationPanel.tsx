import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

interface RouteOptimizationPanelProps {
  tenantId: number;
  driverId: number;
  driverName: string;
  date: string;
  onClose: () => void;
  onOptimized: () => void;
}

interface Trip {
  trip_id: number;
  customer_name: string;
  pickup_location: string;
  pickup_address: string;
  destination: string;
  destination_address: string;
  pickup_time: string;
  status: string;
}

interface OptimizationResult {
  method: 'google' | 'haversine' | 'manual';
  originalOrder: Trip[];
  optimizedOrder: Trip[];
  savings: {
    distance?: number;
    time?: number;
  };
  warning?: string;
  reliable: boolean;
}

function RouteOptimizationPanel({
  tenantId,
  driverId,
  driverName,
  date,
  onClose,
  onOptimized
}: RouteOptimizationPanelProps) {
  const token = useAuthStore(state => state.token);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
  }, [driverId, date]);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    setOptimizationResult(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/trips?driverId=${driverId}&date=${date}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch trips');

      const result = await response.json();
      setTrips(result.sort((a: Trip, b: Trip) => a.pickup_time.localeCompare(b.pickup_time)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = async () => {
    if (trips.length < 2) return;

    setOptimizing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/routes/optimize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            driverId,
            date,
            trips: trips.map(t => ({
              trip_id: t.trip_id,
              pickup_address: t.pickup_address,
              destination_address: t.destination_address
            }))
          })
        }
      );

      if (!response.ok) throw new Error('Failed to optimize route');

      const result = await response.json();
      setOptimizationResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const applyOptimization = async () => {
    if (!optimizationResult) return;

    setLoading(true);
    try {
      // Update trip times based on optimized order
      const updatePromises = optimizationResult.optimizedOrder.map((trip, index) => {
        const newTime = `${8 + index}:00:00`; // Start at 8 AM, 1 hour intervals
        return fetch(`/api/tenants/${tenantId}/trips/${trip.trip_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ pickup_time: newTime })
        });
      });

      await Promise.all(updatePromises);
      onOptimized();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '600px',
      maxWidth: '90vw',
      backgroundColor: 'white',
      boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--gray-200)',
        backgroundColor: 'var(--gray-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            Route Optimizer
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)' }}>
            {driverName} • {formatDate(date)}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--gray-500)',
            padding: '4px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
            Loading trips...
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            padding: '1.5rem',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            No trips found for this driver on {formatDate(date)}
          </div>
        )}

        {!loading && trips.length > 0 && !optimizationResult && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                Current Schedule ({trips.length} trips)
              </h4>
              <button
                onClick={optimizeRoute}
                disabled={optimizing || trips.length < 2}
                style={{
                  padding: '8px 16px',
                  background: trips.length < 2 ? 'var(--gray-300)' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: trips.length < 2 ? 'not-allowed' : 'pointer',
                  opacity: optimizing ? 0.7 : 1
                }}
                title={trips.length < 2 ? 'Need at least 2 trips to optimize' : ''}
              >
                {optimizing ? 'Optimizing...' : 'Optimize Route'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trips.map((trip, index) => (
                <div key={trip.trip_id} style={{
                  padding: '12px',
                  background: 'var(--gray-50)',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      minWidth: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{trip.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        {trip.pickup_time} • {trip.pickup_location} → {trip.destination}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {optimizationResult && (
          <div>
            {/* Method Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: optimizationResult.reliable ? '#d1fae5' : '#fed7aa',
              color: optimizationResult.reliable ? '#065f46' : '#92400e',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '1.5rem'
            }}>
              {optimizationResult.method === 'google' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Optimized with Google Maps
                </>
              )}
              {optimizationResult.method === 'haversine' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Estimated distances
                </>
              )}
              {optimizationResult.warning && (
                <span style={{ fontWeight: 400 }}>• {optimizationResult.warning}</span>
              )}
            </div>

            {/* Before/After Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
                  Before
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {optimizationResult.originalOrder.map((trip, index) => (
                    <div key={trip.trip_id} style={{
                      padding: '8px',
                      background: '#fef2f2',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>{index + 1}.</strong> {trip.customer_name}
                      <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px' }}>
                        {trip.pickup_location} → {trip.destination}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                  After
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {optimizationResult.optimizedOrder.map((trip, index) => (
                    <div key={trip.trip_id} style={{
                      padding: '8px',
                      background: '#f0fdf4',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>{index + 1}.</strong> {trip.customer_name}
                      <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px' }}>
                        {trip.pickup_location} → {trip.destination}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Savings Display */}
            {optimizationResult.savings && (
              <div style={{
                background: '#dbeafe',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                  Estimated Savings
                </div>
                <div style={{ fontSize: '13px', color: '#1e3a8a' }}>
                  {optimizationResult.savings.distance && `${optimizationResult.savings.distance.toFixed(1)} miles saved`}
                  {optimizationResult.savings.time && optimizationResult.savings.distance && ' • '}
                  {optimizationResult.savings.time && `${optimizationResult.savings.time} minutes saved`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {optimizationResult && (
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          backgroundColor: 'var(--gray-50)',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => setOptimizationResult(null)}
            style={{
              padding: '10px 20px',
              background: 'var(--gray-200)',
              color: 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={applyOptimization}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Applying...' : 'Apply Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RouteOptimizationPanel;
