import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTenant } from '../../context/TenantContext';
import { useServiceContext } from '../../contexts/ServiceContext';
import { dashboardApi, DashboardOverview } from '../../services/dashboardApi';
import { vehicleApi, customerApi, driverApi, adminAnalyticsApi } from '../../services/api';
import IncidentFormModal from '../vehicles/IncidentFormModal';
import SafeguardingFormModal from '../safeguarding/SafeguardingFormModal';
import BusDashboard from '../bus/BusDashboard';
import '../../pages/AdminDashboard.css';

/**
 * Service-Aware Dashboard Page Component
 *
 * Displays different dashboards based on active service:
 * - Transport: Shows trips, ad-hoc bookings, driver assignments
 * - Bus: Shows scheduled routes, timetables, seat availability
 */

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  instructions: string;
  timestamp?: string;
}

function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { tenant, tenantId } = useTenant();
  const { activeService } = useServiceContext();
  const navigate = useNavigate();

  // Transport dashboard state - must be called before any conditional returns
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [profitability, setProfitability] = useState<any>(null);
  const [loadingProfitability, setLoadingProfitability] = useState(false);

  // Quick Actions State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showSafeguardingModal, setShowSafeguardingModal] = useState(false);
  const [showLateArrivalModal, setShowLateArrivalModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<string>('');
  const [scheduleModalTitle, setScheduleModalTitle] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.tenantId && activeService !== 'bus') {
      loadDashboard();
      loadProfitability();
      // Auto-refresh every 5 minutes
      const interval = setInterval(() => {
        loadDashboard();
        loadProfitability();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.tenantId, activeService]);

  // If bus service is active, show bus dashboard (after ALL hooks are called)
  if (activeService === 'bus') {
    return <BusDashboard />;
  }

  // Otherwise show transport dashboard

  const loadDashboard = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      setError('');
      const data = await dashboardApi.getOverview(user.tenantId);
      setDashboard(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitability = async () => {
    if (!tenantId) return;

    try {
      setLoadingProfitability(true);
      // Get last 30 days of profitability data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await adminAnalyticsApi.getProfitabilityDashboard(tenantId, {
        startDate,
        endDate
      });
      setProfitability(data);
    } catch {
      // Error handled silently
    } finally {
      setLoadingProfitability(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  // Quick Actions Handlers
  const handleViewSchedule = async (daysOffset: number, title: string) => {
    if (!tenantId) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    setScheduleModalDate(dateStr);
    setScheduleModalTitle(title);
    setShowScheduleModal(true);
    setLoadingSchedule(true);

    try {
      // Fetch schedule for the specific date
      // Note: This uses tenant_trips table for one-off bookings
      // Dashboard shows tenant_customers.schedule for recurring schedules
      const response = await fetch(`/api/tenants/${tenantId}/schedules/daily?date=${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load schedule');

      const data = await response.json();

      // If no trips found, show message about using recurring schedules
      if (!data.journeys || data.journeys.length === 0) {
        setScheduleData({
          ...data,
          note: 'No specific trips booked. Check Schedules page for recurring customer schedules.'
        });
      } else {
        setScheduleData(data);
      }
    } catch {
      setScheduleData(null);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleViewTomorrowSchedule = () => {
    handleViewSchedule(1, "Tomorrow's Schedule");
  };

  const handleViewTodaySchedule = () => {
    handleViewSchedule(0, "Today's Schedule");
  };

  const handleReportIncident = async () => {
    if (!tenantId) return;
    // Load vehicles and drivers for incident form
    try {
      const [vehiclesData, driversResponse] = await Promise.all([
        vehicleApi.getVehicles(tenantId),
        driverApi.getDrivers(tenantId)
      ]);
      // Vehicles API returns array directly, drivers API returns { drivers: [...], total, page, etc }
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversResponse) ? driversResponse : (driversResponse?.drivers || []));
      setShowIncidentModal(true);
    } catch {
      // Error handled silently
    }
  };

  const handleReportSafeguarding = async () => {
    if (!tenantId) return;
    // Load drivers and customers for safeguarding form
    try {
      const [driversResponse, customersResponse] = await Promise.all([
        driverApi.getDrivers(tenantId),
        customerApi.getCustomers(tenantId)
      ]);
      // Drivers API returns { drivers: [...], total, page, etc }
      // Customers API returns { customers: [...], total, page, etc }
      setDrivers(Array.isArray(driversResponse) ? driversResponse : (driversResponse?.drivers || []));
      setCustomers(Array.isArray(customersResponse) ? customersResponse : (customersResponse?.customers || []));
      setShowSafeguardingModal(true);
    } catch {
      // Error handled silently
    }
  };

  const handleLogLateArrival = async () => {
    if (!tenantId) return;
    // Load customers for late arrival form
    try {
      const customersResponse = await customerApi.getCustomers(tenantId);
      // Customers API returns { customers: [...], total, page, etc }
      setCustomers(Array.isArray(customersResponse) ? customersResponse : (customersResponse?.customers || []));
      setShowLateArrivalModal(true);
    } catch {
      // Error handled silently
    }
  };

  const handleExportReport = () => {
    if (!dashboard) return;

    // Generate CSV report of today's data
    const today = new Date().toLocaleDateString('en-GB');
    const csvData: string[] = [];

    // Header
    csvData.push(`Travel Support System - Daily Report,${today}`);
    csvData.push('');

    // Stats Summary
    csvData.push('STATISTICS');
    csvData.push(`Revenue This Week,£${dashboard.stats?.revenueThisWeek || 0}`);
    csvData.push(`Journeys This Week,${dashboard.stats?.journeysThisWeek || 0}`);
    csvData.push(`Journeys Today,${dashboard.stats?.journeysToday || 0}`);
    csvData.push(`Active Customers,${dashboard.stats?.activeCustomers || 0}`);
    csvData.push(`Active Drivers,${dashboard.stats?.activeDrivers || 0}`);
    csvData.push('');

    // Critical Issues
    csvData.push('CRITICAL ISSUES');
    csvData.push(`Total,${dashboard.summary?.criticalTasks || 0}`);
    csvData.push(`Unassigned Journeys,${dashboard.tasks?.unassignedJourneys?.count || 0}`);
    csvData.push(`Expired MOTs,${dashboard.tasks?.expiredMots?.count || 0}`);
    csvData.push(`Safeguarding Reports Pending,${dashboard.tasks?.safeguardingReports?.count || 0}`);
    csvData.push('');

    // Today's Journeys
    if (dashboard.today?.journeys?.items?.length > 0) {
      csvData.push('TODAY\'S JOURNEYS');
      csvData.push('Customer,Pickup Time,Destination,Assigned');
      dashboard.today.journeys.items.forEach((journey: any) => {
        csvData.push(`${journey.customer_name},${journey.today_schedule?.pickupTime || ''},${journey.today_schedule?.destination || ''},${journey.today_schedule?.driverId ? 'Yes' : 'No'}`);
      });
      csvData.push('');
    }

    // Drivers on Duty
    if (dashboard.today?.drivers?.items?.length > 0) {
      csvData.push('DRIVERS ON DUTY');
      csvData.push('Driver,Vehicle,Status');
      dashboard.today.drivers.items.forEach((driver: any) => {
        csvData.push(`${driver.name},${driver.registration || 'None'},${driver.on_leave ? 'On Leave' : driver.vehicle_id ? 'Ready' : 'No Vehicle'}`);
      });
      csvData.push('');
    }

    // Create download
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateAlerts = (): Alert[] => {
    if (!dashboard) return [];

    const alerts: Alert[] = [];

    // Critical Alerts
    dashboard.tasks.expiredMots.items?.forEach((item: any) => {
      alerts.push({
        id: `expired-mot-${item.vehicle_id}`,
        type: 'critical',
        message: `${item.registration} (${item.make} ${item.model}) has EXPIRED MOT - ${Math.abs(item.days_expired)} days overdue`,
        instructions: 'Go to Fleet → Vehicles → Update MOT date or take vehicle off the road immediately'
      });
    });

    dashboard.tasks.safeguardingReports.items?.forEach((item: any) => {
      alerts.push({
        id: `safeguarding-${item.report_id}`,
        type: 'critical',
        message: `Safeguarding report: ${item.incident_type} (${item.severity}) - ${item.driver_name || item.customer_name}`,
        instructions: 'Go to Compliance → Safeguarding Reports → Review and take appropriate action',
        timestamp: item.created_at
      });
    });

    dashboard.tasks.overdueInvoices.items?.forEach((item: any) => {
      if (item.days_overdue > 7) {
        alerts.push({
          id: `overdue-invoice-${item.invoice_id}`,
          type: 'critical',
          message: `Invoice ${item.invoice_number} is ${item.days_overdue} days overdue - £${item.total} from ${item.provider_name}`,
          instructions: 'Go to Billing → Invoices → Contact provider or mark as paid',
          timestamp: item.due_date
        });
      }
    });

    // Expired and Critical Documents
    dashboard.tasks.expiringDocuments.items?.forEach((item: any) => {
      const categoryLabel = item.document_category?.replace(/_/g, ' ') || 'Document';
      const entityInfo = item.entity_name ? ` for ${item.entity_name}` : '';

      if (item.expiry_status === 'expired') {
        alerts.push({
          id: `expired-doc-${item.document_id}`,
          type: 'critical',
          message: `${categoryLabel}${entityInfo} EXPIRED ${Math.abs(item.days_until_expiry)} days ago`,
          instructions: 'Go to Documents → Renew or update this document immediately',
          timestamp: item.expiry_date
        });
      } else if (item.expiry_status === 'critical') {
        alerts.push({
          id: `critical-doc-${item.document_id}`,
          type: 'critical',
          message: `${categoryLabel}${entityInfo} expires in ${item.days_until_expiry} days (URGENT)`,
          instructions: 'Go to Documents → Renew this document immediately',
          timestamp: item.expiry_date
        });
      }
    });

    // Warning Alerts
    dashboard.tasks.expiringMots.items?.forEach((item: any) => {
      alerts.push({
        id: `expiring-mot-${item.vehicle_id}`,
        type: 'warning',
        message: `${item.registration} (${item.make} ${item.model}) MOT expires in ${item.days_until_expiry} days`,
        instructions: 'Go to Fleet → Vehicles → Schedule MOT appointment',
        timestamp: item.mot_date
      });
    });

    dashboard.tasks.pendingTimesheets.items?.forEach((item: any) => {
      alerts.push({
        id: `timesheet-${item.submission_id}`,
        type: 'warning',
        message: `${item.driver_name} submitted timesheet for £${item.invoice_amount}`,
        instructions: 'Go to Finance → Timesheets → Review and approve or reject',
        timestamp: item.created_at
      });
    });

    dashboard.tasks.pendingLeaveRequests.items?.forEach((item: any) => {
      alerts.push({
        id: `leave-${item.request_id}`,
        type: 'warning',
        message: `${item.driver_name} requested ${item.days} days leave (${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()})`,
        instructions: 'Go to Staff → Leave Requests → Approve or decline request',
        timestamp: item.requested_date
      });
    });

    dashboard.tasks.expiringTraining.items?.forEach((item: any) => {
      alerts.push({
        id: `training-${item.training_record_id}`,
        type: 'warning',
        message: `${item.driver_name}'s ${item.training_type_name} certificate expires in ${item.days_until_expiry} days${item.is_mandatory ? ' (MANDATORY)' : ''}`,
        instructions: 'Go to Training → Driver Training → Schedule renewal training',
        timestamp: item.expiry_date
      });
    });

    dashboard.tasks.expiringPermits.items?.forEach((item: any) => {
      alerts.push({
        id: `permit-${item.driver_id}-${item.permit_type}`,
        type: 'warning',
        message: `${item.driver_name}'s ${item.permit_type} permit expires in ${item.days_until_expiry} days`,
        instructions: 'Go to Drivers → Driver Permits → Renew permit',
        timestamp: item.expiry_date
      });
    });

    // Warning-level document expiry
    dashboard.tasks.expiringDocuments.items?.forEach((item: any) => {
      if (item.expiry_status === 'warning') {
        const categoryLabel = item.document_category?.replace(/_/g, ' ') || 'Document';
        const entityInfo = item.entity_name ? ` for ${item.entity_name}` : '';

        alerts.push({
          id: `warning-doc-${item.document_id}`,
          type: 'warning',
          message: `${categoryLabel}${entityInfo} expires in ${item.days_until_expiry} days`,
          instructions: 'Go to Documents → Review and renew this document',
          timestamp: item.expiry_date
        });
      }
    });

    // Info Alerts
    dashboard.tasks.unassignedJourneys.items?.forEach((item: any) => {
      alerts.push({
        id: `unassigned-${item.customer_id}`,
        type: 'info',
        message: `${item.name} needs driver assignment for scheduled journeys`,
        instructions: 'Go to Schedules → Assign driver to customer\'s journeys'
      });
    });

    dashboard.tasks.customerHolidays.items?.forEach((item: any) => {
      alerts.push({
        id: `holiday-${item.request_id}`,
        type: 'info',
        message: `${item.customer_name} will be on holiday (${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()})`,
        instructions: 'Update customer schedule or arrange temporary suspension',
        timestamp: item.start_date
      });
    });

    dashboard.tasks.driverMessages.items?.forEach((item: any) => {
      alerts.push({
        id: `driver-msg-${item.message_id}`,
        type: 'info',
        message: `${item.driver_name}: ${item.subject}`,
        instructions: 'Go to Messages → Driver Messages → Read and respond',
        timestamp: item.created_at
      });
    });

    dashboard.tasks.customerMessages.items?.forEach((item: any) => {
      alerts.push({
        id: `customer-msg-${item.message_id}`,
        type: 'info',
        message: `${item.customer_name}: ${item.subject}`,
        instructions: 'Go to Messages → Customer Messages → Read and respond',
        timestamp: item.created_at
      });
    });

    dashboard.tasks.outingSuggestions.items?.forEach((item: any) => {
      alerts.push({
        id: `outing-${item.outing_id}`,
        type: 'info',
        message: `Social outing suggested: ${item.name}${item.destination ? ` to ${item.destination}` : ''}`,
        instructions: 'Go to Social → Outings → Review and plan event',
        timestamp: item.created_at
      });
    });

    // Sort: critical → warning → info, then by timestamp
    const priorityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => {
      if (priorityOrder[a.type] !== priorityOrder[b.type]) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return 0;
    });
  };

  const alerts = generateAlerts().filter(alert => !dismissedAlerts.has(alert.id));

  const getAlertStyles = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical':
        return {
          bg: '#fef2f2',
          border: '#ef4444',
          textColor: '#991b1b'
        };
      case 'warning':
        return {
          bg: '#fffbeb',
          border: '#f59e0b',
          textColor: '#92400e'
        };
      case 'info':
        return {
          bg: '#eff6ff',
          border: '#3b82f6',
          textColor: '#1e40af'
        };
    }
  };

  if (loading && !dashboard) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem', margin: '2rem auto' }}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
        <button className="btn btn-primary" onClick={loadDashboard} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.75rem' }}>
      {/* Header - Compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '20px' }}>Dashboard</h2>
        <button
          onClick={loadDashboard}
          disabled={loading}
          title="Refresh"
          style={{
            padding: '6px 8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: loading ? 0.6 : 1
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Stats Cards - Compact */}
      {dashboard && (
        <div className="stats-grid" style={{ marginBottom: '0.75rem' }}>
          <div className="stat-card stat-card-purple" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>£{dashboard.stats?.revenueThisWeek?.toLocaleString() || '0'}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Revenue This Week</div>
          </div>

          <div className="stat-card stat-card-blue" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.stats?.journeysThisWeek || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Journeys This Week</div>
          </div>

          <div className="stat-card stat-card-green" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.stats?.activeCustomers || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Active Customers</div>
          </div>

          <div className="stat-card stat-card-orange" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.stats?.activeDrivers || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Active Drivers</div>
          </div>

          <div className="stat-card stat-card-teal" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.stats?.journeysToday || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Journeys Today</div>
          </div>

          <div className="stat-card stat-card-indigo" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.stats?.pendingApprovals || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Approvals</div>
          </div>

          <div className="stat-card stat-card-red" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>{dashboard.summary?.criticalTasks || 0}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Active Issues</div>
          </div>

          <div className="stat-card stat-card-amber" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ fontSize: '20px' }}>£{dashboard.stats?.pendingPayments?.toLocaleString() || '0'}</div>
            <div className="stat-label" style={{ fontSize: '12px' }}>Pending Payments</div>
          </div>
        </div>
      )}

      {/* Profitability KPIs - Last 30 Days */}
      {profitability && profitability.overview && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Financial Performance (Last 30 Days)
            </h3>
            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              View Details →
            </button>
          </div>

          <div className="dashboard-financial-row">
            {/* Total Revenue */}
            <div style={{
              background: 'white',
              borderRadius: '4px',
              padding: '10px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase' }}>
                Revenue
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#9333ea' }}>
                £{profitability.overview.totalRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                {profitability.trips.completed} trips
              </div>
            </div>

            {/* Total Costs */}
            <div style={{
              background: 'white',
              borderRadius: '4px',
              padding: '10px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase' }}>
                Costs
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>
                £{profitability.overview.totalCosts.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                Wages: {profitability.costPercentages.wages}%
              </div>
            </div>

            {/* Net Profit */}
            <div style={{
              background: 'white',
              borderRadius: '4px',
              padding: '10px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase' }}>
                Net Profit
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: profitability.overview.profitable ? '#16a34a' : '#dc2626' }}>
                {profitability.overview.profitable ? '£' : '-£'}
                {Math.abs(profitability.overview.netProfit).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                {profitability.overview.profitable ? 'Profitable' : 'Loss'}
              </div>
            </div>

            {/* Profit Margin */}
            <div style={{
              background: 'white',
              borderRadius: '4px',
              padding: '10px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', fontWeight: 500, textTransform: 'uppercase' }}>
                Margin
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>
                {profitability.overview.profitMargin.toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                £{profitability.trips.averageRevenue}/trip
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Two Column Layout */}
      {dashboard && (
        <div className="dashboard-main-grid">

          {/* ========== LEFT COLUMN: Alerts, Today's Data ========== */}
          <div>
            {/* Active Alerts - Always visible */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                Active Alerts ({alerts.length})
              </h3>
              {alerts.length === 0 ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#166534',
                  textAlign: 'center'
                }}>
                  All clear - no active alerts
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {alerts.map(alert => {
                    const styles = getAlertStyles(alert.type);
                    return (
                      <div key={alert.id} style={{
                        background: styles.bg,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '8px',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: styles.textColor, marginBottom: '4px' }}>
                              {alert.message}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {alert.instructions}
                            </div>
                          </div>
                          <button
                            onClick={() => dismissAlert(alert.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '16px',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Journeys - Compact */}
            {dashboard.today && dashboard.today.journeys.count > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                  Today's Journeys ({dashboard.today.journeys.count})
                </h3>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  {dashboard.today.journeys.items.slice(0, 5).map((journey: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '8px 0',
                      borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {journey.customer_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {journey.phone}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Driver Roster - Compact */}
            {dashboard.today && dashboard.today.drivers.count > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                  Driver Roster ({dashboard.today.drivers.count})
                </h3>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  {dashboard.today.drivers.items.slice(0, 5).map((driver: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '8px 0',
                      borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {driver.registration ? `${driver.make} ${driver.model} (${driver.registration})` : 'No vehicle assigned'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========== RIGHT COLUMN: Financial, Compliance, Fleet ========== */}
          <div>
            {/* Financial Summary - Compact */}
            <div style={{ marginBottom: '16px' }}>
              <h3 className="dashboard-section-title">
                Financial Summary
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginLeft: '4px', display: 'block' }}>
                  {new Date(dashboard.stats.monthStart).toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </h3>
              <div className="dashboard-mini-grid" style={{ marginBottom: '12px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    £{dashboard.stats.revenueMTD?.toLocaleString() || '0'}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Revenue MTD</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    £{dashboard.stats.outstandingInvoicesTotal?.toLocaleString() || '0'}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>
                    Outstanding ({dashboard.stats.outstandingInvoicesCount})
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    £{dashboard.stats.payrollCosts?.toLocaleString() || '0'}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Payroll</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    £{((dashboard.stats.revenueMTD || 0) - (dashboard.stats.payrollCosts || 0)).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Net Profit</div>
                </div>
              </div>
            </div>

            {/* Driver Compliance - Compact */}
            <div style={{ marginBottom: '16px' }}>
              <h3 className="dashboard-section-title">Driver Compliance</h3>
              <div className="dashboard-mini-grid">
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {dashboard.stats.compliancePercentage}%
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Compliance</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {dashboard.stats.compliantDrivers}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Compliant</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {dashboard.stats.nonCompliantDrivers}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Non-Compliant</div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', marginBottom: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {dashboard.stats.totalDrivers}
                  </div>
                  <div style={{ fontSize: '9px', color: '#475569' }}>Total Drivers</div>
                </div>
              </div>
            </div>

            {/* Fleet Utilization - Compact */}
            {dashboard.fleet && (
              <div style={{ marginBottom: '16px' }}>
                <h3 className="dashboard-section-title">Fleet Utilization</h3>
                <div className="dashboard-mini-grid">
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13"/>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                        <circle cx="5.5" cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {dashboard.stats.totalVehicles}
                    </div>
                    <div style={{ fontSize: '9px', color: '#475569' }}>Total Fleet</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {dashboard.stats.assignedVehicles}
                    </div>
                    <div style={{ fontSize: '9px', color: '#475569' }}>
                      Assigned ({dashboard.stats.utilizationPercentage}%)
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', marginBottom: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {dashboard.stats.availableVehicles}
                    </div>
                    <div style={{ fontSize: '9px', color: '#475569' }}>Available</div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dashboard.stats.maintenanceOverdue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: dashboard.stats.maintenanceOverdue > 0 ? '#ef4444' : '#f59e0b', marginBottom: '4px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {dashboard.stats.maintenanceOverdue + dashboard.stats.maintenanceDueThisWeek}
                    </div>
                    <div style={{ fontSize: '9px', color: '#475569' }}>Maintenance Due</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals and handlers below */}
      {/* Schedule View Modal */}
      {showScheduleModal && (
        <ScheduleModal
          title={scheduleModalTitle}
          date={scheduleModalDate}
          data={scheduleData}
          loading={loadingSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Incident Report Modal */}
      {showIncidentModal && (
        <IncidentFormModal
          vehicles={vehicles}
          drivers={drivers}
          onClose={(shouldRefresh) => {
            setShowIncidentModal(false);
            if (shouldRefresh) {
              loadDashboard();
            }
          }}
        />
      )}

      {/* Safeguarding Report Modal */}
      {showSafeguardingModal && (
        <SafeguardingFormModal
          drivers={drivers}
          customers={customers}
          onClose={(shouldRefresh) => {
            setShowSafeguardingModal(false);
            if (shouldRefresh) {
              loadDashboard();
            }
          }}
        />
      )}

      {/* Late Arrival Modal */}
      {showLateArrivalModal && (
        <LateArrivalModal
          customers={customers}
          onClose={() => {
            setShowLateArrivalModal(false);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}

// Schedule View Modal Component
interface ScheduleModalProps {
  title: string;
  date: string;
  data: any;
  loading: boolean;
  onClose: () => void;
}

function ScheduleModal({ title, date, data, loading, onClose }: ScheduleModalProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{title}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
              {formatDate(date)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--gray-400)',
              padding: '0',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--gray-600)' }}>Loading schedule...</p>
          </div>
        ) : !data || data.journeys?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <p style={{ fontSize: '16px', marginBottom: '0.5rem', fontWeight: 600 }}>No Trips Booked</p>
            <p style={{ fontSize: '14px', marginBottom: '1rem' }}>
              There are no specific trip bookings for this date in the system.
            </p>
            {data?.note && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '6px',
                padding: '1rem',
                marginTop: '1rem',
                fontSize: '13px',
                color: '#92400e',
                textAlign: 'left'
              }}>
                <strong>Note:</strong> {data.note}
                <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  The dashboard shows recurring schedules from customer profiles,
                  but this modal shows specific trip bookings from the Schedules page.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#e6e6fa', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#4b0082' }}>
                  {data.journeys?.length || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#4b0082', marginTop: '4px' }}>
                  Total Journeys
                </div>
              </div>
              <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#155724' }}>
                  {data.journeys?.filter((j: any) => j.driver_name).length || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#155724', marginTop: '4px' }}>
                  Assigned
                </div>
              </div>
              <div style={{ background: '#ffcccb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#8B0000' }}>
                  {data.journeys?.filter((j: any) => !j.driver_name).length || 0}
                </div>
                <div style={{ fontSize: '13px', color: '#8B0000', marginTop: '4px' }}>
                  Unassigned
                </div>
              </div>
            </div>

            {/* Journey List */}
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 700 }}>Journey Schedule</h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {data.journeys?.map((journey: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '1rem',
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr 150px 120px',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    {/* Time */}
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)' }}>
                        {journey.pickup_time || 'Not set'}
                      </div>
                      {journey.return_time && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                          Return: {journey.return_time}
                        </div>
                      )}
                    </div>

                    {/* Customer & Destination */}
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {journey.customer_name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                        {journey.pickup_address || 'Address not set'} → {journey.destination || 'Destination not set'}
                      </div>
                      {journey.special_requirements && (
                        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                          Note: {journey.special_requirements}
                        </div>
                      )}
                    </div>

                    {/* Driver */}
                    <div>
                      {journey.driver_name ? (
                        <>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-900)' }}>
                            {journey.driver_name}
                          </div>
                          {journey.vehicle_registration && (
                            <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '2px' }}>
                              {journey.vehicle_registration}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#8B0000', fontWeight: 600 }}>
                          No driver assigned
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        background: journey.driver_name ? '#e8f5e9' : '#ffebee',
                        color: journey.driver_name ? '#2e7d32' : '#c62828',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        {journey.driver_name ? 'ASSIGNED' : 'UNASSIGNED'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#e6e6fa',
              color: '#4b0082',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Late Arrival Modal Component
interface LateArrivalModalProps {
  customers: any[];
  onClose: () => void;
}

function LateArrivalModal({ customers, onClose }: LateArrivalModalProps) {
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !arrivalTime || !scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Calculate delay in minutes
      const scheduled = new Date(`2000-01-01T${scheduledTime}`);
      const actual = new Date(`2000-01-01T${arrivalTime}`);
      const delayMinutes = Math.round((actual.getTime() - scheduled.getTime()) / 60000);

      // Save to database (you'll need to create this API endpoint)
      const response = await fetch(`/api/tenants/${tenantId}/late-arrivals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          scheduled_time: scheduledTime,
          arrival_time: arrivalTime,
          delay_minutes: delayMinutes,
          reason,
          notes,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to log late arrival');
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save late arrival');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px' }}>Log Late Arrival</h3>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c00',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select customer...</option>
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
              Scheduled Pickup Time *
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
              Actual Arrival Time *
            </label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select reason...</option>
              <option value="traffic">Traffic delay</option>
              <option value="vehicle">Vehicle issue</option>
              <option value="customer">Customer not ready</option>
              <option value="weather">Weather conditions</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 600 }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                background: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                background: '#e0f2f7',
                color: '#006064',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Log Late Arrival'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DashboardPage;
