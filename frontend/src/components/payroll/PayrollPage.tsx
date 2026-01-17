import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { payrollApi } from '../../services/api';
import Modal from '../common/Modal';
import './Payroll.css';

/**
 * Payroll Management Page
 *
 * Comprehensive payroll processing system with:
 * - Stats overview (employees, monthly totals, HMRC due, YTD)
 * - Payroll periods management
 * - Detailed period view with tabs for contracted, freelance, joiners/leavers, summary
 * - Auto-generation, editing, payment tracking, HMRC submission
 */

// ============================================================================
// TYPES
// ============================================================================

interface PayrollStats {
  active_employees: number;
  this_month_gross: number;
  this_month_net: number;
  this_month_hmrc: number;
  ytd_gross: number;
  ytd_net: number;
  ytd_hmrc: number;
}

interface PayrollPeriod {
  period_id: number;
  start_date: string;
  end_date: string;
  period_type: 'weekly' | 'monthly';
  status: 'draft' | 'processed' | 'paid' | 'submitted';
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_ni: number;
  total_pension: number;
  hmrc_payment_due: number;
  created_at: string;
}

interface PayrollRecord {
  record_id: number;
  driver_id: number;
  driver_name: string;
  employment_type: 'contracted' | 'employed' | 'freelance';
  hours_worked?: number;
  hourly_rate?: number;
  salary?: number;
  gross_pay: number;
  tax_deducted: number;
  ni_deducted: number;
  pension_deducted: number;
  other_deductions: number;
  net_pay: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
}

interface FreelanceSubmission {
  submission_id: number;
  driver_id: number;
  driver_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  tax_paid: number;
  ni_paid: number;
  net_amount: number;
  payment_status: 'pending' | 'paid';
  payment_date?: string;
}

interface JoinerLeaver {
  driver_id: number;
  driver_name: string;
  employment_type: string;
  join_date?: string;
  leave_date?: string;
  reason?: string;
}

