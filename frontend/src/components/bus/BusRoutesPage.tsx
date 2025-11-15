import React, { useEffect, useState } from 'react';
import { busRoutesApi, BusRoute } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import './BusRoutesPage.css';

export default function BusRoutesPage() {
  const { tenant } = useTenant();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'planning'>('all');

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchRoutes = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = filter === 'all' ? {} : { status: filter };
        const data = await busRoutesApi.getRoutes(tenant.tenant_id, params);
        setRoutes(data);
      } catch (err: any) {
        console.error('Failed to load routes:', err);
        setError(err.message || 'Failed to load routes');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [tenant?.tenant_id, filter]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'planning':
        return 'status-planning';
      case 'registered':
        return 'status-registered';
      case 'suspended':
        return 'status-suspended';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getOperatingDaysDisplay = (route: BusRoute) => {
    const days = [];
    if (route.operates_monday) days.push('Mon');
    if (route.operates_tuesday) days.push('Tue');
    if (route.operates_wednesday) days.push('Wed');
    if (route.operates_thursday) days.push('Thu');
    if (route.operates_friday) days.push('Fri');
    if (route.operates_saturday) days.push('Sat');
    if (route.operates_sunday) days.push('Sun');

    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !route.operates_saturday && !route.operates_sunday) return 'Weekdays';
    if (days.length === 2 && route.operates_saturday && route.operates_sunday) return 'Weekends';
    return days.join(', ');
  };

  if (loading) {
    return (
      <div className="bus-routes-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus-routes-page">
        <div className="error-state">
          <h2>Error Loading Routes</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-routes-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Bus Routes</h1>
          <p className="page-subtitle">Manage your Section 22 local bus routes</p>
        </div>
        <button className="btn-primary">
          <span>+</span>
          Create New Route
        </button>
      </div>

      <div className="page-filters">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Routes ({routes.length})
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'planning' ? 'active' : ''}`}
            onClick={() => setFilter('planning')}
          >
            Planning
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search routes..."
            className="search-input"
          />
        </div>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗺️</div>
          <h2>No Routes Found</h2>
          <p>
            {filter === 'all'
              ? 'Get started by creating your first bus route.'
              : `No ${filter} routes found. Try changing your filter.`}
          </p>
          <button className="btn-primary">Create Your First Route</button>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map((route) => (
            <div key={route.route_id} className="route-card">
              <div className="route-header">
                <div className="route-number">{route.route_number}</div>
                <span className={`status-badge ${getStatusBadgeClass(route.status)}`}>
                  {route.status}
                </span>
              </div>

              <h3 className="route-name">{route.route_name}</h3>

              {route.description && (
                <p className="route-description">{route.description}</p>
              )}

              <div className="route-journey">
                <div className="journey-point">
                  <div className="journey-icon start">📍</div>
                  <div className="journey-label">{route.origin_point}</div>
                </div>
                <div className="journey-arrow">→</div>
                <div className="journey-point">
                  <div className="journey-icon end">🎯</div>
                  <div className="journey-label">{route.destination_point}</div>
                </div>
              </div>

              <div className="route-meta">
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-value">{getOperatingDaysDisplay(route)}</span>
                </div>
                {route.total_distance_miles && (
                  <div className="meta-item">
                    <span className="meta-icon">📏</span>
                    <span className="meta-value">{route.total_distance_miles} miles</span>
                  </div>
                )}
                {route.estimated_duration_minutes && (
                  <div className="meta-item">
                    <span className="meta-icon">⏱️</span>
                    <span className="meta-value">{route.estimated_duration_minutes} mins</span>
                  </div>
                )}
              </div>

              <div className="route-stats">
                <div className="stat-item">
                  <div className="stat-value">{route.stop_count || 0}</div>
                  <div className="stat-label">Stops</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{route.timetable_count || 0}</div>
                  <div className="stat-label">Services</div>
                </div>
              </div>

              <div className="route-actions">
                <button className="btn-secondary">View Details</button>
                <button className="btn-text">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
