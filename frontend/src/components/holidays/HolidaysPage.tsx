import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import HolidayStats from './HolidayStats';
import HolidayRequestsTable from './HolidayRequestsTable';
import HolidayRequestFormModal from './HolidayRequestFormModal';
import HolidayCalendar from './HolidayCalendar';
import HolidayBalancesTab from './HolidayBalancesTab';
import BalanceAdjustmentModal from './BalanceAdjustmentModal';
import HolidaySettingsTab from './HolidaySettingsTab';
import {
  getHolidayOverview,
  getHolidayRequests,
  getHolidayBalances,
  getHolidaySettings,
  updateHolidayRequest,
  createHolidayRequest,
  updateHolidaySettings,
  updateDriverHolidayBalance
} from '../../services/holidaysApi';
import {
  HolidayOverview,
  HolidayRequest,
  HolidayBalance,
  HolidaySettings,
  CreateHolidayRequestDto,
  UpdateHolidayRequestDto,
  UpdateHolidaySettingsDto
} from '../../types/holiday.types';
import './Holidays.css';

const HolidaysPage: React.FC = () => {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests' | 'balances' | 'settings'>('calendar');

  // Data states
  const [overview, setOverview] = useState<HolidayOverview | null>(null);
  const [requests, setRequests] = useState<HolidayRequest[]>([]);
  const [balances, setBalances] = useState<HolidayBalance[]>([]);
  const [settings, setSettings] = useState<HolidaySettings | null>(null);

  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<HolidayRequest | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<HolidayBalance | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (tenantId) {
      loadAllData();
    }
  }, [tenantId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverview(),
        loadRequests(),
        loadBalances(),
        loadSettings()
      ]);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const data = await getHolidayOverview(tenantId!);
      setOverview(data);
    } catch {
      // Error handled silently
    }
  };

  const loadRequests = async () => {
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await getHolidayRequests(tenantId!, filters);
      setRequests(data);
    } catch {
      // Error handled silently
    }
  };

  const loadBalances = async () => {
    try {
      const data = await getHolidayBalances(tenantId!);
      setBalances(data);
    } catch {
      // Error handled silently
    }
  };

  const loadSettings = async () => {
    try {
      const data = await getHolidaySettings(tenantId!);
      setSettings(data);
    } catch {
      // Error handled silently
    }
  };

  const handleAddRequest = () => {
    setEditingRequest(null);
    setShowRequestModal(true);
  };

  const handleViewRequest = (requestId: number) => {
    const request = requests.find(r => r.request_id === requestId);
    if (request) {
      setEditingRequest(request);
      setShowRequestModal(true);
    }
  };

  const handleSaveRequest = async (requestData: CreateHolidayRequestDto) => {
    try {
      await createHolidayRequest(tenantId!, requestData);
      await loadRequests();
      await loadOverview();
    } catch (error) {
      throw error;
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await updateHolidayRequest(tenantId!, requestId, { status: 'approved' });
      await loadRequests();
      await loadOverview();
      await loadBalances();
    } catch {
      // Error handled silently
    }
  };

  const handleRejectRequest = async (requestId: number, reason: string) => {
    try {
      await updateHolidayRequest(tenantId!, requestId, {
        status: 'rejected',
        rejection_reason: reason
      });
      await loadRequests();
      await loadOverview();
    } catch {
      // Error handled silently
    }
  };

  const handleSaveSettings = async (newSettings: UpdateHolidaySettingsDto) => {
    try {
      const updated = await updateHolidaySettings(tenantId!, newSettings);
      setSettings(updated);
    } catch (error) {
      throw error;
    }
  };

  const handleAdjustBalance = (driverId: number) => {
    const balance = balances.find(b => b.driver_id === driverId);
    if (balance) {
      setEditingBalance(balance);
      setShowBalanceModal(true);
    }
  };

  const handleSaveBalanceAdjustment = async (driverId: number, adjustment: number, reason: string) => {
    try {
      await updateDriverHolidayBalance(tenantId!, driverId, adjustment, reason);
      await loadBalances();
      await loadOverview();
    } catch (error) {
      throw error;
    }
  };

  if (loading && !overview) {
    return (
      <div className="holidays-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading holidays data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="holidays-page">
      <div className="page-header">
        <div>
          <h1>Holiday Management</h1>
          <p className="page-description">
            Manage driver holidays and customer absences
          </p>
        </div>
        {(activeTab === 'requests' || activeTab === 'calendar') && (
          <button className="btn btn-primary" onClick={handleAddRequest}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Request
          </button>
        )}
      </div>

      {overview && <HolidayStats overview={overview} />}

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
              <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"/>
            </svg>
            Calendar
          </button>
          <button
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests
            {overview && overview.requests?.pending > 0 && (
              <span className="badge badge-warning">{overview.requests.pending}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
            onClick={() => setActiveTab('balances')}
          >
            Balances
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'calendar' && (
            <div className="calendar-tab">
              <HolidayCalendar onViewRequest={handleViewRequest} />
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-tab">
              <div className="filters-bar">
                <div className="filter-group">
                  <label>Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      loadRequests();
                    }}
                    className="form-select"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <HolidayRequestsTable
                requests={requests}
                onViewRequest={handleViewRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            </div>
          )}

          {activeTab === 'balances' && (
            <HolidayBalancesTab
              balances={balances}
              onAdjustBalance={handleAdjustBalance}
              loading={loading}
            />
          )}

          {activeTab === 'settings' && settings && (
            <HolidaySettingsTab
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      </div>

      {showRequestModal && (
        <HolidayRequestFormModal
          request={editingRequest}
          onClose={() => {
            setShowRequestModal(false);
            setEditingRequest(null);
          }}
          onSave={handleSaveRequest}
        />
      )}

      {showBalanceModal && (
        <BalanceAdjustmentModal
          balance={editingBalance}
          onClose={() => {
            setShowBalanceModal(false);
            setEditingBalance(null);
          }}
          onSave={handleSaveBalanceAdjustment}
        />
      )}
    </div>
  );
};

export default HolidaysPage;
