import { TrainingType } from '../../types';

interface Props {
  trainingTypes: TrainingType[];
  onRefresh: () => void;
  onAddType: () => void;
}

function TrainingTypesSection({ trainingTypes, onRefresh, onAddType }: Props) {
  return (
    <div className="training-section training-types-section">
      <div className="section-header">
        <h3>Training Types</h3>
        <button className="btn btn-primary" onClick={onAddType}>Add Training Type</button>
      </div>
      <div className="section-content">
        {trainingTypes.length === 0 ? (
          <div className="empty-state">No training types configured yet.</div>
        ) : (
          <table className="training-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th className="center">Validity</th>
                <th className="center">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {trainingTypes.map(type => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{type.category}</td>
                  <td className="center">{type.validityPeriod} months</td>
                  <td className="center">
                    {type.mandatory ? '✓' : '-'}
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

export default TrainingTypesSection;
