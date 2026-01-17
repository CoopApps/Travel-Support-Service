import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { vehicleApi } from '../../services/api';

interface IncidentsTabProps {
  onReportIncident: () => void;
}

interface Incident {
  incident_id: number;
  vehicle_id: number;
  registration: string;
  make: string;
  model: string;
  driver_name?: string;
  incident_type: string;
  incident_date: string;
  location?: string;
  description: string;
  severity: string;
  status: string;
  injuries_occurred: boolean;
  third_party_involved: boolean;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
}

interface IncidentStats {
  total_incidents: number;
  reported_count: number;
  investigating_count: number;
  resolved_count: number;
  closed_count: number;
  accidents: number;
  damages: number;
  near_misses: number;
  breakdowns: number;
  critical_count: number;
  serious_count: number;
  injuries_count: number;
  third_party_count: number;
  total_estimated_cost: number;
  total_actual_cost: number;
}

function IncidentsTab({ onReportIncident }: IncidentsTabProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId, statusFilter, typeFilter, severityFilter]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [incidentsData, statsData] = await Promise.all([
        vehicleApi.getIncidents(tenantId, {
          status: statusFilter || undefined,
          incident_type: typeFilter || undefined,
          severity: severityFilter || undefined,
        }),
        vehicleApi.getIncidentStats(tenantId)
      ]);

      setIncidents(incidentsData.incidents || incidentsData);
      setStats(statsData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      reported: 'bg-yellow-100 text-yellow-800',
      under_investigation: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, string> = {
      minor: 'bg-blue-100 text-blue-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      serious: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return badges[severity] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      accident: 'bg-red-100 text-red-800',
      damage: 'bg-orange-100 text-orange-800',
      near_miss: 'bg-yellow-100 text-yellow-800',
      breakdown: 'bg-blue-100 text-blue-800',
      theft: 'bg-purple-100 text-purple-800',
      vandalism: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Statistics Cards - Compact */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{stats.total_incidents}</div>
            <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 500, textTransform: 'uppercase' }}>Total</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{stats.reported_count + stats.investigating_count}</div>
            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 500, textTransform: 'uppercase' }}>Active</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>{stats.accidents}</div>
            <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 500, textTransform: 'uppercase' }}>Accidents</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stats.injuries_count > 0 ? '#dc2626' : '#16a34a' }}>{stats.injuries_count}</div>
            <div style={{ fontSize: '10px', color: stats.injuries_count > 0 ? '#dc2626' : '#16a34a', fontWeight: 500, textTransform: 'uppercase' }}>Injuries</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#9333ea' }}>{formatCurrency(stats.total_estimated_cost)}</div>
            <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 500, textTransform: 'uppercase' }}>Est. Cost</div>
          </div>
          <div style={{ background: 'white', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0d9488' }}>{formatCurrency(stats.total_actual_cost)}</div>
            <div style={{ fontSize: '10px', color: '#0d9488', fontWeight: 500, textTransform: 'uppercase' }}>Actual</div>
          </div>
        </div>
      )}

      {/* Toolbar - Compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '110px' }}
          >
            <option value="">All Status</option>
            <option value="reported">Reported</option>
            <option value="under_investigation">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '100px' }}
          >
            <option value="">All Types</option>
            <option value="accident">Accident</option>
            <option value="damage">Damage</option>
            <option value="near_miss">Near Miss</option>
            <option value="breakdown">Breakdown</option>
            <option value="theft">Theft</option>
            <option value="vandalism">Vandalism</option>
            <option value="other">Other</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px', minWidth: '100px' }}
          >
            <option value="">All Severity</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="serious">Serious</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Report Button */}
        <button
          onClick={onReportIncident}
          style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Report
        </button>
      </div>

      {/* Incidents Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-4.41 0-8-3.59-8-8V8.59l8-4.36 8 4.36V12c0 4.41-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {statusFilter || typeFilter || severityFilter
              ? 'No incidents match the current filters.'
              : 'No incidents reported yet.'
            }
          </p>
          {!statusFilter && !typeFilter && !severityFilter && (
            <button onClick={onReportIncident} className="btn btn-primary">
              Report Your First Incident
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.incident_id}>
                  <td>{formatDate(incident.incident_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{incident.registration}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      {incident.make} {incident.model}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getTypeBadge(incident.incident_type)}`}>
                      {incident.incident_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getSeverityBadge(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    {incident.injuries_occurred && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: '#fee2e2', color: '#dc2626', borderRadius: '3px', fontWeight: 600 }}>
                          INJURY
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ maxWidth: '250px' }}>
                      {incident.description.length > 80
                        ? `${incident.description.substring(0, 80)}...`
                        : incident.description
                      }
                    </div>
                    {incident.location && (
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {incident.location}
                      </div>
                    )}
                  </td>
                  <td>{incident.driver_name || '—'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(incident.status)}`}>
                      {incident.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {incident.actual_cost ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{formatCurrency(incident.actual_cost)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>actual</div>
                      </div>
                    ) : incident.estimated_cost ? (
                      <div>
                        <div>{formatCurrency(incident.estimated_cost)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>estimated</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="btn btn-sm btn-secondary"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default IncidentsTab;
