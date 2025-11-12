import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import OfficeStaffPage from './OfficeStaffPage';
import CostCenterPage from './CostCenterPage';
import TimesheetApprovalPage from './TimesheetApprovalPage';
import CooperativeStructurePage from './CooperativeStructurePage';
import ProfitabilityAnalytics from './ProfitabilityAnalytics';
import './AdminDashboard.css';

type AdminTab = 'staff' | 'cost-centers' | 'timesheets' | 'cooperative' | 'profitability';

/**
 * Company Admin Dashboard
 *
 * Central hub for managing back-office operations including:
 * - Office staff management (non-driver employees)
 * - Cost center tracking and budget management
 * - Driver timesheet approval workflow
 */
function AdminDashboard() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<AdminTab>('staff');

  if (!tenant) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if tenant is a cooperative
  const isCooperative = tenant.organization_type === 'cooperative' ||
                        tenant.organization_type === 'cooperative_commonwealth' ||
                        !!tenant.cooperative_model;

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>Company Admin</h1>
        <p className="page-subtitle">Back-office management and administration</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <span className="tab-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          Office Staff
        </button>

        <button
          className={`tab-button ${activeTab === 'cost-centers' ? 'active' : ''}`}
          onClick={() => setActiveTab('cost-centers')}
        >
          <span className="tab-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </span>
          Cost Centers
        </button>

        <button
          className={`tab-button ${activeTab === 'timesheets' ? 'active' : ''}`}
          onClick={() => setActiveTab('timesheets')}
        >
          <span className="tab-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          </span>
          Timesheet Approval
        </button>

        {isCooperative && (
          <button
            className={`tab-button ${activeTab === 'cooperative' ? 'active' : ''}`}
            onClick={() => setActiveTab('cooperative')}
          >
            <span className="tab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
                <path d="M16.24 7.76l-2.12 2.12" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </span>
            Co-operative Structure
          </button>
        )}

        <button
          className={`tab-button ${activeTab === 'profitability' ? 'active' : ''}`}
          onClick={() => setActiveTab('profitability')}
        >
          <span className="tab-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          Profitability Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'staff' && <OfficeStaffPage />}
        {activeTab === 'cost-centers' && <CostCenterPage />}
        {activeTab === 'timesheets' && <TimesheetApprovalPage />}
        {activeTab === 'cooperative' && isCooperative && <CooperativeStructurePage />}
        {activeTab === 'profitability' && <ProfitabilityAnalytics />}
      </div>
    </div>
  );
}

export default AdminDashboard;
