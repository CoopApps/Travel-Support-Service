import { TrainingRecord, TrainingType, Driver } from '../../types';

interface Props {
  records: TrainingRecord[];
  trainingTypes: TrainingType[];
  drivers: Driver[];
  onRefresh: () => void;
  onAddRecord: () => void;
}

function TrainingRecordsSection({ records, trainingTypes, drivers, onRefresh, onAddRecord }: Props) {
  return (
    <div className="training-section training-records-section">
      <div className="section-header">
        <h3>Training Records</h3>
        <button className="btn btn-primary" onClick={onAddRecord}>Add Training Record</button>
      </div>
      <div className="section-content">
        {records.length === 0 ? (
          <div className="empty-state">No training records found.</div>
        ) : (
          <table className="training-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Training</th>
                <th>Completed</th>
                <th>Expires</th>
                <th className="center">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map(record => (
                <tr key={record.id}>
                  <td>{record.driverName}</td>
                  <td>{record.trainingTypeName}</td>
                  <td>{new Date(record.completedDate).toLocaleDateString()}</td>
                  <td>{new Date(record.expiryDate).toLocaleDateString()}</td>
                  <td className="center">
                    <span className={`status-badge ${record.status}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TrainingRecordsSection;
