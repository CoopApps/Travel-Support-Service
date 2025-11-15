import React from 'react';

/**
 * Fare Transparency Card
 *
 * Shows customers:
 * - REAL cost of running the trip (wages, fuel, vehicle)
 * - How fare decreases as more passengers join (solidarity pricing)
 * - Surplus allocation (reserves, dividends, cooperative commonwealth)
 * - Community impact messaging
 *
 * Core cooperative values: Transparency, Solidarity, Democratic Ownership
 */

interface TripCostBreakdown {
  driverWages: number;
  fuelCost: number;
  vehicleDepreciation: number;
  insuranceAllocation: number;
  maintenanceAllocation: number;
  overheadAllocation: number;
  totalTripCost: number;
  tripDistanceMiles: number;
  tripDurationHours: number;
}

interface SurplusAllocation {
  totalSurplus: number;
  businessReservePercent: number;
  dividendPercent: number;
  cooperativeCommonwealthPercent: number;
  toBusinessReserve: number;
  toDividends: number;
  toCooperativeCommonwealth: number;
}

interface DynamicFareStructure {
  tripCostBreakdown: TripCostBreakdown;
  currentPassengers: number;
  availableSeats: number;
  breakEvenPassengers: number;
  breakEvenFarePerPerson: number;
  currentFarePerPerson: number;
  fareAtCapacity: number;
  savingsVsBreakEven: number;
  surplusAmount?: number;
  surplusAllocation?: SurplusAllocation;
}

interface FareTransparencyCardProps {
  dynamicFare: DynamicFareStructure;
  quotedFare: number;
  passengerTier?: string;
  fareReductionMessage?: string;
  communityImpactMessage?: string;
  showDetails?: boolean;
}

export default function FareTransparencyCard({
  dynamicFare,
  quotedFare,
  passengerTier = 'adult',
  fareReductionMessage,
  communityImpactMessage,
  showDetails = true,
}: FareTransparencyCardProps) {
  const {
    tripCostBreakdown,
    currentPassengers,
    availableSeats,
    breakEvenPassengers,
    breakEvenFarePerPerson,
    currentFarePerPerson,
    fareAtCapacity,
    savingsVsBreakEven,
    surplusAmount,
    surplusAllocation,
  } = dynamicFare;

  const [expanded, setExpanded] = React.useState(showDetails);

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const getTierLabel = () => {
    switch (passengerTier) {
      case 'child': return 'Child (50%)';
      case 'concessionary': return 'Concessionary (50%)';
      case 'wheelchair': return 'Wheelchair User';
      case 'companion': return 'Companion (Free)';
      default: return 'Adult';
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      marginBottom: '1.5rem'
    }}>
      {/* Header - Your Fare */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
          Your Fare ({getTierLabel()})
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {formatCurrency(quotedFare)}
        </div>
        {savingsVsBreakEven > 0 && (
          <div style={{
            fontSize: '0.875rem',
            marginTop: '0.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            display: 'inline-block'
          }}>
            ✓ {formatCurrency(savingsVsBreakEven)} cheaper than break-even!
          </div>
        )}
      </div>

      {/* Incentive Messages */}
      {(fareReductionMessage || communityImpactMessage) && (
        <div style={{ padding: '1rem', background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
          {fareReductionMessage && (
            <div style={{
              fontSize: '0.875rem',
              color: '#047857',
              marginBottom: communityImpactMessage ? '0.5rem' : 0,
              fontWeight: 500
            }}>
              💡 {fareReductionMessage}
            </div>
          )}
          {communityImpactMessage && (
            <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: 500 }}>
              🤝 {communityImpactMessage}
            </div>
          )}
        </div>
      )}

      {/* Cost Transparency Section */}
      <div style={{ padding: '1.5rem' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151'
          }}
        >
          <span>💰 How We Calculate This Fare (Transparent Pricing)</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div style={{ marginTop: '1rem' }}>
            {/* Trip Cost Breakdown */}
            <div style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem'
            }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                🧾 Real Trip Costs
              </h4>
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                {tripCostBreakdown.tripDistanceMiles} miles • {(tripCostBreakdown.tripDurationHours * 60).toFixed(0)} minutes
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Driver Wages</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.driverWages)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Fuel Cost</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.fuelCost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Vehicle Depreciation</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.vehicleDepreciation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Insurance</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.insuranceAllocation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Maintenance</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.maintenanceAllocation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Admin & Overhead</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(tripCostBreakdown.overheadAllocation)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '2px solid #e5e7eb',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  <span>Total Trip Cost</span>
                  <span>{formatCurrency(tripCostBreakdown.totalTripCost)}</span>
                </div>
              </div>
            </div>

            {/* Solidarity Pricing - How cost sharing works */}
            <div style={{
              background: '#eff6ff',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              border: '1px solid #bfdbfe'
            }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                color: '#1e40af'
              }}>
                🤝 Solidarity Pricing (Cost Sharing)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                  <strong>Current Passengers:</strong> {currentPassengers} / {currentPassengers + availableSeats}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                  <strong>Break-Even Point:</strong> {breakEvenPassengers} passengers
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                  <strong>Break-Even Fare:</strong> {formatCurrency(breakEvenFarePerPerson)} per person
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                  <strong>Current Fare:</strong> {formatCurrency(currentFarePerPerson)} per person
                </div>
                {currentPassengers + availableSeats > currentPassengers && (
                  <div style={{ fontSize: '0.8125rem', color: '#1e3a8a' }}>
                    <strong>If Full:</strong> {formatCurrency(fareAtCapacity)} per person
                  </div>
                )}
              </div>

              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'white',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                color: '#1e3a8a',
                lineHeight: 1.5
              }}>
                💡 <strong>How it works:</strong> The total trip cost is {formatCurrency(tripCostBreakdown.totalTripCost)}.
                We share this cost equally among all passengers. More passengers = cheaper for everyone!
              </div>
            </div>

            {/* Surplus Allocation (if generating surplus) */}
            {surplusAllocation && surplusAmount && surplusAmount > 0 && (
              <div style={{
                background: '#f0fdf4',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid #86efac'
              }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  color: '#047857'
                }}>
                  ✨ Surplus Generated: {formatCurrency(surplusAmount)}
                </h4>

                <div style={{ fontSize: '0.8125rem', color: '#065f46', marginBottom: '0.75rem' }}>
                  This trip has more passengers than needed to break even. The surplus is allocated to:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#065f46' }}>
                      💼 Business Reserves ({surplusAllocation.businessReservePercent}%)
                    </span>
                    <span style={{ fontWeight: 600, color: '#047857' }}>
                      {formatCurrency(surplusAllocation.toBusinessReserve)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#065f46' }}>
                      👥 Member Dividends ({surplusAllocation.dividendPercent}%)
                    </span>
                    <span style={{ fontWeight: 600, color: '#047857' }}>
                      {formatCurrency(surplusAllocation.toDividends)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#065f46' }}>
                      🌍 Cooperative Commonwealth ({surplusAllocation.cooperativeCommonwealthPercent}%)
                    </span>
                    <span style={{ fontWeight: 600, color: '#047857' }}>
                      {formatCurrency(surplusAllocation.toCooperativeCommonwealth)}
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#065f46',
                  lineHeight: 1.5
                }}>
                  🌟 <strong>Building Community Wealth:</strong> Your participation helps build reserves for
                  the cooperative, returns value to members, and contributes to the broader cooperative movement.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
