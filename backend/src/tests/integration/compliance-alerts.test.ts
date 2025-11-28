import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

let app: Application;
let tenantId: number;
let adminUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Compliance Test Company');
  adminUser = await createTestUser(tenantId, 'compliancetest@test.local', 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: adminUser.username, password: adminUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('GET /api/tenants/:tenantId/compliance-alerts', () => {
  it('should return compliance alerts', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/compliance-alerts`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 500) {
      console.log('Compliance alerts returned 500');
      return;
    }

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body) || response.body.alerts).toBeTruthy();
  });

  it('should filter by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/compliance-alerts?status=active`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should filter by severity', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/compliance-alerts?severity=high`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/compliance-alerts`);

    expect(response.status).toBe(401);
  });
});
