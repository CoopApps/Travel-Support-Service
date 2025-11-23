import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { busRoutesApi, BusRoute } from '../../services/busApi';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import RouteFormModal from './RouteFormModal';
import './BusRoutesPage.css';

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  total_votes: number;
  total_pledges: number;
  target_passengers: number;
  status: 'open' | 'threshold_met' | 'approved' | 'rejected' | 'converted_to_route';
  is_viable: boolean;
  target_reached: boolean;
}

export default function BusRoutesPage() {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [proposals, setProposals] = useState<RouteProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'planning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);

  const fetchRoutes = async () => {
    if (!tenant?.tenant_id) return;

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

  const fetchProposals = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      const response = await fetch(
        `/api/tenants/${tenant.tenant_id}/admin/route-proposals`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Only show actionable proposals (open or threshold_met)
        setProposals(data.filter((p: RouteProposal) =>
          p.status === 'open' || p.status === 'threshold_met'
        ));
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchProposals();
  }, [tenant?.tenant_id, filter]);

  const handleCreateRoute = () => {
    setEditingRoute(null);
    setShowModal(true);
  };

  const handleEditRoute = (route: BusRoute) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleDeleteRoute = async (route: BusRoute) => {
    if (!tenant?.tenant_id) return;

    const confirmMessage = route.timetable_count && route.timetable_count > 0
      ? `This route has ${route.timetable_count} timetable(s). Are you sure you want to delete "${route.route_name}"?`
      : `Are you sure you want to delete "${route.route_name}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      await busRoutesApi.deleteRoute(tenant.tenant_id, route.route_id);
      fetchRoutes();
    } catch (err: any) {
      console.error('Failed to delete route:', err);
      alert(err.response?.data?.error || 'Failed to delete route. It may have active timetables.');
    }
  };

  const handleModalSuccess = () => {
    fetchRoutes();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  // Filter routes by search query
  const filteredRoutes = routes.filter(route => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      route.route_number.toLowerCase().includes(query) ||
      route.route_name.toLowerCase().includes(query) ||
      route.origin_point.toLowerCase().includes(query) ||
      route.destination_point.toLowerCase().includes(query)
    );
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'planning': return 'status-planning';
      case 'registered': return 'status-registered';
      case 'suspended': return 'status-suspended';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getOperatingDaysShort = (route: BusRoute) => {
    const days = [];
    if (route.operates_monday) days.push('M');
    if (route.operates_tuesday) days.push('T');
    if (route.operates_wednesday) days.push('W');
    if (route.operates_thursday) days.push('T');
    if (route.operates_friday) days.push('F');
    if (route.operates_saturday) days.push('S');
    if (route.operates_sunday) days.push('S');

    if (days.length === 7) return 'Daily';
    if (days.length === 5 && !route.operates_saturday && !route.operates_sunday) return 'M-F';
    if (days.length === 2 && route.operates_saturday && route.operates_sunday) return 'S-S';
    return days.join('');
  };

  const getProposalStatusClass = (proposal: RouteProposal) => {
    if (proposal.status === 'threshold_met') return 'proposal-ready';
    if (proposal.is_viable) return 'proposal-viable';
    return 'proposal-open';
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
          <button className="btn-primary" onClick={fetchRoutes}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-routes-page routes-with-sidebar">
      {/* Main Content Area */}
      <div className="routes-main">
        <div className="page-header compact">
          <div className="header-content">
            <h1>Bus Routes</h1>
          </div>
          <button className="btn-primary btn-sm" onClick={handleCreateRoute}>
            + New Route
          </button>
        </div>

        <div className="page-filters compact">
          <div className="filter-group">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({routes.length})
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

          <input
            type="text"
            placeholder="Search routes..."
            className="search-input compact"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredRoutes.length === 0 ? (
          <div className="empty-state compact">
            <h3>No Routes Found</h3>
            <p>
              {searchQuery
                ? 'No routes match your search.'
                : 'Create your first bus route to get started.'}
            </p>
            {!searchQuery && (
              <button className="btn-primary btn-sm" onClick={handleCreateRoute}>
                Create Route
              </button>
            )}
          </div>
        ) : (
          <div className="routes-table-container">
            <table className="routes-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Route</th>
                  <th>Name</th>
                  <th>Journey</th>
                  <th style={{ width: '70px' }}>Days</th>
                  <th style={{ width: '60px' }}>Stops</th>
                  <th style={{ width: '80px' }}>Services</th>
                  <th style={{ width: '90px' }}>Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.route_id}>
                    <td>
                      <span className="route-number-badge">{route.route_number}</span>
                    </td>
                    <td>
                      <div className="route-name-cell">
                        <span className="route-name">{route.route_name}</span>
                        {route.route_type === 'group' && (
                          <span className="route-type-badge group">Group</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="journey-cell">
                        <span className="origin">{route.origin_point}</span>
                        <span className="arrow">→</span>
                        <span className="destination">{route.destination_point}</span>
                      </div>
                    </td>
                    <td>
                      <span className="days-badge">{getOperatingDaysShort(route)}</span>
                    </td>
                    <td className="center">{route.stop_count || 0}</td>
                    <td className="center">{route.timetable_count || 0}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(route.status)}`}>
                        {route.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleEditRoute(route)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteRoute(route)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proposed Routes Sidebar */}
      <aside className="proposals-sidebar">
        <div className="sidebar-header">
          <h2>Route Proposals</h2>
          <span className="proposal-count">{proposals.length}</span>
        </div>

        <div className="sidebar-actions">
          <Link to="/admin/route-proposals" className="btn-secondary btn-sm btn-block">
            Review All
          </Link>
        </div>

        {proposals.length === 0 ? (
          <div className="sidebar-empty">
            <p>No pending proposals</p>
          </div>
        ) : (
          <div className="proposals-list">
            {proposals.slice(0, 5).map((proposal) => (
              <div key={proposal.proposal_id} className={`proposal-card ${getProposalStatusClass(proposal)}`}>
                <div className="proposal-header">
                  <span className="proposal-name">{proposal.route_name}</span>
                  {proposal.status === 'threshold_met' && (
                    <span className="proposal-badge ready">Ready</span>
                  )}
                </div>
                <div className="proposal-journey">
                  {proposal.origin_area} → {proposal.destination_name}
                </div>
                <div className="proposal-stats">
                  <span className="stat">
                    <strong>{proposal.total_pledges}</strong>/{proposal.target_passengers} pledges
                  </span>
                  <span className="stat">
                    <strong>{proposal.total_votes}</strong> votes
                  </span>
                </div>
                <div className="proposal-progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(100, (proposal.total_pledges / proposal.target_passengers) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {proposals.length > 5 && (
          <div className="sidebar-more">
            <Link to="/admin/route-proposals">
              +{proposals.length - 5} more proposals
            </Link>
          </div>
        )}
      </aside>

      <RouteFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        route={editingRoute}
      />
    </div>
  );
}
