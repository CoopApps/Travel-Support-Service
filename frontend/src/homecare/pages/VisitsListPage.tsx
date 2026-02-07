import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { visitApi, Visit, clientApi, Client, carerApi, Carer } from '../services/homecareApi';

function VisitsListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [carers, setCarers] = useState<Carer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [clientFilter, setClientFilter] = useState<string>(searchParams.get('clientId') || 'all');
  const [carerFilter, setCarerFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId, statusFilter, clientFilter, carerFilter, startDate, endDate]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = parseInt(clientFilter);
      if (carerFilter !== 'all') params.carer_id = parseInt(carerFilter);
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [visitsRes, clientsRes, carersRes] = await Promise.all([
        visitApi.list(tenantId, params),
        clientApi.list(tenantId),
        carerApi.list(tenantId),
      ]);
      setVisits(visitsRes.data);
      setClients(clientsRes.data);
      setCarers(carersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load visits');
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
      in_progress: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
      completed: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      cancelled: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      missed: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    };
    return styles[status as keyof typeof styles] || styles.scheduled;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Visits
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/homecare/visits/new')}
        >
          + Schedule Visit
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Client
            </label>
            <select
              className="form-control"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.client_id} value={client.client_id.toString()}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Carer Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Carer
            </label>
            <select
              className="form-control"
              value={carerFilter}
              onChange={(e) => setCarerFilter(e.target.value)}
            >
              <option value="all">All Carers</option>
              {carers.map(carer => (
                <option key={carer.carer_id} value={carer.carer_id.toString()}>
                  {carer.first_name} {carer.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Start Date
            </label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              End Date
            </label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading visits...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      ) : visits.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>No visits found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Date & Time
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Client
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Carer
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Duration
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit, index) => {
                  const scheduledStart = new Date(visit.scheduled_start);
                  const scheduledEnd = new Date(visit.scheduled_end);
                  const durationMinutes = Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60));

                  return (
                    <tr
                      key={visit.visit_id}
                      style={{
                        borderBottom: index < visits.length - 1 ? '1px solid var(--gray-200)' : 'none',
                        background: 'white',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500 }}>
                          {scheduledStart.toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                          {scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {scheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {visit.client ? (
                          <Link
                            to={`/homecare/clients/${visit.client_id}`}
                            style={{ color: '#0891b2', textDecoration: 'none' }}
                          >
                            {visit.client.first_name} {visit.client.last_name}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--gray-500)' }}>Unknown</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {visit.carer ? (
                          <Link
                            to={`/homecare/carers/${visit.carer_id}`}
                            style={{ color: '#0891b2', textDecoration: 'none' }}
                          >
                            {visit.carer.first_name} {visit.carer.last_name}
                          </Link>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                        {visit.visit_type}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                        {durationMinutes} min
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            ...getStatusBadge(visit.status),
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        >
                          {visit.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/homecare/visits/${visit.visit_id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && (
        <div style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--gray-600)', textAlign: 'center' }}>
          Showing {visits.length} visits
        </div>
      )}
    </div>
  );
}

export default VisitsListPage;
