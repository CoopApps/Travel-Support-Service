import React, { useState, useEffect } from 'react';
import { vehicleApi } from '../../services/api';

interface FleetAnalyticsDashboardProps {
  tenantId: number;
}

const FleetAnalyticsDashboard: React.FC<FleetAnalyticsDashboardProps> = ({ tenantId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [tenantId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleApi.getEnhancedStats(tenantId);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading fleet analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</p>
        <button
          onClick={loadStats}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        No data available
      </div>
    );
  }

  const { summary, composition, utilization, financial, performance, topPerformers, underutilized } = stats;

  return (
    <div>

      {/* Summary Cards - Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{summary.totalVehicles}</div>
          <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 500, textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{summary.activeVehicles}</div>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Active</div>
        </div>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#6b7280' }}>{summary.archivedVehicles}</div>
          <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Archived</div>
        </div>
      </div>

      {/* Fleet Composition, Utilization & Financial - Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {/* Fleet Composition */}
        <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Composition</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Owned</span><span style={{ fontWeight: 600, color: '#3b82f6' }}>{composition.owned}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Leased</span><span style={{ fontWeight: 600, color: '#8b5cf6' }}>{composition.leased}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Personal</span><span style={{ fontWeight: 600, color: '#10b981' }}>{composition.personal}</span></div>
          </div>
        </div>

        {/* Utilization */}
        <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Utilization</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Assigned</span><span style={{ fontWeight: 600, color: '#10b981' }}>{utilization.assigned}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Unassigned</span><span style={{ fontWeight: 600, color: '#f59e0b' }}>{utilization.unassigned}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Accessible</span><span style={{ fontWeight: 600, color: '#3b82f6' }}>{utilization.wheelchairAccessible}</span></div>
          </div>
        </div>

        {/* Financial Overview */}
        <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Financial</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Lease/mo</span><span style={{ fontWeight: 600 }}>£{parseFloat(financial.totalMonthlyLease).toFixed(0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Insurance/mo</span><span style={{ fontWeight: 600 }}>£{parseFloat(financial.totalMonthlyInsurance).toFixed(0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Total Miles</span><span style={{ fontWeight: 600 }}>{financial.totalMileage.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Performance Metrics - Compact */}
      <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>Performance Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>{performance.totalTrips}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Trips</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>£{parseFloat(performance.totalRevenue).toFixed(0)}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Revenue</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>£{parseFloat(performance.totalMaintenanceCost).toFixed(0)}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Maint.</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#8b5cf6' }}>{parseFloat(performance.averageTripsPerVehicle).toFixed(1)}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Avg/Veh</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>£{parseFloat(performance.averageRevenuePerVehicle).toFixed(0)}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Rev/Veh</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: performance.netRevenue && parseFloat(performance.netRevenue) >= 0 ? '#10b981' : '#ef4444' }}>£{parseFloat(performance.netRevenue).toFixed(0)}</div>
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Net</div>
          </div>
        </div>
      </div>

      {/* Fleet Stats Row - Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{financial.averageMileagePerVehicle.toLocaleString()} mi</div>
          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Avg Miles/Vehicle</div>
        </div>
        <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{financial.averageAge.toFixed(1)} yrs</div>
          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Fleet Age</div>
        </div>
      </div>

      {/* Top Performers & Underutilized - Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {/* Top Performers */}
        {topPerformers && topPerformers.length > 0 && (
          <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '10px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Top Performers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topPerformers.slice(0, 3).map((vehicle: any, index: number) => (
                  <div key={vehicle.vehicle_id} style={{ padding: '6px 8px', background: '#f0fdf4', borderRadius: '3px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>{index + 1}.</strong> {vehicle.registration} - {vehicle.make}</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>{vehicle.total_trips}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Underutilized */}
        {underutilized && underutilized.length > 0 && (
          <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '10px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Underutilized
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {underutilized.slice(0, 3).map((vehicle: any) => (
                  <div key={vehicle.vehicle_id} style={{ padding: '6px 8px', background: '#fffbeb', borderRadius: '3px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{vehicle.registration} - {vehicle.make}</span>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>{vehicle.total_trips || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetAnalyticsDashboard;
