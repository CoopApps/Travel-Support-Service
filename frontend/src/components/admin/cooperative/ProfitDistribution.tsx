import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface ProfitDistributionProps {
  tenantId: number;
}

const ProfitDistribution: React.FC<ProfitDistributionProps> = ({ tenantId }) => {
  const [periods, setPeriods] = useState<cooperativeApi.DistributionPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<cooperativeApi.DistributionPeriod | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<cooperativeApi.DistributionPeriod | null>(null);
  const [periodDetails, setPeriodDetails] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    period_type: 'quarterly' as 'quarterly' | 'annual' | 'special',
    period_start: '',
    period_end: '',
    total_revenue: '',
    total_expenses: '',
    total_profit: '',
    reserve_percentage: '20',
    distribution_percentage: '80',
    notes: '',
  });

  useEffect(() => {
    loadPeriods();
  }, [tenantId, filterStatus, filterType]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const { periods: data } = await cooperativeApi.getDistributionPeriods(tenantId, {
        status: filterStatus || undefined,
        period_type: filterType || undefined,
      });
      setPeriods(data);
    } catch (error) {
      console.error('Error loading distribution periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (period?: cooperativeApi.DistributionPeriod) => {
    setEditingPeriod(period || null);

    if (period) {
      setFormData({
        period_type: period.period_type,
        period_start: period.period_start.split('T')[0],
        period_end: period.period_end.split('T')[0],
        total_revenue: period.total_revenue?.toString() || '',
        total_expenses: period.total_expenses?.toString() || '',
        total_profit: period.total_profit?.toString() || '',
        reserve_percentage: period.reserve_percentage.toString(),
        distribution_percentage: period.distribution_percentage.toString(),
        notes: period.notes || '',
      });
    } else {
      const today = new Date();
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);

      setFormData({
        period_type: 'quarterly',
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: quarterEnd.toISOString().split('T')[0],
        total_revenue: '',
        total_expenses: '',
        total_profit: '',
        reserve_percentage: '20',
        distribution_percentage: '80',
        notes: '',
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPeriod(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        total_revenue: formData.total_revenue ? parseFloat(formData.total_revenue) : undefined,
        total_expenses: formData.total_expenses ? parseFloat(formData.total_expenses) : undefined,
        total_profit: formData.total_profit ? parseFloat(formData.total_profit) : undefined,
        reserve_percentage: parseFloat(formData.reserve_percentage),
        distribution_percentage: parseFloat(formData.distribution_percentage),
      };

      if (editingPeriod) {
        await cooperativeApi.updateDistributionPeriod(tenantId, editingPeriod.period_id, data);
      } else {
        await cooperativeApi.createDistributionPeriod(tenantId, data);
      }

      handleCloseModal();
      loadPeriods();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save distribution period');
    }
  };

  const handleDelete = async (periodId: number) => {
    if (!confirm('Delete this distribution period?')) return;

    try {
      await cooperativeApi.deleteDistributionPeriod(tenantId, periodId);
      loadPeriods();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete period');
    }
  };

  const handleCalculate = async (periodId: number) => {
    try {
      const result = await cooperativeApi.calculateDistributions(tenantId, periodId);
      alert(`Distributions calculated! ${result.result.distributions_created} members will receive distributions.`);
      loadPeriods();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to calculate distributions');
    }
  };

  const handleApprove = async (periodId: number) => {
    if (!confirm('Approve this distribution period? This will allow payments to be processed.')) return;

    try {
      await cooperativeApi.approveDistributionPeriod(tenantId, periodId);
      alert('Distribution period approved!');
      loadPeriods();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve period');
    }
  };

  const handleShowDetails = async (period: cooperativeApi.DistributionPeriod) => {
    try {
      const details = await cooperativeApi.getDistributionPeriod(tenantId, period.period_id);
      setPeriodDetails(details);
      setSelectedPeriod(period);
      setShowDetailsModal(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load period details');
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPeriod(null);
    setPeriodDetails(null);
  };

  const handleMarkPaid = async (distributionId: number) => {
    const method = prompt('Payment method (bank_transfer, check, reinvest):');
    if (!method) return;

    const reference = prompt('Payment reference (optional):') || undefined;

    try {
      await cooperativeApi.markDistributionPaid(tenantId, distributionId, {
        payment_method: method,
        payment_reference: reference,
      });
      // Reload details
      if (selectedPeriod) {
        const details = await cooperativeApi.getDistributionPeriod(tenantId, selectedPeriod.period_id);
        setPeriodDetails(details);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to mark as paid');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      calculated: '#3b82f6',
      approved: '#10b981',
      distributed: '#059669',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading distribution periods...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Profit Distribution & Dividends
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Manage profit shares for workers and dividends for investors
        </p>
      </div>

      {/* Filters & Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '150px',
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="calculated">Calculated</option>
          <option value="approved">Approved</option>
          <option value="distributed">Distributed</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '150px',
          }}
        >
          <option value="">All Types</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
          <option value="special">Special</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={() => handleOpenModal()}
          style={{ marginLeft: 'auto' }}
        >
          + New Distribution Period
        </button>
      </div>

      {/* Distribution Periods Table */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Profit</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Distribution Pool</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No distribution periods found. Create your first period to get started.
                </td>
              </tr>
            ) : (
              periods.map((period) => (
                <tr key={period.period_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>
                      {new Date(period.period_start).toLocaleDateString()} - {new Date(period.period_end).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: '#eff6ff',
                      color: '#3b82f6',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {period.period_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500 }}>
                    {period.total_profit ? formatCurrency(period.total_profit) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500, color: '#10b981' }}>
                    {period.distribution_pool ? formatCurrency(period.distribution_pool) : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: getStatusColor(period.status) + '15',
                      color: getStatusColor(period.status),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {period.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {period.status === 'draft' && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenModal(period)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleCalculate(period.period_id)}
                          >
                            Calculate
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(period.period_id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {period.status === 'calculated' && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleShowDetails(period)}
                          >
                            View Details
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(period.period_id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleCalculate(period.period_id)}
                          >
                            Recalculate
                          </button>
                        </>
                      )}
                      {(period.status === 'approved' || period.status === 'distributed') && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleShowDetails(period)}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Period Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingPeriod ? 'Edit Distribution Period' : 'New Distribution Period'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Period Type</label>
                  <select
                    value={formData.period_type}
                    onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
                    required
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="special">Special</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Period Start</label>
                    <input
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Period End</label>
                    <input
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Total Revenue (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_revenue}
                      onChange={(e) => setFormData({ ...formData, total_revenue: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Expenses (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_expenses}
                      onChange={(e) => setFormData({ ...formData, total_expenses: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Profit (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_profit}
                      onChange={(e) => setFormData({ ...formData, total_profit: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Reserve Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.reserve_percentage}
                      onChange={(e) => setFormData({ ...formData, reserve_percentage: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Distribution Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.distribution_percentage}
                      onChange={(e) => setFormData({ ...formData, distribution_percentage: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPeriod ? 'Update' : 'Create'} Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPeriod && periodDetails && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Distribution Details</h3>
              <button className="modal-close" onClick={handleCloseDetailsModal}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Summary */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                      {formatCurrency(periodDetails.summary.total_amount || 0)}
                    </div>
                  </div>
                  <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Paid</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
                      {formatCurrency(periodDetails.summary.total_paid || 0)}
                    </div>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Unpaid</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#f59e0b' }}>
                      {formatCurrency(periodDetails.summary.total_unpaid || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Distributions */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
                  Member Distributions ({periodDetails.distributions.length})
                </h4>
                <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Member</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>%</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                        <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                        <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodDetails.distributions.map((dist: cooperativeApi.MemberDistribution) => (
                        <tr key={dist.distribution_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{dist.member_name}</td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>
                            <span style={{
                              background: dist.distribution_type === 'profit_share' ? '#dbeafe' : '#fef3c7',
                              color: dist.distribution_type === 'profit_share' ? '#1e40af' : '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}>
                              {dist.distribution_type === 'profit_share' ? 'Profit Share' : 'Dividend'}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
                            {(dist.ownership_percentage || dist.investment_percentage || 0).toFixed(2)}%
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
                            {formatCurrency(dist.distribution_amount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {dist.paid ? (
                              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 500 }}>Paid</span>
                            ) : (
                              <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 500 }}>Unpaid</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {!dist.paid && selectedPeriod.status === 'approved' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleMarkPaid(dist.distribution_id)}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitDistribution;
