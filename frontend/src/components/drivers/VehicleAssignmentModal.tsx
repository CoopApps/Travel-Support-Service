import { useState, FormEvent } from 'react';
import { Driver } from '../../types';
import { driverApi } from '../../services/api';
import PersonalVehicleModal from './PersonalVehicleModal';

interface VehicleAssignmentModalProps {
  driver: Driver;
  tenantId: number;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Vehicle Assignment Modal
 *
 * Manage driver vehicle assignments (company, lease, or personal vehicles)
 */
function VehicleAssignmentModal({ driver, tenantId, onClose }: VehicleAssignmentModalProps) {
  const [vehicleType, setVehicleType] = useState(driver.vehicle_type || 'own');
  const [vehicleId, setVehicleId] = useState(driver.vehicle_id || '');
  const [assignedVehicle, setAssignedVehicle] = useState(driver.assigned_vehicle || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPersonalVehicleModal, setShowPersonalVehicleModal] = useState(false);

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await driverApi.updateDriver(tenantId, driver.driver_id, {
        vehicleType,
        vehicleId: vehicleId || null,
        assignedVehicle: assignedVehicle || null,
      });
      setSuccess('Vehicle assignment updated successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update vehicle assignment');
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
          className="card"
          style={{
            width: '100%',
            maxWidth: '500px',
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              Vehicle Assignment - {driver.name}
            </h2>
            <button
              onClick={() => onClose(false)}
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
            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Current Assignment Info */}
              <div style={{
                background: '#f0f9ff',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                borderLeft: '4px solid #0ea5e9',
              }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#0369a1' }}>
                  Current Assignment
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gray-700)' }}>
                  Vehicle Type: <strong style={{ textTransform: 'capitalize' }}>{driver.vehicle_type || 'None'}</strong>
                  {driver.vehicle_id && (
                    <span> • ID: <strong>{driver.vehicle_id}</strong></span>
                  )}
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="form-group">
                <label htmlFor="vehicleType">Vehicle Type *</label>
                <select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="own">Own Vehicle (Personal)</option>
                  <option value="company">Company Vehicle</option>
                  <option value="lease">Leased Vehicle</option>
                </select>
                <small style={{ color: 'var(--gray-600)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Select whether the driver uses their own vehicle or a company/leased one
                </small>
              </div>

              {/* Vehicle ID (for company/lease vehicles) */}
              {(vehicleType === 'company' || vehicleType === 'lease') && (
                <div className="form-group">
                  <label htmlFor="vehicleId">
                    {vehicleType === 'company' ? 'Company Vehicle ID' : 'Lease Vehicle ID'}
                  </label>
                  <input
                    id="vehicleId"
                    type="text"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    placeholder="Enter vehicle ID or registration"
                    disabled={loading}
                  />
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Internal vehicle ID or registration number
                  </small>
                </div>
              )}

              {/* Personal Vehicle Registration (for own vehicles) */}
              {vehicleType === 'own' && (
                <div style={{
                  background: '#fef3c7',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #fbbf24',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#92400e' }}>
                    Personal Vehicle Registration Required
                  </div>
                  <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 0.75rem 0' }}>
                    Personal vehicles must be registered with full details (make, model, registration, MOT, insurance, etc.)
                    to appear in the Fleet Management module and enable maintenance tracking.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowPersonalVehicleModal(true)}
                    style={{ width: '100%' }}
                  >
                    + Register Personal Vehicle
                  </button>
                </div>
              )}

              {/* Info Box */}
              <div style={{
                background: '#fef9c3',
                padding: '10px',
                borderRadius: '4px',
                marginTop: '1rem',
                marginBottom: '1.5rem',
                borderLeft: '3px solid #eab308',
                fontSize: '12px',
                color: '#713f12',
              }}>
                <strong>Note:</strong> Vehicle assignments affect fuel allowances, insurance tracking, and maintenance schedules.
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onClose(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Personal Vehicle Modal */}
      {showPersonalVehicleModal && (
        <PersonalVehicleModal
          driver={driver}
          onClose={(shouldRefresh) => {
            setShowPersonalVehicleModal(false);
            if (shouldRefresh) {
              onClose(true); // Close parent modal and refresh
            }
          }}
        />
      )}
    </>
  );
}

export default VehicleAssignmentModal;
