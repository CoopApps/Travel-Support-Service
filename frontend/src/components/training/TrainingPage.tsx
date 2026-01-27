import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { trainingApi, driverApi } from '../../services/api';
import {
  TrainingOverview,
  TrainingType,
  TrainingRecord,
  DriverCompliance,
  Driver
} from '../../types';
import { CreateTrainingTypeDTO, CreateTrainingRecordDTO } from '../../types/training.types';
import TrainingStatsCards from './TrainingStatsCards';
import DriverTrainingComplianceTable from './DriverTrainingComplianceTable';
import ManageTrainingTypesModal from './ManageTrainingTypesModal';
import AddTrainingTypeModal from './AddTrainingTypeModal';
import AddTrainingRecordModal from './AddTrainingRecordModal';
import './Training.css';

/**
 * Training Page - Driver training and compliance management
 *
 * Features:
 * - Training types management (courses/certifications)
 * - Training records tracking
 * - Driver compliance monitoring
 * - Expiry alerts
 */
function TrainingPage() {
  const { tenant, tenantId } = useTenant();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal states
  const [isManageTypesModalOpen, setIsManageTypesModalOpen] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Bulk selection state
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError('');
      const [overviewData, typesData, recordsData, driversData] = await Promise.all([
        trainingApi.getOverview(tenantId),
        trainingApi.getTrainingTypes(tenantId),
        trainingApi.getTrainingRecords(tenantId, {
          page,
          limit,
          search,
          archived: activeTab === 'archive'
        }),
        driverApi.getDrivers(tenantId)
      ]);

      setOverview(overviewData);
      setTrainingTypes(typesData.trainingTypes || []);
      setTrainingRecords(recordsData.trainingRecords || []);
      setTotal(recordsData.total || 0);
      setTotalPages(recordsData.totalPages || 0);
      setDrivers(driversData?.drivers || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to load training data';
      setError(errorMessage);
      console.error('Failed to load training data:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, page, limit, search, activeTab]); // Remove toast from dependencies to prevent infinite loop

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle creating a new training type
  const handleCreateTrainingType = async (data: CreateTrainingTypeDTO) => {
    if (!tenantId) return;

    try {
      await trainingApi.createTrainingType(tenantId, data);
      await fetchData(); // Refresh all data
    } catch (error) {
      throw error;
    }
  };

  // Handle creating a new training record
  const handleCreateTrainingRecord = async (data: CreateTrainingRecordDTO) => {
    if (!tenantId) return;

    try {
      await trainingApi.createTrainingRecord(tenantId, data);
      await fetchData(); // Refresh all data
    } catch (error) {
      throw error;
    }
  };

  // Handle adding training for a specific driver
  const handleAddTrainingForDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsAddRecordModalOpen(true);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page when searching
  };

  /**
   * Toggle selection of a training record
   */
  const toggleRecordSelection = (recordId: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  /**
   * Toggle all records on current page
   */
  const toggleAllRecords = () => {
    const currentRecords = trainingRecords.filter(r => activeTab === 'active' ? !r.archived : r.archived);
    if (selectedRecords.size === currentRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(currentRecords.map(r => r.id)));
    }
  };

  /**
   * Bulk archive selected records
   */
  const handleBulkArchive = async () => {
    if (selectedRecords.size === 0) return;
    if (!confirm(`Archive ${selectedRecords.size} training record${selectedRecords.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedRecords).map(id =>
          trainingApi.updateTrainingRecord(tenantId, id, { archived: true })
        )
      );
      toast.success(`Archived ${selectedRecords.size} training record${selectedRecords.size !== 1 ? 's' : ''}`);
      setSelectedRecords(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to archive records: ${err.message}`);
    }
  };

  /**
   * Bulk unarchive selected records
   */
  const handleBulkUnarchive = async () => {
    if (selectedRecords.size === 0) return;
    if (!confirm(`Unarchive ${selectedRecords.size} training record${selectedRecords.size !== 1 ? 's' : ''}?`)) return;

    try {
      await Promise.all(
        Array.from(selectedRecords).map(id =>
          trainingApi.updateTrainingRecord(tenantId, id, { archived: false })
        )
      );
      toast.success(`Unarchived ${selectedRecords.size} training record${selectedRecords.size !== 1 ? 's' : ''}`);
      setSelectedRecords(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to unarchive records: ${err.message}`);
    }
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    if (!tenantId) return;

    try {
      const response = await trainingApi.exportTrainingRecords(tenantId, {
        search,
        archived: activeTab === 'archive',
      });

      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-records-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Training records exported successfully');
    } catch (error) {
      toast.error('Failed to export training records');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading training data...</p>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div>
        {/* Empty State */}
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            Add drivers first to manage their training and compliance. Training management tracks certifications, courses, and compliance status for all drivers.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/drivers'}>
            Manage Drivers First
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons and Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {/* Tabs - Compact */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f3f4f6', borderRadius: '4px', padding: '2px' }}>
          <button
            onClick={() => { setActiveTab('active'); setPage(1); }}
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
            onClick={() => { setActiveTab('archive'); setPage(1); }}
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
            style={{
              padding: '6px 10px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#374151'
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
            onClick={() => setIsManageTypesModalOpen(true)}
            style={{
              padding: '6px 12px',
              background: '#3b82f6',
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
            Manage Types ({trainingTypes.length})
          </button>
          <button
            onClick={() => setIsAddRecordModalOpen(true)}
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
            Add Record
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {overview && <TrainingStatsCards overview={overview} />}

      {/* Search & Bulk Actions - Compact */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', maxWidth: '320px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search training records..."
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              style={{
                padding: '6px 10px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Bulk Actions */}
        {selectedRecords.size > 0 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 8px', background: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
              {selectedRecords.size} selected
            </span>
            {activeTab === 'active' ? (
              <button
                onClick={handleBulkArchive}
                style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
              >
                Archive
              </button>
            ) : (
              <button
                onClick={handleBulkUnarchive}
                style={{ padding: '4px 8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
              >
                Unarchive
              </button>
            )}
            <button
              onClick={() => setSelectedRecords(new Set())}
              style={{ padding: '4px 8px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {selectedRecords.size === 0 && (
        <div style={{ marginBottom: '12px', color: 'var(--gray-600)', fontSize: '12px', whiteSpace: 'nowrap' }}>
          Showing {trainingRecords.length} of {total}
        </div>
      )}

      {/* Training Records Table */}
      {trainingRecords.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z"/>
            </svg>
          </div>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {search ? 'No training records found matching your search.' : `No ${activeTab} training records yet.`}
          </p>
          {!search && activeTab === 'active' && (
            <button className="btn btn-primary" onClick={() => setIsAddRecordModalOpen(true)}>
              Add Your First Training Record
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRecords.size === trainingRecords.length && trainingRecords.length > 0}
                      onChange={toggleAllRecords}
                      style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                  </th>
                  <th>Driver</th>
                  <th>Training Type</th>
                  <th>Category</th>
                  <th>Completed Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainingRecords.map((record) => {
                  const driver = drivers.find(d => d.driver_id === record.driverId);
                  const type = trainingTypes.find(t => t.id === record.trainingTypeId);
                  const expiryDate = new Date(record.expiryDate);
                  const today = new Date();
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let statusColor = '#10b981'; // Valid (green)
                  let statusText = 'Valid';

                  if (daysUntilExpiry < 0) {
                    statusColor = '#dc3545'; // Expired (red)
                    statusText = 'Expired';
                  } else if (daysUntilExpiry <= 30) {
                    statusColor = '#f59e0b'; // Expiring Soon (amber)
                    statusText = 'Expiring Soon';
                  }

                  return (
                    <tr key={record.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleRecordSelection(record.id)}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                      </td>
                      <td>{driver?.name || 'Unknown Driver'}</td>
                      <td>{type?.name || 'Unknown Type'}</td>
                      <td>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          fontWeight: 500
                        }}>
                          {type?.category || 'N/A'}
                        </span>
                      </td>
                      <td>{new Date(record.completedDate).toLocaleDateString()}</td>
                      <td>{expiryDate.toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          background: statusColor + '20',
                          color: statusColor,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          {statusText}
                        </span>
                      </td>
                      <td>{record.provider || '-'}</td>
                      <td style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        <button
                          onClick={() => handleAddTrainingForDriver(driver!)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        className="btn"
                        onClick={() => setPage(pageNum)}
                        style={{
                          minWidth: '36px',
                          padding: '0.375rem 0.5rem',
                          background: page === pageNum ? '#28a745' : 'white',
                          color: page === pageNum ? 'white' : 'var(--gray-700)',
                          border: '1px solid var(--gray-300)',
                          fontWeight: page === pageNum ? 600 : 400
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ManageTrainingTypesModal
        isOpen={isManageTypesModalOpen}
        onClose={() => setIsManageTypesModalOpen(false)}
        trainingTypes={trainingTypes}
        onAddType={() => setIsAddTypeModalOpen(true)}
      />

      <AddTrainingTypeModal
        isOpen={isAddTypeModalOpen}
        onClose={() => setIsAddTypeModalOpen(false)}
        onSave={handleCreateTrainingType}
      />

      <AddTrainingRecordModal
        isOpen={isAddRecordModalOpen}
        onClose={() => {
          setIsAddRecordModalOpen(false);
          setSelectedDriver(null);
        }}
        onSave={handleCreateTrainingRecord}
        drivers={drivers}
        trainingTypes={trainingTypes}
      />
    </div>
  );
}

export default TrainingPage;
