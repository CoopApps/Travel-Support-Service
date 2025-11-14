import { useState } from 'react';
import { OrganizationalPermit } from '../../types';
import { permitsApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import OrganizationalPermitModal from './OrganizationalPermitModal';

interface OrganizationalPermitsSectionProps {
  permits: {
    section19: OrganizationalPermit[];
    section22: OrganizationalPermit[];
  };
  onRefresh: () => void;
}

function OrganizationalPermitsSection({ permits, onRefresh }: OrganizationalPermitsSectionProps) {
  const { tenantId } = useTenant();
  const [showModal, setShowModal] = useState(false);
  const [editingPermit, setEditingPermit] = useState<OrganizationalPermit | null>(null);
  const [permitType, setPermitType] = useState<'section19' | 'section22'>('section19');

  const handleAdd = (type: 'section19' | 'section22') => {
    setPermitType(type);
    setEditingPermit(null);
    setShowModal(true);
  };

  const handleEdit = (permit: OrganizationalPermit) => {
    setPermitType(permit.permit_type);
    setEditingPermit(permit);
    setShowModal(true);
  };

  const handleDelete = async (permit: OrganizationalPermit) => {
    if (!tenantId) return;
    if (!confirm(`Are you sure you want to delete permit ${permit.permit_number}?`)) return;

    try {
      await permitsApi.deleteOrganizationalPermit(tenantId, permit.id || permit.permit_id!);
      onRefresh();
    } catch (error) {
      console.error('Error deleting permit:', error);
      alert('Failed to delete permit');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getExpiryStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return { text: 'No Date', color: '#6c757d' };

    const date = new Date(expiryDate);
    const today = new Date();
    const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { text: 'Expired', color: '#dc2626' };
    if (daysUntil <= 30) return { text: 'Expiring Soon', color: '#f59e0b' };
    return { text: 'Valid', color: '#22c55e' };
  };

  return (
    <div className="organizational-permits-section">
      <h3>Organizational Permits</h3>

      <div className="org-permits-grid">
        {/* Section 19 Permits */}
        <div className="permit-type-section">
          <div className="section-header">
            <h4>Section 19 Permits</h4>
            <button className="btn btn-primary btn-sm" onClick={() => handleAdd('section19')}>
              Add Section 19
            </button>
          </div>

          {permits.section19.length === 0 ? (
            <div className="empty-state">
              <p>No Section 19 permits added</p>
            </div>
          ) : (
            <div className="permits-list">
              {permits.section19.map((permit) => {
                const status = getExpiryStatus(permit.expiry_date);
                return (
                  <div key={permit.id || permit.permit_id} className="permit-card">
                    <div className="permit-header">
                      <strong>{permit.organisation_name}</strong>
                      <span className="permit-status" style={{ background: status.color }}>
                        {status.text}
                      </span>
                    </div>
                    <div className="permit-details">
                      <div><strong>Permit #:</strong> {permit.permit_number}</div>
                      <div><strong>Expiry:</strong> {formatDate(permit.expiry_date)}</div>
                      {permit.permit_size_type && (
                        <div><strong>Size:</strong> {permit.permit_size_type === 'standard' ? 'Standard (≤16 passengers)' : 'Large Bus (17+ passengers)'}</div>
                      )}
                      {permit.permitted_passenger_classes && permit.permitted_passenger_classes.length > 0 && (
                        <div><strong>Passenger Classes:</strong> {permit.permitted_passenger_classes.join(', ')}</div>
                      )}
                      {permit.disc_number && <div><strong>Disc #:</strong> {permit.disc_number}</div>}
                      {permit.issued_by_type && (
                        <div><strong>Issued By:</strong> {permit.issued_by_type === 'traffic_commissioner' ? 'Traffic Commissioner' : 'Designated Body'}</div>
                      )}
                      {permit.notes && <div><strong>Notes:</strong> {permit.notes}</div>}
                    </div>
                    <div className="permit-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(permit)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(permit)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 22 Permits */}
        <div className="permit-type-section">
          <div className="section-header">
            <h4>Section 22 Permits</h4>
            <button className="btn btn-primary btn-sm" onClick={() => handleAdd('section22')}>
              Add Section 22
            </button>
          </div>

          {permits.section22.length === 0 ? (
            <div className="empty-state">
              <p>No Section 22 permits added</p>
            </div>
          ) : (
            <div className="permits-list">
              {permits.section22.map((permit) => {
                const status = getExpiryStatus(permit.expiry_date);
                return (
                  <div key={permit.id || permit.permit_id} className="permit-card">
                    <div className="permit-header">
                      <strong>{permit.organisation_name}</strong>
                      <span className="permit-status" style={{ background: status.color }}>
                        {status.text}
                      </span>
                    </div>
                    <div className="permit-details">
                      <div><strong>Permit #:</strong> {permit.permit_number}</div>
                      <div><strong>Expiry:</strong> {formatDate(permit.expiry_date)}</div>
                      {permit.permit_size_type && (
                        <div><strong>Size:</strong> {permit.permit_size_type === 'standard' ? 'Standard (≤16 passengers)' : 'Large Bus (17+ passengers)'}</div>
                      )}
                      {permit.permitted_passenger_classes && permit.permitted_passenger_classes.length > 0 && (
                        <div><strong>Passenger Classes:</strong> {permit.permitted_passenger_classes.join(', ')}</div>
                      )}
                      {permit.disc_number && <div><strong>Disc #:</strong> {permit.disc_number}</div>}
                      {permit.issued_by_type && (
                        <div><strong>Issued By:</strong> {permit.issued_by_type === 'traffic_commissioner' ? 'Traffic Commissioner' : 'Designated Body'}</div>
                      )}
                      {permit.notes && <div><strong>Notes:</strong> {permit.notes}</div>}
                    </div>
                    <div className="permit-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(permit)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(permit)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <OrganizationalPermitModal
          permit={editingPermit}
          permitType={permitType}
          onClose={() => {
            setShowModal(false);
            setEditingPermit(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingPermit(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default OrganizationalPermitsSection;
