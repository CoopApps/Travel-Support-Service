import { useState } from 'react';
import { OrganizationalPermit } from '../../types';
import { permitsApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface OrganizationalPermitModalProps {
  permit: OrganizationalPermit | null;
  permitType: 'section19' | 'section22';
  onClose: () => void;
  onSuccess: () => void;
}

function OrganizationalPermitModal({ permit, permitType, onClose, onSuccess }: OrganizationalPermitModalProps) {
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    organisation_name: permit?.organisation_name || '',
    permit_number: permit?.permit_number || '',
    issue_date: permit?.issue_date || '',
    expiry_date: permit?.expiry_date || '',
    notes: permit?.notes || '',
    permit_size_type: permit?.permit_size_type || 'standard',
    permitted_passenger_classes: permit?.permitted_passenger_classes || [],
    disc_number: permit?.disc_number || '',
    issued_by_type: permit?.issued_by_type || 'traffic_commissioner',
    issuing_body_name: permit?.issuing_body_name || '',
    designated_body_id: permit?.designated_body_id || '',
    permit_conditions: permit?.permit_conditions || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setSaving(true);

      const data = {
        ...formData,
        permit_type: permitType
      };

      if (permit?.id || permit?.permit_id) {
        await permitsApi.updateOrganizationalPermit(tenantId, permit.id || permit.permit_id!, data);
      } else {
        await permitsApi.createOrganizationalPermit(tenantId, data);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving permit:', error);
      alert('Failed to save permit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {permit ? 'Edit' : 'Add'} {permitType === 'section19' ? 'Section 19' : 'Section 22'} Permit
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={formData.organisation_name}
                onChange={(e) => setFormData({ ...formData, organisation_name: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Permit Number *</label>
              <input
                type="text"
                value={formData.permit_number}
                onChange={(e) => setFormData({ ...formData, permit_number: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Compliance Fields */}
            <div className="form-group">
              <label>Permit Size Type</label>
              <select
                value={formData.permit_size_type}
                onChange={(e) => setFormData({ ...formData, permit_size_type: e.target.value as 'standard' | 'large_bus' })}
                className="form-control"
              >
                <option value="standard">Standard (≤16 passengers)</option>
                <option value="large_bus">Large Bus (17+ passengers)</option>
              </select>
            </div>

            {permitType === 'section19' && (
              <div className="form-group">
                <label>Permitted Passenger Classes (Section 19 only)</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map((classCode) => (
                    <label key={classCode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.permitted_passenger_classes.includes(classCode as 'A' | 'B' | 'C' | 'D' | 'E' | 'F')}
                        onChange={(e) => {
                          const classes = [...formData.permitted_passenger_classes];
                          if (e.target.checked) {
                            classes.push(classCode as 'A' | 'B' | 'C' | 'D' | 'E' | 'F');
                          } else {
                            const index = classes.indexOf(classCode as 'A' | 'B' | 'C' | 'D' | 'E' | 'F');
                            if (index > -1) classes.splice(index, 1);
                          }
                          setFormData({ ...formData, permitted_passenger_classes: classes });
                        }}
                      />
                      Class {classCode}
                    </label>
                  ))}
                </div>
                <small style={{ color: 'var(--gray-600)', fontSize: '12px', display: 'block', marginTop: '0.5rem' }}>
                  A: Disabled | B: Elderly | C: Social Disadvantage | D: Members | E: Locality | F: Other
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Disc Number</label>
              <input
                type="text"
                value={formData.disc_number}
                onChange={(e) => setFormData({ ...formData, disc_number: e.target.value })}
                className="form-control"
                placeholder="e.g., DISC-2024-001"
              />
            </div>

            <div className="form-group">
              <label>Issued By</label>
              <select
                value={formData.issued_by_type}
                onChange={(e) => setFormData({ ...formData, issued_by_type: e.target.value as 'traffic_commissioner' | 'designated_body' })}
                className="form-control"
              >
                <option value="traffic_commissioner">Traffic Commissioner</option>
                <option value="designated_body">Designated Body</option>
              </select>
            </div>

            {formData.issued_by_type === 'designated_body' && (
              <>
                <div className="form-group">
                  <label>Issuing Body Name</label>
                  <input
                    type="text"
                    value={formData.issuing_body_name}
                    onChange={(e) => setFormData({ ...formData, issuing_body_name: e.target.value })}
                    className="form-control"
                    placeholder="Name of designated body"
                  />
                </div>

                <div className="form-group">
                  <label>Designated Body ID</label>
                  <input
                    type="text"
                    value={formData.designated_body_id}
                    onChange={(e) => setFormData({ ...formData, designated_body_id: e.target.value })}
                    className="form-control"
                    placeholder="Designated body registration ID"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Permit Conditions</label>
              <textarea
                value={formData.permit_conditions}
                onChange={(e) => setFormData({ ...formData, permit_conditions: e.target.value })}
                className="form-control"
                rows={2}
                placeholder="Any specific conditions or restrictions on the permit"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-control"
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Permit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrganizationalPermitModal;
