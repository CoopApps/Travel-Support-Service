import { useState, useEffect } from 'react';
import { tenantApi } from '../../services/platform-admin-api';
import { usePlatformAdminStore } from '../../store/platformAdminStore';
import type { Tenant, TenantListQuery } from '../../types';
import TenantStats from './TenantStats';
import TenantFormModal from './TenantFormModal';
import TenantUserManagementModal from './TenantUserManagementModal';

/**
 * Tenant List Page
 *
 * Main platform admin dashboard for managing tenants
 */

function TenantListPage() {
  const admin = usePlatformAdminStore((state) => state.admin);
  const logout = usePlatformAdminStore((state) => state.logout);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'travel-support'>('overview');

  // Tenant state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter/search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [orgTypeFilter, setOrgTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  /**
   * Fetch tenants
   */
  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError('');

      const query: TenantListQuery = {
        page,
        limit,
        search,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      if (orgTypeFilter) {
        query.organization_type = orgTypeFilter;
      }

      if (statusFilter !== '') {
        query.is_active = statusFilter;
      }

      const response = await tenantApi.getTenants(query);

      setTenants(response.tenants);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      setError(err.response?.data?.error?.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load tenants on mount and when filters change (only for travel-support tab)
   */
  useEffect(() => {
    if (activeTab === 'travel-support') {
      fetchTenants();
    }
  }, [activeTab, page, search, orgTypeFilter, statusFilter]);

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  /**
   * Handle delete tenant
   */
  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to deactivate ${tenant.company_name}?`)) {
      return;
    }

    try {
      await tenantApi.deleteTenant(tenant.tenant_id);
      fetchTenants();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete tenant');
    }
  };

  /**
   * Handle edit tenant
   */
  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setShowModal(true);
  };

  /**
   * Handle create new tenant
   */
  const handleCreate = () => {
    setEditingTenant(null);
    setShowModal(true);
  };

  /**
   * Handle modal close
   */
  const handleModalClose = (shouldRefresh: boolean) => {
    setShowModal(false);
    setEditingTenant(null);
    if (shouldRefresh) {
      fetchTenants();
    }
  };

  /**
   * Handle view users
   */
  const handleViewUsers = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowUsersModal(true);
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Get status badge class
   */
  const getStatusBadgeClass = (isActive: boolean): string => {
    return isActive ? 'status-badge status-active' : 'status-badge status-inactive';
  };

  /**
   * Format organization type for display
   */
  const formatOrgType = (orgType: string): string => {
    const labels: Record<string, string> = {
      charity: 'Charity',
      cic: 'CIC',
      third_sector: 'Third Sector',
      cooperative: 'Co-operative',
      cooperative_commonwealth: 'Commonwealth',
    };
    return labels[orgType] || orgType;
  };

  /**
   * Get organization type badge color
   */
  const getOrgTypeColor = (orgType: string): string => {
    const colors: Record<string, string> = {
      charity: '#6b7280',
      cic: '#3b82f6',
      third_sector: '#8b5cf6',
      cooperative: '#10b981',
      cooperative_commonwealth: '#f59e0b',
    };
    return colors[orgType] || '#6b7280';
  };

  /**
   * Get currency symbol
   */
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      GBP: '£',
      USD: '$',
      EUR: '€',
    };
    return symbols[currency] || currency;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        padding: '0.75rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: 'var(--gray-900)' }}>
              Co-operative Commonwealth
            </h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)', fontSize: '12px' }}>
              Multi-App Platform Administration
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '13px' }}>
                {admin?.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                Platform Admin
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={logout}
              style={{ padding: '0.4rem 0.8rem', fontSize: '13px' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '0.6rem 0',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'overview' ? '#3b82f6' : 'var(--gray-600)',
                fontWeight: activeTab === 'overview' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('travel-support')}
              style={{
                padding: '0.6rem 0',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'travel-support' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'travel-support' ? '#3b82f6' : 'var(--gray-600)',
                fontWeight: activeTab === 'travel-support' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 17h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z"/>
                <path d="M16 3v4a1 1 0 0 0 1 1h3"/>
                <path d="M5 11V5a2 2 0 0 1 2-2h7l4 4v4"/>
                <circle cx="8" cy="17" r="2"/>
                <circle cx="16" cy="17" r="2"/>
              </svg>
              Travel Support
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--gray-900)', marginBottom: '0.3rem', fontSize: '16px' }}>
                Platform Overview
              </h2>
              <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '12px' }}>
                Overview of all apps and organizations in the Co-operative Commonwealth
              </p>
            </div>

            {/* Statistics Cards */}
            <TenantStats />

            {/* Apps Grid */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--gray-900)', fontSize: '15px' }}>
                Applications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setActiveTab('travel-support')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 17h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2z"/>
                        <path d="M16 3v4a1 1 0 0 0 1 1h3"/>
                        <path d="M5 11V5a2 2 0 0 1 2-2h7l4 4v4"/>
                        <circle cx="8" cy="17" r="2"/>
                        <circle cx="16" cy="17" r="2"/>
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Travel Support System</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--gray-600)' }}>
                        Accessible transport management
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--gray-600)' }}>Tenants:</span>
                      <span style={{ fontWeight: 600, marginLeft: '4px', color: 'var(--gray-900)' }}>
                        {total}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--gray-600)' }}>Status:</span>
                      <span style={{ fontWeight: 600, marginLeft: '4px', color: '#10b981' }}>Active</span>
                    </div>
                  </div>
                </div>

                {/* Placeholder for future apps */}
                <div className="card" style={{ padding: '1rem', border: '2px dashed var(--gray-300)', background: '#f9fafb', cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      border: '2px dashed var(--gray-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem auto'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px' }}>Add New Application</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Travel Support Tab */}
        {activeTab === 'travel-support' && (
          <>
            {/* Page Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--gray-900)', marginBottom: '0.3rem', fontSize: '16px' }}>
                  Travel Support System
                </h2>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '12px' }}>
                  Manage organizations using the Travel Support application
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                style={{ background: '#10b981', padding: '0.5rem 1rem', fontSize: '13px' }}
              >
                + Add Organization
              </button>
            </div>

            {/* Statistics Cards */}
            <TenantStats />

        {/* Toolbar */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, subdomain, email..."
                style={{ width: '100%', padding: '0.5rem', fontSize: '13px' }}
              />
            </div>
            <div style={{ minWidth: '160px' }}>
              <select
                value={orgTypeFilter}
                onChange={(e) => {
                  setOrgTypeFilter(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.5rem', fontSize: '13px' }}
              >
                <option value="">All Types</option>
                <option value="charity">Charity</option>
                <option value="cic">CIC</option>
                <option value="third_sector">Third Sector</option>
                <option value="cooperative">Co-operative</option>
                <option value="cooperative_commonwealth">Commonwealth Co-op</option>
              </select>
            </div>
            <div style={{ minWidth: '130px' }}>
              <select
                value={statusFilter === '' ? '' : statusFilter ? 'active' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusFilter(value === '' ? '' : value === 'active');
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.5rem', fontSize: '13px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '13px' }}>
              Search
            </button>
            {(search || orgTypeFilter || statusFilter !== '') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setOrgTypeFilter('');
                  setStatusFilter('');
                  setPage(1);
                }}
                style={{ padding: '0.5rem 1rem', fontSize: '13px' }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
            <p style={{ marginTop: '0.75rem', color: 'var(--gray-600)', fontSize: '13px' }}>Loading tenants...</p>
          </div>
        ) : tenants.length === 0 ? (
          /* Empty State */
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-600)', marginBottom: '0.75rem', fontSize: '13px' }}>
              {search || orgTypeFilter || statusFilter !== ''
                ? 'No tenants found matching your filters.'
                : 'No tenants yet.'}
            </p>
            {!search && !orgTypeFilter && statusFilter === '' && (
              <button className="btn btn-primary" onClick={handleCreate} style={{ padding: '0.5rem 1rem', fontSize: '13px' }}>
                Add Your First Tenant
              </button>
            )}
          </div>
        ) : (
          /* Tenant Table */
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Subdomain</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Pricing</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.tenant_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                          {tenant.company_name}
                        </div>
                        {tenant.domain && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {tenant.domain}
                          </div>
                        )}
                      </td>
                      <td>
                        <code style={{
                          background: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          {tenant.subdomain}
                        </code>
                      </td>
                      <td>
                        <div>
                          <span style={{
                            background: getOrgTypeColor(tenant.organization_type),
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            letterSpacing: '0.5px',
                          }}>
                            {formatOrgType(tenant.organization_type)}
                          </span>
                          {tenant.discount_percentage > 0 && (
                            <span style={{ color: '#10b981', fontSize: '12px', marginLeft: '6px', fontWeight: 600 }}>
                              -{tenant.discount_percentage}%
                            </span>
                          )}
                          {tenant.cooperative_model && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                              {tenant.cooperative_model} model
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {tenant.contact_name && (
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>
                            {tenant.contact_name}
                          </div>
                        )}
                        {tenant.contact_email && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                            {tenant.contact_email}
                          </div>
                        )}
                        {!tenant.contact_name && !tenant.contact_email && (
                          <span style={{ color: 'var(--gray-400)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {getCurrencySymbol(tenant.currency)}
                            {(tenant.base_price * (1 - tenant.discount_percentage / 100)).toFixed(2)}
                          </div>
                          {tenant.discount_percentage > 0 && (
                            <div style={{ color: '#6b7280', textDecoration: 'line-through', fontSize: '11px' }}>
                              {getCurrencySymbol(tenant.currency)}{tenant.base_price}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                            per {tenant.billing_cycle}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(tenant.is_active)}>
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                        {formatDate(tenant.created_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-action btn-edit"
                            onClick={() => handleEdit(tenant)}
                            title="Edit tenant"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '11px' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                          </button>
                          <button
                            className="btn btn-action btn-login-enabled"
                            onClick={() => handleViewUsers(tenant)}
                            title="Manage users"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '11px' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Users
                          </button>
                          <button
                            className="btn btn-action btn-delete"
                            onClick={() => handleDelete(tenant)}
                            title="Deactivate tenant"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '11px' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
              }}>
                <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} tenants
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '13px' }}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '13px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <TenantFormModal
          tenant={editingTenant}
          onClose={handleModalClose}
        />
      )}

      {/* User Management Modal */}
      {showUsersModal && selectedTenant && (
        <TenantUserManagementModal
          tenantId={selectedTenant.tenant_id}
          companyName={selectedTenant.company_name}
          onClose={() => {
            setShowUsersModal(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
}

export default TenantListPage;
