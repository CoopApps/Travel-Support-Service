import apiClient from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface CooperativeMeeting {
  meeting_id: number;
  tenant_id: number;
  meeting_type: 'agm' | 'board' | 'general' | 'special';
  scheduled_date: string;
  held_date?: string;
  attendees_count?: number;
  quorum_met?: boolean;
  minutes_url?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCooperativeMeetingDto {
  meeting_type: 'agm' | 'board' | 'general' | 'special';
  scheduled_date: string;
  notes?: string;
}

export interface UpdateCooperativeMeetingDto {
  held_date?: string;
  attendees_count?: number;
  quorum_met?: boolean;
  minutes_url?: string;
  notes?: string;
}

export interface CooperativeReport {
  report_id: number;
  tenant_id: number;
  report_type: 'annual' | 'financial' | 'membership' | 'compliance';
  period_start: string;
  period_end: string;
  report_data?: any;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCooperativeReportDto {
  report_type: 'annual' | 'financial' | 'membership' | 'compliance';
  period_start: string;
  period_end: string;
  report_data?: any;
  notes?: string;
}

export interface CooperativeMembership {
  membership_id: number;
  tenant_id: number;
  member_type: 'driver' | 'customer' | 'staff' | 'other';
  member_reference_id?: number;
  ownership_shares: number;
  voting_rights: boolean;
  joined_date: string;
  left_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCooperativeMembershipDto {
  member_type: 'driver' | 'customer' | 'staff' | 'other';
  member_reference_id?: number;
  ownership_shares?: number;
  voting_rights?: boolean;
  joined_date: string;
  notes?: string;
}

export interface MembershipStats {
  active_members: number;
  driver_members: number;
  customer_members: number;
  total_shares: number;
  voting_members: number;
}

export interface CooperativeOverview {
  organization_type: string;
  cooperative_model?: string;
  discount_percentage: number;
  governance_requirements?: any;
  enabled_modules?: string[];
  compliance: {
    meetings: {
      total: number;
      held: number;
      quorum_met: number;
    };
    reports: {
      total: number;
      submitted: number;
      approved: number;
    };
  };
  membership: {
    active: number;
    drivers: number;
    customers: number;
    total_shares: number;
  };
}

export interface CooperativeProposal {
  proposal_id: number;
  tenant_id: number;
  proposal_type: 'policy' | 'financial' | 'board_election' | 'service_change' | 'hiring' | 'investment';
  title: string;
  description?: string;
  proposal_data?: any;
  voting_opens: string;
  voting_closes: string;
  status: 'draft' | 'open' | 'closed' | 'passed' | 'failed' | 'cancelled';
  quorum_required: number;
  approval_threshold: number;
  result?: ProposalResult;
  created_by?: number;
  created_by_email?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  notes?: string;
  voting_status?: 'pending' | 'active' | 'expired';
  hours_remaining?: number;
}

export interface ProposalResult {
  yes_count: number;
  no_count: number;
  abstain_count: number;
  yes_weight: number;
  no_weight: number;
  abstain_weight: number;
  total_votes: number;
  total_weight: number;
  eligible_voters: number;
  quorum_required: number;
  approval_threshold: number;
  quorum_met: boolean;
  approved: boolean;
  turnout_percentage: number;
  approval_percentage: number;
}

export interface CreateProposalDto {
  proposal_type: 'policy' | 'financial' | 'board_election' | 'service_change' | 'hiring' | 'investment';
  title: string;
  description?: string;
  proposal_data?: any;
  voting_opens: string;
  voting_closes: string;
  quorum_required?: number;
  approval_threshold?: number;
  notes?: string;
}

export interface UpdateProposalDto {
  proposal_type?: string;
  title?: string;
  description?: string;
  proposal_data?: any;
  voting_opens?: string;
  voting_closes?: string;
  quorum_required?: number;
  approval_threshold?: number;
  status?: string;
  notes?: string;
}

export interface CastVoteDto {
  vote_choice: 'yes' | 'no' | 'abstain';
  voter_comment?: string;
}

export interface Vote {
  vote_id: number;
  proposal_id: number;
  member_id: number;
  vote_choice: 'yes' | 'no' | 'abstain';
  vote_weight: number;
  voted_at: string;
  voter_comment?: string;
}

export interface DistributionPeriod {
  period_id: number;
  tenant_id: number;
  period_type: 'quarterly' | 'annual' | 'special';
  period_start: string;
  period_end: string;
  total_revenue?: number;
  total_expenses?: number;
  total_profit?: number;
  distribution_pool?: number;
  reserve_percentage: number;
  distribution_percentage: number;
  status: 'draft' | 'calculated' | 'approved' | 'distributed' | 'cancelled';
  created_by?: number;
  created_at: string;
  updated_at: string;
  approved_by?: number;
  approved_at?: string;
  distributed_at?: string;
  notes?: string;
}

export interface CreateDistributionPeriodDto {
  period_type: 'quarterly' | 'annual' | 'special';
  period_start: string;
  period_end: string;
  total_revenue?: number;
  total_expenses?: number;
  total_profit?: number;
  reserve_percentage?: number;
  distribution_percentage?: number;
  notes?: string;
}

export interface MemberDistribution {
  distribution_id: number;
  period_id: number;
  member_id: number;
  distribution_type: 'profit_share' | 'dividend';
  ownership_shares?: number;
  ownership_percentage?: number;
  investment_amount?: number;
  investment_percentage?: number;
  distribution_amount: number;
  tax_withheld: number;
  net_amount: number;
  payment_method?: string;
  payment_reference?: string;
  paid: boolean;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  member_name?: string;
  member_type?: string;
  // Joined fields from period
  period_start?: string;
  period_end?: string;
}

export interface DistributionSummary {
  total_distributions: number;
  total_amount: number;
  total_paid: number;
  total_unpaid: number;
  profit_shares: number;
  dividends: number;
  members_count: number;
  paid_count: number;
  unpaid_count: number;
}

export interface Investment {
  investment_id: number;
  tenant_id: number;
  member_id: number;
  investment_amount: number;
  investment_date: string;
  investment_type: 'capital' | 'share_purchase' | 'loan';
  returned_amount: number;
  returned_date?: string;
  status: 'active' | 'returned' | 'converted';
  created_by?: number;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// ============================================================================
// COOPERATIVE MEETINGS API
// ============================================================================

export const getMeetings = async (
  tenantId: number,
  filters?: {
    year?: number;
    meeting_type?: string;
  }
): Promise<{ meetings: CooperativeMeeting[] }> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.meeting_type) params.append('meeting_type', filters.meeting_type);

  const url = `/tenants/${tenantId}/cooperative/meetings${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const createMeeting = async (
  tenantId: number,
  data: CreateCooperativeMeetingDto
): Promise<CooperativeMeeting> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/meetings`, data);
  return response.data;
};

export const updateMeeting = async (
  tenantId: number,
  meetingId: number,
  data: UpdateCooperativeMeetingDto
): Promise<void> => {
  await apiClient.put(`/tenants/${tenantId}/cooperative/meetings/${meetingId}`, data);
};

export const deleteMeeting = async (
  tenantId: number,
  meetingId: number
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/cooperative/meetings/${meetingId}`);
};

// ============================================================================
// COOPERATIVE REPORTS API
// ============================================================================

export const getReports = async (
  tenantId: number,
  filters?: {
    status?: string;
    report_type?: string;
    year?: number;
  }
): Promise<{ reports: CooperativeReport[] }> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.report_type) params.append('report_type', filters.report_type);
  if (filters?.year) params.append('year', filters.year.toString());

  const url = `/tenants/${tenantId}/cooperative/reports${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const createReport = async (
  tenantId: number,
  data: CreateCooperativeReportDto
): Promise<CooperativeReport> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/reports`, data);
  return response.data;
};

export const updateReport = async (
  tenantId: number,
  reportId: number,
  data: { status: string; notes?: string }
): Promise<void> => {
  await apiClient.put(`/tenants/${tenantId}/cooperative/reports/${reportId}`, data);
};

// ============================================================================
// COOPERATIVE MEMBERSHIP API
// ============================================================================

export const getMembership = async (
  tenantId: number,
  filters?: {
    member_type?: string;
    is_active?: boolean;
  }
): Promise<{ members: CooperativeMembership[]; stats: MembershipStats }> => {
  const params = new URLSearchParams();
  if (filters?.member_type) params.append('member_type', filters.member_type);
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

  const url = `/tenants/${tenantId}/cooperative/membership${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const createMember = async (
  tenantId: number,
  data: CreateCooperativeMembershipDto
): Promise<CooperativeMembership> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/membership`, data);
  return response.data;
};

export const updateMember = async (
  tenantId: number,
  membershipId: number,
  data: {
    ownership_shares?: number;
    voting_rights?: boolean;
    notes?: string;
  }
): Promise<void> => {
  await apiClient.put(`/tenants/${tenantId}/cooperative/membership/${membershipId}`, data);
};

export const removeMember = async (
  tenantId: number,
  membershipId: number
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/cooperative/membership/${membershipId}`);
};

// ============================================================================
// COOPERATIVE OVERVIEW API
// ============================================================================

export const getOverview = async (
  tenantId: number
): Promise<CooperativeOverview> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/overview`);
  return response.data;
};

// ============================================================================
// VOTING & PROPOSALS API
// ============================================================================

export const getProposals = async (
  tenantId: number,
  filters?: {
    status?: string;
    proposal_type?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ proposals: CooperativeProposal[] }> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.proposal_type) params.append('proposal_type', filters.proposal_type);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const url = `/tenants/${tenantId}/cooperative/proposals${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const getActiveProposals = async (
  tenantId: number
): Promise<{ proposals: CooperativeProposal[] }> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/proposals/active`);
  return response.data;
};

export const getProposal = async (
  tenantId: number,
  proposalId: number
): Promise<{
  proposal: CooperativeProposal;
  vote_breakdown: Array<{ vote_choice: string; vote_count: number; total_weight: number }>;
  my_vote: Vote | null;
}> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/proposals/${proposalId}`);
  return response.data;
};

export const createProposal = async (
  tenantId: number,
  data: CreateProposalDto
): Promise<CooperativeProposal> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/proposals`, data);
  return response.data;
};

export const updateProposal = async (
  tenantId: number,
  proposalId: number,
  data: UpdateProposalDto
): Promise<void> => {
  await apiClient.put(`/tenants/${tenantId}/cooperative/proposals/${proposalId}`, data);
};

export const deleteProposal = async (
  tenantId: number,
  proposalId: number
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/cooperative/proposals/${proposalId}`);
};

