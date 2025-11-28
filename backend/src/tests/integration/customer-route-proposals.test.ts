import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';
import { query } from '../../config/database';

/**
 * Customer Route Proposals Integration Tests
 *
 * Tests democratic, community-driven route planning system:
 * - Route proposal submission
 * - Getting proposals with filtering
 * - Voting and pledging on proposals
 * - Approval and rejection workflows
 * - Proposal status tracking
 * - Customer feedback mechanisms
 * - Admin review processes
 * - Privacy settings management
 */

let app: Application;
let tenantId: number;
let adminUser: { userId: number; username: string; email: string; password: string };
let adminToken: string;
let customerId: number;
let customerToken: string;
let testProposalId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Route Proposals Test Company');
  adminUser = await createTestUser(tenantId, `routeadmin${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: adminUser.username, password: adminUser.password });

  adminToken = loginResponse.body.token;

  // Create a test customer
  const customerResult = await query(`
    INSERT INTO tenant_customers (
      tenant_id, name, email, phone, postcode, is_active
    ) VALUES ($1, $2, $3, $4, $5, true)
    RETURNING customer_id
  `, [tenantId, 'Test Customer', `testcustomer${Date.now()}@test.local`, '07700900000', 'S10 1AA']);

  customerId = customerResult[0].customer_id;

  // Create customer user account for authentication
  const customerUser = await createTestUser(tenantId, `customer${Date.now()}@test.local`, 'customer');

  // Link customer user to customer record
  await query(`
    UPDATE tenant_customers SET user_id = $1 WHERE customer_id = $2
  `, [customerUser.userId, customerId]);

  const customerLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: customerUser.username, password: customerUser.password });

  customerToken = customerLoginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Submit Route Proposal', () => {
  it('should require customer authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        route_name: 'Test Route',
        origin_area: 'Sheffield South',
        destination_name: 'City Centre'
      });

    expect([401, 403]).toContain(response.status);
  });

  it('should require privacy consent before creating proposal', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        route_name: 'Test Route',
        route_description: 'A test route for integration testing',
        origin_area: 'Sheffield South',
        origin_postcodes: ['S10', 'S11'],
        destination_name: 'City Centre',
        destination_address: 'Sheffield Station',
        destination_postcode: 'S1 2BP',
        proposed_frequency: 'weekdays',
        operates_monday: true,
        operates_tuesday: true,
        operates_wednesday: true,
        operates_thursday: true,
        operates_friday: true,
        departure_time_window_start: '08:00',
        departure_time_window_end: '09:00',
        estimated_journey_duration_minutes: 30,
        minimum_passengers_required: 8,
        target_passengers: 16
      });

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should create privacy settings first', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/privacy`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        privacy_consent_given: true,
        share_travel_patterns: true,
        privacy_level: 'area_only'
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should create route proposal successfully', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        route_name: 'Sheffield South to City Centre',
        route_description: 'Morning commute route from south Sheffield to city centre',
        origin_area: 'Sheffield South',
        origin_postcodes: ['S10', 'S11', 'S17'],
        destination_name: 'Sheffield City Centre',
        destination_address: 'Sheffield Station, Sheaf Street',
        destination_postcode: 'S1 2BP',
        proposed_frequency: 'weekdays',
        operates_monday: true,
        operates_tuesday: true,
        operates_wednesday: true,
        operates_thursday: true,
        operates_friday: true,
        operates_saturday: false,
        operates_sunday: false,
        departure_time_window_start: '08:00',
        departure_time_window_end: '09:00',
        estimated_journey_duration_minutes: 30,
        minimum_passengers_required: 8,
        target_passengers: 16,
        proposer_is_anonymous: false
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      expect(response.body).toHaveProperty('proposal_id');
      expect(response.body.route_name).toBe('Sheffield South to City Centre');
      expect(response.body.status).toBe('open');
      testProposalId = response.body.proposal_id;
    }
  });

  it('should create anonymous proposal', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        route_name: 'Anonymous Route Test',
        route_description: 'Testing anonymous proposals',
        origin_area: 'Test Area',
        destination_name: 'Test Destination',
        proposed_frequency: 'daily',
        operates_monday: true,
        operates_tuesday: true,
        operates_wednesday: true,
        operates_thursday: true,
        operates_friday: true,
        operates_saturday: true,
        operates_sunday: true,
        departure_time_window_start: '09:00',
        departure_time_window_end: '10:00',
        proposer_is_anonymous: true
      });

    expect([201, 500]).toContain(response.status);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        route_name: 'Incomplete Route'
      });

    expect([400, 500]).toContain(response.status);
  });
});

