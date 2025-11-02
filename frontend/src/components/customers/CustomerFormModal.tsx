import { useState, useEffect, FormEvent } from 'react';
import { customerApi } from '../../services/api';
import providersApi from '../../services/providersApi';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../../types';
import { Provider } from '../../types/provider.types';

/**
 * Customer Form Modal - Complete Version
 *
 * Modal for creating and editing customers with all fields.
 * Includes split payment configuration.
 */

interface CustomerFormModalProps {
  customer: Customer | null;
  onClose: (shouldRefresh: boolean) => void;
  tenantId: number;
}

function CustomerFormModal({ customer, onClose, tenantId }: CustomerFormModalProps) {
  const isEditing = !!customer;

  // Form state
  const [formData, setFormData] = useState<CreateCustomerDto>({
    name: '',
    address: '',
    address_line_2: '',
    city: '',
    county: '',
    postcode: '',
    phone: '',
    email: '',
    paying_org: 'Self-Pay',
    has_split_payment: false,
    provider_split: {},
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    medication_notes: '',
    driver_notes: '',
    mobility_requirements: '',
  });

  // Split payment providers state
  const [providers, setProviders] = useState<Array<{ name: string; percentage: number }>>([]);

  // Provider directory state
  const [providerDirectory, setProviderDirectory] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Load provider directory on mount
   */
  useEffect(() => {
    const loadProviders = async () => {
      setLoadingProviders(true);
      try {
        const directory = await providersApi.getProviderDirectory(tenantId);
        setProviderDirectory(directory);
      } catch (err) {
        console.error('Error loading provider directory:', err);
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [tenantId]);

  /**
   * Initialize form with customer data if editing
   */
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        address: customer.address || '',
        address_line_2: customer.address_line_2 || '',
        city: customer.city || '',
        county: customer.county || '',
        postcode: customer.postcode || '',
        phone: customer.phone || '',
        email: customer.email || '',
        paying_org: customer.paying_org || 'Self-Pay',
        has_split_payment: customer.has_split_payment || false,
        provider_split: customer.provider_split || {},
        emergency_contact_name: customer.emergency_contact_name || '',
        emergency_contact_phone: customer.emergency_contact_phone || '',
        medical_notes: customer.medical_notes || '',
        medication_notes: customer.medication_notes || '',
        driver_notes: customer.driver_notes || '',
        mobility_requirements: customer.mobility_requirements || '',
      });

      // Initialize providers array from provider_split
      if (customer.has_split_payment && customer.provider_split) {
        const providerArray = Object.entries(customer.provider_split).map(([name, percentage]) => ({
          name,
          percentage: percentage as number,
        }));
        setProviders(providerArray);
      }
    }
  }, [customer]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof CreateCustomerDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Handle split payment toggle
   */
  const handleSplitPaymentToggle = (enabled: boolean) => {
    setFormData((prev) => ({ ...prev, has_split_payment: enabled }));
    if (enabled && providers.length === 0) {
      // Initialize with two providers from directory if available
      const defaultProviders = providerDirectory.slice(0, 2).map(p => p.name);
      if (defaultProviders.length >= 2) {
        setProviders([
          { name: defaultProviders[0], percentage: 50 },
          { name: defaultProviders[1], percentage: 50 },
        ]);
      } else {
        // Fallback to empty providers if directory not loaded yet
        setProviders([
          { name: '', percentage: 50 },
          { name: '', percentage: 50 },
        ]);
      }
    }
  };

  /**
   * Add provider
   */
  const addProvider = () => {
    setProviders((prev) => [...prev, { name: '', percentage: 0 }]);
  };

  /**
   * Remove provider
   */
  const removeProvider = (index: number) => {
    setProviders((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Update provider
   */
  const updateProvider = (index: number, field: 'name' | 'percentage', value: string | number) => {
    setProviders((prev) =>
      prev.map((provider, i) =>
        i === index ? { ...provider, [field]: value } : provider
      )
    );
  };

  /**
   * Calculate total percentage
   */
  const getTotalPercentage = (): number => {
    return providers.reduce((sum, provider) => sum + (provider.percentage || 0), 0);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate split payment
    if (formData.has_split_payment) {
      const totalPercentage = getTotalPercentage();
      if (totalPercentage !== 100) {
        setError(`Provider percentages must total 100% (currently ${totalPercentage}%)`);
        return;
      }

      // Convert providers array to provider_split object
      const provider_split: Record<string, number> = {};
      providers.forEach((provider) => {
        if (provider.name.trim()) {
          provider_split[provider.name.trim()] = provider.percentage;
        }
      });
      formData.provider_split = provider_split;
    } else {
      formData.provider_split = {};
    }

    setLoading(true);

    try {
      if (isEditing) {
        const updateData: UpdateCustomerDto = formData;
        await customerApi.updateCustomer(tenantId, customer.id, updateData);
      } else {
        await customerApi.createCustomer(tenantId, formData);
      }

      onClose(true); // Close and refresh the list
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setError(err.response?.data?.error?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onClose(false); // Close without refreshing
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
        onClick={handleCancel}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '900px',
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
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <button
              onClick={handleCancel}
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
            {/* Error Message */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Basic Information
              </h3>

              <div className="mb-2">
                <label htmlFor="name">
                  Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-2">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="mb-2">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Address
              </h3>

              <div className="mb-2">
                <label htmlFor="address">Address Line 1</label>
                <input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="mb-2">
                <label htmlFor="address_line_2">Address Line 2</label>
                <input
                  id="address_line_2"
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => handleChange('address_line_2', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="mb-2">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="postcode">Postcode</label>
                  <input
                    id="postcode"
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => handleChange('postcode', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-2">
                <label htmlFor="county">County</label>
                <input
                  id="county"
                  type="text"
                  value={formData.county}
                  onChange={(e) => handleChange('county', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Payment */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Payment
              </h3>

              <div className="mb-2">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.has_split_payment || false}
                    onChange={(e) => handleSplitPaymentToggle(e.target.checked)}
                    disabled={loading}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    Split Payment Between Multiple Providers
                  </span>
                </label>
              </div>

              {!formData.has_split_payment ? (
                /* Single Payment Provider */
                <div className="mb-2">
                  <label htmlFor="paying_org">Payment Provider</label>
                  <select
                    id="paying_org"
                    value={formData.paying_org}
                    onChange={(e) => handleChange('paying_org', e.target.value)}
                    disabled={loading || loadingProviders}
                  >
                    <option value="Self-Pay">Self-Pay</option>
                    {providerDirectory.map((provider) => (
                      <option key={provider.provider_id} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  {loadingProviders && (
                    <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                      Loading providers...
                    </small>
                  )}
                </div>
              ) : (
                /* Split Payment Configuration */
                <div style={{
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  padding: '14px',
                  background: '#f8fafc',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                      Provider Split Configuration
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: 0 }}>
                      Add providers and their percentage split. Total must equal 100%.
                    </p>
                  </div>

                  {providers.map((provider, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '12px' }}>Provider Name</label>
                        <select
                          value={provider.name}
                          onChange={(e) => updateProvider(index, 'name', e.target.value)}
                          disabled={loading || loadingProviders}
                          style={{ fontSize: '13px', padding: '8px' }}
                        >
                          <option value="">Select Provider...</option>
                          {providerDirectory.map((p) => (
                            <option key={p.provider_id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px' }}>Percentage (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={provider.percentage}
                          onChange={(e) => updateProvider(index, 'percentage', parseFloat(e.target.value) || 0)}
                          disabled={loading}
                          style={{ fontSize: '13px', padding: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProvider(index)}
                        disabled={loading || providers.length <= 1}
                        className="btn btn-secondary btn-sm"
                        style={{ marginBottom: '2px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--gray-200)' }}>
                    <button
                      type="button"
                      onClick={addProvider}
                      disabled={loading}
                      className="btn btn-secondary btn-sm"
                    >
                      + Add Provider
                    </button>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      Total: <span style={{
                        color: getTotalPercentage() === 100 ? '#28a745' : '#dc3545'
                      }}>
                        {getTotalPercentage()}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Emergency Contact
              </h3>

              <div className="mb-2">
                <label htmlFor="emergency_contact_name">Name</label>
                <input
                  id="emergency_contact_name"
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="mb-2">
                <label htmlFor="emergency_contact_phone">Phone</label>
                <input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Additional Information
              </h3>

              <div className="mb-2">
                <label htmlFor="medical_notes">Medical Notes</label>
                <textarea
                  id="medical_notes"
                  value={formData.medical_notes}
                  onChange={(e) => handleChange('medical_notes', e.target.value)}
                  disabled={loading}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Any medical conditions or health information..."
                />
              </div>

              <div className="mb-2">
                <label htmlFor="medication_notes">Medication Notes</label>
                <textarea
                  id="medication_notes"
                  value={formData.medication_notes}
                  onChange={(e) => handleChange('medication_notes', e.target.value)}
                  disabled={loading}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Current medications, dosages, and schedules..."
                />
              </div>

              <div className="mb-2">
                <label htmlFor="driver_notes">Driver Notes</label>
                <textarea
                  id="driver_notes"
                  value={formData.driver_notes}
                  onChange={(e) => handleChange('driver_notes', e.target.value)}
                  disabled={loading}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Special instructions for drivers (pickup locations, access codes, etc.)..."
                />
              </div>

              <div className="mb-2">
                <label htmlFor="mobility_requirements">Mobility Requirements</label>
                <textarea
                  id="mobility_requirements"
                  value={formData.mobility_requirements}
                  onChange={(e) => handleChange('mobility_requirements', e.target.value)}
                  disabled={loading}
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Wheelchair requirements, walking aids, assistance needed..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid var(--gray-200)',
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
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
                  isEditing ? 'Update Customer' : 'Create Customer'
                )}
              </button>
            </div>
          </form>
          </div> {/* Close card-body */}
        </div> {/* Close card */}
      </div> {/* Close overlay */}
    </>
  );
}

export default CustomerFormModal;
