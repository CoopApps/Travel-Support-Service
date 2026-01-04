import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { officeStaffApi } from '../../services/api';

interface OfficeStaff {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  employee_number?: string;
  job_title: string;
  department?: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'temporary';
  start_date: string;
  end_date?: string;
  salary_annual?: number;
  hourly_rate?: number;
  manager_id?: number;
  is_active: boolean;
  manager_name?: string;
}

interface OfficeStaffSummary {
  total_staff: number;
  active_staff: number;
  by_department: Array<{ department: string; count: number }>;
  by_employment_type: Array<{ employment_type: string; count: number }>;
}

function OfficeStaffPage() {
  const { tenant } = useTenant();
  const [staff, setStaff] = useState<OfficeStaff[]>([]);
  const [summary, setSummary] = useState<OfficeStaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<OfficeStaff | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_number: '',
    job_title: '',
    department: '',
    employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'temporary',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    salary_annual: '',
    hourly_rate: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [staffData, summaryData] = await Promise.all([
        officeStaffApi.getStaff(tenant!.tenant_id),
        officeStaffApi.getSummary(tenant!.tenant_id)
      ]);

      setStaff(staffData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load office staff');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      temporary: 'Temporary'
    };
    return labels[type] || type;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_number: '',
      job_title: '',
      department: '',
      employment_type: 'full_time',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      salary_annual: '',
      hourly_rate: '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        salary_annual: formData.salary_annual ? parseFloat(formData.salary_annual) : undefined,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        end_date: formData.end_date || undefined
      };

      await officeStaffApi.createStaff(tenant.tenant_id, payload);
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading office staff...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="office-staff-page">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Office Staff Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ background: '#28a745' }}>
          + Add Staff Member
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#e3f2fd',
          color: '#1976d2'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.total_staff || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Total Staff
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#e8f5e9',
          color: '#388e3c'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.active_staff || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Active Staff
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#fff3e0',
          color: '#f57c00'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {summary?.by_department.length || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Departments
          </small>
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
        {/* Search Form */}
        <form onSubmit={(e) => { e.preventDefault(); /* Implement search */ }} style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search staff..."
              style={{ flex: '1' }}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { /* Clear search */ }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Staff Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Job Title</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--gray-500)', margin: 0 }}>No office staff members found</p>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={() => setShowAddModal(true)}
                  >
                    Add First Staff Member
                  </button>
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="staff-name">
                      <strong>{member.first_name} {member.last_name}</strong>
                      {member.employee_number && (
                        <span className="employee-number">#{member.employee_number}</span>
                      )}
                    </div>
                  </td>
                  <td>{member.job_title}</td>
                  <td>{member.department || '-'}</td>
                  <td>
                    <span className="badge badge-info">
                      {getEmploymentTypeLabel(member.employment_type)}
                    </span>
                  </td>
                  <td>{member.email}</td>
                  <td>{member.phone || '-'}</td>
                  <td>{formatDate(member.start_date)}</td>
                  <td>
                    <span className={`badge ${member.is_active ? 'badge-success' : 'badge-secondary'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => setSelectedStaff(member)}
                        title="View Details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Add Staff Member</h2>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    First Name <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Last Name <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Email <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Job Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Job Title <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Employee Number</label>
                  <input
                    type="text"
                    name="employee_number"
                    value={formData.employee_number}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Employment Type <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Start Date <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Date (Optional)</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Compensation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Annual Salary (£)</label>
                  <input
                    type="number"
                    name="salary_annual"
                    value={formData.salary_annual}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Hourly Rate (£)</label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span>Active Employee</span>
                </label>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placeholder for Details Modal */}
      {selectedStaff && (
        <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedStaff.first_name} {selectedStaff.last_name}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Job Title:</label>
                <span>{selectedStaff.job_title}</span>
              </div>
              <div className="detail-item">
                <label>Department:</label>
                <span>{selectedStaff.department || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Employment Type:</label>
                <span>{getEmploymentTypeLabel(selectedStaff.employment_type)}</span>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <span>{selectedStaff.email}</span>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <span>{selectedStaff.phone || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Start Date:</label>
                <span>{formatDate(selectedStaff.start_date)}</span>
              </div>
              {selectedStaff.salary_annual && (
                <div className="detail-item">
                  <label>Annual Salary:</label>
                  <span>{formatCurrency(selectedStaff.salary_annual)}</span>
                </div>
              )}
              {selectedStaff.hourly_rate && (
                <div className="detail-item">
                  <label>Hourly Rate:</label>
                  <span>{formatCurrency(selectedStaff.hourly_rate)}</span>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedStaff(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficeStaffPage;
