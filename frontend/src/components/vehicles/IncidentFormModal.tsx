import { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { vehicleApi } from '../../services/api';
import { Vehicle, Driver } from '../../types';

interface IncidentFormModalProps {
  incident?: any;
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: (shouldRefresh: boolean) => void;
}

function IncidentFormModal({ incident, vehicles, drivers, onClose }: IncidentFormModalProps) {
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [vehicleId, setVehicleId] = useState(incident?.vehicle_id || '');
  const [driverId, setDriverId] = useState(incident?.driver_id || '');
  const [incidentType, setIncidentType] = useState(incident?.incident_type || 'accident');
  const [incidentDate, setIncidentDate] = useState(
    incident?.incident_date ? new Date(incident.incident_date).toISOString().slice(0, 16) : ''
  );
  const [location, setLocation] = useState(incident?.location || '');
  const [description, setDescription] = useState(incident?.description || '');
  const [severity, setSeverity] = useState(incident?.severity || 'moderate');
  const [injuriesOccurred, setInjuriesOccurred] = useState(incident?.injuries_occurred || false);
  const [injuryDetails, setInjuryDetails] = useState(incident?.injury_details || '');
  const [vehicleDriveable, setVehicleDriveable] = useState(incident?.vehicle_driveable !== undefined ? incident.vehicle_driveable : true);
  const [estimatedCost, setEstimatedCost] = useState(incident?.estimated_cost || '');
  const [damageDescription, setDamageDescription] = useState(incident?.damage_description || '');
  const [thirdPartyInvolved, setThirdPartyInvolved] = useState(incident?.third_party_involved || false);
  const [thirdPartyName, setThirdPartyName] = useState(incident?.third_party_name || '');
  const [thirdPartyContact, setThirdPartyContact] = useState(incident?.third_party_contact || '');
  const [thirdPartyVehicleReg, setThirdPartyVehicleReg] = useState(incident?.third_party_vehicle_reg || '');
  const [policeNotified, setPoliceNotified] = useState(incident?.police_notified || false);
  const [policeReference, setPoliceReference] = useState(incident?.police_reference || '');
  const [witnesses, setWitnesses] = useState(incident?.witnesses || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vehicleId || !incidentDate || !description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const data = {
        vehicle_id: parseInt(vehicleId),
        driver_id: driverId ? parseInt(driverId) : null,
        incident_type: incidentType,
        incident_date: new Date(incidentDate).toISOString(),
        location,
        description,
        severity,
        injuries_occurred: injuriesOccurred,
        injury_details: injuriesOccurred ? injuryDetails : null,
        vehicle_driveable: vehicleDriveable,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        damage_description: damageDescription || null,
        third_party_involved: thirdPartyInvolved,
        third_party_name: thirdPartyInvolved ? thirdPartyName : null,
        third_party_contact: thirdPartyInvolved ? thirdPartyContact : null,
        third_party_vehicle_reg: thirdPartyInvolved ? thirdPartyVehicleReg : null,
        police_notified: policeNotified,
        police_reference: policeNotified ? policeReference : null,
        witnesses: witnesses || null
      };

      if (incident) {
        await vehicleApi.updateIncident(tenantId!, incident.incident_id, data);
      } else {
        await vehicleApi.createIncident(tenantId!, data);
      }

      onClose(true);
    } catch (err: any) {
      console.error('Error saving incident:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save incident');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{incident ? 'Edit Incident' : 'Report New Incident'}</h2>
          <button onClick={() => onClose(false)} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Vehicle */}
              <div className="form-group">
                <label>Vehicle <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.registration} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div className="form-group">
                <label>Driver</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select driver...</option>
                  {drivers.map(d => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incident Type */}
              <div className="form-group">
                <label>Incident Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="accident">Accident</option>
                  <option value="damage">Damage</option>
                  <option value="near_miss">Near Miss</option>
                  <option value="breakdown">Breakdown</option>
                  <option value="theft">Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Severity */}
              <div className="form-group">
                <label>Severity <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="serious">Serious</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="form-group">
                <label>Incident Date & Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              {/* Location */}
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Street, town/city"
                  className="form-control"
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Detailed description of what happened..."
                className="form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Vehicle Driveable */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={vehicleDriveable}
                    onChange={(e) => setVehicleDriveable(e.target.checked)}
                  />
                  <span>Vehicle is driveable</span>
                </label>
              </div>

              {/* Estimated Cost */}
              <div className="form-group">
                <label>Estimated Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                  className="form-control"
                />
              </div>
            </div>

            {/* Damage Description */}
            <div className="form-group">
              <label>Damage Description</label>
              <textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                rows={2}
                placeholder="Describe the damage to the vehicle..."
                className="form-control"
              />
            </div>

            {/* Injuries */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={injuriesOccurred}
                  onChange={(e) => setInjuriesOccurred(e.target.checked)}
                />
                <span>Injuries occurred</span>
              </label>
            </div>

            {injuriesOccurred && (
              <div className="form-group">
                <label>Injury Details <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  value={injuryDetails}
                  onChange={(e) => setInjuryDetails(e.target.value)}
                  required={injuriesOccurred}
                  rows={2}
                  placeholder="Details of injuries..."
                  className="form-control"
                />
              </div>
            )}

            {/* Third Party */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={thirdPartyInvolved}
                  onChange={(e) => setThirdPartyInvolved(e.target.checked)}
                />
                <span>Third party involved</span>
              </label>
            </div>

            {thirdPartyInvolved && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Third Party Name</label>
                  <input
                    type="text"
                    value={thirdPartyName}
                    onChange={(e) => setThirdPartyName(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Third Party Contact</label>
                  <input
                    type="text"
                    value={thirdPartyContact}
                    onChange={(e) => setThirdPartyContact(e.target.value)}
                    placeholder="Phone or email"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Third Party Vehicle Reg</label>
                  <input
                    type="text"
                    value={thirdPartyVehicleReg}
                    onChange={(e) => setThirdPartyVehicleReg(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {/* Police */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={policeNotified}
                  onChange={(e) => setPoliceNotified(e.target.checked)}
                />
                <span>Police notified</span>
              </label>
            </div>

            {policeNotified && (
              <div className="form-group">
                <label>Police Reference Number</label>
                <input
                  type="text"
                  value={policeReference}
                  onChange={(e) => setPoliceReference(e.target.value)}
                  className="form-control"
                />
              </div>
            )}

            {/* Witnesses */}
            <div className="form-group">
              <label>Witnesses</label>
              <textarea
                value={witnesses}
                onChange={(e) => setWitnesses(e.target.value)}
                rows={2}
                placeholder="Names and contact details of any witnesses..."
                className="form-control"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : (incident ? 'Update Incident' : 'Report Incident')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IncidentFormModal;
