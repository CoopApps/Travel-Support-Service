import { Driver, TrainingType, TrainingRecord } from '../../types';

interface DriverTrainingComplianceTableProps {
  drivers: Driver[];
  trainingTypes: TrainingType[];
  trainingRecords: TrainingRecord[];
  onAddTraining: (driver: Driver) => void;
}

function DriverTrainingComplianceTable({
  drivers,
  trainingTypes,
  trainingRecords,
  onAddTraining
}: DriverTrainingComplianceTableProps) {

  // Get training records for a specific driver and training type
  const getTrainingStatus = (driverId: number, trainingTypeId: number) => {
    const record = trainingRecords.find(
      r => r.driverId === driverId && r.trainingTypeId === trainingTypeId
    );

    if (!record) {
      return { text: 'Not Completed', color: '#6c757d', level: 'missing' };
    }

    const expiryDate = new Date(record.expiryDate);
    const today = new Date();
    const daysUntil = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { text: `Expired ${Math.abs(daysUntil)} days ago`, color: '#dc2626', level: 'expired', record };
    } else if (daysUntil <= 30) {
      return { text: `${daysUntil} days left`, color: '#f59e0b', level: 'warning', record };
    } else {
      return { text: 'Valid', color: '#22c55e', level: 'ok', record };
    }
  };

  // Calculate overall compliance status for a driver
  const getComplianceStatus = (driverId: number) => {
    const mandatoryTypes = trainingTypes.filter(t => t.mandatory);
    if (mandatoryTypes.length === 0) {
      return { text: 'NO REQUIREMENTS', color: '#6c757d', completed: 0, total: 0 };
    }

    let completed = 0;
    let hasExpired = false;
    let hasWarning = false;

    mandatoryTypes.forEach(type => {
      const status = getTrainingStatus(driverId, type.id);
      if (status.level === 'ok') {
        completed++;
      } else if (status.level === 'expired') {
        hasExpired = true;
      } else if (status.level === 'warning') {
        hasWarning = true;
        completed++; // Still counts as completed but expiring
      }
    });

    if (hasExpired || completed < mandatoryTypes.length) {
      return { text: 'NON-COMPLIANT', color: '#dc2626', completed, total: mandatoryTypes.length };
    }
    if (hasWarning) {
      return { text: 'EXPIRING SOON', color: '#ffc107', completed, total: mandatoryTypes.length };
    }
    return { text: 'COMPLIANT', color: '#22c55e', completed, total: mandatoryTypes.length };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="driver-training-compliance-section">
      {/* Compliance Table */}
      <div className="table-container">
        <table className="compliance-table">
          <thead>
            <tr>
              <th>Driver</th>
              {trainingTypes.map(type => (
                <th key={type.id}>
                  {type.name}
                  {type.mandatory && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
                </th>
              ))}
              <th>Compliance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={trainingTypes.length + 3} style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                  No drivers found. Add drivers first to track their training compliance.
                </td>
              </tr>
            ) : (
              drivers.map(driver => {
                const compliance = getComplianceStatus(driver.driver_id);

                return (
                  <tr key={driver.driver_id}>
                    <td>
                      <strong>{driver.name}</strong><br />
                      <small style={{ color: '#6c757d' }}>{driver.phone}</small>
                    </td>
                    {trainingTypes.map(type => {
                      const status = getTrainingStatus(driver.driver_id, type.id);
                      return (
                        <td key={type.id}>
                          <div style={{ color: status.color, fontWeight: 'bold', fontSize: '0.8125rem' }}>
                            {status.text}
                          </div>
                          {status.record && (
                            <small style={{ color: '#6c757d', display: 'block', marginTop: '2px' }}>
                              Expires: {formatDate(status.record.expiryDate)}
                            </small>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <div>
                        <span
                          className="status-badge"
                          style={{
                            background: compliance.color === '#22c55e' ? '#d1fae5' :
                                       compliance.color === '#ffc107' ? '#fef3c7' : '#fee2e2',
                            color: compliance.color === '#22c55e' ? '#065f46' :
                                  compliance.color === '#ffc107' ? '#92400e' : '#991b1b'
                          }}
                        >
                          {compliance.text}
                        </span>
                      </div>
                      {compliance.total > 0 && (
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                          {compliance.completed}/{compliance.total} mandatory
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onAddTraining(driver)}
                          title="Add training record"
                        >
                          Add Training
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {trainingTypes.filter(t => t.mandatory).length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6c757d' }}>
          <span style={{ color: '#dc2626' }}>*</span> Indicates mandatory training requirement
        </div>
      )}
    </div>
  );
}

export default DriverTrainingComplianceTable;
