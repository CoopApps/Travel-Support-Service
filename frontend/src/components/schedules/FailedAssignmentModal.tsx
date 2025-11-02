import React from 'react';
import Modal from '../common/Modal';

interface FailedAssignment {
  customerId: number;
  customerName: string;
  day: string;
  reason: string;
}

interface AssignmentResult {
  successful: number;
  failed: FailedAssignment[];
}

interface FailedAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AssignmentResult | null;
}

const FailedAssignmentModal: React.FC<FailedAssignmentModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Assignment Results"
    >
      <div style={{ padding: '1rem' }}>
        {/* Success Summary */}
        <div style={{
          padding: '1rem',
          background: '#e8f5e9',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          borderLeft: '4px solid #4caf50'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>
            ✓ Successfully Assigned
          </h4>
          <p style={{ margin: 0, color: '#1b5e20', fontSize: '0.9375rem' }}>
            {result.successful} customer{result.successful !== 1 ? 's' : ''} assigned to their regular drivers
          </p>
        </div>

        {/* Failed Assignments */}
        {result.failed.length > 0 && (
          <>
            <div style={{
              padding: '1rem',
              background: '#ffebee',
              borderRadius: '6px',
              marginBottom: '1rem',
              borderLeft: '4px solid #f44336'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>
                ✗ Unable to Assign
              </h4>
              <p style={{ margin: 0, color: '#b71c1c', fontSize: '0.9375rem' }}>
                {result.failed.length} customer{result.failed.length !== 1 ? 's' : ''} could not be assigned
              </p>
            </div>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px'
            }}>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead style={{
                  background: 'var(--gray-100)',
                  position: 'sticky',
                  top: 0
                }}>
                  <tr>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      borderBottom: '2px solid var(--gray-300)'
                    }}>Customer</th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      borderBottom: '2px solid var(--gray-300)'
                    }}>Day</th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      borderBottom: '2px solid var(--gray-300)'
                    }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((failure, index) => (
                    <tr key={index} style={{
                      borderBottom: index < result.failed.length - 1 ? '1px solid var(--gray-200)' : 'none'
                    }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                        {failure.customerName}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--gray-700)' }}>
                        {failure.day}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--gray-600)' }}>
                        {failure.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--gray-50)',
              borderRadius: '4px',
              fontSize: '0.8125rem',
              color: 'var(--gray-700)'
            }}>
              <strong>Note:</strong> These customers remain in the unassigned list below.
              You can manually assign them by creating trips in the schedule grid.
            </div>
          </>
        )}

        {/* Action Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FailedAssignmentModal;
