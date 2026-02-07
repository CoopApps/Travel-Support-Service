import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { carerApi, Carer } from '../services/homecareApi';
import HomecareLayout from '../components/HomecareLayout';

function CarersListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [carers, setCarers] = useState<Carer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCarers();
  }, [tenantId, statusFilter]);

  const loadCarers = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await carerApi.list(tenantId, params);
      setCarers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load carers');
      console.error('Failed to load carers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCarers = carers.filter(carer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      carer.first_name.toLowerCase().includes(searchLower) ||
      carer.last_name.toLowerCase().includes(searchLower) ||
      carer.email?.toLowerCase().includes(searchLower) ||
      carer.phone?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      inactive: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  const getDBSStatus = (carer: Carer) => {
    if (!carer.dbs_expiry_date) return { text: 'No DBS', color: '#ef4444' };
    const expiryDate = new Date(carer.dbs_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { text: 'Expired', color: '#ef4444' };
    if (daysUntilExpiry < 30) return { text: `${daysUntilExpiry}d`, color: '#f59e0b' };
    return { text: 'Valid', color: '#10b981' };
  };

  return (
    <HomecareLayout>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
            Carers
          </h1>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/homecare/carers/new')}
          >
            + New Carer
          </button>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '250px' }}>
              <input
                type="text"
                placeholder="Search carers..."
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: '150px' }}>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading carers...</p>
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={loadCarers} style={{ marginTop: '1rem' }}>
              Retry
            </button>
          </div>
        ) : filteredCarers.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>
              {searchTerm ? 'No carers found matching your search.' : 'No carers yet. Create your first carer to get started.'}
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
                      Employment
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      DBS Status
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Performance
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
                  {filteredCarers.map((carer, index) => {
                    const dbsStatus = getDBSStatus(carer);
                    return (
                      <tr
                        key={carer.carer_id}
                        style={{
                          borderBottom: index < filteredCarers.length - 1 ? '1px solid var(--gray-200)' : 'none',
                          background: 'white',
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <Link
                            to={`/homecare/carers/${carer.carer_id}`}
                            style={{ color: '#0891b2', textDecoration: 'none', fontWeight: 500 }}
                          >
                            {carer.first_name} {carer.last_name}
                          </Link>
                          {carer.care_certificate && (
                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                              Care Certificate
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '13px' }}>
                          {carer.phone && <div>{carer.phone}</div>}
                          <div style={{ color: 'var(--gray-600)' }}>{carer.email}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '13px' }}>
                          <div style={{ textTransform: 'capitalize' }}>
                            {carer.employment_type.replace('_', ' ')}
                          </div>
                          {carer.contracted_hours && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                              {carer.contracted_hours}h/week
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ color: dbsStatus.color, fontSize: '13px', fontWeight: 500 }}>
                            {dbsStatus.text}
                          </span>
                          {carer.dbs_expiry_date && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                              Exp: {new Date(carer.dbs_expiry_date).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '13px' }}>
                          <div>{carer.total_visits_completed || 0} visits</div>
                          {carer.on_time_percentage !== undefined && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                              {carer.on_time_percentage.toFixed(0)}% on time
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              ...getStatusBadge(carer.status),
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              textTransform: 'capitalize',
                            }}
                          >
                            {carer.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/homecare/carers/${carer.carer_id}`)}
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
            Showing {filteredCarers.length} of {carers.length} carers
          </div>
        )}
      </div>
    </HomecareLayout>
  );
}

export default CarersListPage;
