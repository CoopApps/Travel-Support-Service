import { Driver, DriverPermits, DriverRole, DriverPermit, ComplianceStatus } from '../../types';

interface DriverComplianceTableProps {
  drivers: Driver[];
  driverPermits: Record<number, DriverPermits>;
  driverRoles: Record<number, DriverRole>;
  onUpdatePermits: (driver: Driver) => void;
  onEditRoles: (driver: Driver) => void;
}

function DriverComplianceTable({
  drivers,
  driverPermits,
  driverRoles,
  onUpdatePermits,
  onEditRoles
}: DriverComplianceTableProps) {

  const getPermitStatus = (permit?: DriverPermit) => {
    if (!permit || !permit.hasPermit || !permit.expiryDate) {
      return { text: 'Not Provided', color: '#6c757d', level: 'missing' };
    }

    const expiryDate = new Date(permit.expiryDate);
    const today = new Date();
    const daysUntil = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { text: `Expired ${Math.abs(daysUntil)} days ago`, color: '#dc2626', level: 'expired' };
    } else if (daysUntil <= 7) {
      return { text: `${daysUntil} days left`, color: '#f59e0b', level: 'warning' };
    } else if (daysUntil <= 30) {
      return { text: `${daysUntil} days left`, color: '#eab308', level: 'warning' };
    } else {
      return { text: 'Valid', color: '#22c55e', level: 'ok' };
    }
  };

  const getRequiredPermits = (role?: DriverRole): string[] => {
    if (!role) return [];
    const required: string[] = [];
    if (role.vulnerablePassengers) required.push('dbs');
    if (role.section19Driver) required.push('section19');
    if (role.section22Driver) required.push('section22');
    if (role.vehicleOwner) required.push('mot');
    return required;
  };

  const getComplianceStatus = (driverId: number): ComplianceStatus => {
    const permits = driverPermits[driverId];
    const role = driverRoles[driverId];
    const required = getRequiredPermits(role);

    if (required.length === 0) {
      return { text: 'NO REQUIREMENTS', color: '#6c757d' };
    }

    let hasExpired = false;
    let hasWarning = false;
    let hasMissing = false;

    required.forEach((type) => {
      const permit = permits?.[type as keyof DriverPermits];
      const status = getPermitStatus(permit);
      if (status.level === 'expired') hasExpired = true;
      else if (status.level === 'warning') hasWarning = true;
      else if (status.level === 'missing') hasMissing = true;
    });

    if (hasExpired) return { text: 'EXPIRED', color: '#dc2626' };
    if (hasMissing) return { text: 'MISSING', color: '#dc2626' };
    if (hasWarning) return { text: 'EXPIRING', color: '#ffc107' };
    return { text: 'COMPLIANT', color: '#22c55e' };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="driver-compliance-section">
      {/* Driver Roles Legend */}
      <div className="roles-legend">
        <h4>Driver Role Types</h4>
        <div className="roles-legend-grid">
          <div>
            <strong>Vulnerable Passenger Driver</strong><br />
            <small>Transports children, elderly, disabled passengers - <em>Requires DBS</em></small>
          </div>
          <div>
            <strong>Section 19 Driver</strong><br />
            <small>Individual authorization for Section 19 operations - <em>Driver permit required</em></small>
          </div>
          <div>
            <strong>Section 22 Driver</strong><br />
            <small>Individual authorization for Section 22 operations - <em>Driver permit required</em></small>
          </div>
          <div>
            <strong>Vehicle Owner/Maintainer</strong><br />
            <small>Owns or maintains vehicles used for transport - <em>Requires MOT</em></small>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="table-container">
        <table className="compliance-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Roles</th>
              <th>DBS Check</th>
              <th>Section 19</th>
              <th>Section 22</th>
              <th>MOT</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const role = driverRoles[driver.driver_id] || {
                vulnerablePassengers: true,
                section19Driver: false,
                section22Driver: false,
                vehicleOwner: false
              };
              const permits = driverPermits[driver.driver_id];
              const required = getRequiredPermits(role);
              const compliance = getComplianceStatus(driver.driver_id);

              return (
                <tr key={driver.driver_id}>
                  <td>
                    <strong>{driver.name}</strong><br />
                    <small>{driver.phone}</small>
                  </td>
                  <td>
                    <div className="role-badges">
                      {role.vulnerablePassengers && <span className="badge badge-vulnerable">Vulnerable</span>}
                      {role.section19Driver && <span className="badge badge-s19">S19</span>}
                      {role.section22Driver && <span className="badge badge-s22">S22</span>}
                      {role.vehicleOwner && <span className="badge badge-owner">Owner</span>}
                    </div>
                  </td>
                  <td>
                    {required.includes('dbs') ? (
                      <>
                        <div style={{ color: getPermitStatus(permits?.dbs).color, fontWeight: 'bold' }}>
                          {getPermitStatus(permits?.dbs).text}
                        </div>
                        {permits?.dbs?.expiryDate && (
                          <small>Expires: {formatDate(permits.dbs.expiryDate)}</small>
                        )}
                      </>
                    ) : (
                      <span className="not-required">Not required</span>
                    )}
                  </td>
                  <td>
                    {required.includes('section19') ? (
                      <>
                        <div style={{ color: getPermitStatus(permits?.section19).color, fontWeight: 'bold' }}>
                          {getPermitStatus(permits?.section19).text}
                        </div>
                        {permits?.section19?.expiryDate && (
                          <small>Expires: {formatDate(permits.section19.expiryDate)}</small>
                        )}
                      </>
                    ) : (
                      <span className="not-required">Not required</span>
                    )}
                  </td>
                  <td>
                    {required.includes('section22') ? (
                      <>
                        <div style={{ color: getPermitStatus(permits?.section22).color, fontWeight: 'bold' }}>
                          {getPermitStatus(permits?.section22).text}
                        </div>
                        {permits?.section22?.expiryDate && (
                          <small>Expires: {formatDate(permits.section22.expiryDate)}</small>
                        )}
                      </>
                    ) : (
                      <span className="not-required">Not required</span>
                    )}
                  </td>
                  <td>
                    {required.includes('mot') ? (
                      <>
                        <div style={{ color: getPermitStatus(permits?.mot).color, fontWeight: 'bold' }}>
                          {getPermitStatus(permits?.mot).text}
                        </div>
                        {permits?.mot?.expiryDate && (
                          <small>Expires: {formatDate(permits.mot.expiryDate)}</small>
                        )}
                      </>
                    ) : (
                      <span className="not-required">Not required</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: compliance.color }}>
                      {compliance.text}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditRoles(driver)}
                        title="Edit driver roles"
                      >
                        Edit Roles
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onUpdatePermits(driver)}
                        title="Update permits"
                      >
                        Update Permits
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DriverComplianceTable;
