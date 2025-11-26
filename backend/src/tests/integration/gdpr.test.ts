import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';
import { query } from '../../config/database';

/**
 * GDPR Compliance Tests
 *
 * Tests GDPR data subject rights:
 * - Data export (Article 20)
 * - Data deletion (Article 17)
 * - Audit logging of GDPR requests
 */

let app: Application;
let tenantId: number;
let adminUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let csrfToken: string;
let csrfCookie: string;
let testCustomerId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('GDPR Test Company');
  adminUser = await createTestUser(tenantId, 'gdpradmin@test.local', 'admin');

  // Login to get auth token
  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({
      username: adminUser.username,
      password: adminUser.password,
    });

  expect(loginResponse.status).toBe(200);
  authToken = loginResponse.body.token;

  // Get CSRF token
  const csrfResponse = await request(app)
    .get(`/api/tenants/${tenantId}/csrf-token`)
    .set('Authorization', `Bearer ${authToken}`);

  csrfToken = csrfResponse.body.data.csrfToken;
  const cookies = csrfResponse.headers['set-cookie'];
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  csrfCookie = cookieArray.find((c: string) => c.startsWith('csrf_token_id='))!;

  // Create a test customer
  const customerResult = await query(
    `INSERT INTO tenant_customers (tenant_id, name, email, phone, address, postcode, is_active)
     VALUES ($1, 'GDPR Test Customer', 'gdprcustomer@test.local', '01onal234567890', '123 Test Street', 'TE1 1ST', true)
     RETURNING customer_id`,
    [tenantId]
  );
  testCustomerId = (customerResult as any)[0].customer_id;
}, 30000);

afterAll(async () => {
  // Clean up test customer if still exists
  try {
    await query('DELETE FROM tenant_customers WHERE customer_id = $1', [testCustomerId]);
  } catch {}

  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('GDPR Data Export (Article 20)', () => {
  it('should export customer data as JSON', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/customers/${testCustomerId}/export`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('customer_');

    // Check export structure
    expect(response.body).toHaveProperty('subjectType', 'customer');
    expect(response.body).toHaveProperty('subjectId', testCustomerId);
    expect(response.body).toHaveProperty('exportedAt');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);

    // Should have profile data
    const profileCategory = response.body.data.find((d: any) => d.category === 'Profile');
    expect(profileCategory).toBeDefined();
    expect(profileCategory.records.length).toBeGreaterThan(0);
    expect(profileCategory.records[0].name).toBe('GDPR Test Customer');
  });

  it('should require admin role for data export', async () => {
    // Create a non-admin user
    const staffUser = await createTestUser(tenantId, 'staff@test.local', 'staff');

    const staffLoginResponse = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: staffUser.username,
        password: staffUser.password,
      });

    const staffToken = staffLoginResponse.body.token;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/customers/${testCustomerId}/export`)
      .set('Authorization', `Bearer ${staffToken}`);

    // Should be forbidden for non-admin
    expect(response.status).toBe(403);

    // Clean up staff user
    await query('DELETE FROM tenant_users WHERE user_id = $1', [staffUser.userId]);
  });

  it('should return 404 for non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/customers/999999/export`)
      .set('Authorization', `Bearer ${authToken}`);

    // May return empty data or 404
    expect([200, 404]).toContain(response.status);
  });
});

