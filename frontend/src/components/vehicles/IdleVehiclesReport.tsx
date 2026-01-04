import React, { useState, useEffect } from 'react';
import { vehicleApi } from '../../services/api';

interface IdleVehiclesReportProps {
  tenantId: number;
}

interface IdleVehicle {
  vehicle_id: number;
  registration_number: string;
  make: string;
  model: string;
  ownership_type: string;
  status: string;
  wheelchair_accessible: boolean;
  days_since_last_trip: number | null;
  last_trip_date: string | null;
  total_trips: number;
  monthly_lease_cost: number | null;
  monthly_insurance_cost: number | null;
  total_monthly_cost: number;
  recommendation: string;
}

const IdleVehiclesReport: React.FC<IdleVehiclesReportProps> = ({ tenantId }) => {
  const [idleData, setIdleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysThreshold, setDaysThreshold] = useState(30);
  const [selectedVehicle, setSelectedVehicle] = useState<IdleVehicle | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  useEffect(() => {
    loadIdleReport();
  }, [tenantId, daysThreshold]);

  const loadIdleReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleApi.getIdleReport(tenantId, daysThreshold);
      setIdleData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load idle vehicles report');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveVehicle = async (vehicleId: number) => {
    if (!confirm('Are you sure you want to archive this vehicle? It will be removed from active service.')) {
      return;
    }

    try {
      await vehicleApi.archiveVehicle(tenantId, vehicleId, 'Idle - not being utilized');
      alert('Vehicle archived successfully');
      loadIdleReport();
      setActionModalOpen(false);
    } catch (err: any) {
      alert('Failed to archive vehicle: ' + err.message);
    }
  };

  const handleViewDetails = (vehicle: IdleVehicle) => {
    setSelectedVehicle(vehicle);
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    setActionModalOpen(false);
    setSelectedVehicle(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{
          border: '3px solid var(--gray-200)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--danger)'
      }}>
        <p style={{ marginBottom: '1rem' }}>Error: {error}</p>
        <button
          onClick={loadIdleReport}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!idleData) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data available</div>;
  }

  const { summary, never_used, idle_vehicles } = idleData;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header with Threshold Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>Idle Vehicles Report</h2>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.9rem' }}>
            Identify underutilized vehicles and optimize fleet costs
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}>
            Idle Threshold (days):
          </label>
          <select
            value={daysThreshold}
            onChange={(e) => setDaysThreshold(Number(e.target.value))}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
            Never Used
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--danger)' }}>
            {summary.never_used_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            0 trips recorded
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
            Idle Vehicles
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--warning)' }}>
            {summary.idle_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            No trips in {daysThreshold}+ days
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
            Total Idle Vehicles
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
            {summary.total_idle}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            {((summary.total_idle / summary.total_vehicles) * 100).toFixed(1)}% of fleet
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
            Potential Monthly Savings
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--success)' }}>
            £{summary.potential_monthly_savings.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            If idle vehicles archived
          </div>
        </div>
      </div>

      {/* Never Used Vehicles Section */}
      {never_used && never_used.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Never Used Vehicles</h3>
            <span style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
              padding: '0.15rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {never_used.length}
            </span>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Vehicle
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>
                    Monthly Cost
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Recommendation
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {never_used.map((vehicle: IdleVehicle) => (
                  <tr key={vehicle.vehicle_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{vehicle.registration_number}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                        {vehicle.make} {vehicle.model}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {vehicle.ownership_type.replace('_', ' ')}
                      </span>
                      {vehicle.wheelchair_accessible && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>
                          ♿
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        backgroundColor: vehicle.status === 'active' ? 'var(--success-light)' : 'var(--gray-200)',
                        color: vehicle.status === 'active' ? 'var(--success)' : 'var(--gray-600)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textTransform: 'capitalize'
                      }}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 500 }}>
                      £{vehicle.total_monthly_cost.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      {vehicle.recommendation}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewDetails(vehicle)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleArchiveVehicle(vehicle.vehicle_id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Idle Vehicles Section */}
      {idle_vehicles && idle_vehicles.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Idle Vehicles ({daysThreshold}+ days)</h3>
            <span style={{
              backgroundColor: 'var(--warning)',
              color: 'white',
              padding: '0.15rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {idle_vehicles.length}
            </span>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Vehicle
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Type
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Last Trip
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                    Days Idle
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                    Total Trips
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>
                    Monthly Cost
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                    Recommendation
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {idle_vehicles.map((vehicle: IdleVehicle) => (
                  <tr key={vehicle.vehicle_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{vehicle.registration_number}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                        {vehicle.make} {vehicle.model}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {vehicle.ownership_type.replace('_', ' ')}
                      </span>
                      {vehicle.wheelchair_accessible && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>
                          ♿
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      {vehicle.last_trip_date ? new Date(vehicle.last_trip_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor:
                          vehicle.days_since_last_trip! > 60 ? 'var(--danger-light)' :
                          vehicle.days_since_last_trip! > 30 ? 'var(--warning-light)' :
                          'var(--gray-100)',
                        color:
                          vehicle.days_since_last_trip! > 60 ? 'var(--danger)' :
                          vehicle.days_since_last_trip! > 30 ? 'var(--warning)' :
                          'var(--gray-600)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {vehicle.days_since_last_trip} days
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>
                      {vehicle.total_trips}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 500 }}>
                      £{vehicle.total_monthly_cost.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      {vehicle.recommendation}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleViewDetails(vehicle)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleArchiveVehicle(vehicle.vehicle_id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--warning)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!never_used || never_used.length === 0) && (!idle_vehicles || idle_vehicles.length === 0) && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)' }}>Great News!</h3>
          <p style={{ margin: 0, color: 'var(--gray-600)' }}>
            No idle vehicles found. Your fleet is fully utilized!
          </p>
        </div>
      )}

      {/* Action Modal */}
      {actionModalOpen && selectedVehicle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Vehicle Details</h3>
              <button
                onClick={closeActionModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '0.75rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Registration:</div>
                <div style={{ fontWeight: 500 }}>{selectedVehicle.registration_number}</div>

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Make/Model:</div>
                <div>{selectedVehicle.make} {selectedVehicle.model}</div>

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Ownership:</div>
                <div style={{ textTransform: 'capitalize' }}>
                  {selectedVehicle.ownership_type.replace('_', ' ')}
                </div>

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Status:</div>
                <div style={{ textTransform: 'capitalize' }}>{selectedVehicle.status}</div>

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Accessible:</div>
                <div>{selectedVehicle.wheelchair_accessible ? 'Yes ♿' : 'No'}</div>

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Total Trips:</div>
                <div>{selectedVehicle.total_trips}</div>

                {selectedVehicle.last_trip_date && (
                  <>
                    <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Last Trip:</div>
                    <div>{new Date(selectedVehicle.last_trip_date).toLocaleDateString()}</div>

                    <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Days Idle:</div>
                    <div style={{
                      fontWeight: 'bold',
                      color: selectedVehicle.days_since_last_trip! > 60 ? 'var(--danger)' : 'var(--warning)'
                    }}>
                      {selectedVehicle.days_since_last_trip} days
                    </div>
                  </>
                )}

                <div style={{ color: 'var(--gray-600)', fontWeight: 500 }}>Monthly Costs:</div>
                <div>
                  {selectedVehicle.monthly_lease_cost && (
                    <div>Lease: £{selectedVehicle.monthly_lease_cost.toFixed(2)}</div>
                  )}
                  {selectedVehicle.monthly_insurance_cost && (
                    <div>Insurance: £{selectedVehicle.monthly_insurance_cost.toFixed(2)}</div>
                  )}
                  <div style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>
                    Total: £{selectedVehicle.total_monthly_cost.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--warning-light)',
              border: '1px solid var(--warning)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                Recommendation
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}>
                {selectedVehicle.recommendation}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeActionModal}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--gray-200)',
                  color: 'var(--gray-700)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleArchiveVehicle(selectedVehicle.vehicle_id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Archive Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdleVehiclesReport;
