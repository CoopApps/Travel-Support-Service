import { useState, useEffect } from 'react';
import { tenantApi } from '../../services/platform-admin-api';
import { usePlatformAdminStore } from '../../store/platformAdminStore';
import type { Tenant, TenantListQuery } from '../../types';
import TenantStats from './TenantStats';
import TenantFormModal from './TenantFormModal';
import TenantUserManagementModal from './TenantUserManagementModal';

/**
 * Tenant List Page
 * Main platform admin dashboard for managing home care co-operatives
 */

function TenantListPage() {
  const admin = usePlatformAdminStore((state) => state.admin);
  const logout = usePlatformAdminStore((state) => state.logout);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'homecare'>('overview');

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
      setError(err.response?.data?.error?.message || 'Failed to load organisations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'homecare') {
      fetchTenants();
    }
  }, [activeTab, page, search, orgTypeFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to deactivate ${tenant.company_name}?`)) {
      return;
    }

    try {
      await tenantApi.deleteTenant(tenant.tenant_id);
      fetchTenants();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete organisation');
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingTenant(null);
    setShowModal(true);
  };

  const handleModalClose = (shouldRefresh: boolean) => {
    setShowModal(false);
    setEditingTenant(null);
    if (shouldRefresh) {
      fetchTenants();
    }
  };

  const handleViewUsers = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowUsersModal(true);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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

  const getCoopModelLabel = (model?: string): string => {
    const labels: Record<string, string> = {
      worker_coop: 'Worker',
      consumer_coop: 'Consumer',
      multi_stakeholder: 'Multi-stakeholder',
      platform_coop: 'Platform',
    };
    return model ? labels[model] || model : '';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', color: 'var(--gray-900)' }}>
                Co-operative Commonwealth
              </h1>
              <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)', fontSize: '12px' }}>
                Home Care Platform Administration
              </p>
            </div>
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
                borderBottom: activeTab === 'overview' ? '2px solid #0891b2' : '2px solid transparent',
                color: activeTab === 'overview' ? '#0891b2' : 'var(--gray-600)',
                fontWeight: activeTab === 'overview' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('homecare')}
              style={{
                padding: '0.6rem 0',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'homecare' ? '2px solid #0891b2' : '2px solid transparent',
                color: activeTab === 'homecare' ? '#0891b2' : 'var(--gray-600)',
                fontWeight: activeTab === 'homecare' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Home Care
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
                Overview of all co-operatives in the Commonwealth
              </p>
            </div>

            <TenantStats />

            {/* Apps Grid */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--gray-900)', fontSize: '15px' }}>
                Applications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setActiveTab('homecare')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Home Care Co-operative</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--gray-600)' }}>
                        Care management for co-ops
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--gray-600)' }}>Organisations:</span>
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
                <div className="card" style={{ padding: '1rem', border: '2px dashed var(--gray-300)', background: '#f9fafb' }}>
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

        {/* Home Care Tab */}
        {activeTab === 'homecare' && (
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
                  Home Care Co-operative System
                </h2>
                <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '12px' }}>
                  Manage care co-operatives and their settings
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
              >
                + Add Co-operative
              </button>
            </div>

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
                    <option value="cooperative">Co-operative</option>
                    <option value="cooperative_commonwealth">Commonwealth Co-op</option>
                    <option value="charity">Charity</option>
                    <option value="cic">CIC</option>
                    <option value="third_sector">Third Sector</option>
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
                <button type="submit" className="btn btn-primary">
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
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {loading ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
                <p style={{ marginTop: '0.75rem', color: 'var(--gray-600)', fontSize: '13px' }}>Loading organisations...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray-600)', marginBottom: '0.75rem', fontSize: '13px' }}>
                  {search || orgTypeFilter || statusFilter !== ''
                    ? 'No organisations found matching your filters.'
                    : 'No co-operatives yet.'}
                </p>
                {!search && !orgTypeFilter && statusFilter === '' && (
                  <button className="btn btn-primary" onClick={handleCreate}>
                    Add Your First Co-operative
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Organisation</th>
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
                            {tenant.cqc_provider_id && (
                              <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                                CQC: {tenant.cqc_provider_id}
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
                                  {getCoopModelLabel(tenant.cooperative_model)} model
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
                                £{(tenant.base_price * (1 - tenant.discount_percentage / 100)).toFixed(2)}
                              </div>
                              {tenant.discount_percentage > 0 && (
                                <div style={{ color: '#6b7280', textDecoration: 'line-through', fontSize: '11px' }}>
                                  £{tenant.base_price}
                                </div>
                              )}
                              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                per {tenant.billing_cycle}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${tenant.is_active ? 'status-active' : 'status-inactive'}`}>
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
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-action btn-view"
                                onClick={() => handleViewUsers(tenant)}
                                title="Users"
                              >
                                Users
                              </button>
                              <button
                                className="btn btn-action btn-delete"
                                onClick={() => handleDelete(tenant)}
                                title="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem',
                  }}>
                    <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                      Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} organisations
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
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

      {/* Modals */}
      {showModal && (
        <TenantFormModal
          tenant={editingTenant}
          onClose={handleModalClose}
        />
      )}

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
