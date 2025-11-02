import { useState, useEffect } from 'react';
import { driverDashboardApi } from '../../services/driverDashboardApi';

interface TripHistoryModalProps {
  tenantId: number;
  driverId: number;
  onClose: () => void;
}

/**
 * Trip History Modal
 *
 * View completed trips from past weeks
 * Filterable by date range
 */
function TripHistoryModal({ tenantId, driverId, onClose }: TripHistoryModalProps) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('7'); // Default to last 7 days

  useEffect(() => {
    loadTrips();
  }, [dateRange]);

  const loadTrips = async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date();
      const daysBack = parseInt(dateRange);
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysBack);

      const start = startDate.toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];

      const data = await driverDashboardApi.getSchedule(tenantId, driverId, start, end);

      // Filter only completed trips and sort by date descending
      const completedTrips = (data.schedules || [])
        .filter((trip: any) => trip.status === 'completed')
        .sort((a: any, b: any) => {
          const dateA = new Date(a.assignment_date + 'T' + (a.pickup_time || '00:00'));
          const dateB = new Date(b.assignment_date + 'T' + (b.pickup_time || '00:00'));
          return dateB.getTime() - dateA.getTime();
        });

      setTrips(completedTrips);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load trip history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
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
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Trip History
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
            Your completed trips
          </p>
        </div>

        {/* Date Range Filter */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'var(--gray-50)'
        }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '14px', color: 'var(--gray-900)' }}>
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="form-control"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem 1.5rem'
        }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
              No completed trips found in the selected date range
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trips.map((trip: any, index: number) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '15px' }}>
                      {trip.customer_name}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      padding: '2px 8px',
                      background: '#d1fae5',
                      color: '#065f46',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      Completed
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '6px' }}>
                    <strong>Date:</strong> {formatDate(trip.assignment_date)}
                    {trip.pickup_time && <> at {formatTime(trip.pickup_time)}</>}
                  </div>

                  {trip.customer_address && (
                    <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '6px' }}>
                      <strong>Pickup:</strong> {trip.customer_address}
                    </div>
                  )}

                  {trip.destination && (
                    <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '6px' }}>
                      <strong>Destination:</strong> {trip.destination}
                    </div>
                  )}

                  {trip.driver_notes && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#92400e'
                    }}>
                      <strong>Notes:</strong> {trip.driver_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
            {trips.length} trip{trips.length !== 1 ? 's' : ''} found
          </div>
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

export default TripHistoryModal;
