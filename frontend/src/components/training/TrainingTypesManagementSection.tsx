import { useState } from 'react';
import { TrainingType } from '../../types';

interface TrainingTypesManagementSectionProps {
  trainingTypes: TrainingType[];
  onAddType: () => void;
}

function TrainingTypesManagementSection({
  trainingTypes,
  onAddType
}: TrainingTypesManagementSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="collapsible-section">
      {/* Collapsible Header */}
      <div
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>Training Types Configuration ({trainingTypes.length})</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddType();
            }}
          >
            Add Training Type
          </button>
          <svg
            className={`collapse-icon ${isExpanded ? 'expanded' : ''}`}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="collapsible-content">
          {trainingTypes.length === 0 ? (
            <div className="empty-state">
              No training types configured yet. Click "Add Training Type" to get started.
            </div>
          ) : (
            <table className="training-table">
              <thead>
                <tr>
                  <th>Training Name</th>
                  <th>Category</th>
                  <th className="center">Validity Period</th>
                  <th className="center">Mandatory</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {trainingTypes.map(type => (
                  <tr key={type.id}>
                    <td>
                      <strong>{type.name}</strong>
                      {type.mandatory && (
                        <span
                          style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '0.75rem',
                            borderRadius: '4px'
                          }}
                        >
                          Required
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#e3f2fd',
                          color: '#1976d2',
                          fontSize: '0.8125rem',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}
                      >
                        {type.category}
                      </span>
                    </td>
                    <td className="center">
                      <strong>{type.validityPeriod}</strong> months
                    </td>
                    <td className="center">
                      {type.mandatory ? (
                        <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>✓</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ color: '#6c757d', fontSize: '0.8125rem' }}>
                      {type.description || 'No description'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {trainingTypes.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                Summary
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <strong>Total Types:</strong> {trainingTypes.length}
                </div>
                <div>
                  <strong>Mandatory:</strong> {trainingTypes.filter(t => t.mandatory).length}
                </div>
                <div>
                  <strong>Optional:</strong> {trainingTypes.filter(t => !t.mandatory).length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TrainingTypesManagementSection;
