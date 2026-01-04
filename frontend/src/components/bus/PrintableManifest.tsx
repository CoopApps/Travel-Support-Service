import React, { useEffect, useState, useRef } from 'react';
import { useTenant } from '../../context/TenantContext';
import {
  busTimetablesApi,
  busRoutesApi,
  busRosterApi,
  regularPassengersApi,
  BusTimetable,
  BusRoute,
  EffectivePassenger
} from '../../services/busApi';
import './PrintableManifest.css';

interface PrintableManifestProps {
  timetableId: number;
  serviceDate: string;
  onClose: () => void;
}

export default function PrintableManifest({
  timetableId,
  serviceDate,
  onClose
}: PrintableManifestProps) {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<BusTimetable | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [passengers, setPassengers] = useState<EffectivePassenger[]>([]);
  const [rosterEntry, setRosterEntry] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadManifestData();
    }
  }, [tenant?.tenant_id, timetableId, serviceDate]);

  const loadManifestData = async () => {
    if (!tenant?.tenant_id) return;
    setLoading(true);
    setError(null);

    try {
      // Load timetable
      const timetableData = await busTimetablesApi.getTimetable(tenant.tenant_id, timetableId);
      setTimetable(timetableData);

      // Load route, passengers, and roster in parallel
      const [routeData, passengersData, rosterData] = await Promise.all([
        busRoutesApi.getRoute(tenant.tenant_id, timetableData.route_id),
        regularPassengersApi.getEffectivePassengers(tenant.tenant_id, timetableId, serviceDate),
        busRosterApi.getRoster(tenant.tenant_id, {
          start_date: serviceDate,
          end_date: serviceDate,
          timetable_id: timetableId
        })
      ]);

      setRoute(routeData);
      setPassengers(passengersData);
      setRosterEntry(rosterData.length > 0 ? rosterData[0] : null);
    } catch (err: any) {
      setError(err.message || 'Failed to load manifest');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Sort passengers by seat number
  const sortedPassengers = [...passengers].sort((a, b) => {
    // Put wheelchair passengers first
    if (a.requires_wheelchair_space && !b.requires_wheelchair_space) return -1;
    if (!a.requires_wheelchair_space && b.requires_wheelchair_space) return 1;
    // Then sort by seat number
    return a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true });
  });

  const wheelchairCount = passengers.filter(p => p.requires_wheelchair_space).length;
  const regularCount = passengers.filter(p => !p.requires_wheelchair_space).length;

  if (loading) {
    return (
      <div className="manifest-overlay">
        <div className="manifest-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading manifest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="manifest-overlay">
        <div className="manifest-container">
          <div className="error-state">
            <p>{error || 'Failed to load manifest'}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manifest-overlay">
      <div className="manifest-container">
        {/* Toolbar - not printed */}
        <div className="manifest-toolbar no-print">
          <h2>Passenger Manifest</h2>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={handlePrint}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Manifest
            </button>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="manifest-print-area" ref={printRef}>
          {/* Header */}
          <div className="manifest-header">
            <div className="company-info">
              <h1>{tenant?.company_name || 'Bus Service'}</h1>
              <p>Passenger Manifest</p>
            </div>
            <div className="manifest-date">
              <div className="date-label">Service Date</div>
              <div className="date-value">{formatDate(serviceDate)}</div>
            </div>
          </div>

          {/* Service Details */}
          <div className="service-details">
            <div className="detail-box">
              <div className="detail-label">Route</div>
              <div className="detail-value">
                <span className="route-number">{timetable.route_number}</span>
                {timetable.service_name}
              </div>
            </div>
            <div className="detail-box">
              <div className="detail-label">Departure</div>
              <div className="detail-value">{formatTime(timetable.departure_time)}</div>
            </div>
            {route && (
              <div className="detail-box route-info">
                <div className="detail-label">Route</div>
                <div className="detail-value">{route.origin_stop} → {route.destination_stop}</div>
              </div>
            )}
          </div>

          {/* Driver & Vehicle */}
          <div className="assignment-details">
            <div className="assignment-box">
              <div className="assignment-label">Driver</div>
              <div className="assignment-value">
                {rosterEntry
                  ? `${rosterEntry.driver_first_name} ${rosterEntry.driver_last_name}`
                  : '_________________________'}
              </div>
            </div>
            <div className="assignment-box">
              <div className="assignment-label">Vehicle</div>
              <div className="assignment-value">
                {rosterEntry?.vehicle_registration || '_________________________'}
              </div>
            </div>
          </div>

          {/* Passenger Summary */}
          <div className="passenger-summary">
            <div className="summary-item">
              <span className="summary-value">{passengers.length}</span>
              <span className="summary-label">Total Passengers</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{regularCount}</span>
              <span className="summary-label">Standard</span>
            </div>
            <div className="summary-item wheelchair">
              <span className="summary-value">{wheelchairCount}</span>
              <span className="summary-label">Wheelchair</span>
            </div>
          </div>

          {/* Passenger List */}
          <table className="passenger-table">
            <thead>
              <tr>
                <th className="col-seat">Seat</th>
                <th className="col-name">Passenger Name</th>
                <th className="col-phone">Phone</th>
                <th className="col-boarding">Boarding Stop</th>
                <th className="col-alighting">Alighting Stop</th>
                <th className="col-notes">Notes</th>
                <th className="col-check">Check</th>
              </tr>
            </thead>
            <tbody>
              {sortedPassengers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-passengers">
                    No passengers booked for this service
                  </td>
                </tr>
              ) : (
                sortedPassengers.map((p, idx) => (
                  <tr key={p.customer_id} className={p.requires_wheelchair_space ? 'wheelchair-row' : ''}>
                    <td className="col-seat">
                      <span className={`seat-badge ${p.requires_wheelchair_space ? 'wheelchair' : ''}`}>
                        {p.seat_number}
                      </span>
                    </td>
                    <td className="col-name">
                      <div className="passenger-name">
                        {p.first_name} {p.last_name}
                        {p.is_regular && <span className="regular-indicator">R</span>}
                      </div>
                    </td>
                    <td className="col-phone">{p.phone || '-'}</td>
                    <td className="col-boarding">{p.boarding_stop_name || 'Start'}</td>
                    <td className="col-alighting">{p.alighting_stop_name || 'End'}</td>
                    <td className="col-notes">
                      {p.requires_wheelchair_space && <span className="note-badge wheelchair">WC</span>}
                      {p.special_requirements && (
                        <span className="special-req" title={p.special_requirements}>
                          {p.special_requirements.substring(0, 30)}
                          {p.special_requirements.length > 30 ? '...' : ''}
                        </span>
                      )}
                    </td>
                    <td className="col-check">
                      <div className="check-box"></div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="manifest-footer">
            <div className="footer-notes">
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-badge regular">R</span> = Regular Passenger
                </span>
                <span className="legend-item">
                  <span className="legend-badge wheelchair">WC</span> = Wheelchair Space
                </span>
              </div>
            </div>
            <div className="print-timestamp">
              Printed: {new Date().toLocaleString('en-GB')}
            </div>
          </div>

          {/* Driver Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Driver Signature</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Date & Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
