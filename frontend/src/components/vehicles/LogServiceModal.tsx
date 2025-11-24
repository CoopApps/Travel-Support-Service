import { useState } from 'react';
import { Vehicle } from '../../types';
import { maintenanceApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface LogServiceModalProps {
  vehicles: Vehicle[];
  preselectedVehicleId?: number;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Log Service Modal
 *
 * Form for recording maintenance/service work
 */
function LogServiceModal({ vehicles, preselectedVehicleId, onClose }: LogServiceModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: preselectedVehicleId || (vehicles[0]?.vehicle_id || 0),
    service_date: new Date().toISOString().split('T')[0],
    service_type: '',
    description: '',
    mileage_at_service: 0,
    cost: 0,
    provider: '',
    next_service_due: '',
    notes: '',
    parts_replaced: '',
    is_warranty_work: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      // Prepare data
      const data = {
        vehicle_id: formData.vehicle_id,
        service_date: formData.service_date,
        service_type: formData.service_type,
        description: formData.description || undefined,
        mileage_at_service: formData.mileage_at_service,
        cost: formData.cost,
        provider: formData.provider || undefined,
        next_service_due: formData.next_service_due || undefined,
        notes: formData.notes || undefined,
        parts_replaced: formData.parts_replaced ? formData.parts_replaced.split(',').map(p => p.trim()) : [],
        is_warranty_work: formData.is_warranty_work
      };

      await maintenanceApi.createRecord(tenantId, data);
      onClose(true);
    } catch (err: any) {
      console.error('Error logging service:', err);
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to log service'));
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.vehicle_id === formData.vehicle_id);

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Log Service/Maintenance</h2>
          <button onClick={() => onClose(false)} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Vehicle Selection */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Vehicle *</label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                required
              >
                <option value="">Select vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                    {vehicle.registration} - {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                  Current mileage: {selectedVehicle.mileage?.toLocaleString()} mi
                </div>
              )}
            </div>

            {/* Service Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Service Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Service Date *</label>
                  <input
                    type="date"
                    name="service_date"
                    value={formData.service_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Service Type *</label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="MOT">MOT</option>
                    <option value="Service">Regular Service</option>
                    <option value="Repair">Repair</option>
                    <option value="Tire Change">Tire Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mileage at Service *</label>
                  <input
                    type="number"
                    name="mileage_at_service"
                    value={formData.mileage_at_service}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Cost (£) *</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Service Provider</label>
                  <input
                    type="text"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    placeholder="e.g., Quick Fit"
                  />
                </div>

                <div className="form-group">
                  <label>Next Service Due</label>
                  <input
                    type="date"
                    name="next_service_due"
                    value={formData.next_service_due}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Brief description of work performed"
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Parts Replaced (comma-separated)</label>
                <input
                  type="text"
                  name="parts_replaced"
                  value={formData.parts_replaced}
                  onChange={handleChange}
                  placeholder="e.g., Front brake pads, Oil filter"
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Additional Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any additional notes or observations"
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_warranty_work"
                    checked={formData.is_warranty_work}
                    onChange={handleChange}
                  />
                  <span>Warranty Work</span>
                </label>
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
              {loading ? 'Logging...' : 'Log Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LogServiceModal;
