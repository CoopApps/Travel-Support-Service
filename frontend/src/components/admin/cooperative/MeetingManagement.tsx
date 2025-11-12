import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface MeetingManagementProps {
  tenantId: number;
}

const MeetingManagement: React.FC<MeetingManagementProps> = ({ tenantId }) => {
  const [meetings, setMeetings] = useState<cooperativeApi.CooperativeMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<cooperativeApi.CooperativeMeeting | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'record'>('create');

  // Form state
  const [formData, setFormData] = useState({
    meeting_type: 'agm' as 'agm' | 'board' | 'general' | 'special',
    scheduled_date: '',
    held_date: '',
    attendees_count: '',
    quorum_met: false,
    minutes_url: '',
    notes: '',
  });

  useEffect(() => {
    loadMeetings();
  }, [tenantId, filterYear, filterType]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const { meetings: data } = await cooperativeApi.getMeetings(tenantId, {
        year: filterYear,
        meeting_type: filterType || undefined,
      });
      setMeetings(data);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'create' | 'edit' | 'record', meeting?: cooperativeApi.CooperativeMeeting) => {
    setModalMode(mode);
    setEditingMeeting(meeting || null);

    if (mode === 'create') {
      setFormData({
        meeting_type: 'agm',
        scheduled_date: '',
        held_date: '',
        attendees_count: '',
        quorum_met: false,
        minutes_url: '',
        notes: '',
      });
    } else if (meeting) {
      setFormData({
        meeting_type: meeting.meeting_type,
        scheduled_date: meeting.scheduled_date?.split('T')[0] || '',
        held_date: meeting.held_date?.split('T')[0] || '',
        attendees_count: meeting.attendees_count?.toString() || '',
        quorum_met: meeting.quorum_met || false,
        minutes_url: meeting.minutes_url || '',
        notes: meeting.notes || '',
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMeeting(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        await cooperativeApi.createMeeting(tenantId, {
          meeting_type: formData.meeting_type,
          scheduled_date: formData.scheduled_date,
          notes: formData.notes || undefined,
        });
      } else if (modalMode === 'edit' && editingMeeting) {
        await cooperativeApi.updateMeeting(tenantId, editingMeeting.meeting_id, {
          notes: formData.notes || undefined,
        });
      } else if (modalMode === 'record' && editingMeeting) {
        await cooperativeApi.updateMeeting(tenantId, editingMeeting.meeting_id, {
          held_date: formData.held_date || undefined,
          attendees_count: formData.attendees_count ? parseInt(formData.attendees_count) : undefined,
          quorum_met: formData.quorum_met,
          minutes_url: formData.minutes_url || undefined,
          notes: formData.notes || undefined,
        });
      }

      handleCloseModal();
      loadMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('Failed to save meeting');
    }
  };

  const handleDelete = async (meetingId: number) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await cooperativeApi.deleteMeeting(tenantId, meetingId);
      loadMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    }
  };

  const meetingTypeLabels: Record<string, string> = {
    agm: 'Annual General Meeting',
    board: 'Board Meeting',
    general: 'General Meeting',
    special: 'Special Meeting',
  };

  const getStatusBadge = (meeting: cooperativeApi.CooperativeMeeting) => {
    if (meeting.held_date) {
      if (meeting.quorum_met) {
        return { color: '#10b981', text: 'Completed (Quorum Met)' };
      }
      return { color: '#f59e0b', text: 'Completed (No Quorum)' };
    }

    const scheduledDate = new Date(meeting.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      return { color: '#ef4444', text: 'Overdue' };
    }
    return { color: '#3b82f6', text: 'Scheduled' };
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
            Meeting Management
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
            Schedule and track co-operative governance meetings
          </p>
        </div>
        <button
          onClick={() => handleOpenModal('create')}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Year
          </label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Meeting Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Types</option>
            <option value="agm">AGM</option>
            <option value="board">Board Meeting</option>
            <option value="general">General Meeting</option>
            <option value="special">Special Meeting</option>
          </select>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          No meetings found. Schedule your first meeting to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {meetings.map((meeting) => {
            const status = getStatusBadge(meeting);
            return (
              <div key={meeting.meeting_id} className="card">
                <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                        {meetingTypeLabels[meeting.meeting_type]}
                      </h3>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: `${status.color}20`,
                          color: status.color,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {status.text}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Scheduled:</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
                          {new Date(meeting.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>

                      {meeting.held_date && (
                        <>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Held:</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
                              {new Date(meeting.held_date).toLocaleDateString()}
                            </span>
                          </div>

                          {meeting.attendees_count && (
                            <div>
                              <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>Attendees:</span>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
                                {meeting.attendees_count}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {meeting.notes && (
                      <p style={{ margin: '0.75rem 0 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
                        {meeting.notes}
                      </p>
                    )}

                    {meeting.minutes_url && (
                      <a
                        href={meeting.minutes_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginTop: '0.75rem',
                          fontSize: '14px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        View Minutes
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!meeting.held_date && (
                      <button
                        onClick={() => handleOpenModal('record', meeting)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Record
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal('edit', meeting)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--gray-100)',
                        color: 'var(--gray-700)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(meeting.meeting_id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'var(--gray-100)',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
              {modalMode === 'create' && 'Schedule Meeting'}
              {modalMode === 'edit' && 'Edit Meeting'}
              {modalMode === 'record' && 'Record Meeting Details'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {modalMode === 'create' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Meeting Type *
                    </label>
                    <select
                      value={formData.meeting_type}
                      onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value as any })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="agm">Annual General Meeting</option>
                      <option value="board">Board Meeting</option>
                      <option value="general">General Meeting</option>
                      <option value="special">Special Meeting</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </>
              )}

              {modalMode === 'record' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Held Date
                    </label>
                    <input
                      type="date"
                      value={formData.held_date}
                      onChange={(e) => setFormData({ ...formData, held_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Number of Attendees
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.attendees_count}
                      onChange={(e) => setFormData({ ...formData, attendees_count: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.quorum_met}
                        onChange={(e) => setFormData({ ...formData, quorum_met: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      Quorum Met
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Minutes URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.minutes_url}
                      onChange={(e) => setFormData({ ...formData, minutes_url: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: 'var(--gray-600)' }}>
                      Link to meeting minutes document
                    </p>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'var(--gray-100)',
                    color: 'var(--gray-700)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalMode === 'create' ? 'Schedule' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;
