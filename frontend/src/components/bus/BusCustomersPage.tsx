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
import { WheelchairIcon, UserIcon, BusIcon, CalendarIcon } from '../icons/BusIcons';
import CustomerFormModal from '../customers/CustomerFormModal';
import './BusCustomersPage.css';

/**
 * Bus Customers Page
 *
 * Shows customers eligible for bus services (Section 22)
 * with the ability to assign them to regular seats on specific services and days.
 */

interface CustomerWithAssignments extends Customer {
  regularAssignments: RegularPassenger[];
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
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Bus Customers</h1>
          <p className="page-subtitle">
            Section 22 eligible customers and their regular seat assignments
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData}>
            Refresh
          </button>
          <button className="btn-primary" onClick={handleCreateCustomer}>
            + Add Customer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => { setActiveTab('active'); setPage(1); }}
        >
          Active Customers
        </button>
        <button
          className={`tab ${activeTab === 'archive' ? 'active' : ''}`}
          onClick={() => { setActiveTab('archive'); setPage(1); }}
        >
          Archived
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search customers by name, phone, or email..."
        />
        <button type="submit" className="btn-secondary">Search</button>
        {search && (
          <button type="button" className="btn-secondary" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Customer List */}
      {customers.length === 0 ? (
        <div className="empty-state">
          <UserIcon size={48} color="#9ca3af" />
          <h2>No Bus Customers</h2>
          <p>
            {search
              ? 'No customers found matching your search.'
              : 'No Section 22 eligible customers yet. Add a customer and mark them as Section 22 eligible.'}
          </p>
          {!search && (
            <button className="btn-primary" onClick={handleCreateCustomer}>
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="customers-list">
          {customers.map(customer => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <div className="customer-avatar">
                  {customer.accessibility_needs?.wheelchairUser ? (
                    <WheelchairIcon size={24} color="#3b82f6" />
                  ) : (
                    <UserIcon size={24} color="#6b7280" />
                  )}
                </div>
                <div className="customer-info">
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-contact">
                    {customer.phone && <span>{customer.phone}</span>}
                    {customer.email && <span>{customer.email}</span>}
                  </div>
                </div>
                <div className="customer-actions">
                  <button className="btn-sm" onClick={() => handleEditCustomer(customer)}>Edit</button>
                  <button
                    className="btn-sm btn-primary"
                    onClick={() => handleOpenAssignmentModal(customer)}
                  >
                    + Add Service
                  </button>
                  {activeTab === 'active' ? (
                    <button className="btn-sm btn-warning" onClick={() => handleArchiveCustomer(customer)}>Archive</button>
                  ) : (
                    <button className="btn-sm btn-success" onClick={() => handleReactivateCustomer(customer)}>Reactivate</button>
                  )}
                </div>
              </div>

              {/* Regular Seat Assignments */}
              <div className="assignments-section">
                <div className="assignments-header">
                  <BusIcon size={16} color="#10b981" />
                  <span>Regular Services ({customer.regularAssignments.length})</span>
                </div>

                {customer.regularAssignments.length === 0 ? (
                  <div className="no-assignments">
                    No regular services assigned. Click "+ Add Service" to assign.
                  </div>
                ) : (
                  <div className="assignments-list">
                    {customer.regularAssignments.map(assignment => (
                      <div key={assignment.regular_id} className={`assignment-card ${assignment.status}`}>
                        <div className="assignment-main">
                          <div className="assignment-service">
                            <span className="route-badge">
                              {timetables.find(t => t.timetable_id === assignment.timetable_id)?.route_number || '?'}
                            </span>
                            <span className="service-time">
                              {timetables.find(t => t.timetable_id === assignment.timetable_id)?.departure_time || '?'}
                            </span>
                            <span className="service-name">
                              {timetables.find(t => t.timetable_id === assignment.timetable_id)?.service_name || ''}
                            </span>
                          </div>
                          <div className="assignment-details">
                            <span className="seat-badge">Seat {assignment.seat_number}</span>
                            <span className="days">{formatDays(assignment)}</span>
                            {assignment.status !== 'active' && (
                              <span className="status-badge suspended">Suspended</span>
                            )}
                          </div>
                        </div>
                        <div className="assignment-actions">
                          <button className="btn-xs" onClick={() => handleOpenAssignmentModal(customer, assignment)}>Edit</button>
                          <button className="btn-xs btn-danger" onClick={() => handleDeleteAssignment(assignment)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">
            Page {page} of {totalPages} ({total} customers)
          </span>
          <div className="page-buttons">
            <button
              className="btn-secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
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
