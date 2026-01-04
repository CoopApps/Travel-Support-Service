import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { passengerClassApi, permitsApi } from '../../services/api';
import { PassengerClassDefinition, PassengerClass } from '../../types/permit.types';
import './Compliance.css';

/**
 * Passenger Class Page (Section 19 Compliance)
 *
 * Manages passenger class definitions and eligibility:
 * - Class A: Disabled persons
 * - Class B: Elderly persons (65+)
 * - Class C: Persons affected by poverty/social disadvantage
 * - Class D: Members of the organization
 * - Class E: Persons in a particular locality
 * - Class F: Other prescribed classes
 */
function PassengerClassPage() {
  const { tenant, tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<PassengerClassDefinition[]>([]);
  const [standardDefs, setStandardDefs] = useState<any[]>([]);
  const [orgPermits, setOrgPermits] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({ isActive: true });

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId, filter]);

  const fetchData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [classesData, standardDefsData, permitsData] = await Promise.all([
        passengerClassApi.getClasses(tenantId, { isActive: filter.isActive }),
        passengerClassApi.getStandardDefinitions(tenantId),
        permitsApi.getOrganizationalPermits(tenantId),
      ]);

      setClasses(classesData);
      setStandardDefs(standardDefsData);
      setOrgPermits(permitsData.section19); // Only Section 19 permits use passenger classes
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (classId: number, currentlyActive: boolean) => {
    if (!tenantId) return;

    try {
      if (currentlyActive) {
        await passengerClassApi.deactivateClass(tenantId, classId);
      } else {
        await passengerClassApi.activateClass(tenantId, classId);
      }
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const getClassColor = (classCode: string) => {
    const colors: Record<string, string> = {
      A: '#ef4444',
      B: '#f59e0b',
      C: '#eab308',
      D: '#22c55e',
      E: '#3b82f6',
      F: '#8b5cf6',
    };
    return colors[classCode] || '#6b7280';
  };

  const getStandardDef = (classCode: string) => {
    return standardDefs.find((def) => def.class_code === classCode);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading passenger classes...</p>
      </div>
    );
  }

  return (
    <div className="passenger-class-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--gray-900)' }}>Passenger Class Definitions</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
            Section 19 Passenger Eligibility - Classes A through F
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          Define New Class
        </button>
      </div>

      {/* Info Card */}
      <div
        style={{
          background: 'var(--blue-50)',
          border: '1px solid var(--blue-200)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--blue-900)' }}>
          <strong>Section 19 Restriction:</strong> Section 19 permits restrict who can be carried.
          You must define which passenger classes your service covers. General public cannot be carried.
        </p>
      </div>

      {/* Filter */}
      <div className="filters-section" style={{ marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filter.isActive}
              onChange={(e) => setFilter({ isActive: e.target.checked })}
            />
            Show only active classes
          </label>
        </div>
      </div>

      {/* Standard Definitions Reference */}
      {standardDefs.length > 0 && classes.length === 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Standard Passenger Class Definitions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {standardDefs.map((def) => (
              <div
                key={def.class_code}
                className="class-card"
                style={{ borderLeft: `4px solid ${getClassColor(def.class_code)}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div
                    className="class-badge"
                    style={{ backgroundColor: getClassColor(def.class_code), color: 'white' }}
                  >
                    {def.class_code}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {def.class_name}
                  </h4>
                </div>
                <p style={{ margin: '0.5rem 0', fontSize: '14px', color: 'var(--gray-700)' }}>
                  {def.class_description}
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                  <strong>Verification:</strong> {def.verification_method}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Defined Classes */}
      {classes.length === 0 ? (
        <div className="empty-state">
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', color: 'var(--gray-400)' }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"></path>
            </svg>
          </div>
          <h3 style={{ color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No Passenger Classes Defined</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Define which passenger classes your Section 19 service covers.<br />
            This determines who is eligible to use your transport service.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Define First Class
          </button>
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Your Defined Passenger Classes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classes.map((passengerClass) => {
              const standardDef = getStandardDef(passengerClass.class_code);

              return (
                <div
                  key={passengerClass.class_id}
                  className="class-card"
                  style={{
                    borderLeft: `4px solid ${getClassColor(passengerClass.class_code)}`,
                    opacity: passengerClass.is_active ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div
                          className="class-badge"
                          style={{ backgroundColor: getClassColor(passengerClass.class_code), color: 'white' }}
                        >
                          {passengerClass.class_code}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
                            {passengerClass.class_name}
                          </h4>
                          {!passengerClass.is_active && (
                            <span className="badge" style={{ backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', marginLeft: '0.5rem' }}>
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: '0.5rem 0', fontSize: '14px', color: 'var(--gray-700)' }}>
                        {passengerClass.class_description}
                      </p>

                      {passengerClass.eligibility_criteria && (
                        <p style={{ margin: '0.75rem 0', fontSize: '13px', color: 'var(--gray-600)' }}>
                          <strong>Eligibility:</strong> {passengerClass.eligibility_criteria}
                        </p>
                      )}

                      {/* Class E specific - geographic area */}
                      {passengerClass.class_code === 'E' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--blue-50)', borderRadius: '4px', fontSize: '13px' }}>
                          {passengerClass.geographic_area && (
                            <p style={{ margin: '0.25rem 0' }}>
                              <strong>Geographic Area:</strong> {passengerClass.geographic_area}
                            </p>
                          )}
                          {passengerClass.radius_miles && (
                            <p style={{ margin: '0.25rem 0' }}>
                              <strong>Radius:</strong> {passengerClass.radius_miles} miles
                            </p>
                          )}
                          {passengerClass.center_point && (
                            <p style={{ margin: '0.25rem 0' }}>
                              <strong>Center Point:</strong> {passengerClass.center_point}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Class F specific - custom definition */}
                      {passengerClass.class_code === 'F' && passengerClass.custom_class_definition && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--purple-50)', borderRadius: '4px', fontSize: '13px' }}>
                          <p style={{ margin: 0 }}>
                            <strong>Custom Definition:</strong> {passengerClass.custom_class_definition}
                          </p>
                        </div>
                      )}

                      {/* Verification */}
                      {passengerClass.verification_required && (
                        <p style={{ marginTop: '0.75rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                          <strong>Verification Required:</strong> {passengerClass.verification_method || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleToggleActive(passengerClass.class_id!, passengerClass.is_active)}
                      >
                        {passengerClass.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => alert('Edit functionality coming soon')}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div
          className="modal-overlay"
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
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Define Passenger Class</h3>
            <p style={{ color: 'var(--gray-600)' }}>
              Full passenger class definition form with class selection (A-F), eligibility criteria,
              geographic definitions for Class E, and verification methods coming soon.
            </p>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PassengerClassPage;
