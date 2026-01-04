/**
 * Route Optimization Analytics Dashboard
 *
 * Displays comprehensive route optimization metrics including:
 * - Overall efficiency scores
 * - Driver utilization
 * - Peak time analysis
 * - Batch optimization capabilities
 * - Capacity optimization insights
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../context/TenantContext';

interface RouteAnalyticsProps {
  tenantId?: number; // Optional - will use context if not provided
}

interface RouteAnalytics {
  overview: {
    totalTrips: number;
    driversUsed: number;
    daysActive: number;
    avgPassengersPerTrip: number;
    totalMiles: number;
    totalHours: number;
    tripsPerDriver: number;
  };
  driverUtilization: Array<{
    driverId: number;
    tripCount: number;
    totalDistance: number;
    activeDays: number;
  }>;
  peakHours: Array<{
    hour: number;
    tripCount: number;
  }>;
}

export const RouteOptimizationAnalytics: React.FC<RouteAnalyticsProps> = ({ tenantId: propTenantId }) => {
  const { tenant } = useTenant();
  const tenantId = propTenantId || tenant?.tenant_id;
  const [analytics, setAnalytics] = useState<RouteAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range for analytics
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Batch optimization state
  const [batchOptimizing, setBatchOptimizing] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/tenants/${tenantId}/routes/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
        }
      );

      setAnalytics(response.data);
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'string' ? errorData :
        (errorData?.message || err.message || 'Failed to load analytics');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const runBatchOptimization = async () => {
    try {
      setBatchOptimizing(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/tenants/${tenantId}/routes/batch-optimize`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBatchResult(response.data);
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'string' ? errorData :
        (errorData?.message || err.message || 'Failed to run batch optimization');
      setError(errorMessage);
    } finally {
      setBatchOptimizing(false);
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  if (loading && !analytics) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '0.5rem' }}>
          Route Optimization Analytics
        </h2>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Performance metrics and optimization insights
        </p>
      </div>

      {/* Date Range Selector */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              fontSize: '14px'
            }}
          />
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            marginTop: '1.25rem',
            padding: '0.5rem 1.5rem',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {analytics && (
        <>
          {/* Overview KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: '#e3f2fd', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbdefb' }}>
              <div style={{ fontSize: '12px', color: '#1976d2', marginBottom: '0.5rem', fontWeight: 600 }}>
                Total Trips
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1976d2' }}>
                {analytics.overview.totalTrips}
              </div>
              <div style={{ fontSize: '11px', color: '#1976d2', marginTop: '0.25rem' }}>
                Across {analytics.overview.daysActive} days
              </div>
            </div>

            <div style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
              <div style={{ fontSize: '12px', color: '#388e3c', marginBottom: '0.5rem', fontWeight: 600 }}>
                Drivers Used
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#388e3c' }}>
                {analytics.overview.driversUsed}
              </div>
              <div style={{ fontSize: '11px', color: '#388e3c', marginTop: '0.25rem' }}>
                {analytics.overview.tripsPerDriver.toFixed(1)} trips/driver
              </div>
            </div>

            <div style={{ background: '#fff3e0', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
              <div style={{ fontSize: '12px', color: '#f57c00', marginBottom: '0.5rem', fontWeight: 600 }}>
                Total Distance
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f57c00' }}>
                {analytics.overview.totalMiles.toFixed(0)}
              </div>
              <div style={{ fontSize: '11px', color: '#f57c00', marginTop: '0.25rem' }}>
                miles driven
              </div>
            </div>

            <div style={{ background: '#f3e5f5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e1bee7' }}>
              <div style={{ fontSize: '12px', color: '#7b1fa2', marginBottom: '0.5rem', fontWeight: 600 }}>
                Total Hours
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#7b1fa2' }}>
                {analytics.overview.totalHours.toFixed(1)}
              </div>
              <div style={{ fontSize: '11px', color: '#7b1fa2', marginTop: '0.25rem' }}>
                driving time
              </div>
            </div>
          </div>

          {/* Batch Optimization Section */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Batch Route Optimization
                </h3>
                <p style={{ fontSize: '13px', color: '#6c757d' }}>
                  Optimize all routes in the selected date range with traffic-aware routing
                </p>
              </div>
              <button
                onClick={runBatchOptimization}
                disabled={batchOptimizing}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: batchOptimizing ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: batchOptimizing ? 'not-allowed' : 'pointer'
                }}
              >
                {batchOptimizing ? 'Optimizing...' : '🚀 Run Batch Optimization'}
              </button>
            </div>

            {batchResult && (
              <div style={{
                background: '#d4edda',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid #c3e6cb'
              }}>
                <div style={{ fontWeight: 600, color: '#155724', marginBottom: '0.5rem' }}>
                  ✅ Optimization Complete!
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#155724' }}>Distance Saved</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#155724' }}>
                      {(batchResult.savings.totalDistanceSaved / 1000).toFixed(1)} km
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#155724' }}>Time Saved</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#155724' }}>
                      {batchResult.savings.totalTimeSaved} min
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#155724' }}>Efficiency Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#155724' }}>
                      {batchResult.savings.efficiency_score}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Driver Utilization Table */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '2rem',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              background: '#f8f9fa',
              borderBottom: '2px solid #dee2e6'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                Driver Utilization
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                      Driver ID
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                      Trips
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                      Active Days
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                      Total Distance
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>
                      Trips/Day
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.driverUtilization.map((driver) => (
                    <tr key={driver.driverId} style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>
                        Driver #{driver.driverId}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {driver.tripCount}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {driver.activeDays}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {driver.totalDistance.toFixed(1)} mi
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        {(driver.tripCount / driver.activeDays).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peak Hours Chart */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem' }}>
              Peak Trip Hours
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.peakHours.map((peak, index) => {
                const maxCount = Math.max(...analytics.peakHours.map(p => p.tripCount));
                const widthPercent = (peak.tripCount / maxCount) * 100;

                return (
                  <div key={peak.hour} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ minWidth: '80px', fontSize: '14px', fontWeight: 500 }}>
                      {formatHour(peak.hour)}
                    </div>
                    <div style={{ flex: 1, background: '#e9ecef', borderRadius: '4px', height: '32px', position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${widthPercent}%`,
                          background: index === 0 ? '#28a745' : index === 1 ? '#ffc107' : '#17a2b8',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#212529'
                      }}>
                        {peak.tripCount} trips
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RouteOptimizationAnalytics;
