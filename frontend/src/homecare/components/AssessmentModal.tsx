import { useState } from 'react';
import { Client } from '../services/homecareApi';

interface AssessmentModalProps {
  client: Client;
  onClose: () => void;
  onSave: (assessment: string) => Promise<void>;
}

function AssessmentModal({ client, onClose, onSave }: AssessmentModalProps) {
  const [assessment, setAssessment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(assessment);
      onClose();
    } catch (err) {
      console.error('Failed to save assessment:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Care Assessment</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                {client.first_name} {client.last_name}
              </div>
              {client.nhs_number && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
                  NHS: {client.nhs_number}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: 500 }}>
                Assessment Notes *
              </label>
              <textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                required
                rows={12}
                className="form-control"
                placeholder="Document the care assessment including:&#10;- Physical health and mobility&#10;- Cognitive function&#10;- Social and emotional wellbeing&#10;- Current support network&#10;- Identified care needs&#10;- Recommended care plan&#10;- Risk assessment"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '0.5rem' }}>
                This assessment will be stored in the client's records
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssessmentModal;
