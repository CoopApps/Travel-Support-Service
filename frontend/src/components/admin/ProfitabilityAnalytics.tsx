import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  getDriverProfitability,
  getTripProfitability,
  getProfitabilityDashboard,
  DriverProfitabilityRow,
  TripProfitabilityRow,
  ProfitabilityDashboard as ProfitabilityDashboardType
} from '../../services/profitabilityApi';

const ProfitabilityAnalytics: React.FC = () => {
  const { tenantId } = useTenant();
  const [activeSubTab, setActiveSubTab] = useState<'drivers' | 'trips' | 'dashboard'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data states
  const [driverData, setDriverData] = useState<DriverProfitabilityRow[]>([]);
  const [tripData, setTripData] = useState<TripProfitabilityRow[]>([]);
  const [dashboardData, setDashboardData] = useState<ProfitabilityDashboardType | null>(null);

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (tenantId && startDate && endDate) {
      loadData();
    }
  }, [tenantId, activeSubTab, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeSubTab === 'drivers') {
        const data = await getDriverProfitability(tenantId!, { start_date: startDate, end_date: endDate });
        setDriverData(data);
      } else if (activeSubTab === 'trips') {
        const data = await getTripProfitability(tenantId!, { start_date: startDate, end_date: endDate });
        setTripData(data);
      } else {
        const data = await getProfitabilityDashboard(tenantId!, { months: 6 });
        setDashboardData(data);
      }
    } catch (err: any) {
      console.error('Error loading profitability data:', err);
      if (err.response?.status === 404) {
        setError('Profitability analytics endpoints are not yet available. The backend implementation is pending.');
      } else {
        setError(err.message || 'Failed to load profitability data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getProfitColor = (profitMargin: number) => {
    if (profitMargin > 20) return 'var(--success)';
    if (profitMargin > 10) return 'var(--warning)';
    return 'var(--danger)';
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeSubTab === 'drivers' && driverData.length > 0) {
      filename = 'driver-profitability.csv';
      csvContent = 'Driver,Total Trips,Revenue,Costs,Profit,Profit Margin %,Avg Profit/Trip\n';
      driverData.forEach(row => {
        csvContent += `${row.driver_name},${row.total_trips},${row.total_revenue.toFixed(2)},${row.total_costs.toFixed(2)},${row.profit.toFixed(2)},${row.profit_margin_percent.toFixed(1)},${row.avg_profit_per_trip.toFixed(2)}\n`;
      });
    } else if (activeSubTab === 'trips' && tripData.length > 0) {
      filename = 'trip-profitability.csv';
      csvContent = 'Date,Customer,Driver,Vehicle,Revenue,Costs,Profit,Profit Margin %\n';
      tripData.forEach(row => {
        csvContent += `${row.trip_date},${row.customer_name},${row.driver_name},${row.vehicle_registration},${row.revenue.toFixed(2)},${row.costs.toFixed(2)},${row.profit.toFixed(2)},${row.profit_margin_percent.toFixed(1)}\n`;
      });
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem' }}>Profitability Analytics</h3>
          <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
            Comprehensive profit and loss analysis for drivers, trips, and overall business performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <span style={{ color: 'var(--gray-600)' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button className="btn btn-secondary" onClick={exportToCSV}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
      }}>
        {[
          { id: 'dashboard', label: 'Overview Dashboard', icon: '📈' },
          { id: 'drivers', label: 'Driver Profitability', icon: '👤' },
          { id: 'trips', label: 'Trip Profitability', icon: '🚗' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'transparent',
              borderBottom: activeSubTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeSubTab === tab.id ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: activeSubTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '1.5rem',
          background: 'var(--warning-50)',
          border: '1px solid var(--warning-200)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
          <p style={{ color: 'var(--warning-700)', fontSize: '16px', fontWeight: 500, marginBottom: '0.5rem' }}>
            Backend Not Available
          </p>
          <p style={{ color: 'var(--gray-700)', fontSize: '14px' }}>
            {error}
          </p>
          <p style={{ color: 'var(--gray-600)', fontSize: '13px', marginTop: '1rem' }}>
            The profitability analytics UI is ready. Once the backend endpoints are implemented,
            this feature will display comprehensive profit/loss metrics for your business.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading profitability data...</p>
        </div>
      )}

      {/* Dashboard Overview */}
      {!loading && !error && activeSubTab === 'dashboard' && dashboardData && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Total Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--gray-900)' }}>
                £{((dashboardData as any).overview?.totalRevenue || (dashboardData as any).period_summary?.total_revenue || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Total Costs</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--danger)' }}>
                £{((dashboardData as any).overview?.totalCosts || (dashboardData as any).period_summary?.total_costs || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Net Profit</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: getProfitColor((dashboardData as any).overview?.profitMargin || (dashboardData as any).period_summary?.profit_margin_percent || 0) }}>
                £{((dashboardData as any).overview?.netProfit || (dashboardData as any).period_summary?.net_profit || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Profit Margin</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: getProfitColor((dashboardData as any).overview?.profitMargin || (dashboardData as any).period_summary?.profit_margin_percent || 0) }}>
                {((dashboardData as any).overview?.profitMargin || (dashboardData as any).period_summary?.profit_margin_percent || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Cost Breakdown & Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Cost Breakdown */}
            <div style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem' }}>Cost Breakdown</h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Fuel Costs</span>
                  <span style={{ fontWeight: 600 }}>£{(((dashboardData as any).costBreakdown?.fuel || (dashboardData as any).cost_breakdown?.fuel_costs || 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Driver Costs (Wages)</span>
                  <span style={{ fontWeight: 600 }}>£{(((dashboardData as any).costBreakdown?.wages || (dashboardData as any).cost_breakdown?.driver_costs || 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Vehicle Costs</span>
                  <span style={{ fontWeight: 600 }}>£{((((dashboardData as any).costBreakdown?.vehicleLease || 0) + ((dashboardData as any).costBreakdown?.vehicleInsurance || 0)) || (dashboardData as any).cost_breakdown?.vehicle_costs || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-700)' }}>Maintenance & Incidents</span>
                  <span style={{ fontWeight: 600 }}>£{((((dashboardData as any).costBreakdown?.maintenance || 0) + ((dashboardData as any).costBreakdown?.incidents || 0)) || (dashboardData as any).cost_breakdown?.other_costs || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div style={{ padding: '1.5rem', background: 'var(--info-50)', border: '1px solid var(--info-200)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--info-700)' }}>💡 Recommendations</h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {((dashboardData as any).recommendations || []).map((rec: string, idx: number) => (
                  <div key={idx} style={{ fontSize: '14px', color: 'var(--gray-700)', paddingLeft: '1rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Profitability Table */}
      {!loading && !error && activeSubTab === 'drivers' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead style={{ background: 'var(--gray-50)' }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Trips</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Costs</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Profit</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Margin %</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Avg Profit/Trip</th>
              </tr>
            </thead>
            <tbody>
              {driverData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                    No driver profitability data available for the selected period
                  </td>
                </tr>
              ) : (
                driverData.map((driver, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{driver.driver_name}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{driver.total_trips}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{driver.total_revenue.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>£{driver.total_costs.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: getProfitColor(driver.profit_margin_percent) }}>
                      £{driver.profit.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: driver.profit_margin_percent > 10 ? 'var(--success-50)' : 'var(--danger-50)',
                        color: driver.profit_margin_percent > 10 ? 'var(--success-700)' : 'var(--danger-700)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {driver.profit_margin_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{driver.avg_profit_per_trip.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Trip Profitability Table */}
      {!loading && !error && activeSubTab === 'trips' && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead style={{ background: 'var(--gray-50)' }}>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Driver</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vehicle</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Costs</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Profit</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {tripData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
                    No trip profitability data available for the selected period
                  </td>
                </tr>
              ) : (
                tripData.map((trip, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.75rem' }}>{new Date(trip.trip_date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem' }}>{trip.customer_name}</td>
                    <td style={{ padding: '0.75rem' }}>{trip.driver_name}</td>
                    <td style={{ padding: '0.75rem' }}>{trip.vehicle_registration}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>£{trip.revenue.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--danger)' }}>£{trip.costs.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: getProfitColor(trip.profit_margin_percent) }}>
                      £{trip.profit.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: trip.profit_margin_percent > 10 ? 'var(--success-50)' : 'var(--danger-50)',
                        color: trip.profit_margin_percent > 10 ? 'var(--success-700)' : 'var(--danger-700)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {trip.profit_margin_percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProfitabilityAnalytics;
