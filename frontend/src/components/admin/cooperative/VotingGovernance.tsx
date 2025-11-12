import React, { useState, useEffect } from 'react';
import * as cooperativeApi from '../../../services/cooperativeApi';

interface VotingGovernanceProps {
  tenantId: number;
}

const VotingGovernance: React.FC<VotingGovernanceProps> = ({ tenantId }) => {
  const [proposals, setProposals] = useState<cooperativeApi.CooperativeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<cooperativeApi.CooperativeProposal | null>(null);
  const [votingProposal, setVotingProposal] = useState<cooperativeApi.CooperativeProposal | null>(null);
  const [resultsProposal, setResultsProposal] = useState<cooperativeApi.CooperativeProposal | null>(null);
  const [proposalDetails, setProposalDetails] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    proposal_type: 'policy' as 'policy' | 'financial' | 'board_election' | 'service_change' | 'hiring' | 'investment',
    title: '',
    description: '',
    voting_opens: '',
    voting_closes: '',
    quorum_required: '50',
    approval_threshold: '50',
    notes: '',
  });

  // Vote form state
  const [voteData, setVoteData] = useState({
    vote_choice: '' as 'yes' | 'no' | 'abstain' | '',
    voter_comment: '',
  });

  useEffect(() => {
    loadProposals();
  }, [tenantId, filterStatus, filterType]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const { proposals: data } = await cooperativeApi.getProposals(tenantId, {
        status: filterStatus || undefined,
        proposal_type: filterType || undefined,
      });
      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proposal?: cooperativeApi.CooperativeProposal) => {
    setEditingProposal(proposal || null);

    if (proposal) {
      setFormData({
        proposal_type: proposal.proposal_type,
        title: proposal.title,
        description: proposal.description || '',
        voting_opens: proposal.voting_opens.split('T')[0],
        voting_closes: proposal.voting_closes.split('T')[0],
        quorum_required: proposal.quorum_required.toString(),
        approval_threshold: proposal.approval_threshold.toString(),
        notes: proposal.notes || '',
      });
    } else {
      const today = new Date();
      const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setFormData({
        proposal_type: 'policy',
        title: '',
        description: '',
        voting_opens: today.toISOString().split('T')[0],
        voting_closes: weekLater.toISOString().split('T')[0],
        quorum_required: '50',
        approval_threshold: '50',
        notes: '',
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProposal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProposal) {
        await cooperativeApi.updateProposal(tenantId, editingProposal.proposal_id, {
          ...formData,
          quorum_required: parseInt(formData.quorum_required),
          approval_threshold: parseInt(formData.approval_threshold),
        });
      } else {
        await cooperativeApi.createProposal(tenantId, {
          ...formData,
          quorum_required: parseInt(formData.quorum_required),
          approval_threshold: parseInt(formData.approval_threshold),
        });
      }

      handleCloseModal();
      loadProposals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save proposal');
    }
  };

  const handleOpenProposal = async (proposalId: number) => {
    try {
      await cooperativeApi.updateProposal(tenantId, proposalId, { status: 'open' });
      loadProposals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to open proposal');
    }
  };

  const handleDelete = async (proposalId: number) => {
    if (!confirm('Delete this proposal?')) return;

    try {
      await cooperativeApi.deleteProposal(tenantId, proposalId);
      loadProposals();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete proposal');
    }
  };

  const handleOpenVoteModal = async (proposal: cooperativeApi.CooperativeProposal) => {
    try {
      const details = await cooperativeApi.getProposal(tenantId, proposal.proposal_id);
      setProposalDetails(details);
      setVotingProposal(proposal);
      setVoteData({
        vote_choice: details.my_vote?.vote_choice || '',
        voter_comment: details.my_vote?.voter_comment || '',
      });
      setShowVoteModal(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load proposal details');
    }
  };

  const handleCloseVoteModal = () => {
    setShowVoteModal(false);
    setVotingProposal(null);
    setProposalDetails(null);
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!votingProposal || !voteData.vote_choice) {
      alert('Please select a vote choice');
      return;
    }

    try {
      await cooperativeApi.castVote(tenantId, votingProposal.proposal_id, {
        vote_choice: voteData.vote_choice,
        voter_comment: voteData.voter_comment || undefined,
      });

      handleCloseVoteModal();
      loadProposals();
      alert('Vote cast successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cast vote');
    }
  };

  const handleShowResults = async (proposal: cooperativeApi.CooperativeProposal) => {
    try {
      const details = await cooperativeApi.getProposal(tenantId, proposal.proposal_id);
      setProposalDetails(details);
      setResultsProposal(proposal);
      setShowResultsModal(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load results');
    }
  };

  const handleCloseResultsModal = () => {
    setShowResultsModal(false);
    setResultsProposal(null);
    setProposalDetails(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      open: '#10b981',
      closed: '#6b7280',
      passed: '#3b82f6',
      failed: '#ef4444',
      cancelled: '#9ca3af',
    };
    return colors[status] || '#6b7280';
  };

  const getVotingStatusBadge = (proposal: cooperativeApi.CooperativeProposal) => {
    if (proposal.status !== 'open') return null;

    const now = new Date();
    const opens = new Date(proposal.voting_opens);
    const closes = new Date(proposal.voting_closes);

    if (now < opens) {
      return <span style={{ color: '#f59e0b', fontSize: '12px' }}>Pending</span>;
    } else if (now > closes) {
      return <span style={{ color: '#ef4444', fontSize: '12px' }}>Expired</span>;
    } else {
      return <span style={{ color: '#10b981', fontSize: '12px' }}>Active</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading proposals...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Democratic Governance
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Create proposals, vote on decisions, and track democratic governance activities
        </p>
      </div>

      {/* Filters & Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '150px',
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '150px',
          }}
        >
          <option value="">All Types</option>
          <option value="policy">Policy</option>
          <option value="financial">Financial</option>
          <option value="board_election">Board Election</option>
          <option value="service_change">Service Change</option>
          <option value="hiring">Hiring</option>
          <option value="investment">Investment</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={() => handleOpenModal()}
          style={{ marginLeft: 'auto' }}
        >
          + New Proposal
        </button>
      </div>

      {/* Proposals Table */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Proposal</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Voting Period</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Turnout</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No proposals found. Create your first proposal to get started.
                </td>
              </tr>
            ) : (
              proposals.map((proposal) => (
                <tr key={proposal.proposal_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 500, color: '#111827', marginBottom: '4px' }}>{proposal.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{proposal.description?.substring(0, 100)}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: '#eff6ff',
                      color: '#3b82f6',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {proposal.proposal_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                    <div>{new Date(proposal.voting_opens).toLocaleDateString()}</div>
                    <div>to {new Date(proposal.voting_closes).toLocaleDateString()}</div>
                    {getVotingStatusBadge(proposal)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: getStatusColor(proposal.status) + '15',
                      color: getStatusColor(proposal.status),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {proposal.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 500 }}>
                    {proposal.result ? `${proposal.result.turnout_percentage.toFixed(1)}%` : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {proposal.status === 'draft' && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenModal(proposal)}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenProposal(proposal.proposal_id)}
                            title="Open for voting"
                          >
                            Open
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(proposal.proposal_id)}
                            title="Delete"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {proposal.status === 'open' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenVoteModal(proposal)}
                        >
                          Vote
                        </button>
                      )}
                      {(proposal.status === 'open' || proposal.status === 'closed' || proposal.status === 'passed' || proposal.status === 'failed') && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleShowResults(proposal)}
                        >
                          Results
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Proposal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingProposal ? 'Edit Proposal' : 'New Proposal'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Proposal Type</label>
                  <select
                    value={formData.proposal_type}
                    onChange={(e) => setFormData({ ...formData, proposal_type: e.target.value as any })}
                    required
                  >
                    <option value="policy">Policy</option>
                    <option value="financial">Financial</option>
                    <option value="board_election">Board Election</option>
                    <option value="service_change">Service Change</option>
                    <option value="hiring">Hiring</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Voting Opens</label>
                    <input
                      type="date"
                      value={formData.voting_opens}
                      onChange={(e) => setFormData({ ...formData, voting_opens: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Voting Closes</label>
                    <input
                      type="date"
                      value={formData.voting_closes}
                      onChange={(e) => setFormData({ ...formData, voting_closes: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Quorum Required (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.quorum_required}
                      onChange={(e) => setFormData({ ...formData, quorum_required: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Approval Threshold (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.approval_threshold}
                      onChange={(e) => setFormData({ ...formData, approval_threshold: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProposal ? 'Update' : 'Create'} Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVoteModal && votingProposal && proposalDetails && (
        <div className="modal-overlay" onClick={handleCloseVoteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Cast Your Vote</h3>
              <button className="modal-close" onClick={handleCloseVoteModal}>&times;</button>
            </div>
            <form onSubmit={handleCastVote}>
              <div className="modal-body">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>{votingProposal.title}</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>{votingProposal.description}</p>
                </div>

                <div className="form-group">
                  <label>Your Vote</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="vote_choice"
                        value="yes"
                        checked={voteData.vote_choice === 'yes'}
                        onChange={(e) => setVoteData({ ...voteData, vote_choice: e.target.value as 'yes' })}
                        required
                      />
                      <span style={{ color: '#10b981', fontWeight: 500 }}>Yes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="vote_choice"
                        value="no"
                        checked={voteData.vote_choice === 'no'}
                        onChange={(e) => setVoteData({ ...voteData, vote_choice: e.target.value as 'no' })}
                        required
                      />
                      <span style={{ color: '#ef4444', fontWeight: 500 }}>No</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="vote_choice"
                        value="abstain"
                        checked={voteData.vote_choice === 'abstain'}
                        onChange={(e) => setVoteData({ ...voteData, vote_choice: e.target.value as 'abstain' })}
                        required
                      />
                      <span style={{ color: '#6b7280', fontWeight: 500 }}>Abstain</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Comment (optional)</label>
                  <textarea
                    value={voteData.voter_comment}
                    onChange={(e) => setVoteData({ ...voteData, voter_comment: e.target.value })}
                    rows={3}
                    placeholder="Explain your vote (optional)"
                  />
                </div>

                {proposalDetails.my_vote && (
                  <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
                    <p style={{ fontSize: '13px', color: '#92400e' }}>
                      You have already voted <strong>{proposalDetails.my_vote.vote_choice}</strong> on this proposal.
                      Submitting will update your vote.
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseVoteModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {proposalDetails.my_vote ? 'Update Vote' : 'Cast Vote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && resultsProposal && proposalDetails && (
        <div className="modal-overlay" onClick={handleCloseResultsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Proposal Results</h3>
              <button className="modal-close" onClick={handleCloseResultsModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>{resultsProposal.title}</h4>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{resultsProposal.description}</p>
              </div>

              {resultsProposal.result && (
                <>
                  {/* Vote Breakdown */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>Vote Breakdown</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{resultsProposal.result.yes_count}</div>
                        <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>Yes</div>
                      </div>
                      <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{resultsProposal.result.no_count}</div>
                        <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>No</div>
                      </div>
                      <div style={{ background: '#e5e7eb', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#6b7280' }}>{resultsProposal.result.abstain_count}</div>
                        <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>Abstain</div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Turnout</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                        {resultsProposal.result.turnout_percentage.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {resultsProposal.result.total_votes} / {resultsProposal.result.eligible_voters} members
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Approval</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                        {resultsProposal.result.approval_percentage.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        of votes cast
                      </div>
                    </div>
                  </div>

                  {/* Outcome */}
                  <div style={{
                    background: resultsProposal.result.quorum_met && resultsProposal.result.approved ? '#dcfce7' : '#fee2e2',
                    padding: '1rem',
                    borderRadius: '6px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#111827' }}>Outcome</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {resultsProposal.result.quorum_met ? (
                        <>Quorum met ({resultsProposal.result.quorum_required}% required)</>
                      ) : (
                        <>Quorum not met ({resultsProposal.result.quorum_required}% required)</>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {resultsProposal.result.approved ? (
                        <>Approved ({resultsProposal.result.approval_threshold}% threshold)</>
                      ) : (
                        <>Not approved ({resultsProposal.result.approval_threshold}% threshold)</>
                      )}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      marginTop: '0.5rem',
                      color: resultsProposal.result.quorum_met && resultsProposal.result.approved ? '#10b981' : '#ef4444',
                    }}>
                      {resultsProposal.result.quorum_met && resultsProposal.result.approved ? 'PROPOSAL PASSED' : 'PROPOSAL FAILED'}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseResultsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingGovernance;
