import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface MembershipManagementProps {
  tenantId: number;
}

const MembershipManagement: React.FC<MembershipManagementProps> = ({ tenantId }) => {
  const [members, setMembers] = useState<cooperativeApi.CooperativeMembership[]>([]);
  const [stats, setStats] = useState<cooperativeApi.MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('true');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<cooperativeApi.CooperativeMembership | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    member_type: 'driver' as 'driver' | 'customer' | 'staff' | 'other',
    member_reference_id: '',
    ownership_shares: '1',
    voting_rights: true,
    joined_date: '',
    notes: '',
  });

  useEffect(() => {
    loadMembership();
  }, [tenantId, filterType, filterActive]);

  const loadMembership = async () => {
    try {
      setLoading(true);
      const { members: data, stats: statsData } = await cooperativeApi.getMembership(tenantId, {
        member_type: filterType || undefined,
        is_active: filterActive === '' ? undefined : filterActive === 'true',
      });
      setMembers(data);
      setStats(statsData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (member?: cooperativeApi.CooperativeMembership) => {
    setEditingMember(member || null);

    if (member) {
      setFormData({
        member_type: member.member_type,
        member_reference_id: member.member_reference_id?.toString() || '',
        ownership_shares: member.ownership_shares.toString(),
        voting_rights: member.voting_rights,
        joined_date: member.joined_date?.split('T')[0] || '',
        notes: member.notes || '',
      });
    } else {
      setFormData({
        member_type: 'driver',
        member_reference_id: '',
        ownership_shares: '1',
        voting_rights: true,
        joined_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMember) {
        await cooperativeApi.updateMember(tenantId, editingMember.membership_id, {
          ownership_shares: parseInt(formData.ownership_shares),
          voting_rights: formData.voting_rights,
          notes: formData.notes || undefined,
        });
      } else {
        await cooperativeApi.createMember(tenantId, {
          member_type: formData.member_type,
          member_reference_id: formData.member_reference_id ? parseInt(formData.member_reference_id) : undefined,
          ownership_shares: parseInt(formData.ownership_shares),
          voting_rights: formData.voting_rights,
          joined_date: formData.joined_date,
          notes: formData.notes || undefined,
        });
      }

      handleCloseModal();
      loadMembership();
    } catch (error) {
      alert('Failed to save member');
    }
  };

  const handleRemove = async (membershipId: number) => {
    if (!confirm('Are you sure you want to remove this member from the co-operative?')) return;

    try {
      await cooperativeApi.removeMember(tenantId, membershipId);
      loadMembership();
    } catch (error) {
      alert('Failed to remove member');
    }
  };

  const memberTypeLabels: Record<string, string> = {
    driver: 'Driver',
    customer: 'Customer',
    staff: 'Staff',
    other: 'Other',
  };

  const memberTypeColors: Record<string, string> = {
    driver: '#3b82f6',
    customer: '#8b5cf6',
    staff: '#10b981',
    other: '#6b7280',
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>
            Membership Management
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
            Manage co-operative members, shares, and voting rights
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
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
          + Add Member
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {stats.active_members}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Active Members</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem' }}>
              {stats.driver_members}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Driver Members</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.25rem' }}>
              {stats.customer_members}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Customer Members</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
              {stats.total_shares}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Total Shares</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>
              {stats.voting_members}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Voting Members</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Member Type
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
            <option value="driver">Drivers</option>
            <option value="customer">Customers</option>
            <option value="staff">Staff</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Status
          </label>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          No members found. Add members to get started.
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Type
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Reference ID
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Shares
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Voting Rights
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Joined
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.membership_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: `${memberTypeColors[member.member_type]}20`,
                          color: memberTypeColors[member.member_type],
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {memberTypeLabels[member.member_type]}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px', color: 'var(--gray-900)' }}>
                      {member.member_reference_id || '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)', textAlign: 'center' }}>
                      {member.ownership_shares}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {member.voting_rights ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ display: 'inline-block' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ display: 'inline-block' }}>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '14px', color: 'var(--gray-700)' }}>
                      {new Date(member.joined_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: member.is_active ? '#10b98120' : '#ef444420',
                          color: member.is_active ? '#10b981' : '#ef4444',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenModal(member)}
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
                        {member.is_active && (
                          <button
                            onClick={() => handleRemove(member.membership_id)}
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
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              {editingMember ? 'Edit Member' : 'Add Member'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!editingMember && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Member Type *
                    </label>
                    <select
                      value={formData.member_type}
                      onChange={(e) => setFormData({ ...formData, member_type: e.target.value as any })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.625rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="driver">Driver</option>
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                      Reference ID
                    </label>
                    <input
                      type="number"
                      value={formData.member_reference_id}
                      onChange={(e) => setFormData({ ...formData, member_reference_id: e.target.value })}
                      placeholder="Optional ID linking to driver/customer record"
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
                      Joined Date *
                    </label>
                    <input
                      type="date"
                      value={formData.joined_date}
                      onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
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

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                  Ownership Shares *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.ownership_shares}
                  onChange={(e) => setFormData({ ...formData, ownership_shares: e.target.value })}
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

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.voting_rights}
                    onChange={(e) => setFormData({ ...formData, voting_rights: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Has Voting Rights
                </label>
              </div>

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
                  {editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipManagement;
