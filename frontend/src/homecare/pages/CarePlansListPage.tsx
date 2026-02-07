import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { carePlanApi, CarePlan, clientApi, Client } from '../services/homecareApi';

function CarePlansListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [tenantId, statusFilter, clientFilter]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = parseInt(clientFilter);

      const [carePlansRes, clientsRes] = await Promise.all([
        carePlanApi.list(tenantId, params),
        clientApi.list(tenantId),
      ]);
      setCarePlans(Array.isArray(carePlansRes.data) ? carePlansRes.data : []);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load care plans');
      console.error('Failed to load care plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      archived: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Care Plans
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/homecare/care-plans/new')}
        >
          + New Care Plan
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Client Filter */}
          <div style={{ flex: '1', minWidth: '200px' }}>
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

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading care plans...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      ) : carePlans.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>No care plans found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Plan Name
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Client
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Frequency
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Duration
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Period
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
                {carePlans.map((plan, index) => (
                  <tr
                    key={plan.care_plan_id}
                    style={{
                      borderBottom: index < carePlans.length - 1 ? '1px solid var(--gray-200)' : 'none',
                      background: 'white',
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <Link
                        to={`/homecare/care-plans/${plan.care_plan_id}`}
                        style={{ color: '#0891b2', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {plan.plan_name}
                      </Link>
                      {plan.care_needs && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                          {plan.care_needs.substring(0, 60)}{plan.care_needs.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {plan.client ? (
                        <Link
                          to={`/homecare/clients/${plan.client_id}`}
                          style={{ color: '#0891b2', textDecoration: 'none' }}
                        >
                          {plan.client.first_name} {plan.client.last_name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--gray-500)' }}>Unknown</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                      {plan.visit_frequency}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                      {plan.visit_duration_minutes} min
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px' }}>
                      <div>{new Date(plan.start_date).toLocaleDateString()}</div>
                      {plan.end_date && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          to {new Date(plan.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          ...getStatusBadge(plan.status),
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/homecare/care-plans/${plan.care_plan_id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && (
        <div style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--gray-600)', textAlign: 'center' }}>
          Showing {carePlans.length} care plans
        </div>
      )}
    </div>
  );
}

export default CarePlansListPage;
