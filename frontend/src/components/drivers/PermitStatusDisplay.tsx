import { Driver } from '../../types';

interface PermitStatusDisplayProps {
  driver: Driver;
}

function PermitStatusDisplay({ driver }: PermitStatusDisplayProps) {
  const permits = [
    {
      name: 'DBS',
      hasPermit: !!driver.dbs_check_date,
      expiry: driver.dbs_expiry_date
    },
    {
      name: 'Section 19',
      hasPermit: driver.section19_driver_auth || driver.section19_permit,
      expiry: driver.section19_driver_expiry || driver.section19_expiry
    },
    {
      name: 'Section 22',
      hasPermit: driver.section22_driver_auth,
      expiry: driver.section22_driver_expiry
    },
    {
      name: 'MOT',
      hasPermit: !!driver.mot_date,
      expiry: driver.mot_expiry_date
    }
  ];

  const activePermits = permits.filter(p => p.hasPermit);

  // Calculate expiry status for each permit
  const getExpiryStatus = (expiry: string | null) => {
    if (!expiry) return { status: 'valid', days: null, color: 'var(--success)' };

    const expiryDate = new Date(expiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', days: Math.abs(daysUntilExpiry), color: 'var(--danger)' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', days: daysUntilExpiry, color: 'var(--danger)' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', days: daysUntilExpiry, color: 'var(--warning)' };
    } else {
      return { status: 'valid', days: daysUntilExpiry, color: 'var(--success)' };
    }
  };

  const expiringPermits = permits.filter(p => {
    if (!p.expiry) return false;
    const status = getExpiryStatus(p.expiry);
    return status.status === 'warning' || status.status === 'critical';
  });

  const expiredPermits = permits.filter(p => {
    if (!p.expiry) return false;
    const status = getExpiryStatus(p.expiry);
    return status.status === 'expired';
  });

  if (activePermits.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
          NO PERMITS
        </div>
        <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
          No permits
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Alert for expired permits */}
      {expiredPermits.length > 0 && (
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'white',
          background: 'var(--danger)',
          padding: '4px 6px',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          🚨 {expiredPermits.length} EXPIRED
        </div>
      )}

      {/* Alert for expiring soon */}
      {expiringPermits.length > 0 && expiredPermits.length === 0 && (
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#713f12',
          background: '#fef9c3',
          padding: '4px 6px',
          borderRadius: '4px',
          textAlign: 'center',
          border: '1px solid var(--warning)'
        }}>
          ⚠️ {expiringPermits.length} expiring soon
        </div>
      )}

      {/* Permit list with status indicators */}
      {activePermits.map((permit) => {
        const expiryStatus = getExpiryStatus(permit.expiry);
        const isExpired = expiredPermits.some(p => p.name === permit.name);
        const isExpiring = expiringPermits.some(p => p.name === permit.name);

        return (
          <div key={permit.name} style={{
            fontSize: '11px',
            padding: '4px 6px',
            borderRadius: '3px',
            background: isExpired ? '#fee2e2' : isExpiring ? '#fef9c3' : 'var(--gray-50)',
            borderLeft: `3px solid ${expiryStatus.color}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: 600, color: expiryStatus.color }}>
                {permit.name}
              </span>
              {isExpired && (
                <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--danger)', fontWeight: 600 }}>
                  (EXPIRED)
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--gray-600)' }}>
              {permit.expiry ? (
                <>
                  {new Date(permit.expiry).toLocaleDateString('en-GB')}
                  {expiryStatus.days !== null && !isExpired && (
                    <span style={{ marginLeft: '4px', color: expiryStatus.color, fontWeight: 600 }}>
                      ({expiryStatus.days}d)
                    </span>
                  )}
                  {isExpired && expiryStatus.days !== null && (
                    <span style={{ marginLeft: '4px', color: 'var(--danger)', fontWeight: 600 }}>
                      ({expiryStatus.days}d ago)
                    </span>
                  )}
                </>
              ) : (
                'No expiry'
              )}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div style={{ fontSize: '10px', color: 'var(--gray-500)', marginTop: '2px' }}>
        {activePermits.length} permit{activePermits.length !== 1 ? 's' : ''} on file
      </div>
    </div>
  );
}

export default PermitStatusDisplay;