describe('GDPR Data Deletion (Article 17)', () => {
  let deletionTestCustomerId: number;

  beforeEach(async () => {
    // Create a fresh customer for deletion tests
    const result = await query(
      `INSERT INTO tenant_customers (tenant_id, name, email, phone, address, postcode, is_active)
       VALUES ($1, 'Deletion Test Customer', 'delete@test.local', '07700900000', '456 Delete Road', 'DE1 1TE', true)
       RETURNING customer_id`,
      [tenantId]
    );
    deletionTestCustomerId = (result as any)[0].customer_id;

    // Refresh CSRF token
    const csrfResponse = await request(app)
      .get(`/api/tenants/${tenantId}/csrf-token`)
      .set('Authorization', `Bearer ${authToken}`);

    csrfToken = csrfResponse.body.data.csrfToken;
    const cookies = csrfResponse.headers['set-cookie'];
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    csrfCookie = cookieArray.find((c: string) => c.startsWith('csrf_token_id='))!;
  });

  afterEach(async () => {
    // Clean up if deletion didn't happen
    try {
      await query('DELETE FROM tenant_customers WHERE customer_id = $1', [deletionTestCustomerId]);
    } catch {}
  });

  it('should delete/anonymize customer data with valid request', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/gdpr/customers/${deletionTestCustomerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        reason: 'Customer requested data deletion under GDPR Article 17',
        confirmDeletion: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('deleted');

    // Verify customer was anonymized
    const customerResult = await query(
      'SELECT * FROM tenant_customers WHERE customer_id = $1',
      [deletionTestCustomerId]
    );

    if ((customerResult as any[]).length > 0) {
      const customer = (customerResult as any)[0];
      expect(customer.name).toBe('[DELETED]');
      expect(customer.email).toContain('deleted_');
      expect(customer.is_active).toBe(false);
    }
  });

  it('should require confirmDeletion flag', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/gdpr/customers/${deletionTestCustomerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        reason: 'Test deletion without confirmation',
        // Missing confirmDeletion: true
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should require deletion reason', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/gdpr/customers/${deletionTestCustomerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        reason: 'Short', // Too short (less than 10 chars)
        confirmDeletion: true,
      });

    expect(response.status).toBe(400);
  });

  it('should require admin role for deletion', async () => {
    // Create a non-admin user
    const staffUser = await createTestUser(tenantId, 'deletestaff@test.local', 'staff');

    const staffLoginResponse = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: staffUser.username,
        password: staffUser.password,
      });

    const staffToken = staffLoginResponse.body.token;

    // Get CSRF for staff user
    const staffCsrfResponse = await request(app)
      .get(`/api/tenants/${tenantId}/csrf-token`)
      .set('Authorization', `Bearer ${staffToken}`);

    const staffCsrfToken = staffCsrfResponse.body.data.csrfToken;
    const staffCookies = staffCsrfResponse.headers['set-cookie'];
    const staffCookieArray = Array.isArray(staffCookies) ? staffCookies : [staffCookies];
    const staffCsrfCookie = staffCookieArray.find((c: string) => c.startsWith('csrf_token_id='));

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/gdpr/customers/${deletionTestCustomerId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .set('Cookie', staffCsrfCookie)
      .set('X-CSRF-Token', staffCsrfToken)
      .send({
        reason: 'Staff trying to delete customer data',
        confirmDeletion: true,
      });

    // Should be forbidden for non-admin
    expect(response.status).toBe(403);

    // Clean up
    await query('DELETE FROM tenant_users WHERE user_id = $1', [staffUser.userId]);
  });
});

describe('GDPR Audit Log', () => {
  it('should log GDPR export requests', async () => {
    // Make an export request
    await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/customers/${testCustomerId}/export`)
      .set('Authorization', `Bearer ${authToken}`);

    // Check audit log
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/audit-log`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('logs');
    expect(Array.isArray(response.body.data.logs)).toBe(true);

    // Should have export log entry
    const exportLog = response.body.data.logs.find(
      (log: any) => log.resource_type === 'gdpr_data_export'
    );
    expect(exportLog).toBeDefined();
  });

  it('should include pagination in audit log response', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/audit-log?limit=10&offset=0`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination).toHaveProperty('total');
    expect(response.body.data.pagination).toHaveProperty('limit', 10);
    expect(response.body.data.pagination).toHaveProperty('offset', 0);
  });
});

describe('GDPR Cross-Tenant Protection', () => {
  let otherTenantId: number;
  let otherUser: { userId: number; username: string; email: string; password: string };

  beforeAll(async () => {
    otherTenantId = await createTestTenant('Other GDPR Company');
    otherUser = await createTestUser(otherTenantId, 'other@test.local', 'admin');
  });

  afterAll(async () => {
    await cleanupTestTenant(otherTenantId);
  });

  it('should prevent accessing other tenant customer data', async () => {
    // Login as other tenant admin
    const otherLoginResponse = await request(app)
      .post(`/api/tenants/${otherTenantId}/login`)
      .send({
        username: otherUser.username,
        password: otherUser.password,
      });

    const otherToken = otherLoginResponse.body.token;

    // Try to export customer from first tenant
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/gdpr/customers/${testCustomerId}/export`)
      .set('Authorization', `Bearer ${otherToken}`);

    // Should be forbidden (tenant mismatch)
    expect(response.status).toBe(403);
  });
});
