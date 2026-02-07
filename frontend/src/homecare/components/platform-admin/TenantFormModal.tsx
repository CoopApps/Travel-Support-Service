import { useState, useEffect, FormEvent } from 'react';
import { tenantApi } from '../../services/platform-admin-api';
import type { Tenant, CreateTenantDto, UpdateTenantDto } from '../../types';

interface TenantFormModalProps {
  tenant: Tenant | null;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * Tenant Form Modal - Home Care Co-operative Edition
 * Create or edit co-operative with organization type-based pricing
 */

function TenantFormModal({ tenant, onClose }: TenantFormModalProps) {
  const isEditing = !!tenant;

  const [formData, setFormData] = useState<CreateTenantDto>({
    company_name: '',
    subdomain: '',
    domain: '',
    organization_type: 'cooperative',
    cooperative_model: 'worker_coop',
    base_price: 100.00,
    currency: 'GBP',
    billing_cycle: 'monthly',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    cqc_provider_id: '',
    admin_username: '',
    admin_email: '',
    admin_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setFormData({
        company_name: tenant.company_name,
        subdomain: tenant.subdomain,
        domain: tenant.domain || '',
        organization_type: tenant.organization_type,
        cooperative_model: tenant.cooperative_model,
        base_price: tenant.base_price,
        currency: tenant.currency,
        billing_cycle: tenant.billing_cycle,
        contact_name: tenant.contact_name || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        address: tenant.address || '',
        cqc_provider_id: tenant.cqc_provider_id || '',
        admin_username: '',
        admin_email: '',
        admin_password: '',
      });
    }
  }, [tenant]);

