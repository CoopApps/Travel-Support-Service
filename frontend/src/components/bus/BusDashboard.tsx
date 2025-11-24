import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  busRoutesApi,
  busTimetablesApi,
  busBookingsApi,
  busRosterApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  EffectivePassenger
} from '../../services/busApi';
import { dashboardApi } from '../../services/dashboardApi';
import { useTenant } from '../../context/TenantContext';
import { MapIcon, AlarmClockIcon, MemoIcon, BusIcon, UserIcon, ClipboardIcon, CalendarIcon, TicketIcon, SeatIcon, ArrowRightIcon, WheelchairIcon, ClockIcon, AlertTriangleIcon } from '../icons/BusIcons';
import SeatAssignmentModal from './SeatAssignmentModal';
import PrintableManifest from './PrintableManifest';
import ServiceCancellationModal from './ServiceCancellationModal';
import './BusDashboard.css';
import './TodaysOperationsPage.css';

interface DashboardStats {
  activeRoutes: number;
  todaysServices: number;
  todaysBookings: number;
  availableSeats: number;
  confirmedBookings: number;
  pendingBookings: number;
}

interface TodayService {
  timetable: BusTimetable;
  route: BusRoute | undefined;
  passengers: EffectivePassenger[];
  rosterEntry: any | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface ServiceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  instructions?: string;
  serviceId?: number;
}

interface BusAnalyticsOverview {
  revenue: {
    total_revenue: string;
    total_bookings: number;
    average_fare: string;
  };
  occupancy: {
    average: string;
  };
}

