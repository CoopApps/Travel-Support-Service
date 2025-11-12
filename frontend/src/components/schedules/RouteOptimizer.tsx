import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { driverApi, tripApi } from '../../services/api';

interface RouteOptimizerProps {
  tenantId: number;
}

interface Driver {
  driver_id: number;
  first_name: string;
  last_name: string;
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

function RouteOptimizer({ tenantId }: RouteOptimizerProps) {
  const token = useAuthStore(state => state.token);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
    // Set today as default date
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [tenantId]);

  useEffect(() => {
    if (selectedDriverId && selectedDate) {
      fetchTrips();
    }
  }, [selectedDriverId, selectedDate]);

  const fetchDrivers = async () => {
    try {
      const result = await driverApi.getDrivers(tenantId);
      setDrivers(result.filter((d: any) => d.is_active));
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const fetchTrips = async () => {
    if (!selectedDriverId || !selectedDate) return;

    setLoading(true);
    setError(null);
    setOptimizationResult(null);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/trips?driverId=${selectedDriverId}&date=${selectedDate}`,
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
    if (!selectedDriverId || !selectedDate || trips.length === 0) return;

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
            driverId: selectedDriverId,
            date: selectedDate,
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
        return tripApi.updateTrip(tenantId, trip.trip_id, { pickup_time: newTime });
      });

      await Promise.all(updatePromises);
      alert('Route optimization applied successfully!');
      fetchTrips();
      setOptimizationResult(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedDriver = drivers.find(d => d.driver_id === selectedDriverId);

  return (
    <div>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        Route Optimizer
      </h3>

      {/* Driver and Date Selection */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--gray-200)',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              Select Driver
            </label>
            <select
              value={selectedDriverId || ''}
              onChange={(e) => setSelectedDriverId(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Choose a driver...</option>
              {drivers.map(driver => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {selectedDriverId && selectedDate && (
          <button
            onClick={optimizeRoute}
            disabled={loading || optimizing || trips.length < 2}
            style={{
              marginTop: '1rem',
              padding: '10px 20px',
              background: trips.length < 2 ? 'var(--gray-300)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: trips.length < 2 ? 'not-allowed' : 'pointer',
              opacity: optimizing ? 0.7 : 1
            }}
            title={trips.length < 2 ? 'Need at least 2 trips to optimize' : ''}
          >
            {optimizing ? 'Optimizing...' : 'Optimize Route'}
          </button>
        )}
      </div>

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

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
          Loading trips...
        </div>
      )}

      {!loading && selectedDriverId && selectedDate && trips.length === 0 && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          color: '#92400e',
          padding: '1.5rem',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          No trips found for {selectedDriver?.first_name} {selectedDriver?.last_name} on {selectedDate}
        </div>
      )}

      {/* Current Trips List */}
      {trips.length > 0 && !optimizationResult && (
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>
            Current Schedule ({trips.length} trips)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trips.map((trip, index) => (
              <div key={trip.trip_id} style={{
                padding: '12px',
                background: 'var(--gray-50)',
                borderRadius: '6px',
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    minWidth: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{trip.customer_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                      {trip.pickup_time} • {trip.pickup_location} → {trip.destination}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Result */}
      {optimizationResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Method Badge */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: optimizationResult.reliable ? '#d1fae5' : '#fed7aa',
              color: optimizationResult.reliable ? '#065f46' : '#92400e',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {optimizationResult.method === 'google' && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Optimized with Google Maps
                </>
              )}
              {optimizationResult.method === 'haversine' && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Optimized with estimated distances
                </>
              )}
              {optimizationResult.method === 'manual' && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
                    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
                    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
                  </svg>
                  Manual reordering required
                </>
              )}
              {optimizationResult.warning && (
                <span style={{ marginLeft: '8px', fontWeight: 400 }}>- {optimizationResult.warning}</span>
              )}
            </div>
          </div>

          {/* Before */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--gray-200)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
              Before Optimization
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {optimizationResult.originalOrder.map((trip, index) => (
                <div key={trip.trip_id} style={{
                  padding: '10px',
                  background: '#fef2f2',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  <strong>{index + 1}.</strong> {trip.customer_name} • {trip.pickup_location} → {trip.destination}
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--gray-200)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
              After Optimization
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {optimizationResult.optimizedOrder.map((trip, index) => (
                <div key={trip.trip_id} style={{
                  padding: '10px',
                  background: '#f0fdf4',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  <strong>{index + 1}.</strong> {trip.customer_name} • {trip.pickup_location} → {trip.destination}
                </div>
              ))}
            </div>
          </div>

          {/* Savings Display */}
          {optimizationResult.savings && (
            <div style={{
              gridColumn: '1 / -1',
              background: '#dbeafe',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                  Estimated Savings
                </div>
                <div style={{ fontSize: '14px', color: '#1e3a8a' }}>
                  {optimizationResult.savings.distance && `${optimizationResult.savings.distance.toFixed(1)} miles saved`}
                  {optimizationResult.savings.time && optimizationResult.savings.distance && ' • '}
                  {optimizationResult.savings.time && `${optimizationResult.savings.time} minutes saved`}
                </div>
              </div>
              <button
                onClick={applyOptimization}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteOptimizer;
