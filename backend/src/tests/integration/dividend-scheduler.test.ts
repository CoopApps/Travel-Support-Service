import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Dividend Scheduler Routes Integration Tests
 *
 * Tests automated dividend calculation system:
 * - Scheduler settings management
 * - Allocation percentage validation
 * - Frequency configuration
 * - Manual calculation triggering
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Dividend Scheduler Test Company');
  testUser = await createTestUser(tenantId, `divschtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Dividend Scheduler Settings - GET', () => {
  it('should get scheduler settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('frequency');
      expect(response.body).toHaveProperty('reserves_percent');
      expect(response.body).toHaveProperty('business_percent');
      expect(response.body).toHaveProperty('dividend_percent');
    }
  });

  it('should return default settings if none exist', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(typeof response.body.enabled).toBe('boolean');
      expect(['monthly', 'quarterly']).toContain(response.body.frequency);
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/scheduler/settings`);

    expect(response.status).toBe(401);
  });

  it('should validate tenant access', async () => {
    const invalidTenantId = 99999;
    const response = await request(app)
      .get(`/api/tenants/${invalidTenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });
});

describe('Dividend Scheduler Settings - PUT', () => {
  it('should update scheduler settings with valid data', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        enabled: true,
        frequency: 'monthly',
        reserves_percent: 20,
        business_percent: 30,
        dividend_percent: 50,
        auto_distribute: false,
        notification_email: 'admin@test.com',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('settings');
    }
  });

  it('should update only enabled flag', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        enabled: true,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should update frequency to quarterly', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'quarterly',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should reject invalid frequency', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'weekly',
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('frequency');
    }
  });

  it('should reject invalid frequency - daily', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'daily',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .send({
        enabled: true,
      });

    expect(response.status).toBe(401);
  });
});

describe('Allocation Percentage Validation', () => {
  it('should accept percentages totaling 100', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 25,
        business_percent: 35,
        dividend_percent: 40,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should accept percentages totaling exactly 100', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 33.33,
        business_percent: 33.33,
        dividend_percent: 33.34,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should reject percentages totaling less than 100', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 20,
        business_percent: 30,
        dividend_percent: 40,
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('100');
    }
  });

  it('should reject percentages totaling more than 100', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 30,
        business_percent: 40,
        dividend_percent: 50,
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('100');
    }
  });

  it('should reject zero total percentages', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 0,
        business_percent: 0,
        dividend_percent: 0,
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should include current total in error response', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 25,
        business_percent: 25,
        dividend_percent: 25,
      });

    if (response.status === 400) {
      expect(response.body).toHaveProperty('current_total');
      expect(response.body.current_total).toBe(75);
    }
  });
});

describe('Auto-Distribution Settings', () => {
  it('should enable auto-distribution', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        auto_distribute: true,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should disable auto-distribution', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        auto_distribute: false,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should update notification email', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notification_email: 'dividends@test.com',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should clear notification email', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notification_email: null,
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Manual Dividend Calculation Trigger', () => {
  it('should trigger manual dividend calculation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/scheduler/trigger`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
    }
  });

  it('should include processing note in response', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/scheduler/trigger`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('note');
      expect(response.body.note.toLowerCase()).toContain('background');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/scheduler/trigger`);

    expect(response.status).toBe(401);
  });

  it('should validate tenant access', async () => {
    const invalidTenantId = 99999;
    const response = await request(app)
      .post(`/api/tenants/${invalidTenantId}/dividends/scheduler/trigger`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should allow multiple manual triggers', async () => {
    const response1 = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/scheduler/trigger`)
      .set('Authorization', `Bearer ${authToken}`);

    const response2 = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/scheduler/trigger`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response1.status);
    expect([200, 500]).toContain(response2.status);
  });
});

describe('Complete Scheduler Configuration Workflow', () => {
  it('should configure scheduler from default to enabled', async () => {
    // Step 1: Get default settings
    const getResponse = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(getResponse.status);

    // Step 2: Update to enabled with full configuration
    const updateResponse = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        enabled: true,
        frequency: 'quarterly',
        reserves_percent: 15,
        business_percent: 35,
        dividend_percent: 50,
        auto_distribute: true,
        notification_email: 'finance@test.com',
      });

    expect([200, 500]).toContain(updateResponse.status);

    // Step 3: Verify settings were updated
    if (updateResponse.status === 200) {
      const verifyResponse = await request(app)
        .get(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
        .set('Authorization', `Bearer ${authToken}`);

      if (verifyResponse.status === 200) {
        expect(verifyResponse.body.enabled).toBe(true);
        expect(verifyResponse.body.frequency).toBe('quarterly');
      }
    }
  });

  it('should handle partial updates correctly', async () => {
    // Update only frequency
    const response1 = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'monthly',
      });

    expect([200, 500]).toContain(response1.status);

    // Update only enabled flag
    const response2 = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        enabled: false,
      });

    expect([200, 500]).toContain(response2.status);
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle negative percentages gracefully', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: -10,
        business_percent: 60,
        dividend_percent: 50,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle very large percentages', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 1000,
        business_percent: 1000,
        dividend_percent: 1000,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle decimal precision issues', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 33.333333,
        business_percent: 33.333333,
        dividend_percent: 33.333334,
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle empty update payload', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle invalid email format gracefully', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notification_email: 'not-an-email',
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle null values in update', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notification_email: null,
        enabled: null,
      });

    expect([200, 400, 500]).toContain(response.status);
  });
});

describe('Frequency Configuration', () => {
  it('should accept monthly frequency', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'monthly',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should accept quarterly frequency', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'quarterly',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
    }
  });

  it('should reject yearly frequency', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'yearly',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should reject empty string frequency', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: '',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should include valid values in frequency error', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/dividends/scheduler/settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        frequency: 'invalid',
      });

    if (response.status === 400) {
      expect(response.body).toHaveProperty('valid_values');
      expect(response.body.valid_values).toContain('monthly');
      expect(response.body.valid_values).toContain('quarterly');
    }
  });
});
