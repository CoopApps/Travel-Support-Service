import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { costCenterApi } from '../../services/api';

interface CostCenter {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: string;
  budget_annual?: number;
  budget_monthly?: number;
  is_active: boolean;
}

interface CostCenterUtilization {
  id: number;
  code: string;
  name: string;
  category: string;
  budget_annual?: number;
  budget_monthly?: number;
  total_spent_ytd: number;
  total_spent_this_month: number;
  remaining_annual?: number;
  remaining_monthly?: number;
}

interface CostCenterSummary {
  total_cost_centers: number;
  active_cost_centers: number;
  total_budget_annual: number;
  total_spent_ytd: number;
  total_spent_this_month: number;
}

function CostCenterPage() {
  const { tenant } = useTenant();
  const [utilization, setUtilization] = useState<CostCenterUtilization[]>([]);
  const [summary, setSummary] = useState<CostCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CostCenterUtilization | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'operational',
    budget_annual: '',
    budget_monthly: '',
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

      const [utilizationData, summaryData] = await Promise.all([
        costCenterApi.getUtilization(tenant!.tenant_id),
        costCenterApi.getSummary(tenant!.tenant_id)
      ]);

      setUtilization(utilizationData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load cost centers');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePercentage = (spent: number, budget?: number) => {
    if (!budget || budget === 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      operational: 'Operational',
      administrative: 'Administrative',
      fleet: 'Fleet',
      compliance: 'Compliance',
      marketing: 'Marketing',
      it: 'IT',
      facilities: 'Facilities',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      operational: '#3b82f6',
      administrative: '#8b5cf6',
      fleet: '#10b981',
      compliance: '#f59e0b',
      marketing: '#ec4899',
      it: '#06b6d4',
      facilities: '#84cc16',
      other: '#6b7280'
    };
    return colors[category] || colors.other;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'operational',
      budget_annual: '',
      budget_monthly: '',
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
        budget_annual: formData.budget_annual ? parseFloat(formData.budget_annual) : undefined,
        budget_monthly: formData.budget_monthly ? parseFloat(formData.budget_monthly) : undefined,
        description: formData.description || undefined
      };

      await costCenterApi.create(tenant.tenant_id, payload);
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create cost centre');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading cost centers...</p>
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
    <div className="cost-center-page">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Cost Centre Management</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ background: '#28a745' }}>
          + Add Cost Centre
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
            {summary?.active_cost_centers || 0}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Active Centers
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
            {formatCurrency(summary?.total_budget_annual)}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            Annual Budget
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
            {formatCurrency(summary?.total_spent_ytd)}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            YTD Spent
          </small>
        </div>
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          background: '#f3e5f5',
          color: '#7b1fa2'
        }}>
          <h4 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 5px 0' }}>
            {formatCurrency(summary?.total_spent_this_month)}
          </h4>
          <small style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block'
          }}>
            This Month
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
              placeholder="Search cost centres..."
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

      {/* Cost Centres Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Annual Budget</th>
              <th>YTD Spent</th>
              <th>Remaining</th>
              <th>Utilization</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilization.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--gray-500)', margin: 0 }}>No cost centres found</p>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={() => setShowAddModal(true)}
                  >
                    Add First Cost Centre
                  </button>
                </td>
              </tr>
            ) : (
              utilization.map((center) => {
                const percentage = calculatePercentage(center.total_spent_ytd, center.budget_annual);
                const isOverBudget = percentage > 100;

                return (
                  <tr key={center.id}>
                    <td>
                      <strong>{center.code}</strong>
                    </td>
                    <td>{center.name}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getCategoryColor(center.category) + '20',
                          color: getCategoryColor(center.category),
                          border: `1px solid ${getCategoryColor(center.category)}40`
                        }}
                      >
                        {getCategoryLabel(center.category)}
                      </span>
                    </td>
                    <td>{formatCurrency(center.budget_annual)}</td>
                    <td>{formatCurrency(center.total_spent_ytd)}</td>
                    <td>
                      <span className={isOverBudget ? 'text-danger' : ''}>
                        {formatCurrency(center.remaining_annual)}
                      </span>
                    </td>
                    <td>
                      <div className="utilization-bar">
                        <div
                          className="utilization-fill"
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                            backgroundColor: isOverBudget ? '#ef4444' : percentage > 80 ? '#f59e0b' : '#10b981'
                          }}
                        ></div>
                        <span className="utilization-text">{percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedCenter(center)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Cost Centre Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Add Cost Centre</h2>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Code <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., CC-IT-001"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--gray-500)', fontSize: '12px' }}>Unique identifier for this cost centre</small>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Name <span style={{ color: 'var(--danger-600)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., IT Department"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Category <span style={{ color: 'var(--danger-600)' }}>*</span></label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="operational">Operational</option>
                  <option value="administrative">Administrative</option>
                  <option value="fleet">Fleet</option>
                  <option value="compliance">Compliance</option>
                  <option value="marketing">Marketing</option>
                  <option value="it">IT</option>
                  <option value="facilities">Facilities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Brief description of this cost centre's purpose..."
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
              </div>

              {/* Budget Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Annual Budget (£)</label>
                  <input
                    type="number"
                    name="budget_annual"
                    value={formData.budget_annual}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--gray-500)', fontSize: '12px' }}>Total budget for the year</small>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Monthly Budget (£)</label>
                  <input
                    type="number"
                    name="budget_monthly"
                    value={formData.budget_monthly}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--gray-500)', fontSize: '12px' }}>Average monthly budget allocation</small>
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
                  <span>Active Cost Centre</span>
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
                  {saving ? 'Saving...' : 'Add Cost Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placeholder for Details Modal */}
      {selectedCenter && (
        <div className="modal-overlay" onClick={() => setSelectedCenter(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedCenter.code} - {selectedCenter.name}</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Category:</label>
                <span>{getCategoryLabel(selectedCenter.category)}</span>
              </div>
              <div className="detail-item">
                <label>Annual Budget:</label>
                <span>{formatCurrency(selectedCenter.budget_annual)}</span>
              </div>
              <div className="detail-item">
                <label>Monthly Budget:</label>
                <span>{formatCurrency(selectedCenter.budget_monthly)}</span>
              </div>
              <div className="detail-item">
                <label>YTD Spent:</label>
                <span>{formatCurrency(selectedCenter.total_spent_ytd)}</span>
              </div>
              <div className="detail-item">
                <label>This Month Spent:</label>
                <span>{formatCurrency(selectedCenter.total_spent_this_month)}</span>
              </div>
              <div className="detail-item">
                <label>Annual Remaining:</label>
                <span>{formatCurrency(selectedCenter.remaining_annual)}</span>
              </div>
              <div className="detail-item">
                <label>Monthly Remaining:</label>
                <span>{formatCurrency(selectedCenter.remaining_monthly)}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedCenter(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostCenterPage;
