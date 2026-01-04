import { useState } from 'react';
import { Driver } from '../../types';
import { vehicleApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface PersonalVehicleModalProps {
  driver: Driver;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Personal Vehicle Modal
 *
 * Form for adding/editing a driver's personal vehicle.
 * Creates a full vehicle record with ownership='personal' in tenant_vehicles table.
 */
function PersonalVehicleModal({ driver, onClose }: PersonalVehicleModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - all fields from legacy personal vehicle form
  const [formData, setFormData] = useState({
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: '',
    seats: 4,
    fuel_type: '',
    mileage: 0,
    mot_date: '',
    insurance_expiry: '',
    last_service_date: '',
    service_interval_months: 12,
    wheelchair_accessible: false
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

      // Create personal vehicle with ownership='personal' and driver_id link
      const vehicleData = {
        ...formData,
        ownership: 'personal' as const,  // Critical: marks as personal vehicle
        driver_id: driver.driver_id,      // Links to this driver
        mot_date: formData.mot_date || null,
        insurance_expiry: formData.insurance_expiry || null,
        last_service_date: formData.last_service_date || null,
        lease_monthly_cost: 0,            // Personal vehicles have no lease cost
        insurance_monthly_cost: 0,        // No company insurance cost
        is_basic_record: false
      };

      await vehicleApi.createVehicle(tenantId, vehicleData);
      onClose(true);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to create personal vehicle'));
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
              Add Personal Vehicle - {driver.name}
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

              {/* Info Box */}
              <div style={{
                background: '#f0f9ff',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                borderLeft: '4px solid #0ea5e9',
                fontSize: '0.875rem',
              }}>
                <strong>Personal Vehicle Registration</strong>
                <p style={{ margin: '0.5rem 0 0 0', color: '#0369a1' }}>
                  This vehicle will be registered to {driver.name} and will appear in the Fleet Management module.
                  All maintenance tracking and compliance features will be enabled.
                </p>
              </div>

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
                      min="1990"
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
                      placeholder="e.g., Toyota"
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
                      placeholder="e.g., Prius"
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
                      <option value="MPV">MPV</option>
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Minibus">Minibus</option>
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
                      max="16"
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
                    <label>Current Mileage</label>
                    <input
                      type="number"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
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

              {/* Compliance & Service */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                  Compliance & Service (Optional)
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
                    <label>Service Interval</label>
                    <select
                      name="service_interval_months"
                      value={formData.service_interval_months}
                      onChange={handleChange}
                    >
                      <option value="6">Every 6 months</option>
                      <option value="12">Every 12 months</option>
                      <option value="18">Every 18 months</option>
                      <option value="24">Every 24 months</option>
                    </select>
                  </div>
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
                {loading ? 'Registering Vehicle...' : 'Register Personal Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default PersonalVehicleModal;
