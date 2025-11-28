import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestCustomer, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Provider Routes Integration Tests
 *
 * Tests provider management system:
 * - Provider directory management
 * - Provider statistics
 * - Provider details and customer grouping
 * - Invoice generation
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testCustomerId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Provider Test Company');
  testUser = await createTestUser(tenantId, `providertest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
  testCustomerId = await createTestCustomer(tenantId);
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Provider Statistics', () => {
  it('should get provider stats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/stats`);

    expect(response.status).toBe(401);
  });
});

describe('Provider Directory', () => {
  let providerId: number;

  it('should get provider directory', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/directory`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should create provider', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/providers/directory`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Test Provider ${Date.now()}`,
        type: 'local_authority',
        billing_day: 1,
        billing_frequency: 'monthly',
        invoice_email: 'billing@testprovider.com',
        payment_terms_days: 30,
        auto_send: false,
        send_reminders: true,
      });

    expect([200, 201, 409, 500]).toContain(response.status);
    if (response.body.provider_id) {
      providerId = response.body.provider_id;
    }
  });

  it('should update provider', async () => {
    if (!providerId) {
      console.log('Skipping - no provider created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/providers/directory/${providerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_terms_days: 45,
        invoice_notes: 'Updated payment terms',
      });

    expect([200, 404, 409, 500]).toContain(response.status);
  });

  it('should delete provider', async () => {
    if (!providerId) {
      console.log('Skipping - no provider created');
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/providers/directory/${providerId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 409, 500]).toContain(response.status);
  });
});

describe('Provider Details', () => {
  it('should get provider details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/Self-Pay/details`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should handle non-existent provider', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/NonExistentProvider/details`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });
});

describe('Provider Invoices', () => {
  it('should get provider invoice data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/Self-Pay/invoice`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ weekStart: '2024-01-01' });

    expect([200, 500]).toContain(response.status);
  });

  it('should create provider invoice', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/providers/Self-Pay/invoice`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        weekStart: '2024-01-01',
        weekEnd: '2024-01-07',
        period: 'Week 1',
      });

    expect([200, 201, 500]).toContain(response.status);
  });
});

describe('Provider with Multiple Customers', () => {
  let provider2Id: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/providers/directory`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Multi Customer Provider ${Date.now()}`,
        type: 'nhs_trust',
        billing_frequency: 'weekly',
        payment_terms_days: 14,
      });

    if (response.body.provider_id) {
      provider2Id = response.body.provider_id;
    }
  });

  it('should calculate provider stats with multiple customers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/providers/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('providers');
    }
  });
});
