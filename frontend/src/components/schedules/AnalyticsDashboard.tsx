import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import EfficiencyReport from './EfficiencyReport';

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
  const [viewMode, setViewMode] = useState<'standard' | 'efficiency'>('standard');

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

  // Calculate date range for efficiency report
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    const days = parseInt(dateRange);
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  };

  return (
    <div>
      {/* Compact Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => setViewMode('standard')}
            style={{
              padding: '4px 10px',
              background: viewMode === 'standard' ? 'white' : 'transparent',
              color: viewMode === 'standard' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'standard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('efficiency')}
            style={{
              padding: '4px 10px',
              background: viewMode === 'efficiency' ? 'white' : 'transparent',
              color: viewMode === 'efficiency' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: viewMode === 'efficiency' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Efficiency
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Date Range - Compact */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['7', '30', '90'] as const).map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              style={{
                padding: '4px 8px',
                background: dateRange === days ? '#3b82f6' : 'white',
                color: dateRange === days ? 'white' : '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '11px'
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Show Efficiency Report or Standard Analytics */}
      {viewMode === 'efficiency' ? (
        <EfficiencyReport {...getDateRange()} />
      ) : (
        <div>

      {/* Overview Cards - Compact */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            Total Trips
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {data.overview.totalTrips}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            Active Drivers
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {data.overview.activeDrivers}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            Completion Rate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {data.overview.completionRate}%
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            Avg/Driver
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {data.overview.avgTripsPerDriver.toFixed(1)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {/* Trips by Day Chart */}
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>By Day</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.tripsByDay.map(item => (
              <div key={item.day} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '28px', fontSize: '11px', fontWeight: 500, color: '#6b7280' }}>{item.day.slice(0, 3)}</span>
                <div style={{
                  flex: 1,
                  height: '6px',
                  background: '#f3f4f6',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(item.count / maxTripsByDay) * 100}%`,
                    background: '#3b82f6',
                    borderRadius: '3px'
                  }} />
                </div>
                <span style={{ width: '24px', fontSize: '11px', color: '#6b7280', textAlign: 'right' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trips by Status */}
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>By Status</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                  padding: '6px 8px',
                  background: '#f9fafb',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors[item.status] || '#9ca3af'
                    }} />
                    <span style={{ fontWeight: 500, textTransform: 'capitalize', fontSize: '12px', color: '#374151' }}>
                      {item.status}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: colors[item.status] || '#6b7280' }}>
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
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Top Destinations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {data.topDestinations.slice(0, 5).map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none'
              }}>
                <span style={{ fontSize: '12px', color: '#374151' }}>{item.destination}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Performance */}
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Driver Performance</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '4px', fontWeight: 500, color: '#6b7280' }}>Driver</th>
                  <th style={{ textAlign: 'right', padding: '4px', fontWeight: 500, color: '#6b7280' }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '4px', fontWeight: 500, color: '#6b7280' }}>Done</th>
                  <th style={{ textAlign: 'right', padding: '4px', fontWeight: 500, color: '#6b7280' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.driverPerformance.slice(0, 5).map(driver => (
                  <tr key={driver.driverId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px', fontWeight: 500, color: '#374151' }}>{driver.driverName}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: '#6b7280' }}>{driver.totalTrips}</td>
                    <td style={{ padding: '4px', textAlign: 'right', color: '#10b981' }}>{driver.completedTrips}</td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{driver.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