export const castVote = async (
  tenantId: number,
  proposalId: number,
  data: CastVoteDto
): Promise<{ message: string; vote: Vote }> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/proposals/${proposalId}/vote`, data);
  return response.data;
};

export const getMyVotes = async (
  tenantId: number
): Promise<{ votes: any[] }> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/voting/my-votes`);
  return response.data;
};

export const getProposalResults = async (
  tenantId: number,
  proposalId: number
): Promise<{
  proposal_id: number;
  status: string;
  results: ProposalResult;
}> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/proposals/${proposalId}/results`);
  return response.data;
};

export const closeExpiredProposals = async (
  tenantId: number
): Promise<{ message: string }> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/voting/close-expired`);
  return response.data;
};

// ============================================================================
// PROFIT DISTRIBUTION API
// ============================================================================

export const getDistributionPeriods = async (
  tenantId: number,
  filters?: {
    status?: string;
    period_type?: string;
    year?: number;
  }
): Promise<{ periods: DistributionPeriod[] }> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.period_type) params.append('period_type', filters.period_type);
  if (filters?.year) params.append('year', filters.year.toString());

  const url = `/tenants/${tenantId}/cooperative/distributions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const getDistributionPeriod = async (
  tenantId: number,
  periodId: number
): Promise<{
  period: DistributionPeriod;
  summary: DistributionSummary;
  distributions: MemberDistribution[];
}> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/distributions/${periodId}`);
  return response.data;
};

