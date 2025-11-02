import { useState } from 'react';
import Modal from '../common/Modal';
import { TrainingType } from '../../types';

interface ManageTrainingTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingTypes: TrainingType[];
  onAddType: () => void;
}

function ManageTrainingTypesModal({
  isOpen,
  onClose,
  trainingTypes,
  onAddType
}: ManageTrainingTypesModalProps) {

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Training Types"
      maxWidth="900px"
    >
      <div>
        {/* Explanation */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '0.9375rem' }}>
            How Training Types Work
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '1.6', color: '#1e40af' }}>
            <li>Each training type becomes a <strong>column</strong> in the driver compliance table</li>
            <li><strong>Mandatory types</strong> are required for all drivers - they affect compliance status</li>
            <li><strong>Optional types</strong> are tracked but don't affect compliance</li>
            <li>When you add a new type, all drivers will show "Not Completed" until you add training records</li>
          </ul>
        </div>

        {/* Action Button */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            className="btn btn-success"
            onClick={() => {
              onAddType();
              onClose();
            }}
          >
            + Add New Training Type
          </button>
        </div>

        {/* Training Types Table */}
        {trainingTypes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '2px dashed #d1d5db'
          }}>
            <h4 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No Training Types Yet</h4>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Create your first training type to start tracking driver training compliance.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                onAddType();
                onClose();
              }}
            >
              Create First Training Type
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                    Training Name
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                    Category
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                    Validity
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {trainingTypes.map(type => (
                  <tr key={type.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <strong style={{ fontSize: '0.9375rem' }}>{type.name}</strong>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        fontSize: '0.8125rem',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}>
                        {type.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>
                      <strong>{type.validityPeriod}</strong> months
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {type.mandatory ? (
                        <span style={{
                          padding: '4px 10px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          MANDATORY
                        </span>
                      ) : (
                        <span style={{
                          padding: '4px 10px',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          Optional
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.8125rem' }}>
                      {type.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <strong style={{ color: '#111827' }}>Total:</strong> {trainingTypes.length} types
                {' • '}
                <strong style={{ color: '#111827' }}>Mandatory:</strong> {trainingTypes.filter(t => t.mandatory).length}
                {' • '}
                <strong style={{ color: '#111827' }}>Optional:</strong> {trainingTypes.filter(t => !t.mandatory).length}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ManageTrainingTypesModal;
