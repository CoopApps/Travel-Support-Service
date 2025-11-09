import { useState, FormEvent } from 'react';
import { safeguardingApi, driverApi, customerApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface SafeguardingFormModalProps {
  drivers: any[];
  customers: any[];
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Admin Safeguarding Report Form Modal
 *
 * Allows admins to submit safeguarding reports on behalf of drivers or office staff
 */
function SafeguardingFormModal({ drivers, customers, onClose }: SafeguardingFormModalProps) {
  const { tenantId } = useTenant();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [driverId, setDriverId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [confidential, setConfidential] = useState(false);

  const incidentTypes = [
    { value: 'child_safety', label: 'Child Safety Concern', description: 'Child protection or welfare concern' },
    { value: 'vulnerable_adult', label: 'Vulnerable Adult', description: 'Adult at risk or safeguarding issue' },
    { value: 'abuse', label: 'Abuse (Physical/Emotional)', description: 'Suspected abuse of any kind' },
    { value: 'neglect', label: 'Neglect', description: 'Signs of neglect or self-neglect' },
    { value: 'harassment', label: 'Harassment', description: 'Harassment towards driver or passenger' },
    { value: 'unsafe_environment', label: 'Unsafe Environment', description: 'Unsafe living conditions' },
    { value: 'medical_concern', label: 'Medical Concern', description: 'Urgent medical or health issue' },
    { value: 'other', label: 'Other', description: 'Other safeguarding concern' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: '#3730a3' },
    { value: 'medium', label: 'Medium', color: '#92400e' },
    { value: 'high', label: 'High', color: '#9a3412' },
    { value: 'critical', label: 'Critical', color: '#991b1b' }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!driverId) {
      setError('Please select a driver');
      return;
    }

    if (!incidentType) {
      setError('Please select an incident type');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    if (!tenantId) {
      setError('Tenant ID not available');
      return;
    }

    try {
      setSubmitting(true);

      const data = {
        driver_id: parseInt(driverId),
        customer_id: customerId ? parseInt(customerId) : undefined,
        incident_type: incidentType,
        severity,
        incident_date: new Date(incidentDate).toISOString(),
        location: location.trim() || 'Not specified',
        description: description.trim(),
        action_taken: actionTaken.trim() || 'None',
        confidential
      };

      await safeguardingApi.submitReport(tenantId, data);
      onClose(true);
    } catch (err: any) {
      console.error('Error submitting safeguarding report:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Report Safeguarding Concern</h2>
          <button onClick={() => onClose(false)} className="modal-close">&times;</button>
        </div>

        {/* Alert Banner */}
        <div style={{
          padding: '0.875rem 1.5rem',
          background: '#fef3c7',
          borderBottom: '1px solid #fde68a',
          fontSize: '13px',
          color: '#92400e',
          lineHeight: '1.5'
        }}>
          <strong>Important:</strong> If this is an emergency requiring immediate attention,
          please call 999 or your supervisor immediately.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Driver */}
              <div className="form-group">
                <label>Driver <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Select driver...</option>
                  {drivers.map(d => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer (Optional) */}
              <div className="form-group">
                <label>Customer (If Applicable)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="form-control"
                >
                  <option value="">None</option>
                  {customers.map(c => (
                    <option key={c.id || c.customer_id} value={c.id || c.customer_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incident Type */}
              <div className="form-group">
                <label>Incident Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Select type...</option>
                  {incidentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {incidentType && (
                  <small style={{ color: 'var(--gray-600)', marginTop: '4px', display: 'block' }}>
                    {incidentTypes.find(t => t.value === incidentType)?.description}
                  </small>
                )}
              </div>

              {/* Severity */}
              <div className="form-group">
                <label>Severity <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                  className="form-control"
                >
                  {severityLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="form-group">
                <label>Incident Date & Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              {/* Location */}
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where did this occur?"
                  className="form-control"
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Detailed description of the concern or incident..."
                className="form-control"
              />
            </div>

            {/* Action Taken */}
            <div className="form-group">
              <label>Action Taken</label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={2}
                placeholder="What immediate action was taken? (if any)"
                className="form-control"
              />
            </div>

            {/* Confidential */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confidential}
                  onChange={(e) => setConfidential(e.target.checked)}
                />
                <span>Mark as Confidential</span>
              </label>
              <small style={{ color: 'var(--gray-600)', marginTop: '4px', display: 'block', marginLeft: '1.5rem' }}>
                Confidential reports will have restricted access
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ background: submitting ? 'var(--gray-400)' : 'var(--danger)' }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SafeguardingFormModal;
