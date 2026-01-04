import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import providersApi from '../../services/providersApi';
import type { Provider, ProviderData } from '../../types';
import Modal from '../common/Modal';

interface ProviderDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  directory: Provider[];
  onRefresh: () => void;
  editProviderId?: number | null;
}

/**
 * Provider Directory Modal
 * Add or edit a provider
 */
function ProviderDirectoryModal({
  isOpen,
  onClose,
  directory,
  onRefresh,
  editProviderId = null
}: ProviderDirectoryModalProps) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Local Authority' as Provider['type'],
    invoice_email: '',
    auto_send: false,
    main_contact: '',
    phone_number: '',
    notes: ''
  });

  // Load provider data when editing
  useEffect(() => {
    if (isOpen && editProviderId) {
      const provider = directory.find(p => p.provider_id === editProviderId);
      if (provider) {
        setFormData({
          name: provider.name,
          type: provider.type,
          invoice_email: provider.invoice_email || '',
          auto_send: provider.auto_send || false,
          main_contact: provider.main_contact || '',
          phone_number: provider.phone_number || '',
          notes: provider.notes || ''
        });
      }
    } else if (isOpen) {
      // Reset form when opening for add
      setFormData({
        name: '',
        type: 'Local Authority',
        invoice_email: '',
        auto_send: false,
        main_contact: '',
        phone_number: '',
        notes: ''
      });
    }
  }, [isOpen, editProviderId, directory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setLoading(true);
      if (editProviderId) {
        await providersApi.updateProvider(tenantId, editProviderId, formData);
      } else {
        await providersApi.createProvider(tenantId, formData);
      }

      onRefresh();
      onClose();
    } catch {
      alert('Failed to save provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editProviderId ? "Edit Provider" : "Add Provider"}>
      <div style={{ maxWidth: '700px' }}>
        {/* Add/Edit Form */}
        <div className="provider-directory-form">

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Provider Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Norfolk County Council"
                />
              </div>

              <div>
                <label className="form-label">Provider Type *</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Provider['type'] })}
                  required
                >
                  <option value="Individual">Individual</option>
                  <option value="Local Authority">Local Authority</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Care Organization">Care Organization</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Invoice Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.invoice_email}
                  onChange={(e) => setFormData({ ...formData, invoice_email: e.target.value })}
                  placeholder="invoices@provider.com"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.auto_send}
                    onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 600 }}>Auto-send invoices when generated</span>
                </label>
                <small style={{ color: 'var(--gray-600)', display: 'block', marginTop: '4px' }}>
                  Automatically email invoices to this provider on billing day
                </small>
              </div>

              <div>
                <label className="form-label">Main Contact</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.main_contact}
                  onChange={(e) => setFormData({ ...formData, main_contact: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="01234 567890"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional information about this provider..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : editProviderId ? 'Update Provider' : 'Add Provider'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default ProviderDirectoryModal;
