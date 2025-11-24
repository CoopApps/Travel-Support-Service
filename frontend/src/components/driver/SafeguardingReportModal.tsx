import { useState, FormEvent } from 'react';
import { driverDashboardApi } from '../../services/driverDashboardApi';

interface SafeguardingReportModalProps {
  tenantId: number;
  driverId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Safeguarding Incident Report Modal
 *
 * Professional safeguarding reporting interface
 * Matches design system of other modules
 */
function SafeguardingReportModal({
  tenantId,
  driverId,
  onClose,
  onSuccess
}: SafeguardingReportModalProps) {
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    { value: 'low', label: 'Low', description: 'Minor concern, monitoring needed' },
    { value: 'medium', label: 'Medium', description: 'Concern requires attention' },
    { value: 'high', label: 'High', description: 'Serious concern, immediate action needed' },
    { value: 'critical', label: 'Critical', description: 'Emergency - immediate intervention required' }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!incidentType) {
      setError('Please select an incident type');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the incident');
      return;
    }

    setSubmitting(true);
    try {
      await driverDashboardApi.submitSafeguardingReport(tenantId, driverId, {
        incidentType,
        severity,
        customerId: customerId === 0 ? undefined : customerId,
        location: location.trim() || 'Not specified',
        incidentDate,
        description: description.trim(),
        actionTaken: actionTaken.trim() || 'None',
        confidential
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to submit safeguarding report'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Report Safeguarding Concern
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.5' }}>
            Report any concerns about the safety or wellbeing of passengers, yourself, or others.
          </p>
        </div>

        {/* Alert */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {/* Incident Type */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Incident Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="form-control"
              required
            >
              <option value="">Select incident type...</option>
              {incidentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Severity Level <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="form-control"
              required
            >
              {severityLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label} - {level.description}
                </option>
              ))}
            </select>
          </div>

          {/* Location & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Customer's home, vehicle"
                className="form-control"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Date & Time <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
                className="form-control"
                max={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Description of Incident <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible about what you witnessed or were told."
              className="form-control"
              rows={4}
              required
            />
          </div>

          {/* Action Taken */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
              Action Taken (Optional)
            </label>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Describe any immediate action you took"
              className="form-control"
              rows={2}
            />
          </div>

          {/* Confidential */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
              />
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
                Mark as Confidential (restrict to senior management only)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SafeguardingReportModal;
