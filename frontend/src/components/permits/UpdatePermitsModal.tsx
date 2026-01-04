import { useState, useEffect } from 'react';
import { Driver, DriverPermits, DriverPermit } from '../../types';
import { permitsApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface UpdatePermitsModalProps {
  driver: Driver;
  currentPermits?: DriverPermits;
  onClose: () => void;
  onSuccess: () => void;
}

function UpdatePermitsModal({ driver, currentPermits, onClose, onSuccess }: UpdatePermitsModalProps) {
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);

  const defaultPermit: DriverPermit = { hasPermit: false, expiryDate: '', issueDate: '', notes: '' };

  const [permits, setPermits] = useState<DriverPermits>({
    dbs: currentPermits?.dbs || { ...defaultPermit },
    section19: currentPermits?.section19 || { ...defaultPermit },
    section22: currentPermits?.section22 || { ...defaultPermit },
    mot: currentPermits?.mot || { ...defaultPermit }
  });

  const handlePermitChange = (type: keyof DriverPermits, field: keyof DriverPermit, value: any) => {
    setPermits(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setSaving(true);
      await permitsApi.updateDriverPermits(tenantId, driver.driver_id, permits);
      onSuccess();
    } catch {
      alert('Failed to update permits');
    } finally {
      setSaving(false);
    }
  };

  const renderPermitFields = (type: keyof DriverPermits, label: string) => {
    const permit = permits[type];

    return (
      <div className="permit-section">
        <h4>{label}</h4>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={permit.hasPermit}
              onChange={(e) => handlePermitChange(type, 'hasPermit', e.target.checked)}
            />
            {' '}Has {label}
          </label>
        </div>

        {permit.hasPermit && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={permit.issueDate || ''}
                  onChange={(e) => handlePermitChange(type, 'issueDate', e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={permit.expiryDate || ''}
                  onChange={(e) => handlePermitChange(type, 'expiryDate', e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={permit.notes || ''}
                onChange={(e) => handlePermitChange(type, 'notes', e.target.value)}
                className="form-control"
                rows={2}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Permits - {driver.name}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {renderPermitFields('dbs', 'DBS Check')}
            {renderPermitFields('section19', 'Section 19 Permit')}
            {renderPermitFields('section22', 'Section 22 Permit')}
            {renderPermitFields('mot', 'MOT Certificate')}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Permits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdatePermitsModal;
