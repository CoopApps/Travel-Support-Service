import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTenant } from '../../context/TenantContext';
import { dashboardApi, DashboardOverview } from '../../services/dashboardApi';
import { vehicleApi, customerApi, driverApi } from '../../services/api';
import IncidentFormModal from '../vehicles/IncidentFormModal';
import '../../pages/AdminDashboard.css';

/**
 * Dashboard Page Component
 *
 * Main operational dashboard showing dismissible alerts with instructions
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
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Quick Actions State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
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
    if (user?.tenantId) {
      loadDashboard();
      // Auto-refresh every 5 minutes
      const interval = setInterval(loadDashboard, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.tenantId]);

  const loadDashboard = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      setError('');
      const data = await dashboardApi.getOverview(user.tenantId);
      setDashboard(data);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
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
    } catch (err) {
      console.error('Error loading schedule:', err);
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
      const [vehiclesData, driversData] = await Promise.all([
        vehicleApi.getVehicles(tenantId),
        driverApi.getDrivers(tenantId)
      ]);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setShowIncidentModal(true);
    } catch (err) {
      console.error('Error loading incident form data:', err);
    }
  };

  const handleLogLateArrival = async () => {
    if (!tenantId) return;
    // Load customers for late arrival form
    try {
      const customersData = await customerApi.getCustomers(tenantId);
      setCustomers(customersData);
      setShowLateArrivalModal(true);
    } catch (err) {
      console.error('Error loading customers:', err);
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
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '20px' }}>Dashboard</h2>
          {tenant && (
            <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)', fontSize: '13px' }}>
              {tenant.companyName}
            </p>
          )}
        </div>
        <button
          onClick={loadDashboard}
          className="btn btn-secondary"
          disabled={loading}
          style={{ padding: '0.5rem 1rem', fontSize: '13px' }}
        >
          Refresh
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

      {/* Today's Urgent Actions - Compact */}
      {dashboard && dashboard.summary?.criticalTasks > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
          color: 'white',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
        }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>
            URGENT: {dashboard.summary.criticalTasks} Critical Issue{dashboard.summary.criticalTasks !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '13px' }}>
            {dashboard.tasks.unassignedJourneys.count > 0 && (
              <span>{dashboard.tasks.unassignedJourneys.count} Unassigned Journey{dashboard.tasks.unassignedJourneys.count !== 1 ? 's' : ''}</span>
            )}
            {dashboard.tasks.expiredMots.count > 0 && (
              <span>{dashboard.tasks.expiredMots.count} Expired MOT{dashboard.tasks.expiredMots.count !== 1 ? 's' : ''}</span>
            )}
            {dashboard.tasks.safeguardingReports.count > 0 && (
              <span>{dashboard.tasks.safeguardingReports.count} Safeguarding Report{dashboard.tasks.safeguardingReports.count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleViewTomorrowSchedule}
          style={{
            padding: '0.5rem 1rem',
            background: '#e6e6fa',
            color: '#4b0082',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#d8d8f0'}
          onMouseOut={(e) => e.currentTarget.style.background = '#e6e6fa'}
        >
          View Tomorrow's Schedule
        </button>
        <button
          onClick={handleReportIncident}
          style={{
            padding: '0.5rem 1rem',
            background: '#ffe4e1',
            color: '#8b0000',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#ffd4d0'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ffe4e1'}
        >
          Report Incident
        </button>
        <button
          onClick={handleLogLateArrival}
          style={{
            padding: '0.5rem 1rem',
            background: '#e0f2f7',
            color: '#006064',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#b2ebf2'}
          onMouseOut={(e) => e.currentTarget.style.background = '#e0f2f7'}
        >
          Log Late Arrival
        </button>
        <button
          onClick={handleExportReport}
          style={{
            padding: '0.5rem 1rem',
            background: '#e8f5e9',
            color: '#1b5e20',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#c8e6c9'}
          onMouseOut={(e) => e.currentTarget.style.background = '#e8f5e9'}
        >
          Export Today's Report
        </button>
      </div>

      {/* Three Column Layout - Today's Operations (Compact) */}
      {dashboard && dashboard.today && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {/* Today's Journeys */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Today's Journeys ({dashboard.today.journeys.count})
              </h3>
              <button
                onClick={handleViewTodaySchedule}
                style={{
                  padding: '4px 8px',
                  background: '#e6e6fa',
                  color: '#4b0082',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d8d8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e6e6fa'}
              >
                View All
              </button>
            </div>
            {dashboard.today.journeys.count === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--gray-500)', fontSize: '12px' }}>
                No journeys scheduled
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {dashboard.today.journeys.items.slice(0, 8).map((journey: any) => (
                  <div
                    key={journey.customer_id}
                    style={{
                      padding: '0.5rem',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {journey.customer_name}
                      </div>
                      {journey.today_schedule?.pickupTime && (
                        <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
                          {journey.today_schedule.pickupTime}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: journey.today_schedule?.driverId ? '#e8f5e9' : '#ffebee',
                      color: journey.today_schedule?.driverId ? '#2e7d32' : '#c62828',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      marginLeft: '0.5rem'
                    }}>
                      {journey.today_schedule?.driverId ? 'OK' : 'UNASSIGNED'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Driver Roster Today */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
              Driver Roster ({dashboard.today.drivers.count})
            </h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {dashboard.today.drivers.items.map((driver: any) => (
                <div
                  key={driver.driver_id}
                  style={{
                    padding: '0.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    opacity: driver.on_leave ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {driver.on_leave && '[LEAVE] '}{driver.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {driver.registration || 'No vehicle'}
                      </div>
                    </div>
                    {!driver.on_leave && (
                      <div style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: driver.vehicle_id ? '#e3f2fd' : '#fff3e0',
                        color: driver.vehicle_id ? '#1976d2' : '#f57c00',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        marginLeft: '0.5rem'
                      }}>
                        {driver.vehicle_id ? 'READY' : 'NO VEH'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Alerts */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
              Customer Alerts ({dashboard.today.customerAlerts.count})
            </h3>
            {dashboard.today.customerAlerts.count === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--gray-500)', fontSize: '12px' }}>
                No alerts
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {dashboard.today.customerAlerts.items.map((alert: any, index: number) => (
                  <div
                    key={`alert-${alert.customer_id}-${index}`}
                    style={{
                      padding: '0.5rem',
                      borderBottom: '1px solid #f3f4f6',
                      background: alert.alert_type === 'holiday' ? '#fffbeb' : '#f0f9ff',
                      marginBottom: '0.25rem',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--gray-900)' }}>
                      [{alert.alert_type === 'holiday' ? 'HOLIDAY' : 'SPECIAL'}] {alert.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-600)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.alert_type === 'holiday' && `Until ${new Date(alert.end_date).toLocaleDateString('en-GB')}`}
                      {alert.alert_type === 'special_requirement' && alert.notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Status - Full Width Bar */}
      {dashboard && dashboard.today && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
              Vehicle Status ({dashboard.today.vehicles.active} active)
            </h3>
            {dashboard.today.vehicles.issues > 0 && (
              <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                {dashboard.today.vehicles.issues} issue{dashboard.today.vehicles.issues !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {dashboard.today.vehicles.items.map((vehicle: any) => (
              <div
                key={vehicle.vehicle_id}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #f3f4f6',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vehicle.registration}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vehicle.driver_name || 'Unassigned'}
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: vehicle.status === 'active' ? '#e8f5e9' : vehicle.status === 'expired_mot' ? '#ffebee' : '#fff3e0',
                  color: vehicle.status === 'active' ? '#2e7d32' : vehicle.status === 'expired_mot' ? '#c62828' : '#f57c00',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  marginLeft: '0.5rem'
                }}>
                  {vehicle.status === 'active' && 'OK'}
                  {vehicle.status === 'expired_mot' && 'EXPIRED'}
                  {vehicle.status === 'mot_expiring_soon' && 'SOON'}
                  {vehicle.status === 'unassigned' && 'UNASSIGNED'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Summary (existing alerts) */}
      {alerts.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '2rem',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', fontWeight: 600 }}>
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#ef4444' }}>●</span>
              <span>{alerts.filter(a => a.type === 'critical').length} Critical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#f59e0b' }}>●</span>
              <span>{alerts.filter(a => a.type === 'warning').length} Warning</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#3b82f6' }}>●</span>
              <span>{alerts.filter(a => a.type === 'info').length} Info</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 0.5rem 0' }}>
            All Clear!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
            No active alerts. Everything is running smoothly.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map((alert) => {
            const styles = getAlertStyles(alert.type);
            return (
              <div
                key={alert.id}
                style={{
                  background: styles.bg,
                  border: `1px solid ${styles.border}`,
                  borderLeft: `4px solid ${styles.border}`,
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: styles.textColor,
                    marginBottom: '0.5rem',
                    lineHeight: 1.4
                  }}>
                    {alert.message}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--gray-600)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontWeight: 500 }}>→</span>
                    {alert.instructions}
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => dismissAlert(alert.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gray-400)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gray-600)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-400)'}
                  title="Dismiss alert"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

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
