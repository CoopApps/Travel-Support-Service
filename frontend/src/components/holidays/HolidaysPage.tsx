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
      {overview && <HolidayStats overview={overview} />}

      {/* Tab Toggle and Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '3px', borderRadius: '6px' }}>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'calendar' ? 'white' : 'transparent',
              color: activeTab === 'calendar' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'calendar' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'requests' ? 'white' : 'transparent',
              color: activeTab === 'requests' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'requests' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Requests
            {overview && overview.requests?.pending > 0 && (
              <span style={{ background: '#f59e0b', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                {overview.requests.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'balances' ? 'white' : 'transparent',
              color: activeTab === 'balances' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'balances' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '5px 12px',
              background: activeTab === 'settings' ? 'white' : 'transparent',
              color: activeTab === 'settings' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'settings' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Settings
          </button>
        </div>

        {(activeTab === 'requests' || activeTab === 'calendar') && (
          <button
            onClick={handleAddRequest}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Request
          </button>
        )}
      </div>

      <div className="tabs-container">

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
