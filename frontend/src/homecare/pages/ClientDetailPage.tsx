import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { clientApi, Client, carePlanApi, CarePlan, visitApi, Visit } from '../services/homecareApi';

function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'care-plans' | 'visits'>('details');

  const isNew = clientId === 'new';

  useEffect(() => {
    if (isNew) {
      setEditing(true);
      setLoading(false);
      setFormData({
        first_name: '',
        last_name: '',
        status: 'active',
      });
    } else {
      loadClientData();
    }
  }, [clientId, tenantId]);

  const loadClientData = async () => {
    if (!tenantId || !clientId || isNew) return;

    try {
      setLoading(true);
      setError(null);

      const [clientRes, carePlansRes, visitsRes] = await Promise.all([
        clientApi.getById(tenantId, parseInt(clientId)),
        carePlanApi.list(tenantId, { client_id: parseInt(clientId) }),
        visitApi.list(tenantId, { client_id: parseInt(clientId) }),
      ]);

      setClient(clientRes.data);
      setFormData(clientRes.data);
      setCarePlans(carePlansRes.data);
      setVisits(visitsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load client');
      console.error('Failed to load client:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    // Validation
    if (!formData.first_name || !formData.last_name) {
      alert('First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        const response = await clientApi.create(tenantId, formData);
        navigate(`/homecare/clients/${response.data.client_id}`, { replace: true });
      } else if (clientId) {
        const response = await clientApi.update(tenantId, parseInt(clientId), formData);
        setClient(response.data);
        setFormData(response.data);
        setEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save client');
      console.error('Failed to save client:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !clientId || isNew) return;
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await clientApi.delete(tenantId, parseInt(clientId));
      navigate('/homecare/clients');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete client');
      console.error('Failed to delete client:', err);
    }
  };

  const handleSyncToTravel = async () => {
    if (!tenantId || !clientId || isNew) return;

    try {
      setSyncing(true);
      setError(null);
      await clientApi.syncToTravel(tenantId, parseInt(clientId));
      await loadClientData();
      alert('Client synced to travel system successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync to travel');
      console.error('Failed to sync to travel:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUnsyncFromTravel = async () => {
    if (!tenantId || !clientId || isNew) return;
    if (!confirm('Are you sure you want to unsync this client from the travel system?')) return;

    try {
      setSyncing(true);
      setError(null);
      await clientApi.unsyncFromTravel(tenantId, parseInt(clientId));
      await loadClientData();
      alert('Client unsynced from travel system');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unsync from travel');
      console.error('Failed to unsync from travel:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          Loading client...
        </div>
          );
  }

  return (
          <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <Link to="/homecare/clients" style={{ color: '#0891b2', textDecoration: 'none', fontSize: '13px' }}>
              ← Back to Clients
            </Link>
            <h1 style={{ margin: '0.5rem 0 0 0', color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
              {isNew ? 'New Client' : `${client?.first_name} ${client?.last_name}`}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isNew && !editing && (
              <>
                {client?.travel_customer_id ? (
                  <button
                    className="btn btn-secondary"
                    onClick={handleUnsyncFromTravel}
                    disabled={syncing}
                  >
                    {syncing ? 'Unsyncing...' : 'Unsync from Travel'}
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    onClick={handleSyncToTravel}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : 'Sync to Travel'}
                  </button>
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
                    setFormData(client || {});
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
                onClick={() => setActiveTab('care-plans')}
                style={{
                  padding: '0.75rem 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'care-plans' ? '2px solid #0891b2' : '2px solid transparent',
                  color: activeTab === 'care-plans' ? '#0891b2' : 'var(--gray-600)',
                  fontWeight: activeTab === 'care-plans' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Care Plans ({carePlans.length})
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                style={{
                  padding: '0.75rem 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'visits' ? '2px solid #0891b2' : '2px solid transparent',
                  color: activeTab === 'visits' ? '#0891b2' : 'var(--gray-600)',
                  fontWeight: activeTab === 'visits' ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Visits ({visits.length})
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
                    <label className="form-label">NHS Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nhs_number || ''}
                      onChange={(e) => setFormData({ ...formData, nhs_number: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'archived' })}
                      disabled={!editing}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
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
                    <label className="form-label">Email</label>
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

              {/* Emergency Contact */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  Emergency Contact
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Relationship</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.emergency_contact_relationship || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* Care Needs */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1rem' }}>
                  Care Needs
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Medical Conditions</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.medical_conditions || ''}
                      onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Allergies</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.allergies || ''}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Mobility Needs</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.mobility_needs || ''}
                      onChange={(e) => setFormData({ ...formData, mobility_needs: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Communication Needs</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.communication_needs || ''}
                      onChange={(e) => setFormData({ ...formData, communication_needs: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="form-label">Dietary Requirements</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.dietary_requirements || ''}
                      onChange={(e) => setFormData({ ...formData, dietary_requirements: e.target.value })}
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {!isNew && !editing && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete Client
                </button>
              </div>
            )}
          </div>
        )}

        {/* Care Plans Tab */}
        {activeTab === 'care-plans' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Care Plans</h3>
              <Link to={`/homecare/care-plans/new?client_id=${clientId}`} className="btn btn-primary btn-sm">
                + New Care Plan
              </Link>
            </div>
            {carePlans.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-600)', margin: 0 }}>No care plans yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {carePlans.map((plan) => (
                  <Link
                    key={plan.care_plan_id}
                    to={`/homecare/care-plans/${plan.care_plan_id}`}
                    className="card"
                    style={{ padding: '1rem', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '14px', fontWeight: 600, color: '#0891b2' }}>
                          {plan.plan_name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-600)' }}>
                          {plan.visit_frequency} • {plan.visit_duration_minutes} minutes
                        </p>
                        {plan.special_instructions && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: 'var(--gray-500)' }}>
                            {plan.special_instructions.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: plan.status === 'active' ? '#d1fae5' : '#f3f4f6',
                          color: plan.status === 'active' ? '#065f46' : '#374151',
                        }}
                      >
                        {plan.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Visits Tab */}
        {activeTab === 'visits' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Visits</h3>
              <Link to={`/homecare/visits/new?client_id=${clientId}`} className="btn btn-primary btn-sm">
                + New Visit
              </Link>
            </div>
            {visits.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-600)', margin: 0 }}>No visits yet.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date/Time</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Carer</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((visit, index) => (
                        <tr key={visit.visit_id} style={{ borderBottom: index < visits.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>
                            {new Date(visit.scheduled_start).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>{visit.visit_type}</td>
                          <td style={{ padding: '1rem', fontSize: '13px' }}>
                            {visit.carer ? `${visit.carer.first_name} ${visit.carer.last_name}` : <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}
                          </td>
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
      );
}

export default ClientDetailPage;
