import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { clientApi, Client } from '../services/homecareApi';

// Clients list page - shows all clients with search and filters
function ClientsListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadClients();
  }, [tenantId, statusFilter]);

  const loadClients = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await clientApi.list(tenantId, params);
      setClients(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load clients');
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(searchLower) ||
      client.last_name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      archived: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Clients
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/homecare/clients/new')}
        >
          + New Client
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="Search clients..."
              className="form-control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
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

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading clients...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={loadClients} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>
            {searchTerm ? 'No clients found matching your search.' : 'No clients yet. Create your first client to get started.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Name
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Contact
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Address
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Travel Sync
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => (
                  <tr
                    key={client.client_id}
                    style={{
                      borderBottom: index < filteredClients.length - 1 ? '1px solid var(--gray-200)' : 'none',
                      background: 'white',
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <Link
                        to={`/homecare/clients/${client.client_id}`}
                        style={{ color: '#0891b2', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                      {client.nhs_number && (
                        <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                          NHS: {client.nhs_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px' }}>
                      {client.phone && <div>{client.phone}</div>}
                      {client.email && <div style={{ color: 'var(--gray-600)' }}>{client.email}</div>}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                      {client.address ? (
                        <>
                          <div>{client.address}</div>
                          {client.postcode && <div>{client.postcode}</div>}
                        </>
                      ) : (
                        <span style={{ color: 'var(--gray-400)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          ...getStatusBadge(client.status),
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '13px' }}>
                      {client.travel_customer_id ? (
                        <span style={{ color: '#10b981' }}>Synced</span>
                      ) : (
                        <span style={{ color: 'var(--gray-400)' }}>Not synced</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/homecare/clients/${client.client_id}`)}
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

      {!loading && !error && (
        <div style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--gray-600)', textAlign: 'center' }}>
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      )}
    </div>
  );
}

export default ClientsListPage;
