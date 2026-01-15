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
    <div>
      {/* Summary Cards - Compact 6-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '10px',
        marginBottom: '1rem'
      }}>
        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Revenue
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
            £{summary.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Missed
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>
            £{summary.totalMissedRevenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Trips
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0ea5e9' }}>
            {summary.totalTrips.toLocaleString()}
          </div>
        </div>

        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Utilization
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>
            {summary.avgVehicleUtilization.toFixed(0)}%
          </div>
        </div>

        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Completion
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
            {summary.completionRate.toFixed(0)}%
          </div>
        </div>

        <div style={{
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
            Customers
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
            {summary.customersServed.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs - Compact */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'vehicles', label: 'Vehicles' },
          { key: 'drivers', label: 'Drivers' },
          { key: 'routes', label: 'Routes' },
          { key: 'time', label: 'Time' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === tab.key ? '#3b82f6' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          padding: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            Missed Revenue by Day
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {emptySeatAnalysis.slice(0, 14).map((day: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px'
                }}
              >
                <div style={{ flex: '0 0 60px', fontSize: '11px', fontWeight: 500, color: '#6b7280' }}>
                  {new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '16px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '3px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: '#dc2626',
                      width: `${Math.min((day.missedRevenue / summary.totalMissedRevenue) * 100, 100)}%`
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '6px',
                      transform: 'translateY(-50%)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'white'
                    }}>
                      £{day.missedRevenue.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div style={{
                  flex: '0 0 50px',
                  fontSize: '10px',
                  color: '#6b7280',
                  textAlign: 'right'
                }}>
                  {day.totalEmptySeats} seats
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Vehicle</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Cap</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Trips</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Days</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Avg</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Util</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#6b7280' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {vehicleUtilization.map((vehicle: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>{vehicle.registration}</div>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{vehicle.capacity}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{vehicle.totalTrips}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{vehicle.daysUsed}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{vehicle.avgPassengers.toFixed(1)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: vehicle.utilizationPercentage >= 70 ? '#d1fae5' :
                                      vehicle.utilizationPercentage >= 50 ? '#fef3c7' : '#fee2e2',
                      color: vehicle.utilizationPercentage >= 70 ? '#065f46' :
                            vehicle.utilizationPercentage >= 50 ? '#92400e' : '#991b1b',
                      fontWeight: 600,
                      fontSize: '10px'
                    }}>
                      {vehicle.utilizationPercentage.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    £{vehicle.totalRevenue.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Driver</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Trips</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Days</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Avg</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Rate</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#6b7280' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {driverProductivity.map((driver: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500, color: '#374151' }}>
                    {driver.driverName}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{driver.totalTrips}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{driver.daysWorked}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{driver.avgTripsPerDay.toFixed(1)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: driver.completionRate >= 90 ? '#d1fae5' : '#fef3c7',
                      color: driver.completionRate >= 90 ? '#065f46' : '#92400e',
                      fontWeight: 600,
                      fontSize: '10px'
                    }}>
                      {driver.completionRate.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    £{driver.totalRevenue.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'routes' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 500, color: '#6b7280' }}>Destination</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Trips</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Drivers</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 500, color: '#6b7280' }}>Avg Pax</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#6b7280' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {routeEfficiency.map((route: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500, color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {route.destination}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{route.tripCount}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{route.driversUsed}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6b7280' }}>{route.avgPassengersPerTrip.toFixed(1)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    £{route.totalRevenue.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'time' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          padding: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {timeAnalysis.map((time: any, idx: number) => {
              const maxTrips = Math.max(...timeAnalysis.map((t: any) => t.tripCount));
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ flex: '0 0 40px', fontSize: '10px', fontWeight: 500, color: '#6b7280' }}>
                    {time.hour.toString().padStart(2, '0')}:00
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '18px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '3px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#0ea5e9',
                        width: `${(time.tripCount / maxTrips) * 100}%`,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '6px'
                      }}>
                        {time.tripCount > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: 'white' }}>
                            {time.tripCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: '0 0 50px', fontSize: '10px', color: '#10b981', textAlign: 'right', fontWeight: 500 }}>
                    £{time.totalRevenue.toFixed(0)}
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
