import React, { useState } from 'react';
import { HolidayRequest } from '../../types/holiday.types';

interface HolidayRequestsTableProps {
  requests: HolidayRequest[];
  onViewRequest: (requestId: number) => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number, reason: string) => void;
}

const HolidayRequestsTable: React.FC<HolidayRequestsTableProps> = ({
  requests,
  onViewRequest,
  onApprove,
  onReject
}) => {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    if (startDate === endDate) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      pending: { class: 'badge-warning', label: 'Pending' },
      approved: { class: 'badge-success', label: 'Approved' },
      rejected: { class: 'badge-danger', label: 'Rejected' },
      cancelled: { class: 'badge-secondary', label: 'Cancelled' }
    };

    const badge = badges[status] || { class: 'badge-secondary', label: status };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  const handleRejectClick = (requestId: number) => {
    setRejectingId(requestId);
    setRejectionReason('');
  };

  const handleRejectConfirm = (requestId: number) => {
    if (rejectionReason.trim()) {
      onReject(requestId, rejectionReason);
      setRejectingId(null);
      setRejectionReason('');
    }
  };

  const handleRejectCancel = () => {
    setRejectingId(null);
    setRejectionReason('');
  };

  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3>No Holiday Requests</h3>
        <p>No requests match the current filter</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Requested</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.request_id}>
              <td>
                <div>
                  <strong>{request.driver_name || request.customer_name || 'Unknown'}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                    {request.driver_id ? 'Driver' : 'Customer'}
                  </div>
                </div>
              </td>
              <td>
                <span className={`type-badge type-${request.type}`}>
                  {request.type}
                </span>
              </td>
              <td>{formatDateRange(request.start_date, request.end_date)}</td>
              <td>
                <strong>{request.days}</strong> {request.days === 1 ? 'day' : 'days'}
              </td>
              <td>{formatDate(request.requested_date)}</td>
              <td>{getStatusBadge(request.status)}</td>
              <td>
                <div className="action-buttons">
                  {request.status === 'pending' && request.driver_id && (
                    <>
                      {rejectingId === request.request_id ? (
                        <div className="reject-form">
                          <input
                            type="text"
                            placeholder="Reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="form-control form-control-sm"
                            autoFocus
                          />
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectConfirm(request.request_id)}
                            disabled={!rejectionReason.trim()}
                            title="Confirm rejection"
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleRejectCancel}
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => onApprove(request.request_id)}
                            title="Approve request"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRejectClick(request.request_id)}
                            title="Reject request"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  )}
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onViewRequest(request.request_id)}
                    title="View details"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HolidayRequestsTable;
