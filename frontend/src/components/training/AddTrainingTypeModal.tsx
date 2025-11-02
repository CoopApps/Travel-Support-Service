import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { CreateTrainingTypeDTO, TrainingCategory } from '../../types/training.types';

interface AddTrainingTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTrainingTypeDTO) => Promise<void>;
}

const TRAINING_CATEGORIES: TrainingCategory[] = [
  'Health & Safety',
  'Accessibility',
  'Safeguarding',
  'Professional Development',
  'Specialist Care',
  'Vehicle Safety',
  'Compliance',
  'Other'
];

const AddTrainingTypeModal: React.FC<AddTrainingTypeModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTrainingTypeDTO>({
    name: '',
    description: '',
    category: 'Health & Safety',
    validityPeriod: 12,
    mandatory: false
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: '',
        description: '',
        category: 'Health & Safety',
        validityPeriod: 12,
        mandatory: false
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving training type:', error);
      alert('Failed to create training type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Training Type"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        {/* Basic Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Training Name *</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., First Aid Certification"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of this training"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-control"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as TrainingCategory })}
              required
            >
              {TRAINING_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Validity Period (months) *</label>
            <input
              type="number"
              className="form-control"
              value={formData.validityPeriod}
              onChange={(e) => setFormData({ ...formData, validityPeriod: parseInt(e.target.value) })}
              min="1"
              max="120"
              required
              placeholder="12"
            />
            <small style={{ color: 'var(--gray-600)' }}>
              How long before this training expires (1-120 months)
            </small>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.mandatory}
                onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 500 }}>Mandatory Training</span>
            </label>
            <small style={{ color: 'var(--gray-600)', display: 'block', marginTop: '4px', marginLeft: '26px' }}>
              Check if all drivers must complete this training
            </small>
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
            {loading ? 'Adding...' : 'Add Training Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTrainingTypeModal;
