interface PermitGuideModalProps {
  onClose: () => void;
}

function PermitGuideModal({ onClose }: PermitGuideModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Permits & Compliance Guide</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="guide-grid">
            {/* Left Column - Driver Permits */}
            <div className="guide-section">
              <h4>Driver Permits</h4>
              <p style={{ marginBottom: '1rem' }}>Individual permits required for drivers based on their roles:</p>

              <div className="permits-grid">
                <div className="permit-info">
                  <h5>DBS Check</h5>
                  <p><strong>Required for:</strong> Drivers transporting vulnerable passengers</p>
                  <p><strong>Validity:</strong> 3 years</p>
                  <p><strong>Notes:</strong> Essential for safeguarding</p>
                </div>

                <div className="permit-info">
                  <h5>Section 19 Driver</h5>
                  <p><strong>Required for:</strong> Drivers under Section 19 permits</p>
                  <p><strong>Validity:</strong> 5 years</p>
                  <p><strong>Notes:</strong> Charitable community transport</p>
                </div>

                <div className="permit-info">
                  <h5>Section 22 Driver</h5>
                  <p><strong>Required for:</strong> Drivers under Section 22 permits</p>
                  <p><strong>Validity:</strong> 5 years</p>
                  <p><strong>Notes:</strong> Educational/social services</p>
                </div>

                <div className="permit-info">
                  <h5>MOT Certificate</h5>
                  <p><strong>Required for:</strong> Vehicle owners/maintainers</p>
                  <p><strong>Validity:</strong> Annual</p>
                  <p><strong>Notes:</strong> Ensures roadworthiness</p>
                </div>
              </div>
            </div>

            {/* Right Column - Organizational Permits & Compliance */}
            <div>
              <div className="guide-section">
                <h4>Organizational Permits</h4>
                <p style={{ marginBottom: '1rem' }}>Organization-wide permits:</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="permit-info">
                    <h5>Section 19 Organizational</h5>
                    <p>Community transport services on not-for-profit basis</p>
                    <p><strong>Who needs it:</strong> Community transport groups, charities</p>
                    <p><strong>Validity:</strong> 5 years</p>
                  </div>

                  <div className="permit-info">
                    <h5>Section 22 Organizational</h5>
                    <p>Transport for educational or social welfare purposes</p>
                    <p><strong>Who needs it:</strong> Educational institutions, social services</p>
                    <p><strong>Validity:</strong> 5 years</p>
                  </div>
                </div>
              </div>

              <div className="guide-section">
                <h4>Compliance Status</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '0.75rem' }}><span className="status-badge" style={{background: '#22c55e'}}>COMPLIANT</span> All required permits valid</li>
                  <li style={{ marginBottom: '0.75rem' }}><span className="status-badge" style={{background: '#ffc107'}}>EXPIRING</span> Expires within 30 days</li>
                  <li style={{ marginBottom: '0.75rem' }}><span className="status-badge" style={{background: '#dc2626'}}>EXPIRED</span> One or more expired</li>
                  <li style={{ marginBottom: '0.75rem' }}><span className="status-badge" style={{background: '#dc2626'}}>MISSING</span> Required permits not provided</li>
                  <li style={{ marginBottom: '0.75rem' }}><span className="status-badge" style={{background: '#6c757d'}}>NO REQUIREMENTS</span> No permits required</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="guide-section">
            <h4>Best Practices</h4>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <li>Set up renewal reminders 30-60 days before expiry</li>
              <li>Keep digital copies of all permits</li>
              <li>Review driver roles annually</li>
              <li>Update permits immediately after renewal</li>
              <li>Maintain audit trail of updates</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PermitGuideModal;
