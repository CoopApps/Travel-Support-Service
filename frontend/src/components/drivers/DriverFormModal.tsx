import { useState, FormEvent } from 'react';
import { driverApi } from '../../services/api';
import { Driver, CreateDriverDto, UpdateDriverDto } from '../../types';
import { useTenant } from '../../context/TenantContext';

/**
 * Driver Form Modal
 *
 * Modal form for creating and editing drivers
 */

interface DriverFormModalProps {
  driver: Driver | null;
  onClose: (refresh?: boolean) => void;
}

function DriverFormModal({ driver, onClose }: DriverFormModalProps) {
  const { tenantId } = useTenant();
  const isEdit = !!driver;

  // Form state
  const [formData, setFormData] = useState({
    name: driver?.name || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
    licenseNumber: driver?.license_number || '',
    licenseExpiry: driver?.license_expiry || '',
    licenseClass: driver?.license_class || '',
    vehicleType: driver?.vehicle_type || 'own',
    weeklyWage: driver?.weekly_wage || 0,
    employmentType: driver?.employment_type || 'contracted',
    emergencyContact: driver?.emergency_contact || '',
    emergencyPhone: driver?.emergency_phone || '',
    preferredHours: driver?.preferred_hours || '',
    notes: driver?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      // Prepare data
      const data: CreateDriverDto | UpdateDriverDto = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry || undefined,
        licenseClass: formData.licenseClass,
        vehicleType: formData.vehicleType,
        weeklyWage: parseFloat(formData.weeklyWage.toString()) || 0,
        employmentType: formData.employmentType as any,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        preferredHours: formData.preferredHours,
        notes: formData.notes,
      };

      if (isEdit && driver) {
        await driverApi.updateDriver(tenantId, driver.driver_id, data);
      } else {
        await driverApi.createDriver(tenantId, data);
      }

      onClose(true); // Close and refresh
    } catch (err: any) {
      console.error('Error saving driver:', err);
      setError(err.response?.data?.error?.message || 'Failed to save driver');
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
        onClick={() => onClose()}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>
              {isEdit ? 'Edit Driver' : 'Add New Driver'}
            </h2>
            <button
              onClick={() => onClose()}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div className="card-body">
        <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Basic Information
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Employment Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Employment Details
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employmentType">Employment Type *</label>
                  <select
                    id="employmentType"
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="contracted">Contracted</option>
                    <option value="freelance">Freelance</option>
                    <option value="employed">Employed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="weeklyWage">Weekly Wage (£)</label>
                  <input
                    id="weeklyWage"
                    name="weeklyWage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weeklyWage}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="vehicleType">Vehicle Type</label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="own">Own Vehicle</option>
                  <option value="company">Company Vehicle</option>
                  <option value="lease">Leased Vehicle</option>
                </select>
              </div>
            </div>

            {/* License Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                License Information
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="licenseNumber">License Number</label>
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="licenseClass">License Class</label>
                  <input
                    id="licenseClass"
                    name="licenseClass"
                    type="text"
                    placeholder="e.g., C1, D1"
                    value={formData.licenseClass}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="licenseExpiry">License Expiry Date</label>
                <input
                  id="licenseExpiry"
                  name="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Emergency Contact
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergencyContact">Contact Name</label>
                  <input
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyPhone">Contact Phone</label>
                  <input
                    id="emergencyPhone"
                    name="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Additional Information
              </h3>

              <div className="form-group">
                <label htmlFor="preferredHours">Preferred Working Hours</label>
                <input
                  id="preferredHours"
                  name="preferredHours"
                  type="text"
                  placeholder="e.g., Mon-Fri 9am-5pm"
                  value={formData.preferredHours}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Any additional notes about this driver..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose()}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    Saving...
                  </div>
                ) : (
                  isEdit ? 'Update Driver' : 'Create Driver'
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default DriverFormModal;
