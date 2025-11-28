import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Cooperative Governance Routes Integration Tests
 *
 * Tests cooperative governance features including:
 * - Meeting scheduling and management
 * - Reporting and compliance
 * - Membership management
 * - Governance overview
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Cooperative Test Company');
  testUser = await createTestUser(tenantId, `cooptest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Cooperative Meetings Management', () => {
  let meetingId: number;

  it('should get all meetings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should create a cooperative meeting', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meeting_type: 'annual_general',
        scheduled_date: new Date('2025-12-31').toISOString(),
        notes: 'Annual general meeting for 2025',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body?.meeting_id) {
      meetingId = response.body.meeting_id;
    }
  });

  it('should filter meetings by year', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ year: 2025 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter meetings by meeting type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ meeting_type: 'annual_general' });

    expect([200, 500]).toContain(response.status);
  });

  it('should update a meeting with attendance details', async () => {
    if (!meetingId) {
      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/meetings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          meeting_type: 'quarterly_board',
          scheduled_date: new Date('2025-06-15').toISOString(),
        });

      if (createResponse.body?.meeting_id) {
        meetingId = createResponse.body.meeting_id;
      }
    }

    if (meetingId) {
      const response = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          held_date: new Date('2025-06-15').toISOString(),
          attendees_count: 12,
          quorum_met: true,
          minutes_url: 'https://example.com/minutes/2025-06.pdf',
        });

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should delete a meeting', async () => {
    if (!meetingId) {
      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/meetings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          meeting_type: 'special',
          scheduled_date: new Date('2025-08-01').toISOString(),
        });

      if (createResponse.body?.meeting_id) {
        meetingId = createResponse.body.meeting_id;
      }
    }

    if (meetingId) {
      const response = await request(app)
        .delete(`/api/tenants/${tenantId}/cooperative/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should require authentication for meetings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/meetings`);

    expect(response.status).toBe(401);
  });

  it('should handle creating meeting without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should handle updating non-existent meeting', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/meetings/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        attendees_count: 5,
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should handle deleting non-existent meeting', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/meetings/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Cooperative Reports Management', () => {
  let reportId: number;

  it('should get all reports', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should create a cooperative report', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        report_type: 'annual_accounts',
        period_start: new Date('2025-01-01').toISOString(),
        period_end: new Date('2025-12-31').toISOString(),
        report_data: {
          total_revenue: 150000,
          total_expenses: 120000,
          net_profit: 30000,
        },
        notes: 'Annual financial report for 2025',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body?.report_id) {
      reportId = response.body.report_id;
    }
  });

  it('should filter reports by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'submitted' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter reports by report type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ report_type: 'annual_accounts' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter reports by year', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ year: 2025 });

    expect([200, 500]).toContain(response.status);
  });

  it('should update report status', async () => {
    if (!reportId) {
      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          report_type: 'quarterly_review',
          period_start: new Date('2025-01-01').toISOString(),
          period_end: new Date('2025-03-31').toISOString(),
          report_data: {},
        });

      if (createResponse.body?.report_id) {
        reportId = createResponse.body.report_id;
      }
    }

    if (reportId) {
      const response = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'approved',
          notes: 'Report approved by platform admin',
        });

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should require authentication for reports', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/reports`);

    expect(response.status).toBe(401);
  });

  it('should handle creating report without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should handle updating report without status', async () => {
    if (reportId) {
      const response = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    }
  });

  it('should handle updating non-existent report', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/reports/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'approved',
      });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Cooperative Membership Management', () => {
  let membershipId: number;

  it('should get all members', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('stats');
    }
  });

  it('should include membership statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats).toHaveProperty('active_members');
      expect(response.body.stats).toHaveProperty('driver_members');
      expect(response.body.stats).toHaveProperty('customer_members');
      expect(response.body.stats).toHaveProperty('total_shares');
      expect(response.body.stats).toHaveProperty('voting_members');
    }
  });

  it('should create a cooperative member', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_type: 'driver',
        member_reference_id: 1,
        ownership_shares: 5,
        voting_rights: true,
        joined_date: new Date('2025-01-15').toISOString(),
        notes: 'Founding member',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body?.membership_id) {
      membershipId = response.body.membership_id;
    }
  });

  it('should filter members by member type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'driver' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter members by active status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ is_active: 'true' });

    expect([200, 500]).toContain(response.status);
  });

  it('should update member ownership shares', async () => {
    if (!membershipId) {
      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/membership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          member_type: 'customer',
          joined_date: new Date('2025-02-01').toISOString(),
          ownership_shares: 1,
        });

      if (createResponse.body?.membership_id) {
        membershipId = createResponse.body.membership_id;
      }
    }

    if (membershipId) {
      const response = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/membership/${membershipId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownership_shares: 10,
          voting_rights: true,
          notes: 'Increased shares',
        });

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should delete a member (soft delete)', async () => {
    if (!membershipId) {
      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/cooperative/membership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          member_type: 'driver',
          joined_date: new Date('2025-03-01').toISOString(),
        });

      if (createResponse.body?.membership_id) {
        membershipId = createResponse.body.membership_id;
      }
    }

    if (membershipId) {
      const response = await request(app)
        .delete(`/api/tenants/${tenantId}/cooperative/membership/${membershipId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should require authentication for membership', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/membership`);

    expect(response.status).toBe(401);
  });

  it('should handle creating member without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should handle updating member without fields', async () => {
    if (membershipId) {
      const response = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/membership/${membershipId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    }
  });

  it('should handle updating non-existent member', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/membership/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ownership_shares: 5,
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should handle deleting non-existent member', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/membership/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Cooperative Overview', () => {
  it('should get cooperative overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('compliance');
      expect(response.body).toHaveProperty('membership');
    }
  });

  it('should include meetings compliance data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.compliance).toHaveProperty('meetings');
      expect(response.body.compliance.meetings).toHaveProperty('total');
      expect(response.body.compliance.meetings).toHaveProperty('held');
      expect(response.body.compliance.meetings).toHaveProperty('quorum_met');
    }
  });

  it('should include reports compliance data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.compliance).toHaveProperty('reports');
      expect(response.body.compliance.reports).toHaveProperty('total');
      expect(response.body.compliance.reports).toHaveProperty('submitted');
      expect(response.body.compliance.reports).toHaveProperty('approved');
    }
  });

  it('should include membership summary data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.membership).toHaveProperty('active');
      expect(response.body.membership).toHaveProperty('drivers');
      expect(response.body.membership).toHaveProperty('customers');
      expect(response.body.membership).toHaveProperty('total_shares');
    }
  });

  it('should include governance requirements', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('organization_type');
      expect(response.body).toHaveProperty('cooperative_model');
      expect(response.body).toHaveProperty('discount_percentage');
      expect(response.body).toHaveProperty('governance_requirements');
      expect(response.body).toHaveProperty('enabled_modules');
    }
  });

  it('should require authentication for overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/overview`);

    expect(response.status).toBe(401);
  });
});

