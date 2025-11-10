import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

interface AnalyticsDashboardProps {
  tenantId: number;
}

interface AnalyticsData {
  overview: {
    totalTrips: number;
    activeDrivers: number;
    completionRate: number;
    avgTripsPerDriver: number;
  };
  tripsByDay: {
    day: string;
    count: number;
  }[];
  tripsByStatus: {
    status: string;
    count: number;
  }[];
  topDestinations: {
    destination: string;
    count: number;
  }[];
  driverPerformance: {
    driverId: number;
    driverName: string;
    totalTrips: number;
    completedTrips: number;
    completionRate: number;
  }[];
}

function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const token = useAuthStore(state => state.token);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/analytics/trips-summary?days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: 'var(--gray-600)' }}>Loading analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#ef4444' }}>
          {error || 'Failed to load analytics'}
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const maxTripsByDay = Math.max(...data.tripsByDay.map(d => d.count), 1);

  return (
    <div>
      {/* Header with Date Range Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>📊 Analytics Dashboard</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setDateRange('7')}
            style={{
              padding: '8px 16px',
              background: dateRange === '7' ? 'var(--primary)' : 'white',
              color: dateRange === '7' ? 'white' : 'var(--gray-700)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30')}
            style={{
              padding: '8px 16px',
              background: dateRange === '30' ? 'var(--primary)' : 'white',
              color: dateRange === '30' ? 'white' : 'var(--gray-700)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange('90')}
            style={{
              padding: '8px 16px',
              background: dateRange === '90' ? 'var(--primary)' : 'white',
              color: dateRange === '90' ? 'white' : 'var(--gray-700)',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, marginBottom: '8px' }}>
            TOTAL TRIPS
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)' }}>
            {data.overview.totalTrips}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, marginBottom: '8px' }}>
            ACTIVE DRIVERS
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)' }}>
            {data.overview.activeDrivers}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, marginBottom: '8px' }}>
            COMPLETION RATE
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981' }}>
            {data.overview.completionRate}%
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 600, marginBottom: '8px' }}>
            AVG TRIPS/DRIVER
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)' }}>
            {data.overview.avgTripsPerDriver.toFixed(1)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Trips by Day Chart */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>Trips by Day of Week</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.tripsByDay.map(item => (
              <div key={item.day}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{item.day}</span>
                  <span style={{ color: 'var(--gray-600)' }}>{item.count} trips</span>
                </div>
                <div style={{
                  height: '8px',
                  background: 'var(--gray-200)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(item.count / maxTripsByDay) * 100}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    borderRadius: '4px',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trips by Status */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>Trips by Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.tripsByStatus.map(item => {
              const colors: Record<string, string> = {
                'completed': '#10b981',
                'scheduled': '#3b82f6',
                'cancelled': '#ef4444',
                'no-show': '#f59e0b'
              };
              return (
                <div key={item.status} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--gray-50)',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: colors[item.status] || 'var(--gray-400)'
                    }} />
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '14px' }}>
                      {item.status}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: colors[item.status] || 'var(--gray-700)' }}>
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Destinations */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>Top Destinations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.topDestinations.slice(0, 5).map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                borderBottom: index < 4 ? '1px solid var(--gray-200)' : 'none'
              }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>{item.destination}</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-900)' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Performance */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>Driver Performance</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: 'var(--gray-600)' }}>Driver</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: 'var(--gray-600)' }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: 'var(--gray-600)' }}>Completed</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: 'var(--gray-600)' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.driverPerformance.map(driver => (
                  <tr key={driver.driverId} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{driver.driverName}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{driver.totalTrips}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981' }}>{driver.completedTrips}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{driver.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
