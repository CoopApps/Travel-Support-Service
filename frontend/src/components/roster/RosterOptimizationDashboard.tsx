/**
 * Driver Roster Optimization Dashboard
 *
 * Comprehensive roster management with:
 * - Workload visualization and balancing
 * - Conflict detection and resolution
 * - Automated shift assignment
 * - Utilization analytics
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../context/TenantContext';

interface WorkloadMetric {
  driver_id: number;
  driver_name: string;
  total_hours: number;
  total_trips: number;
  total_distance: number;
  days_worked: number;
  average_hours_per_day: number;
  utilization_percentage: number;
}

interface RosterConflict {
  conflict_type: string;
  driver_id: number;
  driver_name: string;
  trip_id: number;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

export const RosterOptimizationDashboard: React.FC = () => {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantId = tenant?.tenant_id || 0;

  // Dashboard data
  const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetric[]>([]);
  const [conflicts, setConflicts] = useState<RosterConflict[]>([]);
  const [unassignedTrips, setUnassignedTrips] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  // Date range
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last 7 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Auto-assign state
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId, startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/tenants/${tenantId}/roster/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
        }
      );

      setWorkloadMetrics(response.data.workload.metrics);
      setConflicts(response.data.conflicts.items);
      setUnassignedTrips(response.data.unassignedTrips);
      setSummary({
        workload: response.data.workload.summary,
        conflicts: response.data.conflicts.summary
      });
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load roster dashboard'));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async (applyChanges: boolean = false) => {
    try {
      setAutoAssigning(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/tenants/${tenantId}/roster/auto-assign`,
        {
          date: endDate, // Assign for the end date (today)
          balanceWorkload: true,
          considerProximity: true,
          maxAssignments: 50,
          applyChanges
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAutoAssignResult(response.data);

      if (applyChanges) {
        // Refresh dashboard after applying changes
        fetchDashboardData();
      }
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to auto-assign drivers'));
    } finally {
      setAutoAssigning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: '#fee', border: '#fcc', color: '#c33' };
      case 'warning': return { bg: '#fff3cd', border: '#ffe5a3', color: '#856404' };
      default: return { bg: '#d1ecf1', border: '#bee5eb', color: '#0c5460' };
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 50) return '#dc3545'; // Under-utilized (red)
    if (utilization > 90) return '#ffc107'; // Over-utilized (yellow)
    return '#28a745'; // Well-balanced (green)
  };

  if (loading && !summary) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading roster data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '0.5rem' }}>
          Driver Roster Optimization
        </h2>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          Workload balancing, conflict detection, and automated shift assignment
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
          onClick={fetchDashboardData}
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

      {summary && (
        <>
          {/* Summary KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: '#e3f2fd', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbdefb' }}>
              <div style={{ fontSize: '12px', color: '#1976d2', marginBottom: '0.5rem', fontWeight: 600 }}>
                Avg Utilization
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1976d2' }}>
                {summary.workload.averageUtilization?.toFixed(1) || 0}%
              </div>
            </div>

            <div style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
              <div style={{ fontSize: '12px', color: '#388e3c', marginBottom: '0.5rem', fontWeight: 600 }}>
                Well-Balanced
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#388e3c' }}>
                {summary.workload.balanced || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#388e3c', marginTop: '0.25rem' }}>
                drivers
              </div>
            </div>

            <div style={{ background: '#fff3e0', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
              <div style={{ fontSize: '12px', color: '#f57c00', marginBottom: '0.5rem', fontWeight: 600 }}>
                Conflicts
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f57c00' }}>
                {summary.conflicts.critical || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#f57c00', marginTop: '0.25rem' }}>
                critical issues
              </div>
            </div>

            <div style={{ background: '#f3e5f5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e1bee7' }}>
              <div style={{ fontSize: '12px', color: '#7b1fa2', marginBottom: '0.5rem', fontWeight: 600 }}>
                Unassigned
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#7b1fa2' }}>
                {unassignedTrips}
              </div>
              <div style={{ fontSize: '11px', color: '#7b1fa2', marginTop: '0.25rem' }}>
                trips
              </div>
            </div>
          </div>

          {/* Auto-Assignment Section */}
          {unassignedTrips > 0 && (
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
                    Automated Shift Assignment
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6c757d' }}>
                    Automatically assign drivers using workload balancing and proximity matching
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleAutoAssign(false)}
                    disabled={autoAssigning}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: autoAssigning ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {autoAssigning ? 'Processing...' : 'Preview'}
                  </button>
                  <button
                    onClick={() => handleAutoAssign(true)}
                    disabled={autoAssigning}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: autoAssigning ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: autoAssigning ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {autoAssigning ? 'Assigning...' : '✓ Apply Assignments'}
                  </button>
                </div>
              </div>

              {autoAssignResult && (
                <div style={{
                  background: '#d4edda',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb'
                }}>
                  <div style={{ fontWeight: 600, color: '#155724', marginBottom: '0.5rem' }}>
                    {autoAssignResult.applied ? '✅ Assignments Applied!' : '📋 Preview Results'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#155724' }}>
                    Assigned {autoAssignResult.assigned} trips | {autoAssignResult.unassigned} could not be assigned
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workload Balance Visualization */}
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
                Driver Workload Balance
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {workloadMetrics.map((metric) => (
                <div key={metric.driver_id} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>
                      {metric.driver_name}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6c757d' }}>
                      {metric.total_hours}h | {metric.total_trips} trips | {metric.utilization_percentage}% utilization
                    </span>
                  </div>
                  <div style={{
                    height: '24px',
                    background: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, metric.utilization_percentage)}%`,
                        background: getUtilizationColor(metric.utilization_percentage),
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conflicts List */}
          {conflicts.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1rem 1.5rem',
                background: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                  Roster Conflicts ({conflicts.length})
                </h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {conflicts.map((conflict, index) => {
                  const colors = getSeverityColor(conflict.severity);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        color: colors.color
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '0.25rem' }}>
                        {conflict.driver_name} - Trip #{conflict.trip_id}
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        {conflict.details}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RosterOptimizationDashboard;