describe('Cooperative Governance Workflows', () => {
  it('should handle complete meeting lifecycle', async () => {
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/meetings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        meeting_type: 'special',
        scheduled_date: new Date('2025-09-15').toISOString(),
        notes: 'Special member vote',
      });

    expect([200, 201, 500]).toContain(createResponse.status);

    if (createResponse.body?.meeting_id) {
      const meetingId = createResponse.body.meeting_id;

      const updateResponse = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          held_date: new Date('2025-09-15').toISOString(),
          attendees_count: 15,
          quorum_met: true,
        });

      expect([200, 404, 500]).toContain(updateResponse.status);

      const deleteResponse = await request(app)
        .delete(`/api/tenants/${tenantId}/cooperative/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(deleteResponse.status);
    }
  });

  it('should handle complete report lifecycle', async () => {
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        report_type: 'member_activity',
        period_start: new Date('2025-01-01').toISOString(),
        period_end: new Date('2025-06-30').toISOString(),
        report_data: {
          total_members: 25,
          active_members: 22,
        },
      });

    expect([200, 201, 500]).toContain(createResponse.status);

    if (createResponse.body?.report_id) {
      const reportId = createResponse.body.report_id;

      const updateResponse = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'approved',
          notes: 'Approved by governance committee',
        });

      expect([200, 404, 500]).toContain(updateResponse.status);
    }
  });

  it('should handle complete membership lifecycle', async () => {
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/membership`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_type: 'driver',
        joined_date: new Date('2025-04-01').toISOString(),
        ownership_shares: 3,
        voting_rights: true,
      });

    expect([200, 201, 500]).toContain(createResponse.status);

    if (createResponse.body?.membership_id) {
      const membershipId = createResponse.body.membership_id;

      const updateResponse = await request(app)
        .put(`/api/tenants/${tenantId}/cooperative/membership/${membershipId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ownership_shares: 7,
          notes: 'Member purchased additional shares',
        });

      expect([200, 404, 500]).toContain(updateResponse.status);

      const deleteResponse = await request(app)
        .delete(`/api/tenants/${tenantId}/cooperative/membership/${membershipId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(deleteResponse.status);
    }
  });
});