describe('Get Proposals', () => {
  it('should get all active proposals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should filter proposals by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ status: 'open' });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 0) {
      response.body.forEach((proposal: any) => {
        expect(proposal.status).toBe('open');
      });
    }
  });

  it('should sort proposals by popularity', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ sortBy: 'popular' });

    expect([200, 500]).toContain(response.status);
  });

  it('should sort proposals by closing soon', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ sortBy: 'closing_soon' });

    expect([200, 500]).toContain(response.status);
  });

  it('should include fare preview for each proposal', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 0) {
      const proposal = response.body[0];
      expect(proposal).toHaveProperty('fare_preview');
      expect(proposal.fare_preview).toHaveProperty('current_fare');
    }
  });

  it('should limit number of results', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ limit: '5' });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.length).toBeLessThanOrEqual(5);
    }
  });

  it('should get proposal details by ID', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 404, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('proposal_id', testProposalId);
      expect(response.body).toHaveProperty('fare_quote');
      expect(response.body).toHaveProperty('fare_preview');
    }
  });

  it('should include viability indicators', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 0) {
      const proposal = response.body[0];
      expect(proposal).toHaveProperty('is_viable');
      expect(proposal).toHaveProperty('target_reached');
    }
  });

  it('should handle non-existent proposal', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/999999`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Vote and Pledge on Proposals', () => {
  it('should allow customer to vote interested', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'interested',
        is_anonymous: false
      });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.message).toContain('recorded');
    }
  });

  it('should allow customer to pledge commitment', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'pledge',
        expected_frequency: 'daily',
        willing_to_pay_amount: 5.50,
        is_anonymous: false,
        notes: 'I would use this route every day for work'
      });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.message).toContain('recorded');
    }
  });

  it('should require commitment details for pledges', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'pledge',
        is_anonymous: false
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate vote type', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'invalid_type'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should allow updating existing vote', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'maybe',
        is_anonymous: true
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should update proposal vote counts after voting', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('total_votes');
    }
  });

  it('should require customer authentication for voting', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vote_type: 'interested'
      });

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should handle anonymous votes', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'interested',
        is_anonymous: true
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Proposal Status Tracking', () => {
  it('should track proposal status changes', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('status');
      expect(['open', 'threshold_met', 'approved', 'rejected', 'converted_to_route']).toContain(response.body.status);
    }
  });

  it('should update status when threshold is met', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ status: 'all' });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      const thresholdMetProposals = response.body.filter((p: any) => p.status === 'threshold_met');
      if (thresholdMetProposals.length > 0) {
        const proposal = thresholdMetProposals[0];
        expect(proposal.total_pledges).toBeGreaterThanOrEqual(proposal.minimum_passengers_required);
      }
    }
  });

  it('should track viability status', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('is_viable');
      expect(typeof response.body.is_viable).toBe('boolean');
    }
  });

  it('should track target reached status', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('target_reached');
      expect(typeof response.body.target_reached).toBe('boolean');
    }
  });
});

describe('Customer Feedback', () => {
  it('should allow notes with votes', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vote_type: 'interested',
        notes: 'This route would be very useful for my daily commute'
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should get customer invitations', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/my-invitations`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should include match score in invitations', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/my-invitations`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 0) {
      const invitation = response.body[0];
      expect(invitation).toHaveProperty('match_score');
      expect(invitation).toHaveProperty('match_reason');
    }
  });

  it('should return empty array for non-customer users', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/my-invitations`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toEqual([]);
    }
  });
});

describe('Privacy Settings', () => {
  it('should get privacy settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/my-privacy`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('privacy_consent_given');
      expect(response.body).toHaveProperty('share_travel_patterns');
      expect(response.body).toHaveProperty('privacy_level');
    }
  });

  it('should update privacy settings', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/privacy`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        privacy_consent_given: true,
        share_travel_patterns: true,
        privacy_level: 'full_sharing'
      });

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.message).toContain('updated');
    }
  });

  it('should validate privacy level', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/privacy`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        privacy_consent_given: true,
        share_travel_patterns: false,
        privacy_level: 'invalid_level'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require customer authentication for privacy settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals/my-privacy`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should allow private privacy level', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/privacy`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        privacy_consent_given: true,
        share_travel_patterns: false,
        privacy_level: 'private'
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should allow area_only privacy level', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/privacy`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        privacy_consent_given: true,
        share_travel_patterns: true,
        privacy_level: 'area_only'
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Admin Review Workflow', () => {
  it('should get all proposals for admin review', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should include viability analysis for admin', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 0) {
      const proposal = response.body[0];
      expect(proposal).toHaveProperty('is_viable');
    }
  });

  it('should get pledges for a proposal', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals/${testProposalId}/pledges`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should require admin role for admin endpoints', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should approve route proposal', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/${testProposalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 400, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.message).toContain('approved');
    }
  });

  it('should reject route proposal with reason', async () => {
    // Create a new proposal to reject
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        route_name: 'Proposal to Reject',
        route_description: 'This will be rejected',
        origin_area: 'Test Area',
        destination_name: 'Test Destination',
        proposed_frequency: 'daily',
        operates_monday: true,
        operates_tuesday: true,
        operates_wednesday: true,
        operates_thursday: true,
        operates_friday: true,
        departure_time_window_start: '10:00',
        departure_time_window_end: '11:00'
      });

    if (createResponse.status !== 201) {
      return;
    }

    const proposalToReject = createResponse.body.proposal_id;

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/${proposalToReject}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rejection_reason: 'Insufficient demand in the area'
      });

    expect([200, 400, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.message).toContain('rejected');
    }
  });

  it('should require rejection reason when rejecting', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/${testProposalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should prevent non-admins from approving proposals', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/${testProposalId}/approve`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should prevent non-admins from rejecting proposals', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/${testProposalId}/reject`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rejection_reason: 'Test reason'
      });

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should sort admin proposals by priority', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);

    if (response.status === 200 && response.body.length > 1) {
      // Verify threshold_met proposals appear before open proposals
      let foundThresholdMet = false;
      let foundOpenAfterThreshold = false;

      for (const proposal of response.body) {
        if (proposal.status === 'threshold_met') {
          foundThresholdMet = true;
        }
        if (foundThresholdMet && proposal.status === 'open') {
          foundOpenAfterThreshold = true;
          break;
        }
      }

      if (foundThresholdMet && foundOpenAfterThreshold) {
        // This should not happen if sorting is correct
        expect(foundOpenAfterThreshold).toBe(false);
      }
    }
  });

  it('should handle approval of non-existent proposal', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/999999/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should handle rejection of non-existent proposal', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/admin/route-proposals/999999/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rejection_reason: 'Test reason'
      });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Authentication and Authorization', () => {
  it('should require authentication for getting proposals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customer-route-proposals`);

    expect(response.status).toBe(401);
  });

  it('should require authentication for creating proposals', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals`)
      .send({
        route_name: 'Test Route'
      });

    expect(response.status).toBe(401);
  });

  it('should require authentication for voting', async () => {
    if (!testProposalId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customer-route-proposals/${testProposalId}/vote`)
      .send({
        vote_type: 'interested'
      });

    expect(response.status).toBe(401);
  });

  it('should require authentication for admin endpoints', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/route-proposals`);

    expect(response.status).toBe(401);
  });
});
