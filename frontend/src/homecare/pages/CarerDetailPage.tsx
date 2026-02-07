import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { carerApi, Carer, visitApi, Visit } from '../services/homecareApi';
import HomecareLayout from '../components/HomecareLayout';

function CarerDetailPage() {
  const { carerId } = useParams<{ carerId: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [carer, setCarer] = useState<Carer | null>(null);
  const [schedule, setSchedule] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState<Partial<Carer>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'schedule'>('details');
  const [syncAsType, setSyncAsType] = useState<'customer' | 'driver'>('customer');

  const isNew = carerId === 'new';

  useEffect(() => {
    if (isNew) {
      setEditing(true);
      setLoading(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        status: 'active',
        employment_type: 'full_time',
        care_certificate: false,
      });
    } else {
      loadCarerData();
    }
  }, [carerId, tenantId]);

  const loadCarerData = async () => {
    if (!tenantId || !carerId || isNew) return;

    try {
      setLoading(true);
      setError(null);

      const carerRes = await carerApi.getById(tenantId, parseInt(carerId));
      setCarer(carerRes.data);
      setFormData(carerRes.data);

      // Load schedule
      const scheduleRes = await carerApi.getSchedule(tenantId, parseInt(carerId));
      setSchedule(scheduleRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load carer');
      console.error('Failed to load carer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('First name, last name, and email are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        const response = await carerApi.create(tenantId, formData);
        navigate(`/homecare/carers/${response.data.carer_id}`, { replace: true });
      } else if (carerId) {
        const response = await carerApi.update(tenantId, parseInt(carerId), formData);
        setCarer(response.data);
        setFormData(response.data);
        setEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save carer');
      console.error('Failed to save carer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !carerId || isNew) return;
    if (!confirm('Are you sure you want to delete this carer?')) return;

    try {
      await carerApi.delete(tenantId, parseInt(carerId));
      navigate('/homecare/carers');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete carer');
      console.error('Failed to delete carer:', err);
    }
  };

  const handleSyncToTravel = async () => {
    if (!tenantId || !carerId || isNew) return;

    try {
      setSyncing(true);
      setError(null);
      await carerApi.syncToTravel(tenantId, parseInt(carerId), { sync_as: syncAsType });
      await loadCarerData();
      alert(`Carer synced to travel system as ${syncAsType}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync to travel');
      console.error('Failed to sync to travel:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUnsyncFromTravel = async () => {
    if (!tenantId || !carerId || isNew) return;
    if (!confirm('Are you sure you want to unsync this carer from the travel system?')) return;

    try {
      setSyncing(true);
      setError(null);
      await carerApi.unsyncFromTravel(tenantId, parseInt(carerId));
      await loadCarerData();
      alert('Carer unsynced from travel system');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unsync from travel');
      console.error('Failed to unsync from travel:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getDBSStatus = () => {
    if (!carer?.dbs_expiry_date) return { text: 'No DBS', color: '#ef4444' };
    const expiryDate = new Date(carer.dbs_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { text: 'Expired', color: '#ef4444' };
    if (daysUntilExpiry < 30) return { text: `Expires in ${daysUntilExpiry} days`, color: '#f59e0b' };
    return { text: 'Valid', color: '#10b981' };
  };

  if (loading) {
    return (
      <HomecareLayout>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          Loading carer...
        </div>
      </HomecareLayout>
    );
  }

  return (
    <HomecareLayout>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <Link to="/homecare/carers" style={{ color: '#0891b2', textDecoration: 'none', fontSize: '13px' }}>
              ← Back to Carers
            </Link>
            <h1 style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
              {isNew ? 'New Carer' : `${carer?.first_name} ${carer?.last_name}`}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isNew && !editing && (
              <>
                {carer?.travel_customer_id || carer?.travel_driver_id ? (
                  <button
                    className="btn btn-secondary"
                    onClick={handleUnsyncFromTravel}
                    disabled={syncing}
                  >
                    {syncing ? 'Unsyncing...' : 'Unsync from Travel'}
                  </button>
                ) : (
                  <>
                    <select
                      className="form-control"
                      style={{ width: 'auto' }}
                      value={syncAsType}
                      onChange={(e) => setSyncAsType(e.target.value as 'customer' | 'driver')}
                    >
                      <option value="customer">As Customer</option>
                      <option value="driver">As Driver</option>
                    </select>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSyncToTravel}
                      disabled={syncing}
                    >
                      {syncing ? 'Syncing...' : 'Sync to Travel'}
                    </button>
                  </>
                )}
                <button className="btn btn-primary" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </>
            )}
            {editing && (
              <>
                {!isNew && (
                  <button className="btn btn-secondary" onClick={() => {
                    setEditing(false);
                    setFormData(carer || {});
                  }}>
                    Cancel
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* DBS Alert */}
        {!isNew && !editing && carer && (
          (() => {
            const dbsStatus = getDBSStatus();
            if (dbsStatus.color === '#ef4444' || dbsStatus.color === '#f59e0b') {
              return (
                <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: dbsStatus.color === '#ef4444' ? '#fef2f2' : '#fef3c7', border: `1px solid ${dbsStatus.color === '#ef4444' ? '#fecaca' : '#fcd34d'}` }}>
                  <p style={{ color: dbsStatus.color === '#ef4444' ? '#991b1b' : '#92400e', margin: 0, fontWeight: 500 }}>
                    ⚠ DBS Status: {dbsStatus.text}
                  </p>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* Tabs */}
        {!isNew && (
          <div style={{ borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <button
                onClick={() => setActiveTab('details')}
                style={{
                  padding: '0.75rem 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'details' ? '2px solid #0891b2' : '2px solid transparent',
                  color: activeTab === 'details' ? '#0891b2' : 'var(--gray-600)',
                  fontWeight: activeTab === 'details' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                style={{
                  padding: '0.75rem 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'schedule' ? '2px solid #0891b2' : '2px solid transparent',
                  color: activeTab === 'schedule' ? '#0891b2' : 'var(--gray-600)',
                  fontWeight: activeTab === 'schedule' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Schedule ({schedule.length})
              </button>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Personal Information */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  Personal Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date_of_birth?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      disabled={!editing}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  Contact Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Postcode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.postcode || ''}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  Employment Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Employment Type</label>
                    <select
                      className="form-control"
                      value={formData.employment_type || 'full_time'}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                      disabled={!editing}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="agency">Agency</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Hourly Rate (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.hourly_rate || ''}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contracted Hours/Week</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.contracted_hours || ''}
                      onChange={(e) => setFormData({ ...formData, contracted_hours: parseFloat(e.target.value) })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Max Daily Hours</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.max_daily_hours || ''}
                      onChange={(e) => setFormData({ ...formData, max_daily_hours: parseFloat(e.target.value) })}
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* DBS & Qualifications */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  DBS & Qualifications
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">DBS Check Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.dbs_check_date?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, dbs_check_date: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">DBS Expiry Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.dbs_expiry_date?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, dbs_expiry_date: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">DBS Certificate Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.dbs_certificate_number || ''}
                      onChange={(e) => setFormData({ ...formData, dbs_certificate_number: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="care_certificate"
                      checked={formData.care_certificate || false}
                      onChange={(e) => setFormData({ ...formData, care_certificate: e.target.checked })}
                      disabled={!editing}
                    />
                    <label htmlFor="care_certificate" style={{ margin: 0, fontSize: '14px' }}>
                      Has Care Certificate
                    </label>
                  </div>
                  <div>
                    <label className="form-label">Qualifications</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.qualifications || ''}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      disabled={!editing}
                      placeholder="List qualifications..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {!isNew && !editing && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete Carer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '16px', fontWeight: 600 }}>Upcoming Schedule</h3>
            {schedule.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-600)', margin: 0 }}>No scheduled visits.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date/Time</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Client</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((visit, index) => (
                        <tr key={visit.visit_id} style={{ borderBottom: index < schedule.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>
                            {new Date(visit.scheduled_start).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>
                            {visit.client ? `${visit.client.first_name} ${visit.client.last_name}` : '-'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>{visit.visit_type}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontSize: '11px', textTransform: 'capitalize' }}>{visit.status}</span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <Link to={`/homecare/visits/${visit.visit_id}`} className="btn btn-secondary btn-sm">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </HomecareLayout>
  );
}

export default CarerDetailPage;