export default function BusDashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();

  // Check if tenant is a cooperative
  const isCooperative = tenant?.organization_type === 'cooperative' || tenant?.organization_type === 'cooperative_commonwealth';

  const [stats, setStats] = useState<DashboardStats>({
    activeRoutes: 0,
    todaysServices: 0,
    todaysBookings: 0,
    availableSeats: 0,
    confirmedBookings: 0,
    pendingBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Today's Operations state
  const [services, setServices] = useState<TodayService[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Analytics & Compliance state
  const [analytics, setAnalytics] = useState<BusAnalyticsOverview | null>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [surplusBalance, setSurplusBalance] = useState<number | null>(null);

  // Modal state
  const [seatAssignmentService, setSeatAssignmentService] = useState<{
    timetable: BusTimetable;
    serviceDate: string;
  } | null>(null);
  const [manifestService, setManifestService] = useState<{
    timetableId: number;
    serviceDate: string;
  } | null>(null);
  const [cancellationService, setCancellationService] = useState<{
    timetable: BusTimetable;
    serviceDate: string;
    passengerCount: number;
  } | null>(null);

  // Get day of week for roster
  const getDayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dayOfWeek = getDayOfWeek(selectedDate);
        const token = localStorage.getItem('token');

        // Fetch all data in parallel
        const [routesData, timetablesData, bookings, rosterData, mainDashboardData] = await Promise.all([
          busRoutesApi.getRoutes(tenant.tenant_id, { status: 'active' }),
          busTimetablesApi.getTimetables(tenant.tenant_id, { status: 'active' }),
          busBookingsApi.getTodaysBookings(tenant.tenant_id),
          busRosterApi.getRoster(tenant.tenant_id, {
            start_date: selectedDate,
            end_date: selectedDate
          }),
          dashboardApi.getOverview(tenant.tenant_id).catch(() => null)
        ]);

        // Fetch bus analytics (may fail if backend not deployed)
        try {
          const analyticsRes = await fetch(`/api/tenants/${tenant.tenant_id}/bus-analytics/overview?period=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (analyticsRes.ok) {
            setAnalytics(await analyticsRes.json());
          }
        } catch (err) {
          console.log('Bus analytics not available');
        }

        // Fetch surplus pool balance
        try {
          const surplusRes = await fetch(`/api/tenants/${tenant.tenant_id}/bus/surplus-pools`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (surplusRes.ok) {
            const pools = await surplusRes.json();
            const totalSurplus = pools.reduce((sum: number, p: any) => sum + (parseFloat(p.accumulated_surplus) || 0), 0);
            setSurplusBalance(totalSurplus);
          }
        } catch (err) {
          console.log('Surplus pool data not available');
        }

        // Set compliance data from main dashboard
        if (mainDashboardData) {
          setComplianceData(mainDashboardData);
        }

        setRoutes(routesData);

        // Filter timetables that run on the selected day
        const todaysTimetables = timetablesData.filter((t: BusTimetable) => {
          const dayKey = `operates_${dayOfWeek}` as keyof BusTimetable;
          return t[dayKey] === true;
        });

        // Load passengers and build service data for each timetable
        const servicePromises = todaysTimetables.map(async (timetable: BusTimetable) => {
          let passengers: EffectivePassenger[] = [];
          try {
            passengers = await regularPassengersApi.getEffectivePassengers(
              tenant.tenant_id,
              timetable.timetable_id,
              selectedDate
            );
          } catch (err) {
            console.error(`Failed to load passengers for timetable ${timetable.timetable_id}:`, err);
          }

          const rosterEntry = rosterData.find((r: any) =>
            r.timetable_id === timetable.timetable_id &&
            r.roster_date === selectedDate
          );

          const now = new Date();
          const serviceTime = new Date(`${selectedDate}T${timetable.departure_time}`);
          const endTime = new Date(serviceTime.getTime() + 2 * 60 * 60 * 1000);

          let status: TodayService['status'] = 'scheduled';
          if (now > endTime) {
            status = 'completed';
          } else if (now >= serviceTime && now <= endTime) {
            status = 'in-progress';
          }

          return {
            timetable,
            route: routesData.find((r: BusRoute) => r.route_id === timetable.route_id),
            passengers,
            rosterEntry,
            status
          };
        });

        const servicesData = await Promise.all(servicePromises);
        servicesData.sort((a, b) =>
          a.timetable.departure_time.localeCompare(b.timetable.departure_time)
        );
        setServices(servicesData);

        // Generate alerts from multiple sources
        const newAlerts: ServiceAlert[] = [];

        // Service-specific alerts
        servicesData.forEach((service) => {
          if (!service.rosterEntry && service.status !== 'completed') {
            newAlerts.push({
              id: `no-driver-${service.timetable.timetable_id}`,
              type: 'critical',
              message: `No driver assigned for ${service.timetable.route_number} ${service.timetable.departure_time}`,
              instructions: 'Go to Roster → Assign a driver to this service',
              serviceId: service.timetable.timetable_id
            });
          }
          if (service.passengers.length < 3 && service.status !== 'completed') {
            newAlerts.push({
              id: `low-bookings-${service.timetable.timetable_id}`,
              type: 'warning',
              message: `Low bookings (${service.passengers.length}) for ${service.timetable.route_number} ${service.timetable.departure_time}`,
              instructions: 'Consider promoting this service or reviewing viability',
              serviceId: service.timetable.timetable_id
            });
          }
          const wheelchairCount = service.passengers.filter(p => p.requires_wheelchair_space).length;
          if (wheelchairCount > 2) {
            newAlerts.push({
              id: `wheelchair-${service.timetable.timetable_id}`,
              type: 'warning',
              message: `${wheelchairCount} wheelchair passengers on ${service.timetable.route_number}`,
              instructions: 'Verify vehicle has sufficient wheelchair capacity',
              serviceId: service.timetable.timetable_id
            });
          }
        });

        // Add compliance alerts from main dashboard
        if (mainDashboardData?.tasks) {
          // Expired MOTs
          mainDashboardData.tasks.expiredMots?.items?.forEach((item: any) => {
            newAlerts.push({
              id: `expired-mot-${item.vehicle_id}`,
              type: 'critical',
              message: `${item.registration} has EXPIRED MOT - ${Math.abs(item.days_expired)} days overdue`,
              instructions: 'Go to Fleet → Vehicles → Update MOT or take vehicle off road'
            });
          });

          // Expiring MOTs
          mainDashboardData.tasks.expiringMots?.items?.forEach((item: any) => {
            newAlerts.push({
              id: `expiring-mot-${item.vehicle_id}`,
              type: 'warning',
              message: `${item.registration} MOT expires in ${item.days_until_expiry} days`,
              instructions: 'Go to Fleet → Vehicles → Schedule MOT appointment'
            });
          });

          // Expiring permits
          mainDashboardData.tasks.expiringPermits?.items?.forEach((item: any) => {
            newAlerts.push({
              id: `permit-${item.driver_id}-${item.permit_type}`,
              type: 'warning',
              message: `${item.driver_name}'s ${item.permit_type} expires in ${item.days_until_expiry} days`,
              instructions: 'Go to Drivers → Permits → Renew permit'
            });
          });

          // Expiring training
          mainDashboardData.tasks.expiringTraining?.items?.forEach((item: any) => {
            newAlerts.push({
              id: `training-${item.training_record_id}`,
              type: 'warning',
              message: `${item.driver_name}'s ${item.training_type_name} expires in ${item.days_until_expiry} days`,
              instructions: 'Go to Training → Schedule renewal training'
            });
          });
        }

        // Sort alerts: critical → warning → info
        newAlerts.sort((a, b) => {
          const priority = { critical: 0, warning: 1, info: 2 };
          return priority[a.type] - priority[b.type];
        });

        setAlerts(newAlerts);

        // Calculate stats
        const confirmedBookings = bookings.filter((b: any) => b.booking_status === 'confirmed').length;
        const pendingBookings = bookings.filter((b: any) => b.booking_status === 'pending').length;
        const availableSeats = servicesData.reduce((sum, s: any) => sum + (s.timetable?.capacity || 16), 0) -
          servicesData.reduce((sum, s) => sum + s.passengers.length, 0);

        setStats({
          activeRoutes: routesData.length,
          todaysServices: servicesData.length,
          todaysBookings: bookings.length,
          availableSeats: Math.max(0, availableSeats),
          confirmedBookings,
          pendingBookings
        });
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tenant?.tenant_id, selectedDate]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  // Modal handlers
  const handleOpenSeatAssignment = (service: TodayService) => {
    setSeatAssignmentService({
      timetable: service.timetable,
      serviceDate: selectedDate
    });
  };

  const handleCloseSeatAssignment = () => {
    setSeatAssignmentService(null);
  };

  const handleOpenManifest = (service: TodayService) => {
    setManifestService({
      timetableId: service.timetable.timetable_id,
      serviceDate: selectedDate
    });
  };

  const handleCloseManifest = () => {
    setManifestService(null);
  };

  const handleOpenCancellation = (service: TodayService) => {
    setCancellationService({
      timetable: service.timetable,
      serviceDate: selectedDate,
      passengerCount: service.passengers.length
    });
  };

  const handleCloseCancellation = () => {
    setCancellationService(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Filter dismissed alerts
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  // Summary stats
  const totalPassengers = services.reduce((sum, s) => sum + s.passengers.length, 0);
  const servicesWithDrivers = services.filter(s => s.rosterEntry).length;
  const wheelchairPassengers = services.reduce(
    (sum, s) => sum + s.passengers.filter(p => p.requires_wheelchair_space).length,
    0
  );

  const getAlertStyles = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical':
        return { bg: '#fef2f2', border: '#ef4444', textColor: '#991b1b' };
      case 'warning':
        return { bg: '#fffbeb', border: '#f59e0b', textColor: '#92400e' };
      case 'info':
        return { bg: '#eff6ff', border: '#3b82f6', textColor: '#1e40af' };
    }
  };

  if (loading) {
    return (
      <div className="bus-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus-dashboard">
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-dashboard" style={{ padding: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '20px' }}>Community Bus Dashboard</h2>
          <p style={{ margin: '2px 0 0 0', color: 'var(--gray-600)', fontSize: '13px' }}>
            Section 22 Local Bus Services
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '13px' }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards - 8 KPIs like transport dashboard */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div className="stat-card stat-card-blue" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{stats.activeRoutes}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Active Routes</div>
        </div>

        <div className="stat-card stat-card-green" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{stats.todaysServices}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Services Today</div>
        </div>

        <div className="stat-card stat-card-orange" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{totalPassengers}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Passengers</div>
        </div>

        <div className="stat-card stat-card-purple" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{stats.availableSeats}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Seats Available</div>
        </div>

        <div className="stat-card stat-card-teal" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{servicesWithDrivers}/{services.length}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Drivers Assigned</div>
        </div>

        <div className="stat-card stat-card-indigo" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{complianceData?.stats?.compliancePercentage || '--'}%</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Compliance</div>
        </div>

        <div className="stat-card stat-card-red" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{activeAlerts.filter(a => a.type === 'critical').length}</div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Critical Issues</div>
        </div>

        <div className="stat-card stat-card-amber" style={{ padding: '0.75rem' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>
            {analytics ? `£${parseFloat(analytics.revenue.total_revenue).toLocaleString()}` : '--'}
          </div>
          <div className="stat-label" style={{ fontSize: '12px' }}>Revenue (30d)</div>
        </div>
      </div>

      {/* Financial Performance KPIs - if analytics available */}
      {analytics && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Financial Performance (Last 30 Days)
            </h3>
            <button
              onClick={() => navigate('/bus/analytics')}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              padding: '1rem',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px', fontWeight: 500 }}>Total Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>£{parseFloat(analytics.revenue.total_revenue).toLocaleString()}</div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>{analytics.revenue.total_bookings} bookings</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              borderRadius: '8px',
              padding: '1rem',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px', fontWeight: 500 }}>Average Fare</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>£{parseFloat(analytics.revenue.average_fare).toFixed(2)}</div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Per passenger</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '8px',
              padding: '1rem',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px', fontWeight: 500 }}>Avg Occupancy</div>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{analytics.occupancy.average}%</div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Seat utilization</div>
            </div>

            {isCooperative && (
              <div style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px', fontWeight: 500 }}>Co-op Surplus</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {surplusBalance !== null ? `£${surplusBalance.toLocaleString()}` : '--'}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>Pool balance</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '16px' }}>

        {/* ========== LEFT COLUMN: Alerts, Today's Operations ========== */}
        <div>
          {/* Active Alerts */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
              Active Alerts ({activeAlerts.length})
            </h3>
            {activeAlerts.length === 0 ? (
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
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {activeAlerts.slice(0, 8).map(alert => {
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
                          {alert.instructions && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {alert.instructions}
                            </div>
                          )}
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

          {/* Today's Operations Summary */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Today's Services ({services.length})
              </h3>
              <span style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            {services.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)', background: '#f8fafc', borderRadius: '8px' }}>
                <ClockIcon size={32} color="#9ca3af" />
                <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>No services scheduled for today</p>
              </div>
            ) : (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {services.slice(0, 6).map((service, idx) => (
                  <div key={service.timetable.timetable_id} style={{
                    padding: '10px 12px',
                    borderBottom: idx < services.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: service.status === 'completed' ? '#e5e7eb' : service.status === 'in-progress' ? '#dbeafe' : '#f0fdf4',
                          color: service.status === 'completed' ? '#6b7280' : service.status === 'in-progress' ? '#1d4ed8' : '#166534',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {formatTime(service.timetable.departure_time)}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {service.timetable.route_number}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {service.timetable.service_name}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {service.rosterEntry
                          ? `${service.rosterEntry.driver_first_name || ''} ${service.rosterEntry.driver_last_name || ''}`.trim() || 'Driver assigned'
                          : <span style={{ color: '#dc2626' }}>No driver</span>
                        }
                        {' • '}
                        {service.passengers.length} passengers
                        {service.passengers.some(p => p.requires_wheelchair_space) && (
                          <> ({service.passengers.filter(p => p.requires_wheelchair_space).length} wheelchair)</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleOpenSeatAssignment(service)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          color: '#475569'
                        }}
                      >
                        Seats
                      </button>
                      <button
                        onClick={() => handleOpenManifest(service)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          color: '#475569'
                        }}
                      >
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========== RIGHT COLUMN: Compliance, Fleet, Co-op ========== */}
        <div>
          {/* Driver Compliance */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Driver Compliance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {complianceData?.stats?.compliancePercentage || '--'}%
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>Compliance Rate</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {complianceData?.stats?.compliantDrivers || '--'}
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
                  {complianceData?.stats?.nonCompliantDrivers || '--'}
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
                  {complianceData?.stats?.totalDrivers || '--'}
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>Total Drivers</div>
              </div>
            </div>
          </div>

          {/* Fleet Status */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Fleet Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '4px' }}>
                  <BusIcon size={14} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {complianceData?.stats?.totalVehicles || '--'}
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>Total Vehicles</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {complianceData?.stats?.availableVehicles || '--'}
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>Available</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginBottom: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {(complianceData?.tasks?.expiringMots?.count || 0) + (complianceData?.tasks?.expiredMots?.count || 0)}
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>MOT Issues</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', marginBottom: '4px' }}>
                  <WheelchairIcon size={14} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {wheelchairPassengers}
                </div>
                <div style={{ fontSize: '9px', color: '#475569' }}>Wheelchair Today</div>
              </div>
            </div>
          </div>

          {/* Co-operative Summary - Only show for cooperative tenants */}
          {isCooperative && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Co-operative</h3>
                <Link
                  to="/bus/cooperative"
                  style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none' }}
                >
                  View Details →
                </Link>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                padding: '12px',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>Surplus Pool Balance</div>
                    <div style={{ fontSize: '22px', fontWeight: 700 }}>
                      {surplusBalance !== null ? `£${surplusBalance.toLocaleString()}` : 'Loading...'}
                    </div>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
                  Available for subsidies & dividends
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Welcome message for new tenants */}
      {stats.activeRoutes === 0 && (
        <div className="welcome-message">
          <h2>Welcome to Community Bus Services!</h2>
          <p>
            Get started by creating your first bus route. Routes define the stops and journey
            pattern for your Section 22 local bus services.
          </p>
          <Link to="/bus/routes" className="btn-primary">
            Create Your First Route
          </Link>
        </div>
      )}

      {/* Modals */}
      {seatAssignmentService && (
        <SeatAssignmentModal
          isOpen={true}
          timetable={seatAssignmentService.timetable}
          serviceDate={seatAssignmentService.serviceDate}
          onClose={handleCloseSeatAssignment}
        />
      )}

      {manifestService && (
        <PrintableManifest
          timetableId={manifestService.timetableId}
          serviceDate={manifestService.serviceDate}
          onClose={handleCloseManifest}
        />
      )}

      {cancellationService && (
        <ServiceCancellationModal
          timetable={cancellationService.timetable}
          serviceDate={cancellationService.serviceDate}
          passengerCount={cancellationService.passengerCount}
          onClose={handleCloseCancellation}
          onCancelled={handleCloseCancellation}
        />
      )}
    </div>
  );
}