interface PeriodSummary {
  period: PayrollPeriod;
  contracted_count: number;
  freelance_count: number;
  joiners: JoinerLeaver[];
  leavers: JoinerLeaver[];
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_ni: number;
  total_pension: number;
  hmrc_payment_due: number;
  hmrc_submitted: boolean;
  submission_date?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PayrollPage: React.FC = () => {
  const { tenantId } = useTenant();
  const toast = useToast();

  // Stats state
  const [stats, setStats] = useState<PayrollStats | null>(null);

  // Periods state
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

  // Period details state
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [freelanceSubmissions, setFreelanceSubmissions] = useState<FreelanceSubmission[]>([]);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contracted' | 'freelance' | 'joiners-leavers' | 'summary'>('contracted');

  // Modal state
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (tenantId) {
      loadStats();
      loadPeriods();
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodDetails(selectedPeriod.period_id);
    }
  }, [selectedPeriod]);

  const loadStats = async () => {
    try {
      const data = await payrollApi.getStats(tenantId!);
      setStats(data);
    } catch {
      // Error handled silently
    }
  };

  const loadPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollApi.getPeriods(tenantId!);
      setPeriods(data.periods || []);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load payroll periods'));
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodDetails = async (periodId: number) => {
    try {
      const [recordsData, freelanceData, summaryData] = await Promise.all([
        payrollApi.getRecords(tenantId!, periodId),
        payrollApi.getFreelanceSubmissions(tenantId!, periodId),
        payrollApi.getPeriodSummary(tenantId!, periodId)
      ]);

      setRecords(recordsData);
      setFreelanceSubmissions(freelanceData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load period details'));
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreatePeriod = async (data: { start_date: string; end_date: string; period_type: string }) => {
    try {
      await payrollApi.createPeriod(tenantId!, data);
      await loadPeriods();
      setShowCreatePeriodModal(false);
      toast.success('Payroll period created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create period');
    }
  };

  const handleViewPeriod = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    setActiveTab('contracted');
  };

  const handleDeletePeriod = async (periodId: number) => {
    if (!confirm('Are you sure you want to delete this payroll period? This action cannot be undone.')) {
      return;
    }

    try {
      await payrollApi.deletePeriod(tenantId!, periodId);
      await loadPeriods();
      if (selectedPeriod?.period_id === periodId) {
        setSelectedPeriod(null);
      }
      toast.success('Payroll period deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete period');
    }
  };

  const handleGeneratePayroll = async (periodId: number) => {
    if (!confirm('Generate payroll for all active contracted employees in this period?')) {
      return;
    }

    try {
      await payrollApi.generateRecords(tenantId!, periodId);
      await loadPeriodDetails(periodId);
      toast.success('Payroll records generated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate payroll');
    }
  };

  const handleEditRecord = (record: PayrollRecord) => {
    setEditingRecord(record);
    setShowEditRecordModal(true);
  };

  const handleSaveRecord = async (data: Partial<PayrollRecord>) => {
    if (!editingRecord) return;

    try {
      await payrollApi.updateRecord(tenantId!, editingRecord.record_id, data);
      await loadPeriodDetails(selectedPeriod!.period_id);
      setShowEditRecordModal(false);
      setEditingRecord(null);
      toast.success('Payroll record updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update record');
    }
  };

  const handleMarkPaid = async (recordId: number) => {
    try {
      await payrollApi.updateRecord(tenantId!, recordId, {
        payment_status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      });
      await loadPeriodDetails(selectedPeriod!.period_id);
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to mark as paid');
    }
  };

  const handleExportCSV = () => {
    if (!records.length) return;

    const headers = ['Driver Name', 'Employment Type', 'Hours/Rate/Salary', 'Gross', 'Tax', 'NI', 'Pension', 'Other', 'Net', 'Status'];
    const rows = records.map(r => [
      r.driver_name,
      r.employment_type,
      r.hours_worked ? `${r.hours_worked}h @ £${r.hourly_rate}` : `£${r.salary}`,
      r.gross_pay.toFixed(2),
      r.tax_deducted.toFixed(2),
      r.ni_deducted.toFixed(2),
      r.pension_deducted.toFixed(2),
      r.other_deductions.toFixed(2),
      r.net_pay.toFixed(2),
      r.payment_status
    ]);

    // Properly escape CSV values to prevent injection and handle special characters
    const escapeCsvValue = (val: any): string => {
      const str = String(val ?? '');
      // If value contains comma, quote, newline, or starts with special chars, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || /^[=+\-@]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers, ...rows].map(row => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${selectedPeriod?.start_date}-${selectedPeriod?.end_date}.csv`;
    a.click();
  };

  // ============================================================================
  // FORMATTERS
  // ============================================================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'status-draft' },
      processed: { label: 'Processed', className: 'status-processed' },
      paid: { label: 'Paid', className: 'status-paid' },
      submitted: { label: 'Submitted', className: 'status-submitted' },
      pending: { label: 'Pending', className: 'status-pending' },
      failed: { label: 'Failed', className: 'status-failed' }
    };
    const badge = badges[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="payroll-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Payroll Management</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
            Manage employee payroll, track payments, and HMRC submissions
          </p>
        </div>
        <button
          className="btn btn-success"
          onClick={() => setShowCreatePeriodModal(true)}
        >
          <PlusIcon size={16} />
          Create Pay Period
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            label="Active Employees"
            value={stats.active_employees.toString()}
            theme="blue"
          />
          <StatCard
            label="This Month Gross"
            value={formatCurrency(stats.this_month_gross)}
            subtitle={`Net: ${formatCurrency(stats.this_month_net)}`}
            theme="green"
          />
          <StatCard
            label="HMRC Due"
            value={formatCurrency(stats.this_month_hmrc)}
            subtitle="Tax + NI to remit"
            theme="orange"
          />
          <StatCard
            label="YTD Gross"
            value={formatCurrency(stats.ytd_gross)}
            subtitle={`Net: ${formatCurrency(stats.ytd_net)}`}
            theme="purple"
          />
          <StatCard
            label="YTD Tax & NI"
            value={formatCurrency(stats.ytd_hmrc)}
            subtitle="HMRC to remit"
            theme="teal"
          />
        </div>
      )}

      {/* Main Content */}
      {!selectedPeriod ? (
        // Periods List View
        <div className="periods-section">
          <h3>Payroll Periods</h3>

          {loading ? (
            <div className="loading-state">Loading payroll periods...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : periods.length === 0 ? (
            <div className="empty-state">
              <p>No payroll periods created yet</p>
              <button className="btn btn-primary" onClick={() => setShowCreatePeriodModal(true)}>
                Create First Period
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Gross</th>
                    <th>Net</th>
                    <th>Tax</th>
                    <th>NI</th>
                    <th>HMRC Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period.period_id}>
                      <td>
                        <strong>{formatDate(period.start_date)}</strong> - {formatDate(period.end_date)}
                      </td>
                      <td>
                        <span className={`type-badge type-${period.period_type}`}>
                          {period.period_type}
                        </span>
                      </td>
                      <td>{getStatusBadge(period.status)}</td>
                      <td>{formatCurrency(period.total_gross)}</td>
                      <td>{formatCurrency(period.total_net)}</td>
                      <td>{formatCurrency(period.total_tax)}</td>
                      <td>{formatCurrency(period.total_ni)}</td>
                      <td><strong>{formatCurrency(period.hmrc_payment_due)}</strong></td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewPeriod(period)}
                          >
                            View
                          </button>
                          {period.status === 'draft' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeletePeriod(period.period_id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Period Details View
        <div className="period-details">
          <div className="period-header">
            <button className="btn btn-outline" onClick={() => setSelectedPeriod(null)}>
              <BackIcon size={16} />
              Back to Periods
            </button>
            <div className="period-info">
              <h3>
                {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
                <span style={{ marginLeft: '1rem' }}>{getStatusBadge(selectedPeriod.status)}</span>
              </h3>
            </div>
            <div className="period-actions">
              {selectedPeriod.status === 'draft' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleGeneratePayroll(selectedPeriod.period_id)}
                >
                  Auto-Generate Payroll
                </button>
              )}
              <button className="btn btn-outline" onClick={handleExportCSV}>
                <DownloadIcon size={16} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'contracted' ? 'active' : ''}`}
                onClick={() => setActiveTab('contracted')}
              >
                Contracted Employees
                <span className="tab-badge">{records.filter(r => r.employment_type !== 'freelance').length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'freelance' ? 'active' : ''}`}
                onClick={() => setActiveTab('freelance')}
              >
                Freelance Submissions
                <span className="tab-badge">{freelanceSubmissions.length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'joiners-leavers' ? 'active' : ''}`}
                onClick={() => setActiveTab('joiners-leavers')}
              >
                Joiners & Leavers
                <span className="tab-badge">
                  {summary ? summary.joiners.length + summary.leavers.length : 0}
                </span>
              </button>
              <button
                className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'contracted' && (
              <ContractedEmployeesTab
                records={records.filter(r => r.employment_type !== 'freelance')}
                onEdit={handleEditRecord}
                onMarkPaid={handleMarkPaid}
                formatCurrency={formatCurrency}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeTab === 'freelance' && (
              <FreelanceSubmissionsTab
                submissions={freelanceSubmissions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeTab === 'joiners-leavers' && summary && (
              <JoinersLeaversTab
                joiners={summary.joiners}
                leavers={summary.leavers}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'summary' && summary && (
              <SummaryTab
                summary={summary}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreatePeriodModal && (
        <CreatePeriodModal
          onClose={() => setShowCreatePeriodModal(false)}
          onCreate={handleCreatePeriod}
        />
      )}

      {showEditRecordModal && editingRecord && (
        <EditRecordModal
          record={editingRecord}
          onClose={() => {
            setShowEditRecordModal(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  theme: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, theme }) => {
  return (
    <div className={`stat-card stat-card-${theme}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
};

// ============================================================================
// CONTRACTED EMPLOYEES TAB
// ============================================================================

interface ContractedEmployeesTabProps {
  records: PayrollRecord[];
  onEdit: (record: PayrollRecord) => void;
  onMarkPaid: (recordId: number) => void;
  formatCurrency: (amount: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const ContractedEmployeesTab: React.FC<ContractedEmployeesTabProps> = ({
  records,
  onEdit,
  onMarkPaid,
  formatCurrency,
  getStatusBadge
}) => {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <p>No contracted employee records for this period</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Driver Name</th>
            <th>Type</th>
            <th>Hours/Rate/Salary</th>
            <th>Gross</th>
            <th>Tax</th>
            <th>NI</th>
            <th>Pension</th>
            <th>Other</th>
            <th>Net</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.record_id}>
              <td><strong>{record.driver_name}</strong></td>
              <td>
                <span className={`type-badge type-${record.employment_type}`}>
                  {record.employment_type}
                </span>
              </td>
              <td>
                {record.hours_worked ? (
                  <span>{record.hours_worked}h @ {formatCurrency(record.hourly_rate!)}</span>
                ) : (
                  <span>{formatCurrency(record.salary!)}</span>
                )}
              </td>
              <td><strong>{formatCurrency(record.gross_pay)}</strong></td>
              <td>{formatCurrency(record.tax_deducted)}</td>
              <td>{formatCurrency(record.ni_deducted)}</td>
              <td>{formatCurrency(record.pension_deducted)}</td>
              <td>{formatCurrency(record.other_deductions)}</td>
              <td><strong>{formatCurrency(record.net_pay)}</strong></td>
              <td>{getStatusBadge(record.payment_status)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onEdit(record)}
                  >
                    Edit
                  </button>
                  {record.payment_status === 'pending' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => onMarkPaid(record.record_id)}
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// FREELANCE SUBMISSIONS TAB
// ============================================================================

interface FreelanceSubmissionsTabProps {
  submissions: FreelanceSubmission[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const FreelanceSubmissionsTab: React.FC<FreelanceSubmissionsTabProps> = ({
  submissions,
  formatCurrency,
  formatDate,
  getStatusBadge
}) => {
  if (submissions.length === 0) {
    return (
      <div className="empty-state">
        <p>No freelance submissions for this period</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Driver Name</th>
            <th>Invoice #</th>
            <th>Invoice Date</th>
            <th>Amount</th>
            <th>Tax Paid</th>
            <th>NI Paid</th>
            <th>Net Amount</th>
            <th>Status</th>
            <th>Payment Date</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(sub => (
            <tr key={sub.submission_id}>
              <td><strong>{sub.driver_name}</strong></td>
              <td>{sub.invoice_number}</td>
              <td>{formatDate(sub.invoice_date)}</td>
              <td><strong>{formatCurrency(sub.total_amount)}</strong></td>
              <td>{formatCurrency(sub.tax_paid)}</td>
              <td>{formatCurrency(sub.ni_paid)}</td>
              <td><strong>{formatCurrency(sub.net_amount)}</strong></td>
              <td>{getStatusBadge(sub.payment_status)}</td>
              <td>{sub.payment_date ? formatDate(sub.payment_date) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// JOINERS & LEAVERS TAB
// ============================================================================

interface JoinersLeaversTabProps {
  joiners: JoinerLeaver[];
  leavers: JoinerLeaver[];
  formatDate: (date: string) => string;
}

const JoinersLeaversTab: React.FC<JoinersLeaversTabProps> = ({
  joiners,
  leavers,
  formatDate
}) => {
  return (
    <div className="joiners-leavers-container">
      <div className="joiners-section">
        <h4>New Joiners</div>
        {joiners.length === 0 ? (
          <p className="empty-message">No new joiners in this period</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employment Type</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {joiners.map(joiner => (
                  <tr key={joiner.driver_id}>
                    <td><strong>{joiner.driver_name}</strong></td>
                    <td>
                      <span className={`type-badge type-${joiner.employment_type}`}>
                        {joiner.employment_type}
                      </span>
                    </td>
                    <td>{joiner.join_date ? formatDate(joiner.join_date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="leavers-section">
        <h4>Leavers</div>
        {leavers.length === 0 ? (
          <p className="empty-message">No leavers in this period</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employment Type</th>
                  <th>Leave Date</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {leavers.map(leaver => (
                  <tr key={leaver.driver_id}>
                    <td><strong>{leaver.driver_name}</strong></td>
                    <td>
                      <span className={`type-badge type-${leaver.employment_type}`}>
                        {leaver.employment_type}
                      </span>
                    </td>
                    <td>{leaver.leave_date ? formatDate(leaver.leave_date) : '-'}</td>
                    <td>{leaver.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUMMARY TAB
// ============================================================================

interface SummaryTabProps {
  summary: PeriodSummary;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  summary,
  formatCurrency,
  formatDate,
  getStatusBadge
}) => {
  return (
    <div className="summary-container">
      <div className="summary-grid">
        <div className="summary-card">
          <h4>Period Information</div>
          <div className="info-row">
            <span className="info-label">Period:</span>
            <span className="info-value">
              {formatDate(summary.period.start_date)} - {formatDate(summary.period.end_date)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Type:</span>
            <span className="info-value">{summary.period.period_type}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className="info-value">{getStatusBadge(summary.period.status)}</span>
          </div>
        </div>

        <div className="summary-card">
          <h4>Employee Count</div>
          <div className="info-row">
            <span className="info-label">Contracted:</span>
            <span className="info-value">{summary.contracted_count}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Freelance:</span>
            <span className="info-value">{summary.freelance_count}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Joiners:</span>
            <span className="info-value">{summary.joiners.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Leavers:</span>
            <span className="info-value">{summary.leavers.length}</span>
          </div>
        </div>

        <div className="summary-card summary-totals">
          <h4>Period Totals</div>
          <div className="info-row">
            <span className="info-label">Total Gross:</span>
            <span className="info-value"><strong>{formatCurrency(summary.total_gross)}</strong></span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Tax:</span>
            <span className="info-value">{formatCurrency(summary.total_tax)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total NI:</span>
            <span className="info-value">{formatCurrency(summary.total_ni)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Pension:</span>
            <span className="info-value">{formatCurrency(summary.total_pension)}</span>
          </div>
          <div className="info-row total-row">
            <span className="info-label">Total Net:</span>
            <span className="info-value"><strong>{formatCurrency(summary.total_net)}</strong></span>
          </div>
        </div>

        <div className="summary-card hmrc-card">
          <h4>HMRC Payment</div>
          <div className="info-row">
            <span className="info-label">Amount Due:</span>
            <span className="info-value">
              <strong style={{ fontSize: '1.5rem', color: 'var(--orange-600)' }}>
                {formatCurrency(summary.hmrc_payment_due)}
              </strong>
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Submitted:</span>
            <span className="info-value">
              {summary.hmrc_submitted ? (
                <span className="status-badge status-submitted">Yes</span>
              ) : (
                <span className="status-badge status-pending">Not Yet</span>
              )}
            </span>
          </div>
          {summary.submission_date && (
            <div className="info-row">
              <span className="info-label">Submission Date:</span>
              <span className="info-value">{formatDate(summary.submission_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE PERIOD MODAL
// ============================================================================

interface CreatePeriodModalProps {
  onClose: () => void;
  onCreate: (data: { start_date: string; end_date: string; period_type: string }) => void;
}

const CreatePeriodModal: React.FC<CreatePeriodModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    period_type: 'monthly'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Payroll Period">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="required">Start Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.start_date}
            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="required">End Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.end_date}
            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="required">Period Type</label>
          <select
            className="form-select"
            value={formData.period_type}
            onChange={e => setFormData({ ...formData, period_type: e.target.value })}
            required
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create Period
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// EDIT RECORD MODAL
// ============================================================================

interface EditRecordModalProps {
  record: PayrollRecord;
  onClose: () => void;
  onSave: (data: Partial<PayrollRecord>) => void;
}

const EditRecordModal: React.FC<EditRecordModalProps> = ({ record, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    hours_worked: record.hours_worked || 0,
    hourly_rate: record.hourly_rate || 0,
    salary: record.salary || 0,
    gross_pay: record.gross_pay,
    tax_deducted: record.tax_deducted,
    ni_deducted: record.ni_deducted,
    pension_deducted: record.pension_deducted,
    other_deductions: record.other_deductions,
    notes: record.notes || ''
  });

  const calculateNet = () => {
    return formData.gross_pay - formData.tax_deducted - formData.ni_deducted - formData.pension_deducted - formData.other_deductions;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      net_pay: calculateNet()
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Payroll - ${record.driver_name}`} maxWidth="800px">
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {record.hours_worked !== undefined && (
            <>
              <div className="form-group">
                <label>Hours Worked</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.hours_worked}
                  onChange={e => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.hourly_rate}
                  onChange={e => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {record.salary !== undefined && (
            <div className="form-group">
              <label>Salary</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Gross Pay</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.gross_pay}
              onChange={e => setFormData({ ...formData, gross_pay: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>Tax Deducted</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.tax_deducted}
              onChange={e => setFormData({ ...formData, tax_deducted: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>NI Deducted</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.ni_deducted}
              onChange={e => setFormData({ ...formData, ni_deducted: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>Pension Deducted</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.pension_deducted}
              onChange={e => setFormData({ ...formData, pension_deducted: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>Other Deductions</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.other_deductions}
              onChange={e => setFormData({ ...formData, other_deductions: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="net-pay-display">
          <strong>Net Pay:</strong> £{calculateNet().toFixed(2)}
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            className="form-textarea"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-success">
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const PlusIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BackIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const DownloadIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default PayrollPage;
