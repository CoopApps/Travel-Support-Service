import { useState, useEffect } from 'react';
import { customerApi } from '../../services/api';
import { Customer, CustomerListQuery } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import CustomerFormModal from './CustomerFormModal';
import CustomerStats from './CustomerStats';
import LoginStatusDisplay from './LoginStatusDisplay';
import PaymentStructureDisplay from './PaymentStructureDisplay';
import WeeklyScheduleDisplay from './WeeklyScheduleDisplay';
import LoginManagementModal from './LoginManagementModal';
import ScheduleManagementModal from './ScheduleManagementModal';
import TimesManagementModal from './TimesManagementModal';
import AssessmentModal from './AssessmentModal';

/**
 * Customer List Page - Stage 4
 *
 * Complete customer management with:
 * - Pagination
 * - Search
 * - Filtering
 * - Create/Edit/Delete operations
 *
 * This serves as the template for all other feature pages.
 */

function CustomerListPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();

  // Safety check: should never happen if tenant context loaded
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  // State for customer data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter/search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Login management modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCustomer, setLoginCustomer] = useState<Customer | null>(null);

  // Schedule management modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCustomer, setScheduleCustomer] = useState<Customer | null>(null);

  // Times management modal state
  const [showTimesModal, setShowTimesModal] = useState(false);
  const [timesCustomer, setTimesCustomer] = useState<Customer | null>(null);

  // Assessment modal state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentCustomer, setAssessmentCustomer] = useState<Customer | null>(null);

  /**
   * Fetch customers from API
   */
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');

      const query: CustomerListQuery = {
        page,
        limit,
        search,
        sortBy: 'name',
        sortOrder: 'asc',
        is_active: activeTab === 'active', // Backend filtering instead of client-side
      };

      const response = await customerApi.getCustomers(tenantId, query);

      setCustomers(response.customers);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load customers');
      toast.error(err.response?.data?.error?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load customers on mount and when filters change
   */
  useEffect(() => {
    fetchCustomers();
  }, [page, search, activeTab]);

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  /**
   * Handle delete customer
   */
  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }

    try {
      await customerApi.deleteCustomer(tenantId, customer.id);
      toast.success(`${customer.name} deleted successfully`);
      fetchCustomers(); // Reload the list
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete customer');
    }
  };

  /**
   * Handle archive customer
   */
  const handleArchive = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Archive customer "${customer.name}"?\n\n` +
      `This will mark the customer as inactive and move them to the archive.\n\n` +
      `You can still view and reactivate them from the Archive tab.`
    );

    if (!confirmed) return;

    try {
      await customerApi.updateCustomer(tenantId, customer.id, { is_active: false });
      toast.success(`${customer.name} archived successfully`);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to archive customer');
    }
  };

  /**
   * Handle reactivate customer
   */
  const handleReactivate = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Reactivate customer "${customer.name}"?\n\n` +
      `This will restore the customer to active status.`
    );

    if (!confirmed) return;

    try {
      await customerApi.updateCustomer(tenantId, customer.id, { is_active: true });
      toast.success(`${customer.name} reactivated successfully`);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reactivate customer');
    }
  };

  /**
   * Handle edit customer
   */
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  /**
   * Handle create new customer
   */
  const handleCreate = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  /**
   * Handle modal close and refresh
   */
  const handleModalClose = (shouldRefresh: boolean) => {
    setShowModal(false);
    setEditingCustomer(null);
    if (shouldRefresh) {
      fetchCustomers();
    }
  };

  /**
   * Handle schedule management
   */
  const handleSchedule = (customer: Customer) => {
    setScheduleCustomer(customer);
    setShowScheduleModal(true);
  };

  /**
   * Handle times management
   */
  const handleTimes = (customer: Customer) => {
    setTimesCustomer(customer);
    setShowTimesModal(true);
  };

  /**
   * Handle login management
   */
  const handleLogin = (customer: Customer) => {
    setLoginCustomer(customer);
    setShowLoginModal(true);
  };

  /**
   * Handle assessment
   */
  const handleAssessment = (customer: Customer) => {
    setAssessmentCustomer(customer);
    setShowAssessmentModal(true);
  };

  /**
   * Handle export to CSV
   */
  const handleExportCSV = async () => {
    try {
      const response = await customerApi.exportCustomers(tenantId, {
        search,
        is_active: activeTab === 'active',
      });

      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Customer data exported successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to export customers');
    }
  };

  /**
   * Calculate weekly cost for a customer
   */
  const calculateWeeklyCost = (customer: Customer): number => {
    if (!customer.schedule) return 0;

    let total = 0;
    const schedule = customer.schedule as any;

    // Sum up daily costs from schedule
    Object.keys(schedule).forEach(dayKey => {
      const day = schedule[dayKey];
      if (day?.enabled) {
        // Use dailyCost if available, otherwise calculate from morning + afternoon
        const dailyCost = day.dailyCost || ((day.morningCost || 0) + (day.afternoonCost || 0));
        total += dailyCost;
      }
    });

    return total;
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Customer Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchCustomers}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleCreate} style={{ background: '#28a745' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => {
            setActiveTab('active');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'active' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'active' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'active' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Active Customers
        </button>
        <button
          onClick={() => {
            setActiveTab('archive');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'archive' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'archive' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'archive' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Archive
        </button>
      </div>

      {/* Statistics Cards */}
      <CustomerStats tenantId={tenantId} />

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search customers..."
              style={{ flex: '1' }}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        /* Empty State */
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {search ? 'No customers found matching your search.' : 'No customers yet.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={handleCreate}>
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        /* Customer Table */
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Login Status</th>
                  <th>Payment Structure</th>
                  <th>Weekly Schedule & Times</th>
                  <th>Weekly Cost</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                            {customer.name}
                          </div>
                          {customer.is_login_enabled && (
                            <span style={{
                              fontSize: '10px',
                              color: '#3b82f6',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              Portal Access
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customer.phone && (
                            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--gray-700)', fontWeight: 500 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-500)' }}>
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                              {customer.email}
                            </div>
                          )}
                          {customer.address && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <LoginStatusDisplay customer={customer} />
                      </td>
                      <td>
                        <PaymentStructureDisplay customer={customer} />
                      </td>
                      <td>
                        <WeeklyScheduleDisplay customer={customer} />
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        £{calculateWeeklyCost(customer).toFixed(2)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '280px' }}>
                          <button
                            className="btn btn-action btn-edit"
                            onClick={() => handleEdit(customer)}
                            title="Edit customer details"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                          </button>
                          <button
                            className="btn btn-action btn-schedule"
                            onClick={() => handleSchedule(customer)}
                            title="Manage weekly schedule"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Schedule
                          </button>
                          <button
                            className="btn btn-action btn-times"
                            onClick={() => handleTimes(customer)}
                            title="Set pickup/return times"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Times
                          </button>
                          <button
                            className={`btn btn-action ${customer.is_login_enabled ? 'btn-login-enabled' : 'btn-login-disabled'}`}
                            onClick={() => handleLogin(customer)}
                            title={customer.is_login_enabled ? 'Manage login' : 'Enable portal access'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {customer.is_login_enabled ? 'Login' : 'Enable'}
                          </button>
                          <button
                            className="btn btn-action btn-assessment"
                            onClick={() => handleAssessment(customer)}
                            title="Risk assessment"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Assess
                          </button>
                          {activeTab === 'active' ? (
                            <button
                              className="btn btn-action btn-archive"
                              onClick={() => handleArchive(customer)}
                              title="Archive customer"
                              style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                <rect x="1" y="3" width="22" height="5"></rect>
                                <line x1="10" y1="12" x2="14" y2="12"></line>
                              </svg>
                              Archive
                            </button>
                          ) : (
                            <button
                              className="btn btn-action btn-reactivate"
                              onClick={() => handleReactivate(customer)}
                              title="Reactivate customer"
                              style={{ background: '#22c55e', borderColor: '#22c55e' }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 3v18h18"></path>
                                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                              </svg>
                              Reactivate
                            </button>
                          )}
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
              marginTop: '1.5rem'
            }}>
              <div style={{ color: 'var(--gray-600)' }}>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} customers
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className="btn"
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: page === pageNum ? 'var(--primary)' : 'var(--gray-100)',
                          color: page === pageNum ? 'white' : 'var(--gray-700)',
                        }}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={handleModalClose}
          tenantId={tenantId}
        />
      )}

      {/* Login Management Modal */}
      {showLoginModal && loginCustomer && (
        <LoginManagementModal
          customer={loginCustomer}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowLoginModal(false);
            setLoginCustomer(null);
            if (shouldRefresh) {
              fetchCustomers();
            }
          }}
        />
      )}

      {/* Schedule Management Modal */}
      {showScheduleModal && scheduleCustomer && (
        <ScheduleManagementModal
          customer={scheduleCustomer}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowScheduleModal(false);
            setScheduleCustomer(null);
            if (shouldRefresh) {
              fetchCustomers();
            }
          }}
        />
      )}

      {/* Times Management Modal */}
      {showTimesModal && timesCustomer && (
        <TimesManagementModal
          customer={timesCustomer}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowTimesModal(false);
            setTimesCustomer(null);
            if (shouldRefresh) {
              fetchCustomers();
            }
          }}
        />
      )}

      {/* Assessment Modal */}
      {showAssessmentModal && assessmentCustomer && (
        <AssessmentModal
          customer={assessmentCustomer}
          tenantId={tenantId}
          onClose={(shouldRefresh) => {
            setShowAssessmentModal(false);
            setAssessmentCustomer(null);
            if (shouldRefresh) {
              fetchCustomers();
            }
          }}
        />
      )}
    </div>
  );
}

export default CustomerListPage;
