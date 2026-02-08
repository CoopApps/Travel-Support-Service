import { useState, useEffect } from 'react';
import { Client } from '../services/homecareApi';

interface ClientFormModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
}

function ClientFormModal({ client, onClose, onSave }: ClientFormModalProps) {
  const isEdit = !!client;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nhs_number: '',
    phone: '',
    email: '',
    address: '',
    postcode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_conditions: '',
    allergies: '',
    mobility_needs: '',
    communication_needs: '',
    dietary_requirements: '',
    status: 'active',
  });

  useEffect(() => {
    if (client) {
      setFormData(client);
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Personal Information */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#374151' }}>
              Personal Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth?.split('T')[0] || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  NHS Number
                </label>
                <input
                  type="text"
                  name="nhs_number"
                  value={formData.nhs_number || ''}
                  onChange={handleChange}
                  placeholder="000 000 0000"
                  className="form-control"
                />
              </div>
            </div>

            {/* Contact Information */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
              Contact Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Postcode
                </label>
                <input
                  type="text"
                  name="postcode"
                  value={formData.postcode || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
              Emergency Contact
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Name
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Phone
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone || ''}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Relationship
                </label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship || ''}
                  onChange={handleChange}
                  placeholder="e.g., Daughter"
                  className="form-control"
                />
              </div>
            </div>

            {/* Care Information */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>
              Care Needs
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Medical Conditions
                </label>
                <textarea
                  name="medical_conditions"
                  value={formData.medical_conditions || ''}
                  onChange={handleChange}
                  rows={2}
                  className="form-control"
                  placeholder="List any medical conditions..."
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Allergies
                </label>
                <textarea
                  name="allergies"
                  value={formData.allergies || ''}
                  onChange={handleChange}
                  rows={2}
                  className="form-control"
                  placeholder="List any allergies..."
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Mobility Needs
                </label>
                <input
                  type="text"
                  name="mobility_needs"
                  value={formData.mobility_needs || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g., Wheelchair user, walking frame"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Communication Needs
                </label>
                <input
                  type="text"
                  name="communication_needs"
                  value={formData.communication_needs || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g., Hearing impaired, speech difficulties"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                  Dietary Requirements
                </label>
                <input
                  type="text"
                  name="dietary_requirements"
                  value={formData.dietary_requirements || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g., Diabetic diet, vegetarian"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '13px', fontWeight: 500 }}>
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-control"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientFormModal;