  const generateSubdomain = (companyName: string): string => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  const handleCompanyNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      company_name: value,
      subdomain: !isEditing ? generateSubdomain(value) : prev.subdomain,
    }));
  };

  const handleChange = (field: keyof CreateTenantDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDiscount = (): number => {
    switch (formData.organization_type) {
      case 'cooperative':
        return 30;
      case 'cooperative_commonwealth':
        return 50;
      default:
        return 0;
    }
  };

  const getActualPrice = (): number => {
    const discount = getDiscount();
    return formData.base_price * (1 - discount / 100);
  };

  const handleOrgTypeChange = (orgType: string) => {
    setFormData(prev => ({
      ...prev,
      organization_type: orgType as any,
      cooperative_model: (orgType === 'cooperative' || orgType === 'cooperative_commonwealth')
        ? prev.cooperative_model || 'worker_coop'
        : undefined,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.company_name || !formData.subdomain) {
      setError('Organisation name and subdomain are required');
      return;
    }

    if ((formData.organization_type === 'cooperative' || formData.organization_type === 'cooperative_commonwealth')
        && !formData.cooperative_model) {
      setError('Co-operative model is required for co-operatives');
      return;
    }

    if (!isEditing && (!formData.admin_username || !formData.admin_email || !formData.admin_password)) {
      setError('Admin user credentials are required for new organisations');
      return;
    }

    if (formData.subdomain && !/^[a-z0-9-]+$/.test(formData.subdomain)) {
      setError('Subdomain must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    if (formData.admin_password && formData.admin_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const updateData: UpdateTenantDto = {
          company_name: formData.company_name,
          organization_type: formData.organization_type,
          cooperative_model: formData.cooperative_model,
          base_price: formData.base_price,
          currency: formData.currency,
          billing_cycle: formData.billing_cycle,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          cqc_provider_id: formData.cqc_provider_id,
        };
        await tenantApi.updateTenant(tenant.tenant_id, updateData);
      } else {
        await tenantApi.createTenant(formData);
      }

      onClose(true);
    } catch (err: any) {
      console.error('Error saving organisation:', err);
      setError(err.response?.data?.error?.message || 'Failed to save organisation');
    } finally {
      setLoading(false);
    }
  };

  const isCooperative = formData.organization_type === 'cooperative' || formData.organization_type === 'cooperative_commonwealth';
  const discount = getDiscount();
  const actualPrice = getActualPrice();

  return (
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
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>
            {isEditing ? 'Edit Organisation' : 'Add Co-operative'}
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
            x
          </button>
        </div>

        <div className="card-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Organisation Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Organisation Information
              </h3>

              <div className="mb-2">
                <label htmlFor="company_name">
                  Organisation Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="e.g., Bright Care Co-operative"
                />
              </div>

              <div className="mb-2">
                <label htmlFor="subdomain">
                  Subdomain <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id="subdomain"
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase())}
                    required
                    disabled={loading || isEditing}
                    placeholder="bright-care"
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--gray-600)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    .homecare.coop
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <label htmlFor="cqc_provider_id">CQC Provider ID</label>
                <input
                  id="cqc_provider_id"
                  type="text"
                  value={formData.cqc_provider_id}
                  onChange={(e) => handleChange('cqc_provider_id', e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 1-123456789"
                />
                <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                  Care Quality Commission registration number
                </small>
              </div>
            </div>

            {/* Organisation Type & Pricing */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Organisation Type & Pricing
              </h3>

              <div className="mb-2">
                <label htmlFor="organization_type">
                  Organisation Type <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  id="organization_type"
                  value={formData.organization_type}
                  onChange={(e) => handleOrgTypeChange(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="charity">Charity (0% discount)</option>
                  <option value="cic">Community Interest Company (0% discount)</option>
                  <option value="third_sector">Third Sector (0% discount)</option>
                  <option value="cooperative">Co-operative (30% discount)</option>
                  <option value="cooperative_commonwealth">Commonwealth Co-operative (50% discount)</option>
                </select>
              </div>

              {isCooperative && (
                <div className="mb-2">
                  <label htmlFor="cooperative_model">
                    Co-operative Model <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    id="cooperative_model"
                    value={formData.cooperative_model || ''}
                    onChange={(e) => handleChange('cooperative_model', e.target.value || undefined)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select model...</option>
                    <option value="worker_coop">Worker Co-op (Carer-owned)</option>
                    <option value="consumer_coop">Consumer Co-op (Client-owned)</option>
                    <option value="multi_stakeholder">Multi-Stakeholder (Both carers & clients)</option>
                    <option value="platform_coop">Platform Co-op (Tech-enabled)</option>
                  </select>
                  <small style={{ color: 'var(--gray-600)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    {formData.cooperative_model === 'worker_coop' && 'Care workers own and govern the co-operative democratically'}
                    {formData.cooperative_model === 'consumer_coop' && 'Clients and families own the co-operative'}
                    {formData.cooperative_model === 'multi_stakeholder' && 'Both carers and clients share ownership'}
                    {formData.cooperative_model === 'platform_coop' && 'Technology platform owned by its users'}
                  </small>
                </div>
              )}

              {/* Pricing Display */}
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label htmlFor="base_price">Base Price (monthly)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        disabled={loading}
                        style={{ width: '80px' }}
                      >
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        id="base_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.base_price}
                        onChange={(e) => handleChange('base_price', parseFloat(e.target.value))}
                        disabled={loading}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label>Discount</label>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: discount > 0 ? '#10b981' : '#6b7280',
                      marginTop: '8px',
                    }}>
                      {discount}%
                    </div>
                  </div>

                  <div>
                    <label>Actual Price</label>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#1f2937',
                      marginTop: '8px',
                    }}>
                      £{actualPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                {discount > 0 && (
                  <div className="info" style={{ fontSize: '12px', padding: '10px', marginTop: '12px' }}>
                    <strong>You save £{(formData.base_price - actualPrice).toFixed(2)} per month</strong> as a {formData.organization_type === 'cooperative_commonwealth' ? 'commonwealth ' : ''}co-operative!
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                Contact Information
              </h3>

              <div className="mb-2">
                <label htmlFor="contact_name">Contact Name</label>
                <input
                  id="contact_name"
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="mb-2">
                  <label htmlFor="contact_email">Contact Email</label>
                  <input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="contact_phone">Contact Phone</label>
                  <input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-2">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={loading}
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Admin User (Only for new organisations) */}
            {!isEditing && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
                  Admin User Credentials
                </h3>

                <div className="mb-2">
                  <label htmlFor="admin_username">
                    Admin Username <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="admin_username"
                    type="text"
                    value={formData.admin_username}
                    onChange={(e) => handleChange('admin_username', e.target.value)}
                    required
                    disabled={loading}
                    placeholder="admin"
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="admin_email">
                    Admin Email <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => handleChange('admin_email', e.target.value)}
                    required
                    disabled={loading}
                    placeholder="admin@brightcare.coop"
                  />
                </div>

                <div className="mb-2">
                  <label htmlFor="admin_password">
                    Admin Password <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="admin_password"
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => handleChange('admin_password', e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>
            )}

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
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                    Saving...
                  </div>
                ) : (
                  isEditing ? 'Update Organisation' : 'Create Organisation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TenantFormModal;
