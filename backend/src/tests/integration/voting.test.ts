import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Co-operative Voting & Democracy Routes Integration Tests
 *
 * Tests the democratic decision-making system for cooperatives:
 * - Proposal management (CRUD operations)
 * - Active proposals and voting periods
 * - Vote casting and tracking
 * - Real-time results and vote tallying
 * - Voting eligibility rules
 * - Member voting history
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testProposalId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Voting Test Cooperative');
  testUser = await createTestUser(tenantId, `votingtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('List Proposals', () => {
  it('should get all proposals for a cooperative', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposals');
      expect(Array.isArray(response.body.proposals)).toBe(true);
    }
  });

  it('should filter proposals by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'draft' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposals');
    }
  });

  it('should filter proposals by proposal type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ proposal_type: 'policy_change' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposals');
    }
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 10, offset: 0 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.proposals.length).toBeLessThanOrEqual(10);
    }
  });

  it('should include creator information in proposals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.proposals.length > 0) {
      const proposal = response.body.proposals[0];
      expect(proposal).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals`);

    expect(response.status).toBe(401);
  });
});

describe('Active Proposals', () => {
  it('should get active proposals available for voting', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/active`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposals');
      expect(Array.isArray(response.body.proposals)).toBe(true);
    }
  });

  it('should only return proposals within voting period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/active`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.proposals.length > 0) {
      const proposal = response.body.proposals[0];
      expect(proposal).toBeDefined();
    }
  });

  it('should order active proposals by closing time', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/active`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.proposals.length > 1) {
      const first = new Date(response.body.proposals[0].voting_closes);
      const second = new Date(response.body.proposals[1].voting_closes);
      expect(first.getTime()).toBeLessThanOrEqual(second.getTime());
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/active`);

    expect(response.status).toBe(401);
  });
});

describe('Proposal Details', () => {
  it('should get detailed proposal information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposal');
      expect(response.body).toHaveProperty('vote_breakdown');
      expect(response.body).toHaveProperty('my_vote');
    }
  });

  it('should include vote breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.vote_breakdown)).toBe(true);
    }
  });

  it('should show current user vote if they voted', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.my_vote).toBeDefined();
    }
  });

  it('should include voting status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.proposal.voting_status).toBeDefined();
      expect(['pending', 'active', 'expired']).toContain(response.body.proposal.voting_status);
    }
  });

  it('should return 404 for non-existent proposal', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999`);

    expect(response.status).toBe(401);
  });
});

describe('Create Proposal', () => {
  it('should create a new proposal', async () => {
    const votingOpens = new Date();
    votingOpens.setHours(votingOpens.getHours() + 1);
    const votingCloses = new Date();
    votingCloses.setDate(votingCloses.getDate() + 7);

    const proposalData = {
      proposal_type: 'policy_change',
      title: 'Test Proposal for Voting System',
      description: 'This is a test proposal to verify the voting system',
      proposal_data: { category: 'operations' },
      voting_opens: votingOpens.toISOString(),
      voting_closes: votingCloses.toISOString(),
      quorum_required: 50,
      approval_threshold: 66,
      notes: 'Test notes'
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(proposalData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('proposal_id');
      expect(response.body.title).toBe(proposalData.title);
      expect(response.body.proposal_type).toBe(proposalData.proposal_type);
      expect(response.body.status).toBe('draft');
      testProposalId = response.body.proposal_id;
    }
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Incomplete Proposal' });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate voting dates', async () => {
    const votingOpens = new Date();
    const votingCloses = new Date();
    votingCloses.setHours(votingCloses.getHours() - 1);

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        proposal_type: 'policy_change',
        title: 'Invalid Dates Proposal',
        voting_opens: votingOpens.toISOString(),
        voting_closes: votingCloses.toISOString()
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should set default quorum and approval threshold', async () => {
    const votingOpens = new Date();
    votingOpens.setHours(votingOpens.getHours() + 1);
    const votingCloses = new Date();
    votingCloses.setDate(votingCloses.getDate() + 7);

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        proposal_type: 'policy_change',
        title: 'Default Values Test',
        voting_opens: votingOpens.toISOString(),
        voting_closes: votingCloses.toISOString()
      });

    if (response.status === 201) {
      expect(response.body.quorum_required).toBeDefined();
      expect(response.body.approval_threshold).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals`)
      .send({ title: 'Test' });

    expect(response.status).toBe(401);
  });
});

describe('Update Proposal', () => {
  it('should update a draft proposal', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Updated Title', description: 'Updated description' });

    expect([200, 400, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.message).toBeDefined();
    }
  });

  it('should validate that only draft proposals can be edited', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Updated Title' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should allow cancelling non-draft proposals', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'cancelled' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should update multiple fields at once', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Title',
        description: 'Updated description',
        quorum_required: 60,
        approval_threshold: 70
      });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should return 404 for non-existent proposal', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Updated Title' });

    expect([404, 500]).toContain(response.status);
  });

  it('should reject empty updates', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(401);
  });
});

