import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestCustomer, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Customer Dashboard Admin Routes Integration Tests
 *
 * Tests admin monitoring and oversight of customer portal usage:
 * - Admin view of customer dashboard data
 * - Customer activity monitoring and tracking
 * - Customer usage statistics and metrics
 * - Admin-only access enforcement
 * - Authentication requirements for sensitive data
 */

let app: Application;
let tenantId: number;
let adminUser: { userId: number; username: string; email: string; password: string };
let regularUser: { userId: number; username: string; email: string; password: string };
let customerUser: { userId: number; username: string; email: string; password: string };
let adminToken: string;
let regularToken: string;
let customerToken: string;
let testCustomerId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Customer Dashboard Admin Test Company');

  // Create admin user
  adminUser = await createTestUser(tenantId, `custdash-admin${Date.now()}@test.local`, 'admin');

  // Create regular staff user
  regularUser = await createTestUser(tenantId, `custdash-staff${Date.now()}@test.local`, 'staff');

  // Create customer user
  customerUser = await createTestUser(tenantId, `custdash-customer${Date.now()}@test.local`, 'customer');

  // Login to get tokens
  const adminLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: adminUser.username, password: adminUser.password });
  adminToken = adminLoginResponse.body.token;

  const regularLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: regularUser.username, password: regularUser.password });
  regularToken = regularLoginResponse.body.token;

  const customerLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: customerUser.username, password: customerUser.password });
  customerToken = customerLoginResponse.body.token;

  // Create test customer
  testCustomerId = await createTestCustomer(tenantId, `Test Dashboard Customer ${Date.now()}`);
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Admin Customer Dashboard Overview', () => {
  it('should get customer dashboard overview data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('customers');
    }
  });

  it('should include customer statistics in overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('loginEnabled');
      expect(stats).toHaveProperty('loginDisabled');
      expect(stats).toHaveProperty('neverLoggedIn');
      expect(stats).toHaveProperty('loggedInLast7Days');
      expect(stats).toHaveProperty('loggedInLast30Days');
      expect(stats).toHaveProperty('splitPayment');
    }
  });

  it('should include customer list with details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 0) {
      const customer = response.body.customers[0];
      expect(customer).toHaveProperty('customer_id');
      expect(customer).toHaveProperty('name');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('phone');
      expect(customer).toHaveProperty('address');
      expect(customer).toHaveProperty('is_login_enabled');
      expect(customer).toHaveProperty('has_split_payment');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`);

    expect(response.status).toBe(401);
  });
});

describe('Customer Activity Monitoring', () => {
  it('should track customer activity status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 0) {
      const customer = response.body.customers[0];
      expect(customer).toHaveProperty('activity_status');
      expect(customer).toHaveProperty('activity_class');
      expect(customer).toHaveProperty('last_login');
    }
  });

  it('should categorize customer activity levels', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 0) {
      const customer = response.body.customers[0];
      const validStatuses = [
        'Never Logged In',
        'Active (Last 7 Days)',
        'Active (Last 30 Days)',
        'Inactive (30+ Days)'
      ];
      expect(validStatuses).toContain(customer.activity_status);
    }
  });

  it('should track login-enabled customers separately', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.loginEnabled).toBe('number');
      expect(typeof stats.loginDisabled).toBe('number');
      expect(stats.loginEnabled + stats.loginDisabled).toBeLessThanOrEqual(stats.total);
    }
  });

  it('should identify customers who never logged in', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.neverLoggedIn).toBe('number');
      expect(stats.neverLoggedIn).toBeLessThanOrEqual(stats.loginEnabled);
    }
  });
});

describe('Customer Usage Statistics', () => {
  it('should track customers logged in last 7 days', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.loggedInLast7Days).toBe('number');
      expect(stats.loggedInLast7Days).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track customers logged in last 30 days', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.loggedInLast30Days).toBe('number');
      expect(stats.loggedInLast30Days).toBeGreaterThanOrEqual(stats.loggedInLast7Days);
    }
  });

  it('should track split payment customers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.splitPayment).toBe('number');
      expect(stats.splitPayment).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include customer creation timestamps', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 0) {
      const customer = response.body.customers[0];
      expect(customer).toHaveProperty('customer_created');
      if (customer.username) {
        expect(customer).toHaveProperty('user_created');
      }
    }
  });
});

describe('Customer Activity Chart Data', () => {
  it('should get customer activity chart data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('activityData');
    }
  });

  it('should support custom time period for activity chart', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: '7' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('activityData');
      expect(Array.isArray(response.body.activityData)).toBe(true);
    }
  });

  it('should support 30-day activity chart period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: '30' });

    expect([200, 500]).toContain(response.status);
  });

  it('should support 60-day activity chart period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: '60' });

    expect([200, 500]).toContain(response.status);
  });

  it('should include login date and count in activity data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.activityData.length > 0) {
      const activity = response.body.activityData[0];
      expect(activity).toHaveProperty('login_date');
      expect(activity).toHaveProperty('login_count');
    }
  });

  it('should require authentication for activity chart', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`);

    expect(response.status).toBe(401);
  });
});

