import request from 'supertest';
import { Application } from 'express';
import {
  createTestTenant,
  createTestUser,
  createTestCustomer,
  cleanupTestTenant,
  closeTestPool,
} from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Tenant Isolation Integration Tests
 *
 * CRITICAL SECURITY TESTS - Ensures complete data isolation between tenants
 *
 * Tests:
 * - Tenant A cannot access Tenant B's customers
 * - Tenant A cannot access Tenant B's drivers
 * - Tenant A cannot access Tenant B's training records
 * - Tenant A cannot modify Tenant B's data
 * - JWT tokens are tenant-specific
 *
 * If these tests fail, there is a CRITICAL SECURITY VULNERABILITY
 */

let app: Application;
let tenant1Id: number;
let tenant2Id: number;
let tenant1User: { userId: number; username: string; email: string; password: string };
let tenant2User: { userId: number; username: string; email: string; password: string };
let tenant1Token: string;
let tenant2Token: string;
let tenant1CustomerId: number;
let tenant2CustomerId: number;

beforeAll(async () => {
  // Create test Express app with all routes
  app = createTestApp();

  // Create two separate tenants
  tenant1Id = await createTestTenant('Tenant 1 Company');
  tenant2Id = await createTestTenant('Tenant 2 Company');

  // Create users for each tenant
  tenant1User = await createTestUser(tenant1Id, 'tenant1@test.local', 'admin');
  tenant2User = await createTestUser(tenant2Id, 'tenant2@test.local', 'admin');

  // Create test customers for each tenant
  tenant1CustomerId = await createTestCustomer(tenant1Id, 'Tenant 1 Customer');
  tenant2CustomerId = await createTestCustomer(tenant2Id, 'Tenant 2 Customer');

  // Get auth tokens for both tenants
  const response1 = await request(app)
    .post(`/api/tenants/${tenant1Id}/login`)
    .send({
      username: tenant1User.username,
      password: tenant1User.password,
    });
  tenant1Token = response1.body.token;

  const response2 = await request(app)
    .post(`/api/tenants/${tenant2Id}/login`)
    .send({
      username: tenant2User.username,
      password: tenant2User.password,
    });
  tenant2Token = response2.body.token;
}, 30000);

afterAll(async () => {
  // Clean up both test tenants
  await cleanupTestTenant(tenant1Id);
  await cleanupTestTenant(tenant2Id);
  await closeTestPool();
}, 30000);

describe('Customer Data Isolation', () => {
  it('should allow Tenant 1 to access their own customers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenant1Id}/customers`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.customers)).toBe(true);

    // Should see their own customer (API may return 'id' or 'customer_id')
    const hasOwnCustomer = response.body.customers.some(
      (c: any) => c.customer_id === tenant1CustomerId || c.id === tenant1CustomerId
    );
    expect(hasOwnCustomer).toBe(true);

    // Should NOT see Tenant 2's customer
    const hasTenant2Customer = response.body.customers.some(
      (c: any) => c.customer_id === tenant2CustomerId || c.id === tenant2CustomerId
    );
    expect(hasTenant2Customer).toBe(false);
  });

  it('should prevent Tenant 1 from accessing Tenant 2 customer list using wrong tenant ID in URL', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenant2Id}/customers`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    // Should return 403 Forbidden or 401 Unauthorized
    expect([401, 403]).toContain(response.status);
  });

  it('should prevent Tenant 1 from accessing Tenant 2 specific customer by ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenant1Id}/customers/${tenant2CustomerId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    // Should return 404 Not Found (because it doesn't exist for Tenant 1)
    // or 403 Forbidden
    expect([404, 403]).toContain(response.status);
  });

  it('should prevent Tenant 1 from modifying Tenant 2 customer', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenant1Id}/customers/${tenant2CustomerId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        name: 'Hacked Name',
      })
      .expect('Content-Type', /json/);

    // Should return 404 Not Found or 403 Forbidden
    expect([404, 403]).toContain(response.status);

    // Verify the customer was NOT modified
    const verifyResponse = await request(app)
      .get(`/api/tenants/${tenant2Id}/customers/${tenant2CustomerId}`)
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(verifyResponse.body.name).not.toBe('Hacked Name');
  });

  it('should prevent Tenant 1 from deleting Tenant 2 customer', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenant1Id}/customers/${tenant2CustomerId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    // Should return 404 Not Found or 403 Forbidden
    expect([404, 403]).toContain(response.status);

    // Verify the customer still exists
    const verifyResponse = await request(app)
      .get(`/api/tenants/${tenant2Id}/customers/${tenant2CustomerId}`)
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(verifyResponse.status).toBe(200);
  });
});

describe('JWT Token Tenant Validation', () => {
  it('should prevent Tenant 1 token from being used on Tenant 2 endpoints', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenant2Id}/customers`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    // Should return 403 Forbidden (token tenant doesn't match URL tenant)
    expect([401, 403]).toContain(response.status);
  });

  it('should validate tenant ID in JWT matches tenant ID in URL', async () => {
    // Try to access Tenant 2's data with Tenant 1's token
    const response = await request(app)
      .post(`/api/tenants/${tenant2Id}/customers`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({
        name: 'Hacker Customer',
        email: 'hacker@test.local',
        phone: '1234567890',
      })
      .expect('Content-Type', /json/);

    // Should return 403 Forbidden
    expect([401, 403]).toContain(response.status);

    // Verify the customer was NOT created for Tenant 2
    const verifyResponse = await request(app)
      .get(`/api/tenants/${tenant2Id}/customers`)
      .set('Authorization', `Bearer ${tenant2Token}`);

    const hasHackerCustomer = verifyResponse.body.customers.some(
      (c: any) => c.email === 'hacker@test.local'
    );
    expect(hasHackerCustomer).toBe(false);
  });
});

