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
    notes: permit?.notes || ''
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
