import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { busRoutesApi, busTimetablesApi, busBookingsApi } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import CooperativeCommonwealthTracker from './CooperativeCommonwealthTracker';
import { MapIcon, AlarmClockIcon, MemoIcon, BusIcon, UserIcon, ClipboardIcon, CalendarIcon, TicketIcon, SeatIcon } from '../icons/BusIcons';
import './BusDashboard.css';

interface DashboardStats {
  activeRoutes: number;
  todaysServices: number;
  todaysBookings: number;
  availableSeats: number;
  confirmedBookings: number;
  pendingBookings: number;
}

export default function BusDashboard() {
  const { tenant } = useTenant();
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

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data in parallel
        const [routes, services, bookings] = await Promise.all([
          busRoutesApi.getRoutes(tenant.tenant_id, { status: 'active' }),
          busTimetablesApi.getTodaysServices(tenant.tenant_id),
          busBookingsApi.getTodaysBookings(tenant.tenant_id)
        ]);

        // Calculate stats
        const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
        const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
        const availableSeats = services.reduce((sum, s: any) => sum + (s.available_seats || 0), 0);

        setStats({
          activeRoutes: routes.length,
          todaysServices: services.length,
          todaysBookings: bookings.length,
          availableSeats,
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
  }, [tenant?.tenant_id]);

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
    <div className="bus-dashboard">
      <div className="dashboard-header">
        <h1>Community Bus Dashboard</h1>
        <p className="dashboard-subtitle">
          Manage your Section 22 local bus services
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card routes">
          <div className="stat-icon">
            <BusIcon size={32} color="#3b82f6" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.activeRoutes}</div>
            <div className="stat-label">Active Routes</div>
          </div>
          <Link to="/bus/routes" className="stat-action">View Routes →</Link>
        </div>

        <div className="stat-card services">
          <div className="stat-icon">
            <CalendarIcon size={32} color="#10b981" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.todaysServices}</div>
            <div className="stat-label">Today's Services</div>
          </div>
          <div className="stat-action">View Schedule →</div>
        </div>

        <div className="stat-card bookings">
          <div className="stat-icon">
            <TicketIcon size={32} color="#f59e0b" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.todaysBookings}</div>
            <div className="stat-label">Today's Bookings</div>
          </div>
          <div className="stat-meta">
            <span className="meta-item confirmed">{stats.confirmedBookings} confirmed</span>
            <span className="meta-item pending">{stats.pendingBookings} pending</span>
          </div>
        </div>

        <div className="stat-card seats">
          <div className="stat-icon">
            <SeatIcon size={32} color="#8b5cf6" />
          </div>
          <div className="stat-details">
            <div className="stat-value">{stats.availableSeats}</div>
            <div className="stat-label">Available Seats</div>
          </div>
          <div className="stat-action">View Availability →</div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/bus/routes" className="action-button">
            <span className="action-icon"><MapIcon size={24} /></span>
            <span className="action-title">Manage Routes</span>
            <span className="action-description">Create and edit bus routes</span>
          </Link>

          <button className="action-button">
            <span className="action-icon"><AlarmClockIcon size={24} /></span>
            <span className="action-title">Create Timetable</span>
            <span className="action-description">Schedule new services</span>
          </button>

          <button className="action-button">
            <span className="action-icon"><MemoIcon size={24} /></span>
            <span className="action-title">New Booking</span>
            <span className="action-description">Create passenger booking</span>
          </button>

          <Link to="/vehicles" className="action-button">
            <span className="action-icon"><BusIcon size={24} /></span>
            <span className="action-title">Manage Vehicles</span>
            <span className="action-description">View and assign vehicles</span>
          </Link>

          <Link to="/drivers" className="action-button">
            <span className="action-icon"><UserIcon size={24} /></span>
            <span className="action-title">Manage Drivers</span>
            <span className="action-description">View and assign drivers</span>
          </Link>

          <Link to="/compliance/service-registrations" className="action-button">
            <span className="action-icon"><ClipboardIcon size={24} /></span>
            <span className="action-title">Service Registrations</span>
            <span className="action-description">Traffic Commissioner compliance</span>
          </Link>
        </div>
      </div>

      {/* Cooperative Commonwealth Impact Tracker */}
      <div style={{ marginTop: '2rem' }}>
        <CooperativeCommonwealthTracker />
      </div>

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
    </div>
  );
}
