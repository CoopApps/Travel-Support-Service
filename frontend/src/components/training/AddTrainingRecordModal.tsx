import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { CreateTrainingRecordDTO } from '../../types/training.types';
import { TrainingType, Driver } from '../../types';
import { useToast } from '../../context/ToastContext';

interface AddTrainingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTrainingRecordDTO) => Promise<void>;
  drivers: Driver[];
  trainingTypes: TrainingType[];
}

const AddTrainingRecordModal: React.FC<AddTrainingRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  drivers,
  trainingTypes
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTrainingRecordDTO>({
    driverId: 0,
    trainingTypeId: 0,
    completedDate: new Date().toISOString().split('T')[0],
    provider: '',
    certificateNumber: ''
  });

  // Calculate expiry date when training type or completed date changes
  const selectedTrainingType = trainingTypes.find(t => t.id === formData.trainingTypeId);

  useEffect(() => {
    if (selectedTrainingType && formData.completedDate) {
      const completedDate = new Date(formData.completedDate);
      const expiryDate = new Date(completedDate);
      expiryDate.setMonth(expiryDate.getMonth() + selectedTrainingType.validityPeriod);

      setFormData(prev => ({
        ...prev,
        expiryDate: expiryDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.completedDate, formData.trainingTypeId, selectedTrainingType]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        driverId: drivers.length > 0 ? drivers[0].driver_id : 0,
        trainingTypeId: trainingTypes.length > 0 ? trainingTypes[0].id : 0,
        completedDate: new Date().toISOString().split('T')[0],
        provider: '',
        certificateNumber: ''
      });
    }
  }, [isOpen, drivers, trainingTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.driverId || !formData.trainingTypeId) {
      toast.error('Please select both a driver and training type');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving training record:', error);
      toast.error('Failed to create training record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Training Record"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        {/* Driver and Training Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Driver *</label>
            <select
              className="form-control"
              value={formData.driverId}
              onChange={(e) => setFormData({ ...formData, driverId: parseInt(e.target.value) })}
              required
            >
              <option value="0">Select a driver</option>
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <small style={{ color: '#dc2626' }}>No drivers available. Please add drivers first.</small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Training Type *</label>
            <select
              className="form-control"
              value={formData.trainingTypeId}
              onChange={(e) => setFormData({ ...formData, trainingTypeId: parseInt(e.target.value) })}
              required
            >
              <option value="0">Select training type</option>
              {trainingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.category})
                </option>
              ))}
            </select>
            {trainingTypes.length === 0 && (
              <small style={{ color: '#dc2626' }}>No training types available. Please add training types first.</small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Completed Date *</label>
            <input
              type="date"
              className="form-control"
              value={formData.completedDate}
              onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.expiryDate || ''}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              disabled={!!selectedTrainingType}
            />
            <small style={{ color: 'var(--gray-600)' }}>
              {selectedTrainingType
                ? `Automatically calculated (${selectedTrainingType.validityPeriod} months from completion)`
                : 'Select a training type to auto-calculate'
              }
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Provider / Instructor</label>
            <input
              type="text"
              className="form-control"
              value={formData.provider || ''}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., St John Ambulance, Internal Training Team"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Certificate Number</label>
            <input
              type="text"
              className="form-control"
              value={formData.certificateNumber || ''}
              onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
              placeholder="Optional certificate or reference number"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes or comments"
            />
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
            disabled={loading || drivers.length === 0 || trainingTypes.length === 0}
          >
            {loading ? 'Adding...' : 'Add Training Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTrainingRecordModal;
