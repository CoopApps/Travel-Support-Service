import { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../../types';
import { vehicleApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface VehicleFormModalProps {
  vehicle: Vehicle | null;
  drivers: Driver[];
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Vehicle Form Modal
 *
 * Form for creating or editing vehicles
 */
function VehicleFormModal({ vehicle, drivers, onClose }: VehicleFormModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    registration: vehicle?.registration || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    vehicle_type: vehicle?.vehicle_type || '',
    seats: vehicle?.seats || 4,
    fuel_type: vehicle?.fuel_type || '',
    mileage: vehicle?.mileage || 0,
    ownership: vehicle?.ownership || 'owned' as 'owned' | 'leased' | 'personal',
    driver_id: vehicle?.driver_id || null as number | null,
    mot_date: vehicle?.mot_date?.split('T')[0] || '',
    insurance_expiry: vehicle?.insurance_expiry?.split('T')[0] || '',
    last_service_date: vehicle?.last_service_date?.split('T')[0] || '',
    service_interval_months: vehicle?.service_interval_months || 12,
    lease_monthly_cost: vehicle?.lease_monthly_cost || 0,
    insurance_monthly_cost: vehicle?.insurance_monthly_cost || 0,
    wheelchair_accessible: vehicle?.wheelchair_accessible || false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        ...formData,
        driver_id: formData.driver_id || null,
        mot_date: formData.mot_date || null,
        insurance_expiry: formData.insurance_expiry || null,
        last_service_date: formData.last_service_date || null
      };

      if (vehicle) {
        // Update existing vehicle
        await vehicleApi.updateVehicle(tenantId, vehicle.vehicle_id, data);
      } else {
        // Create new vehicle
        await vehicleApi.createVehicle(tenantId, data);
      }

      onClose(true);
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={() => onClose(false)}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
              {vehicle ? 'Edit Vehicle' : 'Add Company Vehicle'}
            </h2>
            <button
              onClick={() => onClose(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem' }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Basic Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Registration *</label>
                  <input
                    type="text"
                    name="registration"
                    value={formData.registration}
                    onChange={handleChange}
                    required
                    placeholder="e.g., AB12 CDE"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label>Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    min="1980"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div className="form-group">
                  <label>Make *</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Ford"
                  />
                </div>

                <div className="form-group">
                  <label>Model *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Transit"
                  />
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Specifications
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Vehicle Type *</label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="Minibus">Minibus</option>
                    <option value="MPV">MPV</option>
                    <option value="Wheelchair Accessible Vehicle">Wheelchair Accessible Vehicle</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Seats *</label>
                  <input
                    type="number"
                    name="seats"
                    value={formData.seats}
                    onChange={handleChange}
                    required
                    min="1"
                    max="20"
                  />
                </div>

                <div className="form-group">
                  <label>Fuel Type *</label>
                  <select
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select fuel type</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="LPG">LPG</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mileage *</label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="wheelchair_accessible"
                    checked={formData.wheelchair_accessible}
                    onChange={handleChange}
                  />
                  <span>Wheelchair Accessible</span>
                </label>
              </div>
            </div>

            {/* Ownership */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Ownership
              </h3>

              <div className="form-group">
                <label>Ownership Type *</label>
                <select
                  name="ownership"
                  value={formData.ownership}
                  onChange={handleChange}
                  required
                >
                  <option value="owned">Company Owned</option>
                  <option value="leased">Company Leased</option>
                  <option value="personal">Driver Owned (Personal)</option>
                </select>
              </div>

              {formData.ownership === 'leased' && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Monthly Lease Cost (£)</label>
                  <input
                    type="number"
                    name="lease_monthly_cost"
                    value={formData.lease_monthly_cost}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {(formData.ownership === 'owned' || formData.ownership === 'leased') && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Monthly Insurance Cost (£)</label>
                  <input
                    type="number"
                    name="insurance_monthly_cost"
                    value={formData.insurance_monthly_cost}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            {/* Compliance */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Compliance & Service
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>MOT Expiry Date</label>
                  <input
                    type="date"
                    name="mot_date"
                    value={formData.mot_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Insurance Expiry Date</label>
                  <input
                    type="date"
                    name="insurance_expiry"
                    value={formData.insurance_expiry}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Last Service Date</label>
                  <input
                    type="date"
                    name="last_service_date"
                    value={formData.last_service_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Service Interval (months)</label>
                  <input
                    type="number"
                    name="service_interval_months"
                    value={formData.service_interval_months}
                    onChange={handleChange}
                    min="1"
                    max="24"
                  />
                </div>
              </div>
            </div>

            {/* Driver Assignment */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                Driver Assignment (Optional)
              </h3>

              <div className="form-group">
                <label>Assign to Driver</label>
                <select
                  name="driver_id"
                  value={formData.driver_id || ''}
                  onChange={handleChange}
                >
                  <option value="">Unassigned</option>
                  {drivers.map(driver => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
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
              {loading ? (vehicle ? 'Updating...' : 'Creating...') : (vehicle ? 'Update Vehicle' : 'Create Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default VehicleFormModal;
