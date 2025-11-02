import { DriverCompliance, TrainingType } from '../../types';

interface Props {
  driverCompliance: DriverCompliance[];
  trainingTypes: TrainingType[];
  onRefresh: () => void;
}

function DriverComplianceSection({ driverCompliance, trainingTypes, onRefresh }: Props) {
  return (
    <div className="training-section driver-compliance-section">
      <h3 style={{ marginBottom: '1rem' }}>Driver Compliance</h3>
      <div className="section-content">
        {driverCompliance.length === 0 ? (
          <div className="empty-state">No compliance data available.</div>
        ) : (
          <table className="compliance-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th className="center">Required</th>
                <th className="center">Valid</th>
                <th className="center">Compliance</th>
                <th className="center">Status</th>
              </tr>
            </thead>
            <tbody>
              {driverCompliance.map(compliance => (
                <tr key={compliance.driverId}>
                  <td>{compliance.driverName}</td>
                  <td className="center">{compliance.requiredTraining}</td>
                  <td className="center">{compliance.validTraining}</td>
                  <td className="center">{compliance.compliancePercentage}%</td>
                  <td className="center">
                    <span className={`status-badge ${compliance.complianceStatus}`}>
                      {compliance.complianceStatus}
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

export default DriverComplianceSection;
