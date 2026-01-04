/**
 * Profitability Analytics Page
 *
 * Comprehensive profitability analysis with:
 * - Financial overview dashboard
 * - Driver profitability rankings
 * - Trip profitability analysis
 * - Cost breakdown and optimization recommendations
 */

import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { adminAnalyticsApi } from '../../services/api';

function ProfitabilityAnalyticsPage() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [driverProfitability, setDriverProfitability] = useState<any>(null);
  const [tripProfitability, setTripProfitability] = useState<any>(null);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'trips'>('overview');

  useEffect(() => {
    if (tenantId) {
      loadAllData();
    }
  }, [tenantId, startDate, endDate]);

  const loadAllData = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError('');

    try {
      const [dashboardData, driverData, tripData] = await Promise.all([
        adminAnalyticsApi.getProfitabilityDashboard(tenantId, { startDate, endDate }),
        adminAnalyticsApi.getDriverProfitability(tenantId, { startDate, endDate, minTrips: 5 }),
        adminAnalyticsApi.getTripProfitability(tenantId, { limit: 100, status: 'completed' })
      ]);

      setDashboard(dashboardData);
      setDriverProfitability(driverData);
      setTripProfitability(tripData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profitability data');
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No tenant information available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: 700 }}>
            💰 Profitability Analytics
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Revenue, costs, and profit analysis
          </p>
        </div>

        {/* Date Range Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />
          </div>

          <button
            onClick={loadAllData}
            disabled={loading}
            style={{
              marginTop: '20px',
              padding: '6px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'overview' ? '#667eea' : 'transparent',
            color: activeTab === 'overview' ? 'white' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #667eea' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          📊 Overview
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'drivers' ? '#667eea' : 'transparent',
            color: activeTab === 'drivers' ? 'white' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'drivers' ? '2px solid #667eea' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          👨‍✈️ Driver Profitability
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'trips' ? '#667eea' : 'transparent',
            color: activeTab === 'trips' ? 'white' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'trips' ? '2px solid #667eea' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          🚗 Trip Analysis
        </button>
      </div>

      {/* Content */}
      {loading && !dashboard ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '1rem' }}>⏳</div>
          <p>Loading profitability data...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboard && (
            <div>
              {/* KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>
                    £{dashboard.overview.totalRevenue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>
                    {dashboard.trips.completed} completed trips
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                    Total Costs
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>
                    £{dashboard.overview.totalCosts.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>
                    Wages: {dashboard.costPercentages.wages}% | Fuel: {dashboard.costPercentages.fuel}%
                  </div>
                </div>

                <div style={{
                  background: dashboard.overview.profitable
                    ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                    : 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                    Net Profit
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>
                    {dashboard.overview.profitable ? '£' : '-£'}
                    {Math.abs(dashboard.overview.netProfit).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>
                    {dashboard.overview.profitable ? '✅ Profitable' : '⚠️ Operating at Loss'}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                    Profit Margin
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700 }}>
                    {dashboard.overview.profitMargin.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>
                    Avg Revenue: £{dashboard.trips.averageRevenue}/trip
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                  💸 Cost Breakdown
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {Object.entries(dashboard.costBreakdown).filter(([key]) => key !== 'total').map(([key, value]: [string, any]) => {
                    const labels: Record<string, string> = {
                      wages: '👨‍✈️ Wages',
                      fuel: '⛽ Fuel',
                      vehicleLease: '🚗 Vehicle Lease',
                      vehicleInsurance: '🛡️ Insurance',
                      maintenance: '🔧 Maintenance',
                      incidents: '🚨 Incidents'
                    };

                    const percentage = ((value / dashboard.costBreakdown.total) * 100).toFixed(1);

                    return (
                      <div key={key} style={{
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                          {labels[key] || key}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                          £{value.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {percentage}% of total costs
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {dashboard.recommendations && dashboard.recommendations.length > 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
                    💡 Optimization Recommendations
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {dashboard.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Driver Profitability Tab */}
          {activeTab === 'drivers' && driverProfitability && (
            <div>
              {/* Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Profitable Drivers</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>
                    {driverProfitability.summary.profitableDrivers}
                  </div>
                </div>

                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Unprofitable Drivers</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b' }}>
                    {driverProfitability.summary.unprofitableDrivers}
                  </div>
                </div>

                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px' }}>Total Net Profit</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>
                    £{driverProfitability.summary.totalNetProfit.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: '#faf5ff',
                  border: '1px solid #d8b4fe',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#6b21a8', marginBottom: '4px' }}>Avg Profit Margin</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b21a8' }}>
                    {driverProfitability.summary.averageProfitMargin}%
                  </div>
                </div>
              </div>

              {/* Driver Table */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Driver</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Trips</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Revenue</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Costs</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Net Profit</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Margin</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverProfitability.drivers.map((driver: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{driver.driverName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{driver.employmentType}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                            {driver.completedTrips}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            £{driver.revenue.total.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>
                            £{driver.costs.total.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: driver.profitability.profitable ? '#059669' : '#dc2626'
                          }}>
                            {driver.profitability.profitable ? '+' : '-'}£{Math.abs(driver.profitability.netProfit).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {driver.profitability.profitMargin.toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: driver.profitability.profitable ? '#d1fae5' : '#fee2e2',
                              color: driver.profitability.profitable ? '#065f46' : '#991b1b'
                            }}>
                              {driver.profitability.profitable ? '✓ Profitable' : '✗ Loss'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trip Profitability Tab */}
          {activeTab === 'trips' && tripProfitability && (
            <div>
              {/* Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Profitable Trips</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>
                    {tripProfitability.summary.profitableTrips}
                  </div>
                </div>

                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Unprofitable Trips</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b' }}>
                    {tripProfitability.summary.unprofitableTrips}
                  </div>
                </div>

                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px' }}>Avg Profit/Trip</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>
                    £{tripProfitability.summary.averageProfitPerTrip}
                  </div>
                </div>

                <div style={{
                  background: '#faf5ff',
                  border: '1px solid #d8b4fe',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '11px', color: '#6b21a8', marginBottom: '4px' }}>Avg Margin</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b21a8' }}>
                    {tripProfitability.summary.averageProfitMargin}%
                  </div>
                </div>
              </div>

              {/* Trip Table */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Driver</th>
                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Revenue</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Costs</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Profit</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripProfitability.trips.slice(0, 50).map((trip: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>
                            {new Date(trip.tripDate).toLocaleDateString('en-GB')}
                          </td>
                          <td style={{ padding: '10px', color: '#0f172a' }}>
                            {trip.customerName}
                          </td>
                          <td style={{ padding: '10px', color: '#64748b' }}>
                            {trip.driverName}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569'
                            }}>
                              {trip.tripType}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                            £{trip.revenue.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>
                            £{trip.costs.total.toFixed(2)}
                          </td>
                          <td style={{
                            padding: '10px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: trip.profitability.profitable ? '#059669' : '#dc2626'
                          }}>
                            {trip.profitability.profitable ? '+' : '-'}£{Math.abs(trip.profitability.netProfit).toFixed(2)}
                          </td>
                          <td style={{
                            padding: '10px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: trip.profitability.profitable ? '#059669' : '#dc2626'
                          }}>
                            {trip.profitability.profitMargin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                  Showing first 50 trips • Total: {tripProfitability.summary.totalTrips} trips
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProfitabilityAnalyticsPage;
