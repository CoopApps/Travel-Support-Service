import { Client } from '../services/homecareApi';
import './MedicalInfoDisplay.css';

interface MedicalInfoDisplayProps {
  client: Client;
}

function MedicalInfoDisplay({ client }: MedicalInfoDisplayProps) {
  const hasInfo = client.medical_conditions || client.allergies || client.mobility_needs ||
                  client.communication_needs || client.dietary_requirements;

  if (!hasInfo) {
    return (
      <div className="medical-info-display empty">
        <span>No medical information recorded</span>
      </div>
    );
  }

  return (
    <div className="medical-info-display">
      {client.medical_conditions && (
        <div className="info-item">
          <span className="info-label">Conditions:</span>
          <span className="info-value">{client.medical_conditions}</span>
        </div>
      )}
      {client.allergies && (
        <div className="info-item alert">
          <span className="info-label">Allergies:</span>
          <span className="info-value">{client.allergies}</span>
        </div>
      )}
      {client.mobility_needs && (
        <div className="info-item">
          <span className="info-label">Mobility:</span>
          <span className="info-value">{client.mobility_needs}</span>
        </div>
      )}
      {client.communication_needs && (
        <div className="info-item">
          <span className="info-label">Communication:</span>
          <span className="info-value">{client.communication_needs}</span>
        </div>
      )}
      {client.dietary_requirements && (
        <div className="info-item">
          <span className="info-label">Dietary:</span>
          <span className="info-value">{client.dietary_requirements}</span>
        </div>
      )}
    </div>
  );
}

export default MedicalInfoDisplay;
