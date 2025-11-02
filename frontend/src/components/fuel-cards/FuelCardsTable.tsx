import React from 'react';
import { FuelCard } from '../../types/fuelCard.types';

interface FuelCardsTableProps {
  fuelCards: FuelCard[];
  onEdit: (cardId: number) => void;
  onToggleStatus: (cardId: number) => void;
  onViewDetails: (cardId: number) => void;
}

const FuelCardsTable: React.FC<FuelCardsTableProps> = ({
  fuelCards,
  onEdit,
  onToggleStatus,
  onViewDetails
}) => {
  const getVehicleDisplay = (card: FuelCard) => {
    if (card.vehicle_make && card.vehicle_model && card.vehicle_registration) {
      return `${card.vehicle_make} ${card.vehicle_model} (${card.vehicle_registration})`;
    } else if (card.vehicle_id) {
      return 'Assigned vehicle';
    } else {
      return 'Any vehicle';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#28a745' : '#dc3545';
  };

  const getUsagePercentage = (card: FuelCard) => {
    if (!card.monthly_limit || !card.monthly_cost) return 0;
    return Math.min(100, (card.monthly_cost / card.monthly_limit) * 100);
  };

  const isOverLimit = (card: FuelCard) => {
    if (!card.monthly_limit || !card.monthly_cost) return false;
    return card.monthly_cost > card.monthly_limit;
  };

  return (
    <div className="fuel-cards-grid">
      {fuelCards.map((card) => {
        const statusColor = getStatusColor(card.status);
        const usagePercentage = getUsagePercentage(card);
        const overLimit = isOverLimit(card);

        return (
          <div key={card.fuel_card_id} className="fuel-card-item">
            <div className="fuel-card-header">
              <div>
                <h5 style={{ margin: 0 }}>Card ••••{card.card_number_last_four}</h5>
                <small style={{ color: '#666' }}>{card.provider}</small>
              </div>
              <span
                className="fuel-card-status-badge"
                style={{
                  background: `${statusColor}20`,
                  color: statusColor
                }}
              >
                {card.status.toUpperCase()}
              </span>
            </div>

            <div className="fuel-card-body">
              <div className="fuel-card-info">
                <div className="fuel-card-info-row">
                  <strong>Driver:</strong> {card.driver_name || 'Unassigned'}
                </div>
                <div className="fuel-card-info-row">
                  <strong>Vehicle:</strong> {getVehicleDisplay(card)}
                </div>
                <div className="fuel-card-info-row">
                  <strong>This Month:</strong> £{(card.monthly_cost || 0).toFixed(2)} ({card.monthly_transactions || 0} fills)
                </div>

                {card.monthly_limit && (
                  <div className="fuel-card-info-row">
                    <strong>Monthly Limit:</strong> £{card.monthly_limit.toFixed(2)}
                    <div className="fuel-card-limit-bar">
                      <div
                        className="fuel-card-limit-bar-fill"
                        style={{
                          width: `${usagePercentage}%`,
                          background: overLimit ? '#dc3545' : '#28a745'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="fuel-card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onViewDetails(card.fuel_card_id)}
                  style={{ flex: 1 }}
                >
                  📋 Details
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onEdit(card.fuel_card_id)}
                  style={{ flex: 1, background: '#17a2b8', color: 'white' }}
                >
                  ✏️ Edit
                </button>
                <button
                  className={`btn btn-${card.status === 'active' ? 'warning' : 'success'} btn-sm`}
                  onClick={() => onToggleStatus(card.fuel_card_id)}
                >
                  {card.status === 'active' ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FuelCardsTable;
