import { Driver } from '../../types';

interface VehicleAssignmentDisplayProps {
  driver: Driver;
  onAssignVehicle: () => void;
  onAddPersonalVehicle: () => void;
}

function VehicleAssignmentDisplay({
  driver,
  onAssignVehicle,
  onAddPersonalVehicle
}: VehicleAssignmentDisplayProps) {
  if (!driver.vehicle_id && !driver.assigned_vehicle) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--warning)' }}>
          No Vehicle Assigned
        </div>
        <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
          No vehicle assigned
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onAssignVehicle}
          style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
        >
          Assign Vehicle
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onAddPersonalVehicle}
          style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
        >
          Add Personal Vehicle
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)' }}>
        {driver.vehicle_type === 'company' ? 'Company Vehicle' :
         driver.vehicle_type === 'lease' ? 'Leased Vehicle' : 'Personal Vehicle'}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--gray-600)' }}>
        {driver.assigned_vehicle || `Vehicle #${driver.vehicle_id}`}
      </div>
      <button
        className="btn btn-sm btn-secondary"
        onClick={onAssignVehicle}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Change Vehicle
      </button>
    </div>
  );
}

export default VehicleAssignmentDisplay;
