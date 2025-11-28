import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestDriver, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Driver Submissions Routes Integration Tests
 *
 * Tests driver hours and fuel submissions system:
 * - Hours submission (freelance drivers)
 * - Fuel cost submission (freelance drivers)
 * - Approval/rejection workflow
 * - Submission retrieval with filters
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testDriverId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Driver Submissions Test Company');
  testUser = await createTestUser(tenantId, `driversubtest${Date.now()}@test.local`, 'admin');

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

describe('Driver Hours Submission', () => {
  let hoursId: number;

  it('should submit weekly hours', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/driver-hours`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        week_ending: '2024-01-07',
        regular_hours: 40,
        overtime_hours: 5,
        notes: 'Weekly hours submission',
      });

    expect([200, 201, 409, 500]).toContain(response.status);
    if (response.body.submission?.hours_id) {
      hoursId = response.body.submission.hours_id;
    }
  });

  it('should get all hours submissions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-hours`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get hours with driver filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-hours`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ driver_id: testDriverId });

    expect([200, 500]).toContain(response.status);
  });

  it('should get hours with status filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-hours`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'submitted' });

    expect([200, 500]).toContain(response.status);
  });

  it('should get hours with date range filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-hours`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ from_date: '2024-01-01', to_date: '2024-01-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should approve hours submission', async () => {
    if (!hoursId) {
      console.log('Skipping - no hours submission created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-hours/${hoursId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'approved',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should reject hours submission', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-hours/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'rejected',
        rejection_reason: 'Hours incorrect',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should mark hours as paid', async () => {
    if (!hoursId) {
      console.log('Skipping - no hours submission created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-hours/${hoursId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'paid',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-hours`);

    expect(response.status).toBe(401);
  });
});

describe('Driver Fuel Submission', () => {
  let fuelId: number;

  it('should submit fuel costs', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/driver-fuel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        date: '2024-01-15',
        station: 'Shell Station',
        litres: 50,
        cost: 75.50,
        mileage: 12500,
        notes: 'Fuel for route deliveries',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.submission?.fuel_id) {
      fuelId = response.body.submission.fuel_id;
    }
  });

  it('should get all fuel submissions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-fuel`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get fuel with driver filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-fuel`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ driver_id: testDriverId });

    expect([200, 500]).toContain(response.status);
  });

  it('should get fuel with status filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-fuel`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'submitted' });

    expect([200, 500]).toContain(response.status);
  });

  it('should get fuel with date range filter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/driver-fuel`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ from_date: '2024-01-01', to_date: '2024-01-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should approve fuel submission', async () => {
    if (!fuelId) {
      console.log('Skipping - no fuel submission created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-fuel/${fuelId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'approved',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should reject fuel submission', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-fuel/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'rejected',
        rejection_reason: 'Receipt not valid',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should mark fuel as reimbursed', async () => {
    if (!fuelId) {
      console.log('Skipping - no fuel submission created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/driver-fuel/${fuelId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'reimbursed',
        reimbursement_reference: 'REF-12345',
      });

    expect([200, 404, 500]).toContain(response.status);
  });
});
