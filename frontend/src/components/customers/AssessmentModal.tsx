import { useState, useEffect, FormEvent } from 'react';
import { Customer } from '../../types';
import { customerApi } from '../../services/api';

interface AssessmentModalProps {
  customer: Customer;
  tenantId: number;
  onClose: (shouldRefresh: boolean) => void;
}

interface RiskAssessment {
  mobilityLevel?: string;
  requiresWheelchair?: boolean;
  requiresWalkingAid?: boolean;
  cognitiveImpairment?: boolean;
  behaviouralIssues?: boolean;
  communicationNeeds?: string;
  medicalConditions?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  specialInstructions?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  assessmentDate?: string;
  assessedBy?: string;
  lastReviewDate?: string;
}

/**
 * Assessment Modal
 *
 * Risk assessment and care requirements for customer
 */
function AssessmentModal({ customer, tenantId, onClose }: AssessmentModalProps) {
  const [assessment, setAssessment] = useState<RiskAssessment>({
    mobilityLevel: '',
    requiresWheelchair: false,
    requiresWalkingAid: false,
    cognitiveImpairment: false,
    behaviouralIssues: false,
    communicationNeeds: '',
    medicalConditions: '',
    emergencyContact: '',
    emergencyPhone: '',
    specialInstructions: '',
    riskLevel: 'low',
    assessmentDate: new Date().toISOString().split('T')[0],
    assessedBy: '',
    lastReviewDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Load existing assessment
   */
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const response = await customerApi.getAssessment(tenantId, customer.id);
        if (response.assessment) {
          setAssessment(response.assessment);
        }
      } catch {
        // Error handled silently
      } finally {
        setLoadingData(false);
      }
    };
    loadAssessment();
  }, [tenantId, customer.id]);

  /**
   * Update assessment field
   */
  const updateField = (field: keyof RiskAssessment, value: any) => {
    setAssessment(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle save assessment
   */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await customerApi.updateAssessment(tenantId, customer.id, {
        ...assessment,
        lastReviewDate: new Date().toISOString().split('T')[0],
      });
      setSuccess('Assessment saved successfully!');
      setTimeout(() => onClose(true), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}
        onClick={() => onClose(false)}
      >
        {/* Modal Content */}
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '0',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              Risk Assessment - {customer.name}
            </h2>
            <button
              onClick={() => onClose(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div className="card-body">
            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            {loadingData ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading assessment...</p>
              </div>
            ) : (
              /* Assessment Form */
              <form onSubmit={handleSave}>
                {/* Mobility Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-900)' }}>
                    Mobility & Physical Needs
                  </h4>

                  <div className="form-group">
                    <label htmlFor="mobility-level">Mobility Level</label>
                    <select
                      id="mobility-level"
                      value={assessment.mobilityLevel || ''}
                      onChange={(e) => updateField('mobilityLevel', e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select...</option>
                      <option value="fully-mobile">Fully Mobile</option>
                      <option value="partially-mobile">Partially Mobile</option>
                      <option value="wheelchair-user">Wheelchair User</option>
                      <option value="non-ambulant">Non-Ambulant</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={assessment.requiresWheelchair || false}
                        onChange={(e) => updateField('requiresWheelchair', e.target.checked)}
                        disabled={loading}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Requires Wheelchair
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={assessment.requiresWalkingAid || false}
                        onChange={(e) => updateField('requiresWalkingAid', e.target.checked)}
                        disabled={loading}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Requires Walking Aid
                    </label>
                  </div>
                </div>

                {/* Cognitive & Behavioral Section */}
                <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-900)' }}>
                    Cognitive & Behavioral
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={assessment.cognitiveImpairment || false}
                        onChange={(e) => updateField('cognitiveImpairment', e.target.checked)}
                        disabled={loading}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Cognitive Impairment
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={assessment.behaviouralIssues || false}
                        onChange={(e) => updateField('behaviouralIssues', e.target.checked)}
                        disabled={loading}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Behavioral Issues
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="communication-needs">Communication Needs</label>
                    <textarea
                      id="communication-needs"
                      value={assessment.communicationNeeds || ''}
                      onChange={(e) => updateField('communicationNeeds', e.target.value)}
                      disabled={loading}
                      placeholder="E.g., hearing impaired, non-verbal, uses sign language..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Medical Section */}
                <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-900)' }}>
                    Medical Information
                  </h4>

                  <div className="form-group">
                    <label htmlFor="medical-conditions">Medical Conditions</label>
                    <textarea
                      id="medical-conditions"
                      value={assessment.medicalConditions || ''}
                      onChange={(e) => updateField('medicalConditions', e.target.value)}
                      disabled={loading}
                      placeholder="List any relevant medical conditions, allergies, or medications..."
                      rows={3}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label htmlFor="emergency-contact">Emergency Contact Name</label>
                      <input
                        id="emergency-contact"
                        type="text"
                        value={assessment.emergencyContact || ''}
                        onChange={(e) => updateField('emergencyContact', e.target.value)}
                        disabled={loading}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="emergency-phone">Emergency Contact Phone</label>
                      <input
                        id="emergency-phone"
                        type="tel"
                        value={assessment.emergencyPhone || ''}
                        onChange={(e) => updateField('emergencyPhone', e.target.value)}
                        disabled={loading}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Risk & Special Instructions Section */}
                <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-900)' }}>
                    Risk Level & Special Instructions
                  </h4>

                  <div className="form-group">
                    <label htmlFor="risk-level">Risk Level</label>
                    <select
                      id="risk-level"
                      value={assessment.riskLevel || 'low'}
                      onChange={(e) => updateField('riskLevel', e.target.value)}
                      disabled={loading}
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="special-instructions">Special Instructions for Drivers</label>
                    <textarea
                      id="special-instructions"
                      value={assessment.specialInstructions || ''}
                      onChange={(e) => updateField('specialInstructions', e.target.value)}
                      disabled={loading}
                      placeholder="Any special handling, assistance requirements, or important notes for transport staff..."
                      rows={3}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label htmlFor="assessment-date">Assessment Date</label>
                      <input
                        id="assessment-date"
                        type="date"
                        value={assessment.assessmentDate || ''}
                        onChange={(e) => updateField('assessmentDate', e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="assessed-by">Assessed By</label>
                      <input
                        id="assessed-by"
                        type="text"
                        value={assessment.assessedBy || ''}
                        onChange={(e) => updateField('assessedBy', e.target.value)}
                        disabled={loading}
                        placeholder="Staff name"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onClose(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-action btn-assessment"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Assessment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AssessmentModal;
