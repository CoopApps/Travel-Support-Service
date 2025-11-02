import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { HolidayRequest, CreateHolidayRequestDto } from '../../types/holiday.types';
import { useTenant } from '../../context/TenantContext';

interface HolidayRequestFormModalProps {
  request?: HolidayRequest | null;
  onClose: () => void;
  onSave: (requestData: CreateHolidayRequestDto) => Promise<void>;
}

const HolidayRequestFormModal: React.FC<HolidayRequestFormModalProps> = ({
  request,
  onClose,
  onSave
}) => {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateHolidayRequestDto>({
    start_date: '',
    end_date: '',
    type: 'annual',
    notes: ''
  });

  const [calculatedDays, setCalculatedDays] = useState(0);

  useEffect(() => {
    if (request) {
      setFormData({
        driver_id: request.driver_id,
        customer_id: request.customer_id,
        start_date: request.start_date,
        end_date: request.end_date,
        type: request.type,
        notes: request.notes || ''
      });
    } else {
      setFormData({
        start_date: '',
        end_date: '',
        type: 'annual',
        notes: ''
      });
    }
  }, [request]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(diffDays);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving holiday request:', error);
      alert('Failed to save holiday request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateHolidayRequestDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isReadOnly = !!request;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={request ? 'View Holiday Request' : 'New Holiday Request'}
    >
      <form onSubmit={handleSubmit} className="holiday-request-form">
        <div className="form-section">
          <h4>Request Details</h4>

          {request && (
            <div className="form-group">
              <label>Requested For</label>
              <input
                type="text"
                value={request.driver_name || request.customer_name || 'Unknown'}
                className="form-control"
                disabled
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="form-control"
                required
                disabled={isReadOnly}
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="form-control"
                required
                min={formData.start_date}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="info-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>Duration: <strong>{calculatedDays}</strong> {calculatedDays === 1 ? 'day' : 'days'}</span>
            </div>
          )}

          <div className="form-group">
            <label>Type *</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as any)}
              className="form-control"
              required
              disabled={isReadOnly}
            >
              <option value="annual">Annual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="form-control"
              rows={3}
              placeholder="Add any additional notes..."
              disabled={isReadOnly}
            />
          </div>

          {request && (
            <>
              <div className="form-group">
                <label>Status</label>
                <div>
                  <span className={`badge badge-${request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="form-group">
                  <label>Rejection Reason</label>
                  <div className="alert alert-danger">
                    {request.rejection_reason}
                  </div>
                </div>
              )}

              {request.approved_date && (
                <div className="form-group">
                  <label>Approved Date</label>
                  <input
                    type="text"
                    value={new Date(request.approved_date).toLocaleDateString('en-GB')}
                    className="form-control"
                    disabled
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {request ? 'Close' : 'Cancel'}
          </button>
          {!request && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.start_date || !formData.end_date}
            >
              {loading ? 'Saving...' : 'Submit Request'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default HolidayRequestFormModal;
