import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { customerApi } from '../../services/api';
import {
  busTimetablesApi,
  busRoutesApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  RegularPassenger,
  RouteStop
} from '../../services/busApi';
import { Customer, CustomerListQuery } from '../../types';
import { WheelchairIcon, UserIcon, BusIcon } from '../icons/BusIcons';
import CustomerFormModal from '../customers/CustomerFormModal';
import './BusCustomersPage.css';

/**
 * Bus Customers Management Page
 *
 * Shows customers eligible for bus services (Section 22)
 * with the ability to assign them to regular seats on specific services and days.
 * Design matches the main CustomerListPage with stat cards and table layout.
 */

interface CustomerWithAssignments extends Customer {
  regularAssignments: RegularPassenger[];
}

interface BusCustomerStats {
  total: number;
  active: number;
  withRegularService: number;
  wheelchairUsers: number;
  totalAssignments: number;
}

export default function BusCustomersPage() {
  const { tenantId, tenant } = useTenant();
  const toast = useToast();

  // Data state
  const [customers, setCustomers] = useState<CustomerWithAssignments[]>([]);
  const [timetables, setTimetables] = useState<BusTimetable[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [allRegularPassengers, setAllRegularPassengers] = useState<RegularPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<BusCustomerStats>({
    total: 0,
    active: 0,
    withRegularService: 0,
    wheelchairUsers: 0,
    totalAssignments: 0,
  });

  // Pagination & search
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Customer form modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Seat assignment modal
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentCustomer, setAssignmentCustomer] = useState<Customer | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [assignmentForm, setAssignmentForm] = useState({
    timetable_id: '',
    seat_number: '',
    travels_monday: false,
    travels_tuesday: false,
    travels_wednesday: false,
    travels_thursday: false,
    travels_friday: false,
    travels_saturday: false,
    travels_sunday: false,
    boarding_stop_id: '',
    alighting_stop_id: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });
  const [editingAssignment, setEditingAssignment] = useState<RegularPassenger | null>(null);
  const [saving, setSaving] = useState(false);

  // Safety check
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to.</p>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, [tenantId, page, search, activeTab]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch customers, timetables, routes, and regular passengers in parallel
      const [customersResponse, timetablesData, routesData, regularData] = await Promise.all([
        customerApi.getCustomers(tenantId, {
          page,
          limit,
          search,
          sortBy: 'name',
          sortOrder: 'asc',
          archived: activeTab === 'archive',
        } as CustomerListQuery),
        busTimetablesApi.getTimetables(tenantId, { status: 'active' }),
        busRoutesApi.getRoutes(tenantId, {}),
        regularPassengersApi.getRegularPassengers(tenantId, {}),
      ]);

      setTimetables(timetablesData);
      setRoutes(routesData);
      setAllRegularPassengers(regularData);

      // Filter to Section 22 eligible customers and attach their assignments
      const section22Customers = (customersResponse.customers || [])
        .filter((c: Customer) => c.section_22_eligible)
        .map((c: Customer) => ({
          ...c,
          regularAssignments: regularData.filter((rp: RegularPassenger) => rp.customer_id === c.id)
        }));

      setCustomers(section22Customers);
      setTotal(customersResponse.total || section22Customers.length);
      setTotalPages(customersResponse.totalPages || Math.ceil(section22Customers.length / limit));

      // Calculate stats
      const customersWithService = section22Customers.filter(c => c.regularAssignments.length > 0);
      const wheelchairCustomers = section22Customers.filter(c => c.accessibility_needs?.wheelchairUser);
      const activeCustomers = section22Customers.filter(c => (c as any).is_active !== false);
      const totalAssignmentsCount = section22Customers.reduce((sum, c) => sum + c.regularAssignments.length, 0);

      setStats({
        total: section22Customers.length,
        active: activeCustomers.length,
        withRegularService: customersWithService.length,
        wheelchairUsers: wheelchairCustomers.length,
        totalAssignments: totalAssignmentsCount,
      });
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
      toast.error('Failed to load bus customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // Customer CRUD
  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleCustomerModalClose = (shouldRefresh: boolean) => {
    setShowCustomerModal(false);
    setEditingCustomer(null);
    if (shouldRefresh) {
      loadData();
    }
  };

  const handleArchiveCustomer = async (customer: Customer) => {
    if (!window.confirm(`Archive "${customer.name}"? They will be moved to the archive tab.`)) return;
    try {
      await customerApi.updateCustomer(tenantId, customer.id, { is_active: false } as any);
      toast.success(`${customer.name} archived`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to archive customer');
    }
  };

  const handleReactivateCustomer = async (customer: Customer) => {
    if (!window.confirm(`Reactivate "${customer.name}"?`)) return;
    try {
      await customerApi.updateCustomer(tenantId, customer.id, { is_active: true } as any);
      toast.success(`${customer.name} reactivated`);
      loadData();
    } catch (err: any) {
      toast.error('Failed to reactivate customer');
    }
  };

  // Seat assignment functions
  const loadRouteStops = async (routeId: number) => {
    try {
      const routeData = await busRoutesApi.getRoute(tenantId, routeId);
      setRouteStops(routeData.stops || []);
    } catch (err) {
      setRouteStops([]);
    }
  };

  const handleOpenAssignmentModal = (customer: Customer, assignment?: RegularPassenger) => {
    setAssignmentCustomer(customer);
    if (assignment) {
      setEditingAssignment(assignment);
      setAssignmentForm({
        timetable_id: assignment.timetable_id.toString(),
        seat_number: assignment.seat_number,
        travels_monday: assignment.travels_monday,
        travels_tuesday: assignment.travels_tuesday,
        travels_wednesday: assignment.travels_wednesday,
        travels_thursday: assignment.travels_thursday,
        travels_friday: assignment.travels_friday,
        travels_saturday: assignment.travels_saturday,
        travels_sunday: assignment.travels_sunday,
        boarding_stop_id: assignment.boarding_stop_id?.toString() || '',
        alighting_stop_id: assignment.alighting_stop_id?.toString() || '',
        valid_from: assignment.valid_from.split('T')[0],
        valid_until: assignment.valid_until?.split('T')[0] || '',
      });
      const timetable = timetables.find(t => t.timetable_id === assignment.timetable_id);
      if (timetable) loadRouteStops(timetable.route_id);
    } else {
      setEditingAssignment(null);
      setAssignmentForm({
        timetable_id: '',
        seat_number: '',
        travels_monday: false,
        travels_tuesday: false,
        travels_wednesday: false,
        travels_thursday: false,
        travels_friday: false,
        travels_saturday: false,
        travels_sunday: false,
        boarding_stop_id: '',
        alighting_stop_id: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
      });
      setRouteStops([]);
    }
    setShowAssignmentModal(true);
  };

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setAssignmentCustomer(null);
    setEditingAssignment(null);
  };

  const handleTimetableChange = (timetableId: string) => {
    setAssignmentForm(prev => ({ ...prev, timetable_id: timetableId }));
    const timetable = timetables.find(t => t.timetable_id === parseInt(timetableId));
    if (timetable) {
      loadRouteStops(timetable.route_id);
    } else {
      setRouteStops([]);
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentCustomer) return;

    const hasDay = assignmentForm.travels_monday || assignmentForm.travels_tuesday ||
      assignmentForm.travels_wednesday || assignmentForm.travels_thursday ||
      assignmentForm.travels_friday || assignmentForm.travels_saturday || assignmentForm.travels_sunday;

    if (!hasDay) {
      toast.error('Please select at least one travel day');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: assignmentCustomer.id,
        timetable_id: parseInt(assignmentForm.timetable_id),
        seat_number: assignmentForm.seat_number,
        travels_monday: assignmentForm.travels_monday,
        travels_tuesday: assignmentForm.travels_tuesday,
        travels_wednesday: assignmentForm.travels_wednesday,
        travels_thursday: assignmentForm.travels_thursday,
        travels_friday: assignmentForm.travels_friday,
        travels_saturday: assignmentForm.travels_saturday,
        travels_sunday: assignmentForm.travels_sunday,
        boarding_stop_id: assignmentForm.boarding_stop_id ? parseInt(assignmentForm.boarding_stop_id) : undefined,
        alighting_stop_id: assignmentForm.alighting_stop_id ? parseInt(assignmentForm.alighting_stop_id) : undefined,
        valid_from: assignmentForm.valid_from,
        valid_until: assignmentForm.valid_until || undefined,
      };

      if (editingAssignment) {
        await regularPassengersApi.updateRegularPassenger(tenantId, editingAssignment.regular_id, payload);
        toast.success('Seat assignment updated');
      } else {
        await regularPassengersApi.createRegularPassenger(tenantId, payload);
        toast.success('Seat assignment added');
      }

      handleCloseAssignmentModal();
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save seat assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignment: RegularPassenger) => {
    if (!window.confirm(`Remove this seat assignment?`)) return;
    try {
      await regularPassengersApi.deleteRegularPassenger(tenantId, assignment.regular_id);
      toast.success('Seat assignment removed');
      loadData();
    } catch (err: any) {
      toast.error('Failed to remove seat assignment');
    }
  };

  // Helper functions
  const formatDays = (p: RegularPassenger) => {
    const days = [];
    if (p.travels_monday) days.push('Mon');
    if (p.travels_tuesday) days.push('Tue');
    if (p.travels_wednesday) days.push('Wed');
    if (p.travels_thursday) days.push('Thu');
    if (p.travels_friday) days.push('Fri');
    if (p.travels_saturday) days.push('Sat');
    if (p.travels_sunday) days.push('Sun');
    return days.join(', ');
  };

  const getTimetableDisplay = (timetableId: number) => {
    const tt = timetables.find(t => t.timetable_id === timetableId);
    if (!tt) return 'Unknown';
    return `${tt.route_number} at ${tt.departure_time}`;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="bus-customers-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading bus customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-customers-page">
      {/* Page Header - Matching CustomerListPage style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Customers Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              Section 22 Eligible Bus Passengers
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleCreateCustomer} style={{ background: '#10b981' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Tabs - Matching CustomerListPage style */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--gray-200)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => { setActiveTab('active'); setPage(1); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'active' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #10b981' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'active' ? '#10b981' : 'var(--gray-600)',
            fontWeight: activeTab === 'active' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Active Customers
        </button>
        <button
          onClick={() => { setActiveTab('archive'); setPage(1); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'archive' ? '2px solid #10b981' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'archive' ? '#10b981' : 'var(--gray-600)',
            fontWeight: activeTab === 'archive' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Archived Customers
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="customer-stats-grid">
        <div className="stat-card stat-card-blue">
          <h4 className="stat-value">{stats.total}</h4>
          <small className="stat-label">Total Customers</small>
        </div>
        <div className="stat-card stat-card-green">
          <h4 className="stat-value">{stats.active}</h4>
          <small className="stat-label">Active Customers</small>
        </div>
        <div className="stat-card stat-card-orange">
          <h4 className="stat-value">{stats.withRegularService}</h4>
          <small className="stat-label">With Regular Service</small>
        </div>
        <div className="stat-card stat-card-purple">
          <h4 className="stat-value">{stats.totalAssignments}</h4>
          <small className="stat-label">Total Seat Assignments</small>
        </div>
        <div className="stat-card stat-card-teal">
          <h4 className="stat-value">{stats.wheelchairUsers}</h4>
          <small className="stat-label">Wheelchair Users</small>
        </div>
        <div className="stat-card stat-card-indigo">
          <h4 className="stat-value">{timetables.length}</h4>
          <small className="stat-label">Active Services</small>
        </div>
      </div>

      {/* Toolbar with Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search customers by name, phone, or email..."
              style={{ flex: '1' }}
            />
            <button type="submit" className="btn btn-secondary">Search</button>
            {search && (
              <button type="button" className="btn btn-secondary" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={loadData} style={{ marginLeft: '1rem' }}>Retry</button>
        </div>
      )}

      {/* Customer Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <UserIcon size={48} color="#9ca3af" />
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {search ? 'No customers found matching your search.' : 'No Section 22 eligible customers yet.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={handleCreateCustomer}>
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Regular Services</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          background: customer.accessibility_needs?.wheelchairUser ? '#dbeafe' : 'var(--gray-100)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {customer.accessibility_needs?.wheelchairUser ? (
                            <WheelchairIcon size={18} color="#3b82f6" />
                          ) : (
                            <UserIcon size={18} color="#6b7280" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                            {customer.name}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                            <span style={{
                              fontSize: '10px',
                              color: '#10b981',
                              background: '#d1fae5',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              Section 22
                            </span>
                            {customer.accessibility_needs?.wheelchairUser && (
                              <span style={{
                                fontSize: '10px',
                                color: '#3b82f6',
                                background: '#dbeafe',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontWeight: 600
                              }}>
                                Wheelchair
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {customer.phone && (
                          <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{customer.phone}</div>
                        )}
                        {customer.email && (
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{customer.email}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {customer.regularAssignments.length === 0 ? (
                        <span style={{ color: 'var(--gray-400)', fontStyle: 'italic', fontSize: '13px' }}>
                          No regular services
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customer.regularAssignments.slice(0, 3).map(assignment => (
                            <div key={assignment.regular_id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              background: assignment.status !== 'active' ? '#fef3c7' : 'var(--gray-50)',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              <span style={{
                                background: '#10b981',
                                color: 'white',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                fontSize: '11px'
                              }}>
                                {timetables.find(t => t.timetable_id === assignment.timetable_id)?.route_number || '?'}
                              </span>
                              <span style={{ fontWeight: 500 }}>
                                {timetables.find(t => t.timetable_id === assignment.timetable_id)?.departure_time || '?'}
                              </span>
                              <span style={{ color: 'var(--gray-500)' }}>
                                Seat {assignment.seat_number}
                              </span>
                              <span style={{ color: '#3b82f6', fontSize: '11px' }}>
                                {formatDays(assignment)}
                              </span>
                              {assignment.status !== 'active' && (
                                <span style={{
                                  background: '#f59e0b',
                                  color: 'white',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontSize: '9px',
                                  fontWeight: 600
                                }}>
                                  SUSPENDED
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenAssignmentModal(customer, assignment)}
                                style={{
                                  marginLeft: 'auto',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--gray-500)',
                                  cursor: 'pointer',
                                  padding: '2px'
                                }}
                                title="Edit"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(assignment)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '2px'
                                }}
                                title="Remove"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                          ))}
                          {customer.regularAssignments.length > 3 && (
                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', paddingLeft: '8px' }}>
                              +{customer.regularAssignments.length - 3} more services
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-action btn-edit"
                          onClick={() => handleEditCustomer(customer)}
                          title="Edit customer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
                        <button
                          className="btn btn-action"
                          onClick={() => handleOpenAssignmentModal(customer)}
                          title="Add regular service"
                          style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
                        >
                          <BusIcon size={14} color="white" />
                          + Service
                        </button>
                        {activeTab === 'active' ? (
                          <button
                            className="btn btn-action btn-archive"
                            onClick={() => handleArchiveCustomer(customer)}
                            title="Archive customer"
                            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="21 8 21 21 3 21 3 8"></polyline>
                              <rect x="1" y="3" width="22" height="5"></rect>
                            </svg>
                            Archive
                          </button>
                        ) : (
                          <button
                            className="btn btn-action"
                            onClick={() => handleReactivateCustomer(customer)}
                            title="Reactivate customer"
                            style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        </>
      )}

      {/* Pagination - Matching CustomerListPage style */}
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
                      backgroundColor: page === pageNum ? '#10b981' : 'var(--gray-100)',
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

      {/* Customer Form Modal */}
      {showCustomerModal && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={handleCustomerModalClose}
          tenantId={tenantId}
        />
      )}

      {/* Seat Assignment Modal */}
      {showAssignmentModal && assignmentCustomer && (
        <div className="modal-overlay" onClick={handleCloseAssignmentModal}>
          <div className="modal-content assignment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAssignment ? 'Edit Service Assignment' : 'Add Regular Service'}</h2>
              <button className="close-btn" onClick={handleCloseAssignmentModal}>&times;</button>
            </div>

            <div className="modal-customer-info">
              Assigning <strong>{assignmentCustomer.name}</strong> to a regular service
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Service *</label>
                    <select
                      value={assignmentForm.timetable_id}
                      onChange={e => handleTimetableChange(e.target.value)}
                      required
                      disabled={!!editingAssignment}
                    >
                      <option value="">Select a service...</option>
                      {timetables.map(t => (
                        <option key={t.timetable_id} value={t.timetable_id}>
                          {t.route_number} at {t.departure_time} - {t.service_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Seat Number *</label>
                    <input
                      type="text"
                      value={assignmentForm.seat_number}
                      onChange={e => setAssignmentForm(prev => ({ ...prev, seat_number: e.target.value }))}
                      placeholder="e.g., 1, 2, W1"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Travel Days *</label>
                  <div className="days-grid">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={assignmentForm[`travels_${day}` as keyof typeof assignmentForm] as boolean}
                          onChange={e => setAssignmentForm(prev => ({
                            ...prev,
                            [`travels_${day}`]: e.target.checked
                          }))}
                        />
                        <span>{day.charAt(0).toUpperCase() + day.slice(1, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {routeStops.length > 0 && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Boarding Stop</label>
                      <select
                        value={assignmentForm.boarding_stop_id}
                        onChange={e => setAssignmentForm(prev => ({ ...prev, boarding_stop_id: e.target.value }))}
                      >
                        <option value="">First stop (default)</option>
                        {routeStops.sort((a, b) => a.stop_sequence - b.stop_sequence).map(s => (
                          <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Alighting Stop</label>
                      <select
                        value={assignmentForm.alighting_stop_id}
                        onChange={e => setAssignmentForm(prev => ({ ...prev, alighting_stop_id: e.target.value }))}
                      >
                        <option value="">Last stop (default)</option>
                        {routeStops.sort((a, b) => a.stop_sequence - b.stop_sequence).map(s => (
                          <option key={s.stop_id} value={s.stop_id}>{s.stop_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Valid From *</label>
                    <input
                      type="date"
                      value={assignmentForm.valid_from}
                      onChange={e => setAssignmentForm(prev => ({ ...prev, valid_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Valid Until (optional)</label>
                    <input
                      type="date"
                      value={assignmentForm.valid_until}
                      onChange={e => setAssignmentForm(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseAssignmentModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Add Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
