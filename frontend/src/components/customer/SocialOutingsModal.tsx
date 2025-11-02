import { useState, useEffect } from 'react';
import { customerDashboardApi } from '../../services/customerDashboardApi';

interface SocialOutingsModalProps {
  tenantId: number;
  customerId: number;
  onClose: () => void;
}

interface Outing {
  id: number;
  name: string;
  description: string;
  outing_date: string;
  location: string;
  departure_time: string;
  return_time: string;
  max_passengers: number;
  total_bookings: number;
  customer_booked: number;
  price_per_person: number;
  wheelchair_bookings: number;
}

function SocialOutingsModal({ tenantId, customerId, onClose }: SocialOutingsModalProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'suggest'>('browse');
  const [outings, setOutings] = useState<Outing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking form
  const [selectedOuting, setSelectedOuting] = useState<Outing | null>(null);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [booking, setBooking] = useState(false);

  // Suggestion form
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionDate, setSuggestionDate] = useState('');
  const [suggestionLocation, setSuggestionLocation] = useState('');
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    loadOutings();
  }, [tenantId, customerId]);

  const loadOutings = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customerDashboardApi.getSocialOutings(tenantId, customerId);
      setOutings(data.outings || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load outings');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (outing: Outing) => {
    if (parseInt(String(outing.customer_booked)) > 0) {
      alert('You are already booked on this outing!');
      return;
    }
    setSelectedOuting(outing);
  };

  const confirmBooking = async () => {
    if (!selectedOuting) return;

    setBooking(true);
    setError('');
    try {
      await customerDashboardApi.bookSocialOuting(tenantId, customerId, selectedOuting.id, {
        special_requirements: specialRequirements,
        dietary_requirements: dietaryRequirements,
      });

      setSelectedOuting(null);
      setSpecialRequirements('');
      setDietaryRequirements('');
      loadOutings();
      alert('Successfully booked onto outing!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book outing');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (outing: Outing) => {
    if (!confirm('Are you sure you want to cancel your booking?')) return;

    try {
      await customerDashboardApi.cancelSocialOuting(tenantId, customerId, outing.id);
      loadOutings();
      alert('Booking cancelled successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggesting(true);
    setError('');

    try {
      await customerDashboardApi.suggestSocialOuting(tenantId, customerId, {
        name: suggestionName,
        description: suggestionDescription,
        suggested_date: suggestionDate,
        suggested_location: suggestionLocation,
        notes: suggestionNotes,
      });

      setSuggestionName('');
      setSuggestionDescription('');
      setSuggestionDate('');
      setSuggestionLocation('');
      setSuggestionNotes('');
      alert('Suggestion submitted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit suggestion');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '8px', maxWidth: '800px',
        width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 0', background: 'white' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600 }}>Social Outings</h2>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)' }}>
            <button
              onClick={() => setActiveTab('browse')}
              style={{
                padding: '0.75rem 1.5rem', border: 'none', background: 'transparent',
                fontSize: '14px', fontWeight: 600,
                color: activeTab === 'browse' ? 'var(--primary)' : 'var(--gray-600)',
                borderBottom: activeTab === 'browse' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', cursor: 'pointer'
              }}
            >
              Browse Outings
            </button>
            <button
              onClick={() => setActiveTab('suggest')}
              style={{
                padding: '0.75rem 1.5rem', border: 'none', background: 'transparent',
                fontSize: '14px', fontWeight: 600,
                color: activeTab === 'suggest' ? 'var(--primary)' : 'var(--gray-600)',
                borderBottom: activeTab === 'suggest' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', cursor: 'pointer'
              }}
            >
              Suggest Outing
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          {activeTab === 'browse' ? (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                </div>
              ) : outings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
                  No upcoming outings at this time
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {outings.map((outing) => {
                    const isBooked = parseInt(String(outing.customer_booked)) > 0;
                    const spotsLeft = outing.max_passengers - parseInt(String(outing.total_bookings));

                    return (
                      <div key={outing.id} style={{
                        background: isBooked ? '#e3f2fd' : 'white',
                        border: `2px solid ${isBooked ? '#2196f3' : 'var(--gray-200)'}`,
                        borderRadius: '8px', padding: '1.25rem'
                      }}>
                        {isBooked && (
                          <div style={{
                            background: '#2196f3', color: 'white', display: 'inline-block',
                            padding: '4px 10px', borderRadius: '4px', fontSize: '12px',
                            fontWeight: 600, marginBottom: '0.75rem'
                          }}>
                            You're booked!
                          </div>
                        )}

                        <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '0.5rem' }}>
                          {outing.name}
                        </div>

                        <div style={{ fontSize: '14px', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
                          {outing.description}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '13px', marginBottom: '1rem' }}>
                          <div><strong>Date:</strong> {new Date(outing.outing_date).toLocaleDateString('en-GB')}</div>
                          <div><strong>Location:</strong> {outing.location}</div>
                          <div><strong>Departs:</strong> {outing.departure_time}</div>
                          <div><strong>Returns:</strong> {outing.return_time}</div>
                          <div><strong>Price:</strong> £{outing.price_per_person?.toFixed(2)}</div>
                          <div><strong>Spots:</strong> {spotsLeft} left</div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isBooked ? (
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleCancel(outing)}
                              style={{ fontSize: '14px' }}
                            >
                              Cancel Booking
                            </button>
                          ) : spotsLeft > 0 ? (
                            <button
                              className="btn btn-primary"
                              onClick={() => handleBook(outing)}
                              style={{ fontSize: '14px' }}
                            >
                              Book Now
                            </button>
                          ) : (
                            <button className="btn btn-secondary" disabled style={{ fontSize: '14px' }}>
                              Fully Booked
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Booking Modal */}
              {selectedOuting && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.5)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 10001
                }}>
                  <div style={{
                    background: 'white', borderRadius: '8px', padding: '2rem',
                    maxWidth: '500px', width: '90%'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>Book: {selectedOuting.name}</h3>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label>Special Requirements (optional)</label>
                      <textarea
                        className="form-control"
                        value={specialRequirements}
                        onChange={(e) => setSpecialRequirements(e.target.value)}
                        rows={2}
                        placeholder="e.g., Wheelchair access needed"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label>Dietary Requirements (optional)</label>
                      <textarea
                        className="form-control"
                        value={dietaryRequirements}
                        onChange={(e) => setDietaryRequirements(e.target.value)}
                        rows={2}
                        placeholder="e.g., Vegetarian, allergies"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedOuting(null)}
                        disabled={booking}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={confirmBooking}
                        disabled={booking}
                      >
                        {booking ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSuggest}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Outing Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={suggestionName}
                  onChange={(e) => setSuggestionName(e.target.value)}
                  required
                  placeholder="e.g., Trip to the Beach"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Description *</label>
                <textarea
                  className="form-control"
                  value={suggestionDescription}
                  onChange={(e) => setSuggestionDescription(e.target.value)}
                  rows={3}
                  required
                  placeholder="Describe the outing"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Suggested Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={suggestionDate}
                    onChange={(e) => setSuggestionDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={suggestionLocation}
                    onChange={(e) => setSuggestionLocation(e.target.value)}
                    placeholder="e.g., Brighton Pier"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Additional Notes</label>
                <textarea
                  className="form-control"
                  value={suggestionNotes}
                  onChange={(e) => setSuggestionNotes(e.target.value)}
                  rows={2}
                  placeholder="Any other details"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={suggesting}
              >
                {suggesting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end'
        }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SocialOutingsModal;
