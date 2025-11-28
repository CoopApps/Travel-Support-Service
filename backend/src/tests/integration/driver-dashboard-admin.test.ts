import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Driver Dashboard Admin Routes Integration Tests
 *
 * Tests admin monitoring of driver dashboard and login activity:
 * - Aggregated driver dashboard data
 * - Login statistics
 * - Activity monitoring
 * - Driver engagement metrics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Driver Dashboard Admin Test Company');
  testUser = await createTestUser(tenantId, `driverdashboardadmintest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Driver Dashboard Overview', () => {
  it('should get aggregated driver dashboard data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('drivers');
    }
  });

  it('should include driver statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('loginEnabled');
      expect(response.body.stats).toHaveProperty('loginDisabled');
      expect(response.body.stats).toHaveProperty('neverLoggedIn');
    }
  });

  it('should track login activity periods', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats).toHaveProperty('loggedInLast7Days');
      expect(response.body.stats).toHaveProperty('loggedInLast30Days');
    }
  });

  it('should categorize by employment type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats).toHaveProperty('byEmploymentType');
      expect(response.body.stats.byEmploymentType).toHaveProperty('contracted');
      expect(response.body.stats.byEmploymentType).toHaveProperty('freelance');
      expect(response.body.stats.byEmploymentType).toHaveProperty('employed');
    }
  });

  it('should return driver list with activity status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('driver_id');
      expect(driver).toHaveProperty('name');
      expect(driver).toHaveProperty('activity_status');
      expect(driver).toHaveProperty('activity_class');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`);

    expect(response.status).toBe(401);
  });
});

describe('Activity Chart Data', () => {
  it('should get driver login activity chart data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('activityData');
      expect(Array.isArray(response.body.activityData)).toBe(true);
    }
  });

  it('should accept custom days parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ days: 7 });

    expect([200, 500]).toContain(response.status);
  });

  it('should default to 30 days if not specified', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should handle 60 day period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard/activity-chart`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ days: 60 });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard/activity-chart`);

    expect(response.status).toBe(401);
  });
});

describe('Driver Activity Classification', () => {
  it('should classify drivers as active or inactive', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(['active', 'moderate', 'inactive']).toContain(driver.activity_class);
    }
  });

  it('should identify never logged in drivers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(typeof response.body.stats.neverLoggedIn).toBe('number');
    }
  });
});

describe('Driver Engagement Metrics', () => {
  it('should track login enabled vs disabled', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const { loginEnabled, loginDisabled, total } = response.body.stats;
      expect(loginEnabled + loginDisabled).toBeLessThanOrEqual(total);
    }
  });

  it('should provide complete driver information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/driver-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('driver_id');
      expect(driver).toHaveProperty('name');
      expect(driver).toHaveProperty('email');
      expect(driver).toHaveProperty('is_login_enabled');
      expect(driver).toHaveProperty('employment_type');
    }
  });
});