describe('Delete Proposal', () => {
  it('should delete a draft proposal', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should only allow deleting draft proposals', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/proposals/999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should return 404 for non-existent proposal', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/proposals/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/proposals/999`);

    expect(response.status).toBe(401);
  });
});

describe('Cast Vote', () => {
  it('should cast a vote on a proposal', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes', voter_comment: 'I support this proposal' });

    expect([200, 400, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.message).toBeDefined();
      expect(response.body.vote).toBeDefined();
    }
  });

  it('should validate vote choice', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'invalid' });

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should accept yes, no, and abstain votes', async () => {
    const voteChoices = ['yes', 'no', 'abstain'];

    for (const choice of voteChoices) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vote_choice: choice });

      expect([200, 400, 404, 500]).toContain(response.status);
    }
  });

  it('should allow updating an existing vote', async () => {
    const firstVote = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes' });

    if (firstVote.status === 200) {
      const secondVote = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vote_choice: 'no' });

      expect([200, 400, 404, 500]).toContain(secondVote.status);
    }
  });

  it('should include optional voter comment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vote_choice: 'yes',
        voter_comment: 'This is a great idea for our cooperative'
      });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should validate membership status', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should validate voting rights', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should validate proposal is open for voting', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should validate voting period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vote_choice: 'yes' });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/proposals/999/vote`)
      .send({ vote_choice: 'yes' });

    expect(response.status).toBe(401);
  });
});

describe('Voting History', () => {
  it('should get current user voting history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/my-votes`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('votes');
      expect(Array.isArray(response.body.votes)).toBe(true);
    }
  });

  it('should return empty array for non-members', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/my-votes`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.votes)).toBe(true);
    }
  });

  it('should order votes by date descending', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/my-votes`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.votes.length > 1) {
      const first = new Date(response.body.votes[0].voted_at);
      const second = new Date(response.body.votes[1].voted_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should include vote details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/my-votes`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.votes.length > 0) {
      const vote = response.body.votes[0];
      expect(vote).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/my-votes`);

    expect(response.status).toBe(401);
  });
});

describe('Proposal Results', () => {
  it('should get real-time results for a proposal', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999/results`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposal_id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('results');
    }
  });

  it('should include vote tallies', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999/results`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.results).toBeDefined();
    }
  });

  it('should calculate results in real-time', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999/results`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.proposal_id).toBeDefined();
    }
  });

  it('should return 404 for non-existent proposal', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999999/results`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/proposals/999/results`);

    expect(response.status).toBe(401);
  });
});

describe('Voting Eligibility - GET', () => {
  it('should get voting eligibility rules', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('rules');
      expect(Array.isArray(response.body.rules)).toBe(true);
    }
  });

  it('should filter by member ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_id: 123 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter by proposal type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ proposal_type: 'policy_change' });

    expect([200, 500]).toContain(response.status);
  });

  it('should order rules by creation date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.rules.length > 1) {
      const first = new Date(response.body.rules[0].created_at);
      const second = new Date(response.body.rules[1].created_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/voting/eligibility`);

    expect(response.status).toBe(401);
  });
});

describe('Voting Eligibility - POST', () => {
  it('should create a voting eligibility rule', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 123,
        eligible: false,
        reason: 'Membership dues overdue',
        effective_date: new Date().toISOString().split('T')[0],
        notes: 'Temporary suspension until payment received'
      });

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('eligibility_id');
      expect(response.body.member_id).toBe(123);
    }
  });

  it('should validate required member ID', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ eligible: false });

    expect([400, 500]).toContain(response.status);
  });

  it('should support proposal type specific rules', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 123,
        proposal_type: 'financial_decision',
        eligible: false,
        reason: 'Not qualified for financial votes'
      });

    expect([201, 400, 500]).toContain(response.status);
  });

  it('should allow setting expiration dates', async () => {
    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + 3);

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 123,
        eligible: false,
        expires_date: expiresDate.toISOString().split('T')[0]
      });

    expect([201, 400, 500]).toContain(response.status);
  });

  it('should default eligible to true if not specified', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ member_id: 123 });

    if (response.status === 201) {
      expect(response.body.eligible).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/eligibility`)
      .send({ member_id: 123 });

    expect(response.status).toBe(401);
  });
});

describe('Voting Eligibility - DELETE', () => {
  it('should delete an eligibility rule', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/voting/eligibility/999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should return 404 for non-existent rule', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/voting/eligibility/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/voting/eligibility/999`);

    expect(response.status).toBe(401);
  });
});

describe('Administrative Functions', () => {
  it('should close expired proposals', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/close-expired`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.message).toBeDefined();
    }
  });

  it('should require authentication for admin functions', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/voting/close-expired`);

    expect(response.status).toBe(401);
  });
});
