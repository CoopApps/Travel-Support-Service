import { Vehicle } from '../../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onAssignDriver: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

/**
 * Vehicle Card Component
 *
 * Displays vehicle details with ownership badges and status indicators
 */
function VehicleCard({ vehicle, onEdit, onAssignDriver, onDelete }: VehicleCardProps) {
  // Calculate status indicators for MOT, Insurance, Service
  const getStatusIndicator = (dateStr: string | undefined, label: string) => {
    if (!dateStr) {
      return { color: '#6b7280', text: 'Not Set', level: 'none' };
    }

    const date = new Date(dateStr);
    const today = new Date();
    const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { color: '#dc2626', text: `${label} Overdue`, level: 'overdue' };
    } else if (daysUntil <= 7) {
      return { color: '#f59e0b', text: `${label} Due Soon`, level: 'due_soon' };
    } else if (daysUntil <= 30) {
      return { color: '#eab308', text: `${label} Due This Month`, level: 'due_month' };
    } else {
      return { color: '#22c55e', text: `${label} OK`, level: 'ok' };
    }
  };

  const motStatus = getStatusIndicator(vehicle.mot_date, 'MOT');
  const insuranceStatus = getStatusIndicator(vehicle.insurance_expiry, 'Insurance');

  // Service status based on last service and interval
  const getServiceStatus = () => {
    if (!vehicle.last_service_date || !vehicle.service_interval_months) {
      return { color: '#6b7280', text: 'Not Set', level: 'none' };
    }

    const lastService = new Date(vehicle.last_service_date);
    const intervalMs = vehicle.service_interval_months * 30 * 24 * 60 * 60 * 1000;
    const nextServiceDate = new Date(lastService.getTime() + intervalMs);
    const today = new Date();
    const daysUntil = Math.floor((nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { color: '#dc2626', text: 'Service Overdue', level: 'overdue' };
    } else if (daysUntil <= 7) {
      return { color: '#f59e0b', text: 'Service Due Soon', level: 'due_soon' };
    } else if (daysUntil <= 30) {
      return { color: '#eab308', text: 'Service Due', level: 'due_month' };
    } else {
      return { color: '#22c55e', text: 'Service OK', level: 'ok' };
    }
  };

  const serviceStatus = getServiceStatus();

  // Ownership header styling (matching legacy module colors)
  const getOwnershipStyle = () => {
    switch (vehicle.ownership) {
      case 'owned':
        return { color: '#388e3c', label: 'COMPANY OWNED' };
      case 'leased':
        return { color: '#f57c00', label: 'COMPANY LEASED' };
      case 'personal':
        return { color: '#c2185b', label: 'DRIVER OWNED' };
      default:
        return { color: '#666', label: vehicle.ownership?.toUpperCase() || 'UNKNOWN' };
    }
  };

  const ownershipStyle = getOwnershipStyle();

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (!amount) return '£0.00';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (isNaN(numAmount)) return '£0.00';
    return `£${numAmount.toFixed(2)}`;
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }}
    >
      {/* Colored Header Bar - Matching Legacy Module */}
      <div style={{
        background: ownershipStyle.color,
        color: 'white',
        padding: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {vehicle.registration}
            </h3>
            <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
              {vehicle.make} {vehicle.model} • {vehicle.year}
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {ownershipStyle.label}
          </div>
        </div>
        {vehicle.wheelchair_accessible && (
          <div style={{
            marginTop: '8px',
            background: 'rgba(255,255,255,0.15)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            display: 'inline-block'
          }}>
            ♿ Wheelchair Accessible
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '1.25rem' }}>

      {/* Vehicle Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>Type</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-900)' }}>
            {vehicle.vehicle_type || 'Not specified'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>Seats</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-900)' }}>
            {vehicle.seats}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>Fuel</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-900)' }}>
            {vehicle.fuel_type || 'Not specified'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '2px' }}>Mileage</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-900)' }}>
            {vehicle.mileage?.toLocaleString()} mi
          </div>
        </div>
      </div>

      {/* Assigned Driver */}
      <div style={{
        padding: '0.75rem',
        background: vehicle.assigned_driver_name ? '#f0f9ff' : '#fef2f2',
        borderRadius: '6px',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '4px' }}>Assigned Driver</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: vehicle.assigned_driver_name ? '#0369a1' : '#dc2626' }}>
          {vehicle.assigned_driver_name || 'Unassigned'}
        </div>
      </div>

      {/* Status Indicators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: motStatus.color
          }}></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-700)' }}>{motStatus.text}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: insuranceStatus.color
          }}></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-700)' }}>{insuranceStatus.text}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: serviceStatus.color
          }}></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-700)' }}>{serviceStatus.text}</div>
        </div>
      </div>

      {/* Monthly Costs (for company vehicles) */}
      {(vehicle.ownership === 'owned' || vehicle.ownership === 'leased') && (
        <div style={{
          borderTop: '1px solid var(--gray-200)',
          paddingTop: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Monthly Costs</div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
            {vehicle.ownership === 'leased' && vehicle.lease_monthly_cost && (
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Lease: </span>
                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                  {formatCurrency(vehicle.lease_monthly_cost)}
                </span>
              </div>
            )}
            {vehicle.insurance_monthly_cost && (
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Insurance: </span>
                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                  {formatCurrency(vehicle.insurance_monthly_cost)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onEdit(vehicle)}
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
        >
          Edit
        </button>
        <button
          onClick={() => onAssignDriver(vehicle)}
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: '0.875rem', padding: '0.5rem' }}
        >
          {vehicle.driver_id ? 'Reassign' : 'Assign'}
        </button>
        <button
          onClick={() => onDelete(vehicle)}
          className="btn"
          style={{
            flex: 1,
            fontSize: '0.875rem',
            padding: '0.5rem',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca'
          }}
        >
          Delete
        </button>
      </div>
      </div>
    </div>
  );
}

export default VehicleCard;
