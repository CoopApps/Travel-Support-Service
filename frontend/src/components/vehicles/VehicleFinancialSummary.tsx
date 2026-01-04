import React, { useState, useEffect } from 'react';
import { vehicleApi } from '../../services/api';

interface VehicleFinancialSummaryProps {
  tenantId: number;
  vehicleId: number;
  vehicleRegistration: string;
  onClose: () => void;
}

interface FinancialData {
  vehicle_info: {
    vehicle_id: number;
    registration_number: string;
    make: string;
    model: string;
    ownership_type: string;
  };
  revenue: {
    total_trips: number;
    total_revenue: number;
    average_revenue_per_trip: number;
    monthly_revenue: number;
  };
  costs: {
    maintenance_costs: number;
    fuel_costs: number;
    insurance_costs: number;
    lease_costs: number;
    total_costs: number;
    monthly_costs: number;
  };
  profitability: {
    net_profit: number;
    profit_margin: number;
    roi: number;
    cost_per_trip: number;
    cost_per_mile: number;
  };
  utilization: {
    total_miles: number;
    average_miles_per_trip: number;
    days_in_service: number;
    trips_per_day: number;
  };
}

const VehicleFinancialSummary: React.FC<VehicleFinancialSummaryProps> = ({
  tenantId,
  vehicleId,
  vehicleRegistration,
  onClose
}) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinancialData();
  }, [tenantId, vehicleId]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleApi.getVehicleFinancialSummary(tenantId, vehicleId);
      setFinancialData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `£${amount.toFixed(2)}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
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
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 1
        }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem' }}>
              Financial Summary
            </h2>
            <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.9rem' }}>
              {vehicleRegistration}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: 'var(--gray-500)',
              lineHeight: 1,
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '300px'
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
          )}

          {error && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--danger)'
            }}>
              <p style={{ marginBottom: '1rem' }}>Error: {error}</p>
              <button
                onClick={loadFinancialData}
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
          )}

          {!loading && !error && financialData && (
            <>
              {/* Vehicle Info */}
              <div style={{
                backgroundColor: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Vehicle
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      {financialData.vehicle_info.make} {financialData.vehicle_info.model}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Ownership Type
                    </div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {financialData.vehicle_info.ownership_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid var(--success)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Net Profit
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: financialData.profitability.net_profit >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {formatCurrency(financialData.profitability.net_profit)}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid var(--primary)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Profit Margin
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: financialData.profitability.profit_margin >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {formatPercentage(financialData.profitability.profit_margin)}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid var(--warning)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    ROI
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: financialData.profitability.roi >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {formatPercentage(financialData.profitability.roi)}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  border: '2px solid var(--gray-300)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Cost Per Trip
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                    {formatCurrency(financialData.profitability.cost_per_trip)}
                  </div>
                </div>
              </div>

              {/* Revenue Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--gray-800)',
                  borderBottom: '2px solid var(--primary)',
                  paddingBottom: '0.5rem'
                }}>
                  Revenue
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    backgroundColor: 'var(--success-light)',
                    border: '1px solid var(--success)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Total Revenue
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                      {formatCurrency(financialData.revenue.total_revenue)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Monthly Revenue
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.revenue.monthly_revenue)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Total Trips
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {financialData.revenue.total_trips}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Avg Revenue/Trip
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.revenue.average_revenue_per_trip)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Costs Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--gray-800)',
                  borderBottom: '2px solid var(--danger)',
                  paddingBottom: '0.5rem'
                }}>
                  Costs
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Total Costs
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                      {formatCurrency(financialData.costs.total_costs)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Monthly Costs
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.costs.monthly_costs)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Maintenance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.costs.maintenance_costs)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Fuel
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.costs.fuel_costs)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Insurance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.costs.insurance_costs)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Lease
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.costs.lease_costs)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Utilization Section */}
              <div>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  color: 'var(--gray-800)',
                  borderBottom: '2px solid var(--gray-400)',
                  paddingBottom: '0.5rem'
                }}>
                  Utilization
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Total Miles
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {financialData.utilization.total_miles.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Avg Miles/Trip
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {financialData.utilization.average_miles_per_trip.toFixed(1)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Days in Service
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {financialData.utilization.days_in_service}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Trips Per Day
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {financialData.utilization.trips_per_day.toFixed(2)}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '6px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Cost Per Mile
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                      {formatCurrency(financialData.profitability.cost_per_mile)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'white'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleFinancialSummary;
