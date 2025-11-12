import React, { useState, useCallback } from 'react';
import Modal from '../common/Modal';
import { enhancedBulkImport } from '../../services/fuelCardsApi';
import { useTenant } from '../../context/TenantContext';
import Papa from 'papaparse';

interface BulkImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'validate' | 'results';

interface ValidationError {
  row: number;
  errors: string[];
  data: any;
}

const BulkImportWizard: React.FC<BulkImportWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { tenantId } = useTenant();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [providerName, setProviderName] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row: any) => ({
          card_id: parseInt(row.card_id || row.CardID || row['Card ID']),
          transaction_date: row.transaction_date || row.Date || row.TransactionDate,
          transaction_time: row.transaction_time || row.Time || row.TransactionTime,
          station_name: row.station_name || row.Station || row.StationName,
          litres: parseFloat(row.litres || row.Litres || row.Volume),
          total_cost: parseFloat(row.total_cost || row.Cost || row.TotalCost),
          price_per_litre: row.price_per_litre ? parseFloat(row.price_per_litre) : undefined,
          receipt_number: row.receipt_number || row.Receipt || row.ReceiptNumber,
          driver_id: row.driver_id ? parseInt(row.driver_id) : undefined,
          vehicle_id: row.vehicle_id ? parseInt(row.vehicle_id) : undefined,
          mileage: row.mileage ? parseInt(row.mileage) : undefined,
          notes: row.notes || row.Notes,
        }));
        setTransactions(parsed);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleValidate = async () => {
    if (transactions.length === 0) {
      setError('No transactions to validate');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await enhancedBulkImport(tenantId!, {
        provider_name: providerName,
        validate_only: true,
        transactions,
      });

      setValidationResults(result);
      setStep('validate');
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await enhancedBulkImport(tenantId!, {
        provider_name: providerName,
        validate_only: false,
        transactions,
      });

      setValidationResults(result);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep('upload');
      setFile(null);
      setProviderName('');
      setTransactions([]);
      setValidationResults(null);
      setError('');
      onClose();
    }
  };

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enhanced Bulk Import Wizard"
      size="large"
    >
      <div style={{ padding: '1.5rem' }}>
        {/* Step Indicator */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50px',
              right: '50px',
              height: '2px',
              background: 'var(--gray-200)',
              zIndex: 0,
            }}>
              <div style={{
                height: '100%',
                background: 'var(--primary)',
                width: step === 'upload' ? '0%' : step === 'validate' ? '50%' : '100%',
                transition: 'width 0.3s',
              }} />
            </div>

            {/* Steps */}
            {[
              { id: 'upload', label: 'Upload CSV', icon: '📁' },
              { id: 'validate', label: 'Validate Data', icon: '✓' },
              { id: 'results', label: 'Import Results', icon: '📊' },
            ].map((s, idx) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step === s.id ? 'var(--primary)' : idx < ['upload', 'validate', 'results'].indexOf(step) ? 'var(--success)' : 'var(--gray-200)',
                  color: step === s.id || idx < ['upload', 'validate', 'results'].indexOf(step) ? 'white' : 'var(--gray-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  {s.icon}
                </div>
                <span style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--gray-700)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Provider Name (optional)
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Shell, BP, Tesco"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '6px',
                }}
              />
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--gray-300)'}`,
                borderRadius: '8px',
                padding: '3rem',
                textAlign: 'center',
                background: dragActive ? 'var(--primary-50)' : 'var(--gray-50)',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📄</div>
              {file ? (
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{file.name}</p>
                  <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                    {transactions.length} transactions ready
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                    Drop CSV file here or click to browse
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                    Supported format: CSV with headers
                  </p>
                </div>
              )}
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--info-50)',
              border: '1px solid var(--info-200)',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '1rem',
            }}>
              <strong>Required CSV columns:</strong> card_id, transaction_date, litres, total_cost, station_name
              <br />
              <strong>Optional columns:</strong> transaction_time, price_per_litre, receipt_number, driver_id, vehicle_id, mileage, notes
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                borderRadius: '6px',
                color: 'var(--danger-700)',
                fontSize: '14px',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={!file || transactions.length === 0 || loading}
                className="btn btn-primary"
              >
                {loading ? 'Validating...' : 'Validate Data'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Validation Results */}
        {step === 'validate' && validationResults && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {validationResults.total}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Total Rows</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--success-700)' }}>
                    {validationResults.valid}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--success-700)' }}>Valid</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--danger-50)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--danger-700)' }}>
                    {validationResults.invalid}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--danger-700)' }}>Invalid</div>
                </div>
              </div>

              {validationResults.invalid > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>Validation Errors:</h4>
                  <div style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                  }}>
                    <table style={{ width: '100%', fontSize: '14px' }}>
                      <thead style={{ background: 'var(--gray-50)', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Row</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResults.results?.map((result: any, idx: number) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                            <td style={{ padding: '0.75rem' }}>{result.row}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--danger-700)' }}>
                                {result.errors?.map((err: string, i: number) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                borderRadius: '6px',
                color: 'var(--danger-700)',
                fontSize: '14px',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button onClick={() => setStep('upload')} className="btn btn-secondary">
                Back
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={validationResults.valid === 0 || loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Importing...' : `Import ${validationResults.valid} Valid Transactions`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Import Results */}
        {step === 'results' && validationResults && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem' }}>
                {validationResults.imported > 0 ? '✅' : '⚠️'}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Import Complete!</h3>
              <p style={{ color: 'var(--gray-600)' }}>
                {validationResults.imported} transactions imported successfully
                {validationResults.failed > 0 && `, ${validationResults.failed} failed`}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--success-700)' }}>
                  {validationResults.imported}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--success-700)' }}>Imported</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--danger-50)', borderRadius: '6px' }}>
                <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--danger-700)' }}>
                  {validationResults.failed}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--danger-700)' }}>Failed</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={handleComplete} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkImportWizard;
