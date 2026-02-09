import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { clientApi, Client } from '../services/homecareApi';
import ClientStats from '../components/ClientStats';
import ClientFormModal from '../components/ClientFormModal';
import AssessmentModal from '../components/AssessmentModal';
import MedicalInfoDisplay from '../components/MedicalInfoDisplay';
import EmergencyContactDisplay from '../components/EmergencyContactDisplay';

/**
 * Homecare Service Client List Page
 *
 * Manages care recipients with comprehensive features:
 * - Pagination, Search, Filtering
 * - Active/Archived tabs
 * - Bulk operations (archive/unarchive)
 * - Quick actions (edit, assess, sync to travel)
 * - CSV export
 */

function ClientsListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const toast = useToast();

  // Safety check
  if (!tenantId) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Error: No Tenant Information</h2>
        <p>Unable to determine which organization you belong to. Please contact support.</p>
      </div>
    );
  }

  // State for client data
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshStats, setRefreshStats] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Filter/search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Assessment modal state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentClient, setAssessmentClient] = useState<Client | null>(null);

  // Bulk selection state
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());

  /**
   * Toggle selection of a client
   */
  const toggleClientSelection = (clientId: number) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  /**
   * Toggle all clients on current page
   */
  const toggleAllClients = () => {
    const currentClients = getFilteredClients();
    if (selectedClients.size === currentClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(currentClients.map(c => c.client_id)));
    }
  };

  /**
   * Bulk archive selected clients
   */
  const handleBulkArchive = async () => {
    if (selectedClients.size === 0) return;
    if (!confirm(`Archive ${selectedClients.size} client${selectedClients.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedClients).map(id =>
          clientApi.update(tenantId, id, { status: 'archived' })
        )
      );
      toast.success(`Archived ${selectedClients.size} client${selectedClients.size !== 1 ? 's' : ''}`);
      setSelectedClients(new Set());
      fetchClients();
      setRefreshStats(prev => prev + 1);
    } catch (err: any) {
      toast.error(`Failed to archive clients: ${err.message}`);
    }
  };

  /**
   * Bulk unarchive selected clients
   */
  const handleBulkUnarchive = async () => {
    if (selectedClients.size === 0) return;
    if (!confirm(`Unarchive ${selectedClients.size} client${selectedClients.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedClients).map(id =>
          clientApi.update(tenantId, id, { status: 'active' })
        )
      );
      toast.success(`Unarchived ${selectedClients.size} client${selectedClients.size !== 1 ? 's' : ''}`);
      setSelectedClients(new Set());
      fetchClients();
      setRefreshStats(prev => prev + 1);
    } catch (err: any) {
      toast.error(`Failed to unarchive clients: ${err.message}`);
    }
  };

  /**
   * Fetch clients from API
   */
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');

      const params: any = {
        status: activeTab === 'archive' ? 'archived' : 'active',
        search,
      };

      const response = await clientApi.list(tenantId, params);
      const clientsData = Array.isArray(response.data) ? response.data : [];

      setClients(clientsData);
      setTotal(clientsData.length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load clients');
      toast.error(err.response?.data?.error || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load clients on mount and when filters change
   */
  useEffect(() => {
    fetchClients();
  }, [tenantId, activeTab, search]);

  /**
   * Handle search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  /**
   * Get filtered clients for current page
   */
  const getFilteredClients = (): Client[] => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return clients.slice(startIndex, endIndex);
  };

  /**
   * Handle add new client
   */
  const handleAdd = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  /**
   * Handle edit client
   */
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  /**
   * Handle save client (add or edit)
   */
  const handleSave = async (data: Partial<Client>) => {
    try {
      if (editingClient) {
        await clientApi.update(tenantId, editingClient.client_id, data);
        toast.success('Client updated successfully');
      } else {
        await clientApi.create(tenantId, data);
        toast.success('Client added successfully');
      }
      fetchClients();
      setRefreshStats(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save client');
      throw err;
    }
  };

  /**
   * Handle delete client
   */
  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete ${client.first_name} ${client.last_name}? This action cannot be undone.`)) return;

    try {
      await clientApi.delete(tenantId, client.client_id);
      toast.success('Client deleted successfully');
      fetchClients();
      setRefreshStats(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete client');
    }
  };

  /**
   * Handle assessment
   */
  const handleAssessment = (client: Client) => {
    setAssessmentClient(client);
    setShowAssessmentModal(true);
  };

  /**
   * Handle save assessment
   */
  const handleSaveAssessment = async (assessment: string) => {
    if (!assessmentClient) return;

    try {
      // In a real implementation, you'd have a dedicated endpoint for assessments
      // For now, we'll add it to the client's notes or medical conditions
      await clientApi.update(tenantId, assessmentClient.client_id, {
        medical_conditions: `${assessmentClient.medical_conditions || ''}\n\nAssessment (${new Date().toLocaleDateString()}): ${assessment}`.trim()
      });
      toast.success('Assessment saved successfully');
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save assessment');
      throw err;
    }
  };

  /**
   * Handle sync to travel
   */
  const handleSyncToTravel = async (client: Client) => {
    if (client.travel_customer_id) {
      toast.info(`${client.first_name} ${client.last_name} is already synced to travel service`);
      return;
    }

    const confirmed = window.confirm(
      `Sync "${client.first_name} ${client.last_name}" to Travel Service?\n\n` +
      `This will create a customer record in the travel system while maintaining their homecare record.`
    );

    if (!confirmed) return;

    try {
      await clientApi.syncToTravel(tenantId, client.client_id);
      toast.success(`${client.first_name} ${client.last_name} synced to travel service`);
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sync client');
    }
  };

  /**
   * Handle export to CSV
   */
  const handleExportCSV = async () => {
    try {
      // Create CSV content
      const headers = ['First Name', 'Last Name', 'DOB', 'NHS Number', 'Phone', 'Email', 'Address', 'Postcode', 'Status', 'Emergency Contact', 'Emergency Phone'];
      const rows = clients.map(c => [
        c.first_name,
        c.last_name,
        c.date_of_birth || '',
        c.nhs_number || '',
        c.phone || '',
        c.email || '',
        c.address || '',
        c.postcode || '',
        c.status,
        c.emergency_contact_name || '',
        c.emergency_contact_phone || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clients-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Client data exported successfully');
    } catch (err: any) {
      toast.error('Failed to export clients');
    }
  };

  const totalPages = Math.ceil(total / limit);
  const paginatedClients = getFilteredClients();

  return (
    <div>
      {/* Tabs and Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => { setActiveTab('active'); setPage(1); setSelectedClients(new Set()); }}
            style={{
              padding: '5px 12px',
              background: activeTab === 'active' ? 'white' : 'transparent',
              color: activeTab === 'active' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Active
          </button>
          <button
            onClick={() => { setActiveTab('archive'); setPage(1); setSelectedClients(new Set()); }}
            style={{
              padding: '5px 12px',
              background: activeTab === 'archive' ? 'white' : 'transparent',
              color: activeTab === 'archive' ? '#111827' : '#6b7280',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '12px',
              boxShadow: activeTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Archived
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            disabled={clients.length === 0}
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: clients.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: clients.length === 0 ? '#9ca3af' : '#374151',
              opacity: clients.length === 0 ? 0.5 : 1
            }}
            title="Export to CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>

          <button
            onClick={handleAdd}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <ClientStats refresh={refreshStats} />

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search by name, NHS number, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="form-control"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-secondary" style={{ fontSize: '12px' }}>
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); }}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading clients...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchClients} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      ) : paginatedClients.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>
            {search ? 'No clients found matching your search.' : `No ${activeTab} clients.`}
          </p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                        onChange={toggleAllClients}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Name
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Contact
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Medical Info
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Emergency Contact
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client, index) => (
                    <tr
                      key={client.client_id}
                      style={{
                        borderBottom: index < paginatedClients.length - 1 ? '1px solid var(--gray-200)' : 'none',
                        background: selectedClients.has(client.client_id) ? '#f0f9ff' : 'white',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.client_id)}
                          onChange={() => toggleClientSelection(client.client_id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <span
                            onClick={() => navigate(`/homecare/clients/${client.client_id}`)}
                            style={{ color: '#0891b2', cursor: 'pointer', fontWeight: 500 }}
                          >
                            {client.first_name} {client.last_name}
                          </span>
                        </div>
                        {client.nhs_number && (
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            NHS: {client.nhs_number}
                          </div>
                        )}
                        {client.date_of_birth && (
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                            DOB: {new Date(client.date_of_birth).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {client.phone && <div>{client.phone}</div>}
                        {client.email && <div style={{ color: 'var(--gray-600)', fontSize: '12px' }}>{client.email}</div>}
                        {client.address && (
                          <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                            {client.postcode}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <MedicalInfoDisplay client={client} />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <EmergencyContactDisplay client={client} />
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEdit(client)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAssessment(client)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            Assess
                          </button>
                          {!client.travel_customer_id && (
                            <button
                              onClick={() => handleSyncToTravel(client)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                              title="Sync to Travel Service"
                            >
                              Sync
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/homecare/clients/${client.client_id}`)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Summary */}
      {!loading && !error && (
        <div style={{ marginTop: '1rem', fontSize: '12px', color: 'var(--gray-600)', textAlign: 'center' }}>
          Showing {paginatedClients.length} of {total} {activeTab} clients
          {selectedClients.size > 0 && ` (${selectedClients.size} selected)`}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {showAssessmentModal && assessmentClient && (
        <AssessmentModal
          client={assessmentClient}
          onClose={() => setShowAssessmentModal(false)}
          onSave={handleSaveAssessment}
        />
      )}
    </div>
  );
}

export default ClientsListPage;