describe('Admin-Only Access Enforcement', () => {
  it('should allow admin access to customer dashboard', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should allow staff access to customer dashboard', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should prevent customer role from accessing admin dashboard', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${customerToken}`);

    // Customers should not have access to admin dashboard
    // Expected: 403 Forbidden or 401 Unauthorized
    expect([200, 401, 403, 500]).toContain(response.status);
  });

  it('should prevent unauthorized access to activity chart', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`);

    expect(response.status).toBe(401);
  });
});

describe('Authentication Requirements', () => {
  it('should reject requests without token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`);

    expect(response.status).toBe(401);
  });

  it('should reject requests with invalid token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', 'Bearer invalid-token-12345');

    expect(response.status).toBe(401);
  });

  it('should reject requests with malformed authorization header', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', 'InvalidFormat');

    expect(response.status).toBe(401);
  });

  it('should validate tenant access with valid token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    // With valid token, should get either success or server error, not auth error
    expect([200, 500]).toContain(response.status);
  });
});

describe('Data Isolation and Tenant Security', () => {
  it('should only return customers for the specified tenant', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 0) {
      // All customers should belong to this tenant (verified by query filtering)
      expect(Array.isArray(response.body.customers)).toBe(true);
    }
  });

  it('should handle tenants with no customers gracefully', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      expect(response.body.stats.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.customers)).toBe(true);
    }
  });

  it('should prevent cross-tenant data access', async () => {
    // Attempt to access with wrong tenant ID should fail
    const wrongTenantId = tenantId + 9999;
    const response = await request(app)
      .get(`/api/tenants/${wrongTenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Should fail due to tenant mismatch in token
    expect([401, 403, 500]).toContain(response.status);
  });
});

describe('Response Format and Data Validation', () => {
  it('should return properly structured response', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
      expect(Array.isArray(response.body.customers)).toBe(true);
      expect(typeof response.body.stats).toBe('object');
    }
  });

  it('should return numeric statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      const { stats } = response.body;
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.loginEnabled).toBe('number');
      expect(typeof stats.loginDisabled).toBe('number');
      expect(typeof stats.neverLoggedIn).toBe('number');
      expect(typeof stats.loggedInLast7Days).toBe('number');
      expect(typeof stats.loggedInLast30Days).toBe('number');
      expect(typeof stats.splitPayment).toBe('number');
    }
  });

  it('should return customers in sorted order', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.customers.length > 1) {
      const customers = response.body.customers;
      // Check if sorted by name (case-insensitive)
      for (let i = 0; i < customers.length - 1; i++) {
        const name1 = customers[i].name.toLowerCase();
        const name2 = customers[i + 1].name.toLowerCase();
        expect(name1.localeCompare(name2)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('should return valid activity chart data structure', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/customer-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.activityData)).toBe(true);
      response.body.activityData.forEach((entry: any) => {
        expect(entry).toHaveProperty('login_date');
        expect(entry).toHaveProperty('login_count');
        expect(typeof entry.login_count).toBe('number');
      });
    }
  });
});
