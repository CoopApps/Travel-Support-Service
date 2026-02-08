import { Client } from '../services/homecareApi';
import './EmergencyContactDisplay.css';

interface EmergencyContactDisplayProps {
  client: Client;
}

function EmergencyContactDisplay({ client }: EmergencyContactDisplayProps) {
  const hasContact = client.emergency_contact_name || client.emergency_contact_phone;

  if (!hasContact) {
    return (
      <div className="emergency-contact-display empty">
        <span>No emergency contact</span>
      </div>
    );
  }

  return (
    <div className="emergency-contact-display">
      {client.emergency_contact_name && (
        <div className="contact-name">{client.emergency_contact_name}</div>
      )}
      {client.emergency_contact_phone && (
        <div className="contact-phone">
          <a href={`tel:${client.emergency_contact_phone}`}>{client.emergency_contact_phone}</a>
        </div>
      )}
      {client.emergency_contact_relationship && (
        <div className="contact-relationship">({client.emergency_contact_relationship})</div>
      )}
    </div>
  );
}

export default EmergencyContactDisplay;
