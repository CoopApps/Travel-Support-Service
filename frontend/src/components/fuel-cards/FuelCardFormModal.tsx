import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { FuelCard, CreateFuelCardDto } from '../../types/fuelCard.types';
import { getAvailableDrivers, getAvailableVehicles } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';

interface FuelCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CreateFuelCardDto) => Promise<void>;
  card?: FuelCard | null;
}

const FuelCardFormModal: React.FC<FuelCardFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card
}) => {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateFuelCardDto>({
    card_number_last_four: '',
    provider: 'Shell',
    pin: '',
    driver_id: undefined,
    vehicle_id: undefined,
    monthly_limit: undefined,
    daily_limit: undefined,
    status: 'active'
  });

  useEffect(() => {
    if (isOpen) {
      loadDriversAndVehicles();
      if (card) {
        setFormData({
          card_number_last_four: card.card_number_last_four,
          provider: card.provider,
          pin: card.pin || '',
          driver_id: card.driver_id,
          vehicle_id: card.vehicle_id,
          monthly_limit: card.monthly_limit,
          daily_limit: card.daily_limit,
          status: card.status
        });
      } else {
        // Reset form for new card
        setFormData({
          card_number_last_four: '',
          provider: 'Shell',
          pin: '',
          driver_id: undefined,
          vehicle_id: undefined,
          monthly_limit: undefined,
          daily_limit: undefined,
          status: 'active'
        });
      }
    }
  }, [isOpen, card]);

  const loadDriversAndVehicles = async () => {
    try {
      const [driversData, vehiclesData] = await Promise.all([
        getAvailableDrivers(tenantId!),
        getAvailableVehicles(tenantId!)
      ]);
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch {
      // Error handled silently
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={card ? 'Edit Fuel Card' : 'Add New Fuel Card'}
    >
      <form onSubmit={handleSubmit}>
        {/* Card Details Section */}
        <div className="fuel-card-form-section">
          <h4>Card Details</h4>

          <div className="form-group">
            <label className="form-label">Card Number (last 4 digits) *</label>
            <input
              type="text"
              className="form-control"
              value={formData.card_number_last_four}
              onChange={(e) => setFormData({ ...formData, card_number_last_four: e.target.value })}
              maxLength={4}
              pattern="[0-9]{4}"
              required
              placeholder="1234"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Provider *</label>
            <select
              className="form-control"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
            >
              <option value="Shell">Shell</option>
              <option value="BP">BP</option>
              <option value="Esso">Esso</option>
              <option value="Texaco">Texaco</option>
              <option value="Tesco">Tesco</option>
              <option value="Sainsburys">Sainsburys</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">PIN (for reference)</label>
            <input
              type="password"
              className="form-control"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              placeholder="Keep secure"
            />
            <small style={{ color: 'var(--gray-600)' }}>Optional - stored securely</small>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="fuel-card-form-section">
          <h4>Assignment</h4>

          <div className="form-group">
            <label className="form-label">Assigned Driver</label>
            <select
              className="form-control"
              value={formData.driver_id || ''}
              onChange={(e) => setFormData({ ...formData, driver_id: e.target.value ? parseInt(e.target.value) : undefined })}
            >
              <option value="">Unassigned / Shared</option>
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Vehicle</label>
            <select
              className="form-control"
              value={formData.vehicle_id || ''}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value ? parseInt(e.target.value) : undefined })}
            >
              <option value="">Any vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.make} {vehicle.model} - {vehicle.registration}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Limits & Controls Section */}
        <div className="fuel-card-form-section">
          <h4>Limits & Controls</h4>

          <div className="form-group">
            <label className="form-label">Monthly Limit (£)</label>
            <input
              type="number"
              className="form-control"
              value={formData.monthly_limit || ''}
              onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value ? parseFloat(e.target.value) : undefined })}
              step="50"
              min="0"
              placeholder="No limit"
            />
            <small style={{ color: 'var(--gray-600)' }}>Leave blank for no limit</small>
          </div>

          <div className="form-group">
            <label className="form-label">Daily Transaction Limit (£)</label>
            <input
              type="number"
              className="form-control"
              value={formData.daily_limit || ''}
              onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value ? parseFloat(e.target.value) : undefined })}
              step="10"
              min="0"
              placeholder="No limit"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-success"
            disabled={loading}
          >
            {loading ? 'Saving...' : card ? 'Update Card' : 'Add Card'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FuelCardFormModal;
