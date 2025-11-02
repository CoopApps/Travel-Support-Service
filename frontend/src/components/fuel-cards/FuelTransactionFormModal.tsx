import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { CreateFuelTransactionDto, FuelCard } from '../../types/fuelCard.types';
import { getAvailableDrivers, getAvailableVehicles } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';

interface FuelTransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: CreateFuelTransactionDto) => Promise<void>;
  fuelCards: FuelCard[];
}

const FuelTransactionFormModal: React.FC<FuelTransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  fuelCards
}) => {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState<CreateFuelTransactionDto>({
    card_id: 0,
    driver_id: 0,
    vehicle_id: 0,
    transaction_date: today,
    transaction_time: now,
    station_name: '',
    litres: 0,
    price_per_litre: 1.50,
    total_cost: 0,
    mileage: undefined,
    previous_mileage: undefined,
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadDriversAndVehicles();
      // Reset form
      setFormData({
        card_id: 0,
        driver_id: 0,
        vehicle_id: 0,
        transaction_date: today,
        transaction_time: now,
        station_name: '',
        litres: 0,
        price_per_litre: 1.50,
        total_cost: 0,
        mileage: undefined,
        previous_mileage: undefined,
        notes: ''
      });
    }
  }, [isOpen]);

  const loadDriversAndVehicles = async () => {
    try {
      const [driversData, vehiclesData] = await Promise.all([
        getAvailableDrivers(tenantId!),
        getAvailableVehicles(tenantId!)
      ]);
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading drivers and vehicles:', error);
    }
  };

  const handleCardChange = (cardId: number) => {
    const selectedCard = fuelCards.find(c => c.fuel_card_id === cardId);
    if (selectedCard) {
      setFormData({
        ...formData,
        card_id: cardId,
        driver_id: selectedCard.driver_id || 0,
        vehicle_id: selectedCard.vehicle_id || 0
      });
    }
  };

  const handleVehicleChange = (vehicleId: number) => {
    const selectedVehicle = vehicles.find(v => v.vehicle_id === vehicleId);
    if (selectedVehicle && selectedVehicle.mileage) {
      setFormData({
        ...formData,
        vehicle_id: vehicleId,
        previous_mileage: selectedVehicle.mileage
      });
    } else {
      setFormData({ ...formData, vehicle_id: vehicleId });
    }
  };

  const calculateTotal = (litres: number, pricePerLitre: number) => {
    const total = litres * pricePerLitre;
    setFormData({
      ...formData,
      litres,
      price_per_litre: pricePerLitre,
      total_cost: parseFloat(total.toFixed(2))
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving fuel transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCards = fuelCards.filter(c => c.status === 'active');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fuel Transaction"
    >
      <form onSubmit={handleSubmit}>
        {/* Date and Time */}
        <div className="transaction-form-grid">
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-control"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Time</label>
            <input
              type="time"
              className="form-control"
              value={formData.transaction_time}
              onChange={(e) => setFormData({ ...formData, transaction_time: e.target.value })}
            />
          </div>
        </div>

        {/* Fuel Card */}
        <div className="form-group">
          <label className="form-label">Fuel Card *</label>
          <select
            className="form-control"
            value={formData.card_id}
            onChange={(e) => handleCardChange(parseInt(e.target.value))}
            required
          >
            <option value="0">Select card...</option>
            {activeCards.map((card) => (
              <option key={card.fuel_card_id} value={card.fuel_card_id}>
                ••••{card.card_number_last_four} - {card.provider} {card.driver_name ? `(${card.driver_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Driver and Vehicle */}
        <div className="transaction-form-grid">
          <div className="form-group">
            <label className="form-label">Driver *</label>
            <select
              className="form-control"
              value={formData.driver_id}
              onChange={(e) => setFormData({ ...formData, driver_id: parseInt(e.target.value) })}
              required
            >
              <option value="0">Select driver...</option>
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select
              className="form-control"
              value={formData.vehicle_id}
              onChange={(e) => handleVehicleChange(parseInt(e.target.value))}
              required
            >
              <option value="0">Select vehicle...</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.make} {vehicle.model} - {vehicle.registration}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fuel Station */}
        <div className="form-group">
          <label className="form-label">Fuel Station *</label>
          <input
            type="text"
            className="form-control"
            value={formData.station_name}
            onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
            required
            placeholder="e.g., Shell Meadowhall"
          />
        </div>

        {/* Fuel Details */}
        <div className="fuel-card-form-section">
          <h4>Fuel Details</h4>
          <div className="transaction-form-grid-3">
            <div className="form-group">
              <label className="form-label">Litres *</label>
              <input
                type="number"
                className="form-control"
                value={formData.litres || ''}
                onChange={(e) => calculateTotal(parseFloat(e.target.value) || 0, formData.price_per_litre)}
                required
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price per Litre (£) *</label>
              <input
                type="number"
                className="form-control"
                value={formData.price_per_litre}
                onChange={(e) => calculateTotal(formData.litres, parseFloat(e.target.value) || 0)}
                required
                step="0.001"
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Cost (£) *</label>
              <input
                type="number"
                className="form-control"
                value={formData.total_cost}
                readOnly
                style={{ background: '#e9ecef' }}
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Mileage Reading */}
        <div className="fuel-card-form-section">
          <h4>Mileage Reading</h4>
          <div className="transaction-form-grid">
            <div className="form-group">
              <label className="form-label">Current Mileage</label>
              <input
                type="number"
                className="form-control"
                value={formData.mileage || ''}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value ? parseInt(e.target.value) : undefined })}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Previous Mileage</label>
              <input
                type="number"
                className="form-control"
                value={formData.previous_mileage || ''}
                readOnly
                style={{ background: '#e9ecef' }}
              />
              <small style={{ color: 'var(--gray-600)' }}>Auto-filled from vehicle</small>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
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
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FuelTransactionFormModal;
