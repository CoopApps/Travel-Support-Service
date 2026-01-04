/**
 * Schedule Efficiency Report Component
 *
 * Comprehensive analytics dashboard showing:
 * - Vehicle utilization metrics
 * - Driver productivity stats
 * - Empty seat analysis (missed revenue)
 * - Route efficiency
 * - Time-based patterns
 */

import { useState, useEffect } from 'react';
import { tripApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface EfficiencyReportProps {
  startDate: string;
  endDate: string;
}

function EfficiencyReport({ startDate, endDate }: EfficiencyReportProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'drivers' | 'routes' | 'time'>('overview');
  const tenantId = useAuthStore((state) => state.tenantId);

  useEffect(() => {
    if (startDate && endDate && tenantId) {
      fetchReport();
    }
  }, [startDate, endDate, tenantId]);

  const fetchReport = async () => {
    if (!startDate || !endDate || !tenantId) return;

    setLoading(true);
    setError('');

    try {
      const response = await tripApi.getEfficiencyReport(tenantId, {
        startDate,
        endDate
      });

      setReport(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load efficiency report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '0.5rem'
      }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
        <span style={{ color: 'var(--gray-600)', fontSize: '16px' }}>
          Generating efficiency report...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: '1.5rem', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { summary, vehicleUtilization, driverProductivity, emptySeatAnalysis, routeEfficiency, timeAnalysis } = report;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
          📊 Schedule Efficiency Report
        </h2>
        <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '14px' }}>
          {new Date(startDate).toLocaleDateString('en-GB')} - {new Date(endDate).toLocaleDateString('en-GB')}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
            £{summary.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            £{summary.avgRevenuePerTrip.toFixed(2)} per trip
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Missed Revenue
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>
            £{summary.totalMissedRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            {summary.totalEmptySeats} empty seats
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Total Trips
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0ea5e9' }}>
            {summary.totalTrips.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            {summary.operatingDays} operating days
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Vehicle Utilization
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>
            {summary.avgVehicleUtilization.toFixed(0)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            {summary.activeVehicles} vehicles used
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Completion Rate
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
            {summary.completionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            {summary.noShowRate.toFixed(1)}% no-show rate
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Customers Served
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
            {summary.customersServed.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
            {summary.activeDrivers} drivers active
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--gray-200)'
      }}>
        {[
          { key: 'overview', label: '📈 Overview' },
          { key: 'vehicles', label: '🚗 Vehicles' },
          { key: 'drivers', label: '👤 Drivers' },
          { key: 'routes', label: '🗺️ Routes' },
          { key: 'time', label: '🕐 Time Analysis' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: activeTab === tab.key ? 'var(--primary-color)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--gray-600)',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-color)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Empty Seat Analysis Chart */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid var(--gray-200)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600 }}>
              💸 Missed Revenue by Day
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {emptySeatAnalysis.map((day: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: '6px',
                    border: '1px solid var(--gray-200)'
                  }}
                >
                  <div style={{ flex: '0 0 120px', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    {new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '24px',
                      backgroundColor: '#fee2e2',
                      borderRadius: '4px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#dc2626',
                        width: `${Math.min((day.missedRevenue / summary.totalMissedRevenue) * 100, 100)}%`,
                        transition: 'width 0.3s'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '8px',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        £{day.missedRevenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    flex: '0 0 80px',
                    fontSize: '12px',
                    color: 'var(--gray-600)',
                    textAlign: 'right'
                  }}>
                    {day.totalEmptySeats} seats
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Vehicle</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Capacity</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Trips</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Days Used</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Avg Passengers</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Utilization</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {vehicleUtilization.map((vehicle: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {vehicle.registration}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                        {vehicle.make} {vehicle.model}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{vehicle.capacity}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{vehicle.totalTrips}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{vehicle.daysUsed}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{vehicle.avgPassengers.toFixed(1)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: vehicle.utilizationPercentage >= 70 ? '#d1fae5' :
                                        vehicle.utilizationPercentage >= 50 ? '#fef3c7' : '#fee2e2',
                        color: vehicle.utilizationPercentage >= 70 ? '#065f46' :
                              vehicle.utilizationPercentage >= 50 ? '#92400e' : '#991b1b',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}>
                        {vehicle.utilizationPercentage.toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      £{vehicle.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Driver</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Trips</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Days Worked</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Avg/Day</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Completion</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Revenue</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Per Trip</th>
                </tr>
              </thead>
              <tbody>
                {driverProductivity.map((driver: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                      {driver.driverName}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{driver.totalTrips}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{driver.daysWorked}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{driver.avgTripsPerDay.toFixed(1)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: driver.completionRate >= 90 ? '#d1fae5' : '#fef3c7',
                        color: driver.completionRate >= 90 ? '#065f46' : '#92400e',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}>
                        {driver.completionRate.toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      £{driver.totalRevenue.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--gray-600)' }}>
                      £{driver.revenuePerTrip.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Destination</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Trips</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Drivers</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Vehicles</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Avg Passengers</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Revenue</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Per Trip</th>
                </tr>
              </thead>
              <tbody>
                {routeEfficiency.map((route: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                      {route.destination}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{route.tripCount}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{route.driversUsed}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{route.vehiclesUsed}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{route.avgPassengersPerTrip.toFixed(1)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                      £{route.totalRevenue.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--gray-600)' }}>
                      £{route.revenuePerTrip.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--gray-200)',
          padding: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600 }}>
            🕐 Trips by Hour
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {timeAnalysis.map((time: any, idx: number) => {
              const maxTrips = Math.max(...timeAnalysis.map((t: any) => t.tripCount));
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: '0 0 80px', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    {time.hour.toString().padStart(2, '0')}:00
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '32px',
                      backgroundColor: 'var(--gray-100)',
                      borderRadius: '6px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#0ea5e9',
                        width: `${(time.tripCount / maxTrips) * 100}%`,
                        transition: 'width 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'white'
                        }}>
                          {time.tripCount} trips
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.8)'
                        }}>
                          • £{time.totalRevenue.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    flex: '0 0 120px',
                    fontSize: '11px',
                    color: 'var(--gray-600)',
                    textAlign: 'right'
                  }}>
                    {time.activeDrivers} drivers • {time.activeVehicles} vehicles
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EfficiencyReport;
