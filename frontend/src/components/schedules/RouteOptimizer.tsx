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
    } catch {
      // Error handled silently
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
      {/* Compact Selection Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <select
          value={selectedDriverId || ''}
          onChange={(e) => setSelectedDriverId(Number(e.target.value))}
          style={{
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '13px',
            minWidth: '180px'
          }}
        >
          <option value="">Select driver...</option>
          {drivers.map(driver => (
            <option key={driver.driver_id} value={driver.driver_id}>
              {driver.first_name} {driver.last_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        />

        {selectedDriverId && selectedDate && trips.length >= 2 && (
          <button
            onClick={optimizeRoute}
            disabled={loading || optimizing}
            style={{
              padding: '6px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: optimizing ? 0.7 : 1
            }}
          >
            {optimizing ? 'Optimizing...' : 'Optimize'}
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

      {/* Initial state - no driver selected */}
      {!selectedDriverId && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.5"
            style={{ margin: '0 auto 12px' }}
          >
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            Select a driver to optimize their route
          </div>
          <div style={{ fontSize: '13px' }}>
            Reorder trips to minimize travel time and distance
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '13px' }}>
          Loading trips...
        </div>
      )}

      {!loading && selectedDriverId && selectedDate && trips.length === 0 && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            No trips found
          </div>
          <div style={{ fontSize: '13px' }}>
            {selectedDriver?.first_name} {selectedDriver?.last_name} has no trips on {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      )}

      {!loading && selectedDriverId && selectedDate && trips.length === 1 && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            Only 1 trip scheduled
          </div>
          <div style={{ fontSize: '13px' }}>
            Need at least 2 trips to optimize a route
          </div>
        </div>
      )}

      {/* Current Trips List */}
      {trips.length > 1 && !optimizationResult && (
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            Current Schedule ({trips.length} trips)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {trips.map((trip, index) => (
              <div key={trip.trip_id} style={{
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  minWidth: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '11px'
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1, fontSize: '12px' }}>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{trip.customer_name}</span>
                  <span style={{ color: '#6b7280' }}> • {trip.pickup_time} • {trip.pickup_location} → {trip.destination}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Result */}
      {optimizationResult && (
        <div>
          {/* Method Badge */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: optimizationResult.reliable ? '#d1fae5' : '#fed7aa',
              color: optimizationResult.reliable ? '#065f46' : '#92400e',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500
            }}>
              {optimizationResult.method === 'google' && 'Google Maps'}
              {optimizationResult.method === 'haversine' && 'Estimated distances'}
              {optimizationResult.method === 'manual' && 'Manual reorder needed'}
              {optimizationResult.warning && ` - ${optimizationResult.warning}`}
            </span>
          </div>

          {/* Before/After Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Before */}
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                Before
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {optimizationResult.originalOrder.map((trip, index) => (
                  <div key={trip.trip_id} style={{
                    padding: '6px 8px',
                    background: '#fef2f2',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>
                    <strong>{index + 1}.</strong> {trip.customer_name} • {trip.pickup_location}
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                After
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {optimizationResult.optimizedOrder.map((trip, index) => (
                  <div key={trip.trip_id} style={{
                    padding: '6px 8px',
                    background: '#f0fdf4',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>
                    <strong>{index + 1}.</strong> {trip.customer_name} • {trip.pickup_location}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Savings & Apply */}
          {optimizationResult.savings && (
            <div style={{
              background: '#eff6ff',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '12px', color: '#1e40af' }}>
                <span style={{ fontWeight: 600 }}>Savings: </span>
                {optimizationResult.savings.distance && `${optimizationResult.savings.distance.toFixed(1)} miles`}
                {optimizationResult.savings.time && optimizationResult.savings.distance && ' • '}
                {optimizationResult.savings.time && `${optimizationResult.savings.time} min`}
              </div>
              <button
                onClick={applyOptimization}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteOptimizer;
