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
      console.error('Error loading fleet analytics:', err);
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
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
          Fleet Analytics Dashboard
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
          Comprehensive fleet performance and financial analysis
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
            {summary.totalVehicles}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Total Vehicles</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
            {summary.activeVehicles}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Active</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#6b7280', marginBottom: '0.25rem' }}>
            {summary.archivedVehicles}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Archived</div>
        </div>
      </div>

      {/* Fleet Composition & Utilization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Fleet Composition */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Fleet Composition
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Owned</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>{composition.owned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Leased</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#8b5cf6' }}>{composition.leased}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Personal</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>{composition.personal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Utilization */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Fleet Utilization
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Assigned</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>{utilization.assigned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Unassigned</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#f59e0b' }}>{utilization.unassigned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Wheelchair Accessible</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>{utilization.wheelchairAccessible}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="card">
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Financial Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Monthly Lease</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>£{parseFloat(financial.totalMonthlyLease).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Monthly Insurance</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>£{parseFloat(financial.totalMonthlyInsurance).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>Total Mileage</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {financial.totalMileage.toLocaleString()} mi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Performance Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem' }}>
                {performance.totalTrips}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Total Trips</div>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
                £{parseFloat(performance.totalRevenue).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Total Revenue</div>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>
                £{parseFloat(performance.totalMaintenanceCost).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Maintenance Cost</div>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.25rem' }}>
                {parseFloat(performance.averageTripsPerVehicle).toFixed(1)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Avg Trips/Vehicle</div>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>
                £{parseFloat(performance.averageRevenuePerVehicle).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Avg Revenue/Vehicle</div>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: performance.netRevenue && parseFloat(performance.netRevenue) >= 0 ? '#10b981' : '#ef4444', marginBottom: '0.25rem' }}>
                £{parseFloat(performance.netRevenue).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Net Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
            {financial.averageMileagePerVehicle.toLocaleString()} mi
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Avg Mileage/Vehicle</div>
        </div>

        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.25rem' }}>
            {financial.averageAge.toFixed(1)} years
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Average Fleet Age</div>
        </div>
      </div>

      {/* Top Performers & Underutilized */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Top Performers */}
        {topPerformers && topPerformers.length > 0 && (
          <div className="card">
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                🏆 Top Performers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topPerformers.map((vehicle: any, index: number) => (
                  <div
                    key={vehicle.vehicle_id}
                    style={{
                      padding: '1rem',
                      background: '#f0fdf4',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          {index + 1}. {vehicle.registration}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                          {vehicle.make} {vehicle.model}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>
                          {vehicle.total_trips} trips
                        </div>
                      </div>
                    </div>
                    {vehicle.driver_name && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        Driver: {vehicle.driver_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Underutilized */}
        {underutilized && underutilized.length > 0 && (
          <div className="card">
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                ⚠️ Underutilized Vehicles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {underutilized.map((vehicle: any) => (
                  <div
                    key={vehicle.vehicle_id}
                    style={{
                      padding: '1rem',
                      background: '#fffbeb',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          {vehicle.registration}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                          {vehicle.make} {vehicle.model}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b' }}>
                          {vehicle.total_trips || 0} trips
                        </div>
                      </div>
                    </div>
                    {vehicle.driver_name ? (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        Driver: {vehicle.driver_name}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
                        No driver assigned
                      </div>
                    )}
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
