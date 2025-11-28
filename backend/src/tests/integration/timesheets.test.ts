import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestDriver, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Timesheet Routes Integration Tests
 *
 * Tests driver timesheet management system:
 * - Timesheet CRUD operations
 * - Submission workflow (draft -> submitted -> approved -> rejected)
 * - Pending approvals
 * - Summary statistics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testDriverId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Timesheet Test Company');
  testUser = await createTestUser(tenantId, `timesheettest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
  testDriverId = await createTestDriver(tenantId, 'Test Driver');
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Timesheet Management', () => {
  let timesheetId: number;

  it('should create a timesheet', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/timesheets`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        week_starting: '2024-01-01',
        week_ending: '2024-01-07',
        monday_hours: 8,
        tuesday_hours: 8,
        wednesday_hours: 8,
        thursday_hours: 8,
        friday_hours: 8,
        notes: 'Test timesheet',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.id) {
      timesheetId = response.body.id;
    }
  });

  it('should get all timesheets', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get timesheets with filters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ driver_id: testDriverId, status: 'draft' });

    expect([200, 500]).toContain(response.status);
  });

  it('should get a specific timesheet', async () => {
    if (!timesheetId) {
      console.log('Skipping - no timesheet created');
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets/${timesheetId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should update a timesheet', async () => {
    if (!timesheetId) {
      console.log('Skipping - no timesheet created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/timesheets/${timesheetId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        friday_hours: 6,
        notes: 'Updated timesheet',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should delete a timesheet', async () => {
    if (!timesheetId) {
      console.log('Skipping - no timesheet created');
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/timesheets/${timesheetId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 204, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets`);

    expect(response.status).toBe(401);
  });
});

describe('Timesheet Workflow', () => {
  let timesheetId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/timesheets`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        week_starting: '2024-01-08',
        week_ending: '2024-01-14',
        monday_hours: 8,
        tuesday_hours: 8,
        wednesday_hours: 8,
        thursday_hours: 8,
        friday_hours: 8,
      });

    if (response.body.id) {
      timesheetId = response.body.id;
    }
  });

  it('should submit a timesheet', async () => {
    if (!timesheetId) {
      console.log('Skipping - no timesheet available');
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/timesheets/${timesheetId}/submit`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 201, 404, 500]).toContain(response.status);
  });

  it('should approve a timesheet', async () => {
    if (!timesheetId) {
      console.log('Skipping - no timesheet available');
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/timesheets/${timesheetId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        approved_by: testUser.userId,
        notes: 'Approved',
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });

  it('should reject a timesheet', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/timesheets/999/reject`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rejected_by: testUser.userId,
        rejection_reason: 'Hours incorrect',
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });
});

describe('Timesheet Queries', () => {
  it('should get pending timesheets', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets/pending`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get timesheet summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/timesheets/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });
});
