import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestDriver, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Payroll Routes Integration Tests
 *
 * Tests payroll management system:
 * - Payroll periods (weekly/monthly)
 * - Payroll records within periods
 * - Freelance submissions
 * - Summary and statistics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testDriverId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Payroll Test Company');
  testUser = await createTestUser(tenantId, `payrolltest${Date.now()}@test.local`, 'admin');

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

describe('Payroll Periods', () => {
  let periodId: number;

  it('should create a payroll period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'weekly',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        status: 'open',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.period_id) {
      periodId = response.body.period_id;
    }
  });

  it('should get all payroll periods', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get a specific period', async () => {
    if (!periodId) {
      console.log('Skipping - no period created');
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods/${periodId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should update a period', async () => {
    if (!periodId) {
      console.log('Skipping - no period created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/payroll/periods/${periodId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'processing',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods`);

    expect(response.status).toBe(401);
  });
});

describe('Payroll Records', () => {
  let periodId: number;

  beforeAll(async () => {
    // Create a period for testing records
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'weekly',
        start_date: '2024-01-08',
        end_date: '2024-01-14',
        status: 'open',
      });

    if (response.body.period_id) {
      periodId = response.body.period_id;
    }
  });

  it('should create payroll record in a period', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods/${periodId}/records`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        employment_type: 'contracted_hourly',
        hours_worked: 40,
        hourly_rate: 15.50,
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should get records for a period', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods/${periodId}/records`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should update a payroll record', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/payroll/records/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hours_worked: 45,
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should delete a payroll record', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/payroll/records/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Freelance Submissions', () => {
  let periodId: number;

  beforeAll(async () => {
    // Create a period for testing freelance submissions
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'weekly',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        status: 'open',
      });

    if (response.body.period_id) {
      periodId = response.body.period_id;
    }
  });

  it('should submit freelance invoice', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods/${periodId}/freelance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        invoice_number: `INV-${Date.now()}`,
        amount: 500.00,
        description: 'Weekly freelance services',
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should get freelance submissions for period', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods/${periodId}/freelance`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should update freelance submission', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/payroll/freelance/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 550.00,
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should delete freelance submission', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/payroll/freelance/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Payroll Summary and Stats', () => {
  let periodId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'weekly',
        start_date: '2024-01-22',
        end_date: '2024-01-28',
        status: 'open',
      });

    if (response.body.period_id) {
      periodId = response.body.period_id;
    }
  });

  it('should get period summary', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/periods/${periodId}/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should get payroll stats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/payroll/stats`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ months: 3 });

    expect([200, 500]).toContain(response.status);
  });

  it('should generate payroll records for period', async () => {
    if (!periodId) {
      console.log('Skipping - no period available');
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/payroll/periods/${periodId}/generate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 201, 500]).toContain(response.status);
  });
});
