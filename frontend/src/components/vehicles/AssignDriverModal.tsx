import { useState } from 'react';
import { Vehicle, Driver } from '../../types';
import { vehicleApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface AssignDriverModalProps {
  vehicle: Vehicle;
  drivers: Driver[];
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Assign Driver Modal
 *
 * Modal for assigning/reassigning/unassigning drivers to vehicles
 */
function AssignDriverModal({ vehicle, drivers, onClose }: AssignDriverModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(vehicle.driver_id || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      await vehicleApi.assignDriver(tenantId, vehicle.vehicle_id, {
        driver_id: selectedDriverId
      });

      onClose(true);
    } catch (err: any) {
      console.error('Error assigning driver:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to assign driver'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>
            {vehicle.driver_id ? 'Reassign Driver' : 'Assign Driver'}
          </h2>
          <button onClick={() => onClose(false)} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Vehicle Info */}
            <div style={{
              background: 'var(--gray-50)',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '4px' }}>
                Vehicle
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                {vehicle.make} {vehicle.model} ({vehicle.registration})
              </div>
              {vehicle.assigned_driver_name && (
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '4px' }}>
                  Currently assigned to: <strong>{vehicle.assigned_driver_name}</strong>
                </div>
              )}
            </div>

            {/* Driver Selection */}
            <div className="form-group">
              <label>Select Driver</label>
              <select
                value={selectedDriverId || ''}
                onChange={(e) => setSelectedDriverId(e.target.value ? parseInt(e.target.value) : null)}
                style={{ width: '100%' }}
                autoFocus
              >
                <option value="">Unassigned</option>
                {drivers.map(driver => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    {driver.name}
                    {driver.vehicle_registration && String(driver.vehicle_id) !== String(vehicle.vehicle_id)
                      ? ` (Currently: ${driver.vehicle_registration})`
                      : ''
                    }
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                {selectedDriverId === null
                  ? 'Vehicle will be unassigned'
                  : 'Selected driver will be assigned to this vehicle'
                }
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Assigning...' : (selectedDriverId === null ? 'Unassign' : 'Assign Driver')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignDriverModal;
