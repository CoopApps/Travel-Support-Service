import { useState } from 'react';
import { Driver, DriverRole } from '../../types';
import { permitsApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface DriverRolesModalProps {
  driver: Driver;
  currentRoles?: DriverRole;
  onClose: () => void;
  onSuccess: () => void;
}

function DriverRolesModal({ driver, currentRoles, onClose, onSuccess }: DriverRolesModalProps) {
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);

  const [roles, setRoles] = useState<DriverRole>(currentRoles || {
    vulnerablePassengers: true,
    section19Driver: false,
    section22Driver: false,
    vehicleOwner: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setSaving(true);
      await permitsApi.updateDriverRoles(tenantId, driver.driver_id, roles);
      onSuccess();
    } catch {
      alert('Failed to update driver roles');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Driver Roles - {driver.name}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)' }}>
              Select the roles that apply to this driver. Required permits will be determined based on these roles.
            </p>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={roles.vulnerablePassengers}
                  onChange={(e) => setRoles({ ...roles, vulnerablePassengers: e.target.checked })}
                />
                <div>
                  <strong>Vulnerable Passenger Driver</strong>
                  <small>Transports children, elderly, or disabled passengers (Requires DBS)</small>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={roles.section19Driver}
                  onChange={(e) => setRoles({ ...roles, section19Driver: e.target.checked })}
                />
                <div>
                  <strong>Section 19 Driver</strong>
                  <small>Individual authorization for Section 19 operations (Driver permit required)</small>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={roles.section22Driver}
                  onChange={(e) => setRoles({ ...roles, section22Driver: e.target.checked })}
                />
                <div>
                  <strong>Section 22 Driver</strong>
                  <small>Individual authorization for Section 22 operations (Driver permit required)</small>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={roles.vehicleOwner}
                  onChange={(e) => setRoles({ ...roles, vehicleOwner: e.target.checked })}
                />
                <div>
                  <strong>Vehicle Owner/Maintainer</strong>
                  <small>Owns or maintains vehicles used for transport (Requires MOT)</small>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Roles'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DriverRolesModal;
