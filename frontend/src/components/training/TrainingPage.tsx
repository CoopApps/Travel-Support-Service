import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
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
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<TrainingOverview | null>(null);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

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
        trainingApi.getTrainingRecords(tenantId),
        driverApi.getDrivers(tenantId)
      ]);

      setOverview(overviewData);
      setTrainingTypes(typesData.trainingTypes || []);
      setTrainingRecords(recordsData.trainingRecords || []);
      setDrivers(driversData.drivers || driversData || []);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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
      console.error('Error creating training type:', error);
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
      console.error('Error creating training record:', error);
      throw error;
    }
  };

  // Handle adding training for a specific driver
  const handleAddTrainingForDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsAddRecordModalOpen(true);
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
      {/* Header - matching permits */}
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
          <button
            className="btn btn-info"
            onClick={() => setIsManageTypesModalOpen(true)}
          >
            Manage Training Types ({trainingTypes.length})
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {overview && <TrainingStatsCards overview={overview} />}

      {/* Driver Training Compliance Table - Main Section */}
      <DriverTrainingComplianceTable
        drivers={drivers}
        trainingTypes={trainingTypes}
        trainingRecords={trainingRecords}
        onAddTraining={handleAddTrainingForDriver}
      />

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
