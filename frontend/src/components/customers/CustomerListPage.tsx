import { useState, useEffect } from 'react';
import { customerApi } from '../../services/api';
import { Customer, CustomerListQuery } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useServiceContext } from '../../contexts/ServiceContext';
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
 * Transport Service Customer List Page
 *
 * Shows Section 19 eligible customers for transport service.
 * Bus customers are managed in a separate BusCustomersPage.
 *
 * Features:
 * - Pagination, Search
 * - Create/Edit/Delete operations
 * - Copy to Bus Service option for dual-service companies
 */

function CustomerListPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();
  const { busEnabled } = useServiceContext();

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
        archived: activeTab === 'archive', // Backend filtering: true for archive, false/undefined for active
      };

      const response = await customerApi.getCustomers(tenantId, query);

      setCustomers(response.customers);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
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
      const response = await (customerApi as any).exportCustomers(tenantId, {
        search,
        archived: activeTab === 'archive',
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

  /**
   * Filter customers to show Section 19 eligible only (transport service)
   */
  const getFilteredCustomers = (): Customer[] => {
    return customers.filter(c => c.section_19_eligible);
  };

  /**
   * Copy customer to Bus Service (makes them Section 22 eligible)
   */
  const handleCopyToBus = async (customer: Customer) => {
    if (customer.section_22_eligible) {
      toast.info(`${customer.name} is already eligible for bus service`);
      return;
    }

    const confirmed = window.confirm(
      `Copy "${customer.name}" to Bus Service?\n\n` +
      `This will make them eligible for Section 22 bus services while keeping their transport service access.`
    );

    if (!confirmed) return;

    try {
      await customerApi.updateCustomer(tenantId, customer.id, {
        section_22_eligible: true
      } as any);
      toast.success(`${customer.name} is now eligible for bus service`);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update customer');
    }
  };

  return (
    <div>
      {/* Page Header - Compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '20px' }}>Customers</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151'
            }}
            title="Export to CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '6px 12px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Tabs - Compact */}
      <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px', width: 'fit-content', marginBottom: '1rem' }}>
        <button
          onClick={() => { setActiveTab('active'); setPage(1); }}
          style={{
            padding: '5px 12px',
            background: activeTab === 'active' ? 'white' : 'transparent',
            color: activeTab === 'active' ? '#111827' : '#6b7280',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '12px',
            boxShadow: activeTab === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Active
        </button>
        <button
          onClick={() => { setActiveTab('archive'); setPage(1); }}
          style={{
            padding: '5px 12px',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            color: activeTab === 'archive' ? '#111827' : '#6b7280',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '12px',
            boxShadow: activeTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          Archived
        </button>
      </div>

      {/* Statistics Cards */}
      <CustomerStats tenantId={tenantId} />

      {/* Search - Compact */}
      <div style={{ marginBottom: '12px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', maxWidth: '320px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search customers..."
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              style={{
                padding: '6px 10px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              Clear
            </button>
          )}
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
      ) : getFilteredCustomers().length === 0 ? (
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
                  {getFilteredCustomers().map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                            {customer.name}
                          </div>
                          {/* Service Eligibility Badges */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {customer.section_19_eligible && (
                              <span style={{
                                fontSize: '10px',
                                color: '#0284c7',
                                background: '#e0f2fe',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                                S19
                              </span>
                            )}
                            {customer.section_22_eligible && (
                              <span style={{
                                fontSize: '10px',
                                color: '#10b981',
                                background: '#d1fae5',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
                                </svg>
                                S22
                              </span>
                            )}
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
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleEdit(customer)}
                            title="Edit"
                            style={{ padding: '4px 6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleSchedule(customer)}
                            title="Schedule"
                            style={{ padding: '4px 6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleTimes(customer)}
                            title="Times"
                            style={{ padding: '4px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleLogin(customer)}
                            title={customer.is_login_enabled ? 'Manage Login' : 'Enable Portal'}
                            style={{
                              padding: '4px 6px',
                              background: customer.is_login_enabled ? '#d1fae5' : '#f3f4f6',
                              border: customer.is_login_enabled ? '1px solid #6ee7b7' : '1px solid #e5e7eb',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={customer.is_login_enabled ? '#059669' : '#6b7280'} strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAssessment(customer)}
                            title="Assessment"
                            style={{ padding: '4px 6px', background: '#fae8ff', border: '1px solid #e879f9', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                          </button>
                          {busEnabled && !customer.section_22_eligible && (
                            <button
                              onClick={() => handleCopyToBus(customer)}
                              title="Add to Bus Service"
                              style={{ padding: '4px 6px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
                              </svg>
                            </button>
                          )}
                          {activeTab === 'active' ? (
                            <button
                              onClick={() => handleArchive(customer)}
                              title="Archive"
                              style={{ padding: '4px 6px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8"/>
                                <rect x="1" y="3" width="22" height="5"/>
                                <line x1="10" y1="12" x2="14" y2="12"/>
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(customer)}
                              title="Reactivate"
                              style={{ padding: '4px 6px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                              </svg>
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