export const createDistributionPeriod = async (
  tenantId: number,
  data: CreateDistributionPeriodDto
): Promise<DistributionPeriod> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/distributions`, data);
  return response.data;
};

export const updateDistributionPeriod = async (
  tenantId: number,
  periodId: number,
  data: Partial<CreateDistributionPeriodDto> & { status?: string }
): Promise<void> => {
  await apiClient.put(`/tenants/${tenantId}/cooperative/distributions/${periodId}`, data);
};

export const deleteDistributionPeriod = async (
  tenantId: number,
  periodId: number
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/cooperative/distributions/${periodId}`);
};

export const calculateDistributions = async (
  tenantId: number,
  periodId: number
): Promise<{ message: string; result: any }> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/distributions/${periodId}/calculate`);
  return response.data;
};

export const approveDistributionPeriod = async (
  tenantId: number,
  periodId: number
): Promise<{ message: string }> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/distributions/${periodId}/approve`);
  return response.data;
};

export const getMemberDistributions = async (
  tenantId: number,
  periodId: number
): Promise<{ distributions: MemberDistribution[] }> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/distributions/${periodId}/members`);
  return response.data;
};

export const markDistributionPaid = async (
  tenantId: number,
  distributionId: number,
  data: {
    payment_method: string;
    payment_reference?: string;
  }
): Promise<{ message: string }> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/cooperative/distributions/members/${distributionId}/mark-paid`,
    data
  );
  return response.data;
};

export const getMyDistributions = async (
  tenantId: number
): Promise<{ distributions: MemberDistribution[] }> => {
  const response = await apiClient.get(`/tenants/${tenantId}/cooperative/distributions/my-distributions`);
  return response.data;
};

export const getInvestments = async (
  tenantId: number,
  filters?: {
    member_id?: number;
    status?: string;
  }
): Promise<{
  investments: Investment[];
  totals: {
    total_invested: number;
    active_investment: number;
    total_investments: number;
  };
}> => {
  const params = new URLSearchParams();
  if (filters?.member_id) params.append('member_id', filters.member_id.toString());
  if (filters?.status) params.append('status', filters.status);

  const url = `/tenants/${tenantId}/cooperative/investments${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const createInvestment = async (
  tenantId: number,
  data: {
    member_id: number;
    investment_amount: number;
    investment_date: string;
    investment_type?: 'capital' | 'share_purchase' | 'loan';
    notes?: string;
  }
): Promise<Investment> => {
  const response = await apiClient.post(`/tenants/${tenantId}/cooperative/investments`, data);
  return response.data;
};
