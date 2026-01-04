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

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
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
      setDrivers(driversData.drivers || driversData || []);
    } catch (error) {
      toast.error('Failed to load training data');
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
      <div className="training-page">
        <div className="training-header">
          <div>
            <h2>Training & Compliance</h2>
            {tenant && (
              <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
                {tenant.company_name}
              </p>
            )}
          </div>
        </div>

        <div className="empty-state" style={{ padding: '60px 20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ color: '#495057', marginBottom: '15px' }}>No Drivers Found</h3>
            <p style={{ color: '#6c757d', marginBottom: '25px', lineHeight: '1.5' }}>
              Add drivers first to manage their training and compliance. Training management tracks
              certifications, courses, and compliance status for all drivers.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => window.location.href = '/drivers'}>
              Manage Drivers First
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="training-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Training & Compliance</h2>
          {tenant && (
            <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
              {tenant.company_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
            Export CSV
          </button>
          <button
            className="btn btn-info"
            onClick={() => setIsManageTypesModalOpen(true)}
          >
            Manage Training Types ({trainingTypes.length})
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
          <button className="btn btn-success" onClick={() => setIsAddRecordModalOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Training Record
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {overview && <TrainingStatsCards overview={overview} />}

      {/* Active/Archive Tabs */}
      <div style={{ borderBottom: '2px solid var(--gray-200)', marginBottom: '1.5rem', marginTop: '2rem' }}>
        <button
          onClick={() => {
            setActiveTab('active');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'active' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'active' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'active' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Active Records
        </button>
        <button
          onClick={() => {
            setActiveTab('archive');
            setPage(1);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'archive' ? 'white' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'archive' ? '2px solid #28a745' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'archive' ? '#28a745' : 'var(--gray-600)',
            fontWeight: activeTab === 'archive' ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Archived Records
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by driver or training type..."
              className="form-control"
              style={{ flex: '1' }}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Results count */}
        <div style={{ color: 'var(--gray-600)', fontSize: '14px', whiteSpace: 'nowrap' }}>
          Showing {trainingRecords.length} of {total} records
        </div>
      </div>

      {/* Training Records Table */}
      {trainingRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--gray-400)">
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
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Training Type</th>
                  <th>Category</th>
                  <th>Completed Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Certificate #</th>
                </tr>
              </thead>
              <tbody>
                {trainingRecords.map((record) => {
                  const driver = drivers.find(d => d.driver_id === record.driverId);
                  const type = trainingTypes.find(t => t.id === record.trainingTypeId);
                  const expiryDate = new Date(record.expiryDate);
                  const today = new Date();
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let statusColor = '#28a745'; // Valid (green)
                  let statusText = 'Valid';

                  if (daysUntilExpiry < 0) {
                    statusColor = '#dc3545'; // Expired (red)
                    statusText = 'Expired';
                  } else if (daysUntilExpiry <= 30) {
                    statusColor = '#ffc107'; // Expiring Soon (yellow)
                    statusText = 'Expiring Soon';
                  }

                  return (
                    <tr key={record.id}>
                      <td>{driver?.name || 'Unknown Driver'}</td>
                      <td>{type?.name || 'Unknown Type'}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: 'var(--gray-100)',
                          color: 'var(--gray-700)'
                        }}>
                          {type?.category || 'N/A'}
                        </span>
                      </td>
                      <td>{new Date(record.completedDate).toLocaleDateString()}</td>
                      <td>{expiryDate.toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: statusColor + '20',
                          color: statusColor,
                          fontWeight: 500
                        }}>
                          {statusText}
                        </span>
                      </td>
                      <td>{record.provider || '-'}</td>
                      <td>{record.certificateNumber || '-'}</td>
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
