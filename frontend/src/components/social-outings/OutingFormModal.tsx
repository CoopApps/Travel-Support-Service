import { useState, useEffect } from 'react';
import { SocialOuting, OutingFormData } from '../../types';
import socialOutingsApi from '../../services/socialOutingsApi';
import { useTenant } from '../../context/TenantContext';
import { useServiceContext } from '../../contexts/ServiceContext';

interface OutingFormModalProps {
  outing: SocialOuting | null;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Outing Form Modal
 *
 * Form for creating or editing social outings
 */
function OutingFormModal({ outing, onClose }: OutingFormModalProps) {
  const { tenantId } = useTenant();
  const { busEnabled } = useServiceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<OutingFormData>({
    name: outing?.name || '',
    destination: outing?.destination || '',
    outing_date: outing?.outing_date?.split('T')[0] || '',
    departure_time: outing?.departure_time || '10:00',
    return_time: outing?.return_time || '',
    max_passengers: outing?.max_passengers || 16,
    cost_per_person: outing?.cost_per_person || 0,
    wheelchair_accessible: outing?.wheelchair_accessible || false,
    description: outing?.description || '',
    meeting_point: outing?.meeting_point || '',
    contact_person: outing?.contact_person || '',
    contact_phone: outing?.contact_phone || '',
    weather_dependent: outing?.weather_dependent || false,
    minimum_passengers: outing?.minimum_passengers || 1,
    service_type: outing?.service_type || 'transport',
    requires_section_22: outing?.requires_section_22 || false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

      // Validate required fields
      if (!formData.name || !formData.destination || !formData.outing_date || !formData.departure_time) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.max_passengers < formData.minimum_passengers) {
        throw new Error('Maximum passengers must be greater than or equal to minimum passengers');
      }

      // Prepare data
      const data: OutingFormData = {
        ...formData,
        return_time: formData.return_time || undefined,
        description: formData.description || undefined,
        meeting_point: formData.meeting_point || undefined,
        contact_person: formData.contact_person || undefined,
        contact_phone: formData.contact_phone || undefined
      };

      if (outing) {
        // Update existing outing
        await socialOutingsApi.updateOuting(tenantId, outing.id, data);
      } else {
        // Create new outing
        await socialOutingsApi.createOuting(tenantId, data);
      }

      onClose(true);
    } catch (err: any) {
      console.error('Error saving outing:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save outing');
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
              {outing ? 'Edit Social Outing' : 'Create Social Outing'}
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
              ×
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Basic Information
                </h3>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="name">Outing Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Trip to the Beach"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="destination">Destination *</label>
                    <input
                      type="text"
                      id="destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Brighton Beach"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the outing..."
                  />
                </div>
              </div>

              {/* Service Type - Only show if bus service is enabled */}
              {busEnabled && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                    Service Type
                  </h3>

                  <div className="form-group">
                    <label>Which service is this outing for?</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, service_type: 'transport', requires_section_22: false }))}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: formData.service_type === 'transport' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                          background: formData.service_type === 'transport' ? '#eff6ff' : 'white',
                          color: formData.service_type === 'transport' ? '#1d4ed8' : '#374151',
                          fontWeight: formData.service_type === 'transport' ? 600 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        Transport Service
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, service_type: 'bus' }))}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: formData.service_type === 'bus' ? '2px solid #10b981' : '1px solid #d1d5db',
                          background: formData.service_type === 'bus' ? '#ecfdf5' : 'white',
                          color: formData.service_type === 'bus' ? '#047857' : '#374151',
                          fontWeight: formData.service_type === 'bus' ? 600 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        Bus Service
                      </button>
                    </div>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      {formData.service_type === 'transport'
                        ? 'Uses regular transport vehicles and drivers'
                        : 'Uses Section 22 licensed vehicles and qualified drivers'}
                    </p>
                  </div>

                  {formData.service_type === 'bus' && (
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          name="requires_section_22"
                          checked={formData.requires_section_22}
                          onChange={handleChange}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                          Requires Section 22 licensed vehicle
                        </span>
                      </label>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', marginLeft: '1.5rem' }}>
                        Check this if the outing requires a vehicle with Section 22 community bus licensing
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Date & Time
                </h3>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="outing_date">Date *</label>
                    <input
                      type="date"
                      id="outing_date"
                      name="outing_date"
                      value={formData.outing_date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="departure_time">Departure Time *</label>
                    <input
                      type="time"
                      id="departure_time"
                      name="departure_time"
                      value={formData.departure_time}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="return_time">Return Time</label>
                    <input
                      type="time"
                      id="return_time"
                      name="return_time"
                      value={formData.return_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Capacity & Cost */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Capacity & Cost
                </h3>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="max_passengers">Max Passengers *</label>
                    <input
                      type="number"
                      id="max_passengers"
                      name="max_passengers"
                      value={formData.max_passengers}
                      onChange={handleChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="minimum_passengers">Min Passengers</label>
                    <input
                      type="number"
                      id="minimum_passengers"
                      name="minimum_passengers"
                      value={formData.minimum_passengers}
                      onChange={handleChange}
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cost_per_person">Cost Per Person (£)</label>
                    <input
                      type="number"
                      id="cost_per_person"
                      name="cost_per_person"
                      value={formData.cost_per_person}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Meeting Point & Contact */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Meeting Point & Contact
                </h3>

                <div className="form-group">
                  <label htmlFor="meeting_point">Meeting Point</label>
                  <input
                    type="text"
                    id="meeting_point"
                    name="meeting_point"
                    value={formData.meeting_point}
                    onChange={handleChange}
                    placeholder="Where passengers should meet"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="contact_person">Contact Person</label>
                    <input
                      type="text"
                      id="contact_person"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      placeholder="Name of organizer"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact_phone">Contact Phone</label>
                    <input
                      type="tel"
                      id="contact_phone"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="Contact number"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Options
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="wheelchair_accessible"
                      checked={formData.wheelchair_accessible}
                      onChange={handleChange}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                      Wheelchair Accessible
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="weather_dependent"
                      checked={formData.weather_dependent}
                      onChange={handleChange}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                      Weather Dependent (may be cancelled in bad weather)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#f9fafb',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : outing ? 'Update Outing' : 'Create Outing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default OutingFormModal;
