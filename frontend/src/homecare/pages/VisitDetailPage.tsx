import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { visitApi, Visit, clientApi, Client, carerApi, Carer } from '../services/homecareApi';

function VisitDetailPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [carers, setCarers] = useState<Carer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Visit>>({});

  const isNewVisit = visitId === 'new';

  useEffect(() => {
    if (isNewVisit) {
      loadClientsAndCarers();
      setIsEditing(true);
      const clientId = searchParams.get('clientId');
      setFormData({
        client_id: clientId ? parseInt(clientId) : undefined,
        visit_type: 'Personal Care',
        status: 'scheduled',
      });
      setLoading(false);
    } else if (tenantId && visitId) {
      loadVisit();
    }
  }, [tenantId, visitId]);

  const loadClientsAndCarers = async () => {
    if (!tenantId) return;
    try {
      const [clientsRes, carersRes] = await Promise.all([
        clientApi.list(tenantId),
        carerApi.list(tenantId, { status: 'active' }),
      ]);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
      setCarers(Array.isArray(carersRes.data) ? carersRes.data : []);
    } catch (err) {
      console.error('Failed to load clients and carers:', err);
      setClients([]);
      setCarers([]);
    }
  };

  const loadVisit = async () => {
    if (!tenantId || !visitId) return;

    try {
      setLoading(true);
      setError(null);
      const [visitRes, clientsRes, carersRes] = await Promise.all([
        visitApi.getById(tenantId, parseInt(visitId)),
        clientApi.list(tenantId),
        carerApi.list(tenantId, { status: 'active' }),
      ]);
      setVisit(visitRes.data);
      setFormData(visitRes.data);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
      setCarers(Array.isArray(carersRes.data) ? carersRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load visit');
      console.error('Failed to load visit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setError(null);
      if (isNewVisit) {
        const response = await visitApi.create(tenantId, formData);
        navigate(`/homecare/visits/${response.data.visit_id}`);
      } else {
        const response = await visitApi.update(tenantId, parseInt(visitId!), formData);
        setVisit(response.data);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save visit');
      console.error('Failed to save visit:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!tenantId || !visitId) return;

    try {
      setError(null);
      await visitApi.checkIn(tenantId, parseInt(visitId), {});
      await loadVisit();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check in');
      console.error('Failed to check in:', err);
    }
  };

  const handleCheckOut = async () => {
    if (!tenantId || !visitId) return;

    const notes = prompt('Add any notes about this visit:');

    try {
      setError(null);
      await visitApi.checkOut(tenantId, parseInt(visitId), { notes: notes || undefined });
      await loadVisit();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check out');
      console.error('Failed to check out:', err);
    }
  };

  const handleAssignCarer = async (carerId: number) => {
    if (!tenantId || !visitId) return;

    try {
      setError(null);
      await visitApi.assignCarer(tenantId, parseInt(visitId), { carer_id: carerId });
      await loadVisit();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign carer');
      console.error('Failed to assign carer:', err);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !visitId || !window.confirm('Are you sure you want to delete this visit?')) return;

    try {
      await visitApi.delete(tenantId, parseInt(visitId));
      navigate('/homecare/visits');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete visit');
      console.error('Failed to delete visit:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Loading visit...
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: { background: '#f3f4f6', color: '#374151' },
      in_progress: { background: '#dbeafe', color: '#1e40af' },
      completed: { background: '#d1fae5', color: '#065f46' },
      cancelled: { background: '#fee2e2', color: '#991b1b' },
      missed: { background: '#fef3c7', color: '#92400e' },
    };
    return styles[status as keyof typeof styles] || styles.scheduled;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/homecare/visits')}>
            � Back
          </button>
          <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
            {isNewVisit ? 'New Visit' : 'Visit Details'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isNewVisit && !isEditing && (
            <>
              {visit?.status === 'scheduled' && (
                <button className="btn btn-primary btn-sm" onClick={handleCheckIn}>
                  Check In
                </button>
              )}
              {visit?.status === 'in_progress' && (
                <button className="btn btn-primary btn-sm" onClick={handleCheckOut}>
                  Check Out
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Visit Details */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Visit Information
          </h2>
          {isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setIsEditing(false);
                if (!isNewVisit) setFormData(visit || {});
              }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                Save
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Client */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Client *
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.client_id || ''}
                onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                required
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {visit?.client ? `${visit.client.first_name} ${visit.client.last_name}` : 'Unknown'}
              </p>
            )}
          </div>

          {/* Carer */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Carer
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.carer_id || ''}
                onChange={(e) => setFormData({ ...formData, carer_id: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">Unassigned</option>
                {carers.map(carer => (
                  <option key={carer.carer_id} value={carer.carer_id}>
                    {carer.first_name} {carer.last_name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                  {visit?.carer ? `${visit.carer.first_name} ${visit.carer.last_name}` : 'Unassigned'}
                </p>
                {!isEditing && !visit?.carer && (
                  <select
                    className="form-control"
                    onChange={(e) => e.target.value && handleAssignCarer(parseInt(e.target.value))}
                    value=""
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="">Assign Carer...</option>
                    {carers.map(carer => (
                      <option key={carer.carer_id} value={carer.carer_id}>
                        {carer.first_name} {carer.last_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Visit Type */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Visit Type *
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.visit_type || ''}
                onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                required
              >
                <option value="">Select Type</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Medication">Medication</option>
                <option value="Meal Preparation">Meal Preparation</option>
                <option value="Domestic Tasks">Domestic Tasks</option>
                <option value="Shopping">Shopping</option>
                <option value="Companionship">Companionship</option>
                <option value="Night Care">Night Care</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>{visit?.visit_type}</p>
            )}
          </div>

          {/* Scheduled Start */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Scheduled Start *
            </label>
            {isEditing ? (
              <input
                type="datetime-local"
                className="form-control"
                value={formData.scheduled_start ? new Date(formData.scheduled_start).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {visit?.scheduled_start ? new Date(visit.scheduled_start).toLocaleString() : '-'}
              </p>
            )}
          </div>

          {/* Scheduled End */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Scheduled End *
            </label>
            {isEditing ? (
              <input
                type="datetime-local"
                className="form-control"
                value={formData.scheduled_end ? new Date(formData.scheduled_end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {visit?.scheduled_end ? new Date(visit.scheduled_end).toLocaleString() : '-'}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Status
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.status || 'scheduled'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="missed">Missed</option>
              </select>
            ) : (
              <span
                style={{
                  ...getStatusBadge(visit?.status || 'scheduled'),
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {visit?.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Notes
          </label>
          {isEditing ? (
            <textarea
              className="form-control"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any notes about this visit..."
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--gray-900)' }}>{visit?.notes || '-'}</p>
          )}
        </div>
      </div>

      {/* Actual Times (only show if visit has started) */}
      {!isNewVisit && (visit?.actual_start || visit?.actual_end) && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Actual Times
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Check In
              </label>
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {visit?.actual_start ? new Date(visit.actual_start).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                Check Out
              </label>
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {visit?.actual_end ? new Date(visit.actual_end).toLocaleString() : '-'}
              </p>
            </div>
            {visit?.actual_start && visit?.actual_end && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                  Duration
                </label>
                <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                  {Math.round((new Date(visit.actual_end).getTime() - new Date(visit.actual_start).getTime()) / (1000 * 60))} minutes
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VisitDetailPage;
