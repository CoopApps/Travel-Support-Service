interface EmergencyContactsModalProps {
  tenantId: number;
  onClose: () => void;
}

/**
 * Emergency Contacts Modal
 *
 * Quick access to important phone numbers
 * Click-to-call functionality for mobile devices
 */
function EmergencyContactsModal({ tenantId, onClose }: EmergencyContactsModalProps) {
  const contacts = [
    {
      name: 'Emergency Services',
      number: '999',
      description: 'Police, Fire, Ambulance',
      icon: 'alert',
      color: '#dc3545',
      urgent: true
    },
    {
      name: 'Office/Dispatch',
      number: 'Office Number',
      description: 'Main office line',
      icon: 'phone',
      color: '#0d6efd'
    },
    {
      name: 'Supervisor',
      number: 'Supervisor Number',
      description: 'Your direct supervisor',
      icon: 'user',
      color: '#6c757d'
    },
    {
      name: 'Breakdown Assistance',
      number: 'Breakdown Number',
      description: 'Vehicle breakdown support',
      icon: 'truck',
      color: '#fd7e14'
    }
  ];

  const handleCall = (number: string) => {
    if (number === 'Office Number' || number === 'Supervisor Number' || number === 'Breakdown Number') {
      alert('This number should be configured by your administrator');
      return;
    }
    window.location.href = `tel:${number}`;
  };

  const getIcon = (icon: string) => {
    const paths: { [key: string]: string } = {
      alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
      phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
      user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      truck: 'M16 3h3l3 6v7h-2M1 16h14M15 16h-1M1 10h14M5 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'
    };
    return paths[icon] || paths.phone;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Emergency Contacts
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
            Important phone numbers for quick access
          </p>
        </div>

        {/* Contacts List */}
        <div style={{ padding: '1rem' }}>
          {contacts.map((contact, index) => (
            <div
              key={index}
              style={{
                marginBottom: '0.75rem',
                border: contact.urgent ? `2px solid ${contact.color}` : '1px solid var(--gray-200)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => handleCall(contact.number)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: contact.urgent ? `${contact.color}10` : 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = contact.urgent ? `${contact.color}20` : 'var(--gray-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = contact.urgent ? `${contact.color}10` : 'white';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: contact.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                    <path d={getIcon(contact.icon)} />
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '2px' }}>
                    {contact.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                    {contact.description}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: contact.color }}>
                    {contact.number}
                  </div>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: contact.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', stroke: 'white', fill: 'none', strokeWidth: 2 }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyContactsModal;
