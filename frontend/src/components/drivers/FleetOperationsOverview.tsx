
interface FleetStats {
  employment: {
    contracted: number;
    freelance: number;
    employed: number;
  };
  vehicles: {
    company: number;
    lease: number;
    personal: number;
    none: number;
  };
  fuel: {
    allowance: number;
    card: number;
    both: number;
    receipts: number;
  };
  dashboard: {
    enabled: number;
    noAccess: number;
  };
  assignments: {
    active: number;
    total: number;
  };
}

interface FleetOperationsOverviewProps {
  stats: FleetStats;
}

/**
 * Fleet Operations Overview - Matching Customer Module Style
 *
 * Displays fleet statistics in themed colored cards
 */
function FleetOperationsOverview({ stats }: FleetOperationsOverviewProps) {
  const totalVehicles = stats.vehicles.company + stats.vehicles.lease + stats.vehicles.personal + stats.vehicles.none;
  const vehiclePercentage = totalVehicles > 0
    ? Math.round(((stats.vehicles.company + stats.vehicles.lease + stats.vehicles.personal) / totalVehicles) * 100)
    : 0;

  const totalDashboard = stats.dashboard.enabled + stats.dashboard.noAccess;
  const dashboardPercentage = totalDashboard > 0
    ? Math.round((stats.dashboard.enabled / totalDashboard) * 100)
    : 0;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Fleet Operations
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
          {/* Employment */}
          <div style={{
            padding: '16px',
            background: '#e8eaf6',
            color: '#3f51b5',
            borderRadius: '8px',
            textAlign: 'center',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {stats.employment.contracted + stats.employment.freelance}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', margin: '6px 0 0 0' }}>
              Employment
            </div>
            <div style={{ fontSize: '10px', opacity: 0.75, margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {stats.employment.contracted} Contracted • {stats.employment.freelance} Freelance
            </div>
          </div>

          {/* Vehicles */}
          <div style={{
            padding: '16px',
            background: '#e0f2f1',
            color: '#00695c',
            borderRadius: '8px',
            textAlign: 'center',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {vehiclePercentage}%
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', margin: '6px 0 0 0' }}>
              Vehicles
            </div>
            <div style={{ fontSize: '10px', opacity: 0.75, margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {stats.vehicles.company} Co • {stats.vehicles.lease} Lease • {stats.vehicles.personal} Own • {stats.vehicles.none} None
            </div>
          </div>

          {/* Fuel */}
          <div style={{
            padding: '16px',
            background: '#fff3e0',
            color: '#f57c00',
            borderRadius: '8px',
            textAlign: 'center',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {stats.fuel.allowance + stats.fuel.card + stats.fuel.both + stats.fuel.receipts}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', margin: '6px 0 0 0' }}>
              Fuel
            </div>
            <div style={{ fontSize: '10px', opacity: 0.75, margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {stats.fuel.allowance} Allow • {stats.fuel.card} Card • {stats.fuel.both} Both • {stats.fuel.receipts} Rcpts
            </div>
          </div>

          {/* Dashboard */}
          <div style={{
            padding: '16px',
            background: '#f3e5f5',
            color: '#7b1fa2',
            borderRadius: '8px',
            textAlign: 'center',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {dashboardPercentage}%
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', margin: '6px 0 0 0' }}>
              Dashboard
            </div>
            <div style={{ fontSize: '10px', opacity: 0.75, margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {stats.dashboard.enabled} Enabled • {stats.dashboard.noAccess} No Access
            </div>
          </div>

          {/* Assignments */}
          <div style={{
            padding: '16px',
            background: '#e8f5e9',
            color: '#388e3c',
            borderRadius: '8px',
            textAlign: 'center',
            minHeight: '95px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {stats.assignments.total}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', margin: '6px 0 0 0' }}>
              Assignments
            </div>
            <div style={{ fontSize: '10px', opacity: 0.75, margin: '4px 0 0 0', lineHeight: 1.3 }}>
              {stats.assignments.active} Active • {stats.assignments.total} Total
            </div>
          </div>
        </div>
    </div>
  );
}

export default FleetOperationsOverview;
