import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { carePlanApi, CarePlan, clientApi, Client } from '../services/homecareApi';

function CarePlanDetailPage() {
  const { carePlanId } = useParams<{ carePlanId: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CarePlan>>({});

  const isNewCarePlan = carePlanId === 'new';

  useEffect(() => {
    if (isNewCarePlan) {
      loadClients();
      setIsEditing(true);
      const clientId = searchParams.get('clientId');
      setFormData({
        client_id: clientId ? parseInt(clientId) : undefined,
        status: 'active',
        visit_duration_minutes: 60,
      });
      setLoading(false);
    } else if (tenantId && carePlanId) {
      loadCarePlan();
    }
  }, [tenantId, carePlanId]);

  const loadClients = async () => {
    if (!tenantId) return;
    try {
      const response = await clientApi.list(tenantId);
      setClients(response.data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadCarePlan = async () => {
    if (!tenantId || !carePlanId) return;

    try {
      setLoading(true);
      setError(null);
      const [carePlanRes, clientsRes] = await Promise.all([
        carePlanApi.getById(tenantId, parseInt(carePlanId)),
        clientApi.list(tenantId),
      ]);
      setCarePlan(carePlanRes.data);
      setFormData(carePlanRes.data);
      setClients(clientsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load care plan');
      console.error('Failed to load care plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setError(null);
      if (isNewCarePlan) {
        const response = await carePlanApi.create(tenantId, formData);
        navigate(`/homecare/care-plans/${response.data.care_plan_id}`);
      } else {
        const response = await carePlanApi.update(tenantId, parseInt(carePlanId!), formData);
        setCarePlan(response.data);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save care plan');
      console.error('Failed to save care plan:', err);
    }
  };

  const handleDelete = async () => {
    if (!tenantId || !carePlanId || !window.confirm('Are you sure you want to delete this care plan?')) return;

    try {
      await carePlanApi.delete(tenantId, parseInt(carePlanId));
      navigate('/homecare/care-plans');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete care plan');
      console.error('Failed to delete care plan:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Loading care plan...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/homecare/care-plans')}>
            ê Back
          </button>
          <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
            {isNewCarePlan ? 'New Care Plan' : carePlan?.plan_name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isNewCarePlan && !isEditing && (
            <>
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

      {/* Care Plan Details */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Care Plan Details
          </h2>
          {isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setIsEditing(false);
                if (!isNewCarePlan) setFormData(carePlan || {});
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
          {/* Plan Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Plan Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                className="form-control"
                value={formData.plan_name || ''}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>{carePlan?.plan_name}</p>
            )}
          </div>

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
                {carePlan?.client ? `${carePlan.client.first_name} ${carePlan.client.last_name}` : 'Unknown'}
              </p>
            )}
          </div>

          {/* Visit Frequency */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Visit Frequency *
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.visit_frequency || ''}
                onChange={(e) => setFormData({ ...formData, visit_frequency: e.target.value })}
                required
              >
                <option value="">Select Frequency</option>
                <option value="Once per week">Once per week</option>
                <option value="Twice per week">Twice per week</option>
                <option value="Three times per week">Three times per week</option>
                <option value="Daily">Daily</option>
                <option value="Multiple times daily">Multiple times daily</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
                <option value="As needed">As needed</option>
              </select>
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>{carePlan?.visit_frequency}</p>
            )}
          </div>

          {/* Visit Duration */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Visit Duration (minutes) *
            </label>
            {isEditing ? (
              <input
                type="number"
                className="form-control"
                value={formData.visit_duration_minutes || ''}
                onChange={(e) => setFormData({ ...formData, visit_duration_minutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>{carePlan?.visit_duration_minutes} minutes</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Start Date *
            </label>
            {isEditing ? (
              <input
                type="date"
                className="form-control"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {carePlan?.start_date ? new Date(carePlan.start_date).toLocaleDateString() : '-'}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              End Date (optional)
            </label>
            {isEditing ? (
              <input
                type="date"
                className="form-control"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {carePlan?.end_date ? new Date(carePlan.end_date).toLocaleDateString() : 'Ongoing'}
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
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'archived' })}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  background: carePlan?.status === 'active' ? '#d1fae5' : '#f3f4f6',
                  color: carePlan?.status === 'active' ? '#065f46' : '#374151',
                  border: carePlan?.status === 'active' ? '1px solid #6ee7b7' : '1px solid #d1d5db',
                }}
              >
                {carePlan?.status}
              </span>
            )}
          </div>
        </div>

        {/* Care Needs */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Care Needs *
          </label>
          {isEditing ? (
            <textarea
              className="form-control"
              value={formData.care_needs || ''}
              onChange={(e) => setFormData({ ...formData, care_needs: e.target.value })}
              rows={4}
              placeholder="Describe the care needs..."
              required
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--gray-900)', whiteSpace: 'pre-wrap' }}>{carePlan?.care_needs || '-'}</p>
          )}
        </div>

        {/* Special Instructions */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Special Instructions
          </label>
          {isEditing ? (
            <textarea
              className="form-control"
              value={formData.special_instructions || ''}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              rows={3}
              placeholder="Any special instructions for carers..."
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--gray-900)', whiteSpace: 'pre-wrap' }}>{carePlan?.special_instructions || '-'}</p>
          )}
        </div>

        {/* Risk Assessment */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Risk Assessment
          </label>
          {isEditing ? (
            <textarea
              className="form-control"
              value={formData.risk_assessment || ''}
              onChange={(e) => setFormData({ ...formData, risk_assessment: e.target.value })}
              rows={3}
              placeholder="Document any risks and mitigation strategies..."
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--gray-900)', whiteSpace: 'pre-wrap' }}>{carePlan?.risk_assessment || '-'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CarePlanDetailPage;