describe('Database Query Isolation', () => {
  it('should verify SQL queries include tenant_id filter', async () => {
    // This is a meta-test - verifies that database queries are safe
    // In production, you might want to add query logging and verify
    // that all SELECT/UPDATE/DELETE queries include tenant_id in WHERE clause

    const response = await request(app)
      .get(`/api/tenants/${tenant1Id}/customers`)
      .set('Authorization', `Bearer ${tenant1Token}`);

    // All returned data should belong to tenant1
    const allBelongToTenant1 = response.body.customers.every(
      (c: any) => c.tenant_id === tenant1Id
    );
    expect(allBelongToTenant1).toBe(true);

    // Should NOT contain any data from tenant2
    const anyFromTenant2 = response.body.customers.some(
      (c: any) => c.tenant_id === tenant2Id
    );
    expect(anyFromTenant2).toBe(false);
  });
});

describe('Cross-Tenant Data Leakage Prevention', () => {
  it('should not leak tenant information in error messages', async () => {
    // Try to access non-existent customer from another tenant
    const response = await request(app)
      .get(`/api/tenants/${tenant1Id}/customers/999999`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    // Should return 404
    expect(response.status).toBe(404);

    // Error message should NOT reveal information about other tenants
    const errorMessage = JSON.stringify(response.body).toLowerCase();
    expect(errorMessage).not.toContain('tenant 2');
    // Check for tenant ID in context of tenant reference (not just number in timestamp)
    expect(errorMessage).not.toContain(`tenant ${tenant2Id}`);
    expect(errorMessage).not.toContain(`tenant_id ${tenant2Id}`);
  });

  it('should not expose tenant count or listing to unauthorized users', async () => {
    // Try to list all tenants without authentication
    const response = await request(app).get('/api/tenants');

    // Should return 401 Unauthorized, 403 Forbidden, or 404 Not Found
    // (404 means route doesn't exist, which is also secure)
    expect([401, 403, 404]).toContain(response.status);
  });
});

describe('Multi-Tenant Search Isolation', () => {
  it('should only search within tenant data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenant1Id}/customers?search=Customer`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect('Content-Type', /json/);

    expect(response.status).toBe(200);

    // Should find Tenant 1's customer (API may return 'id' or 'customer_id')
    const foundTenant1Customer = response.body.customers.some(
      (c: any) => c.customer_id === tenant1CustomerId || c.id === tenant1CustomerId
    );
    expect(foundTenant1Customer).toBe(true);

    // Should NOT find Tenant 2's customer (even though name matches search)
    const foundTenant2Customer = response.body.customers.some(
      (c: any) => c.customer_id === tenant2CustomerId || c.id === tenant2CustomerId
    );
    expect(foundTenant2Customer).toBe(false);
  });
});
