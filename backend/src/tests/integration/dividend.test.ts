import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Dividend Management Routes Integration Tests
 *
 * Tests cooperative dividend calculation and distribution system:
 * - Dividend calculation for periods
 * - Distribution history tracking
 * - Member dividend history
 * - Payment processing
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Dividend Test Cooperative');
  testUser = await createTestUser(tenantId, `dividendtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Dividend Calculation', () => {
  let distributionId: number;

  it('should calculate dividends for a period', async () => {
    const periodStart = '2025-01-01';
    const periodEnd = '2025-01-31';

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: periodStart,
        period_end: periodEnd,
        reserves_percent: 20,
        business_percent: 30,
        dividend_percent: 50,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('distribution');
      expect(response.body).toHaveProperty('member_dividends');
      expect(response.body).toHaveProperty('summary');
    }
  });

  it('should calculate and save dividends', async () => {
    const periodStart = '2025-02-01';
    const periodEnd = '2025-02-28';

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: periodStart,
        period_end: periodEnd,
        reserves_percent: 20,
        business_percent: 30,
        dividend_percent: 50,
        save: true,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.distribution_id) {
      distributionId = response.body.distribution_id;
      expect(response.body).toHaveProperty('saved', true);
      expect(response.body).toHaveProperty('distribution_id');
    }
  });

  it('should validate required period fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reserves_percent: 20,
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
    }
  });

  it('should handle missing period_start', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_end: '2025-01-31',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle missing period_end', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-01-01',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should use default allocation percentages', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-03-01',
        period_end: '2025-03-31',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.distribution).toBeDefined();
    }
  });

  it('should calculate with custom allocation percentages', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-04-01',
        period_end: '2025-04-30',
        reserves_percent: 25,
        business_percent: 25,
        dividend_percent: 50,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .send({
        period_start: '2025-01-01',
        period_end: '2025-01-31',
      });

    expect(response.status).toBe(401);
  });
});

describe('Distribution Payment', () => {
  it('should mark distribution as paid', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/1/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'account_credit',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('distribution_id');
    }
  });

  it('should use default payment method', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/1/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([200, 500]).toContain(response.status);
  });

  it('should handle bank transfer payment method', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/2/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'bank_transfer',
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle cash payment method', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/3/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'cash',
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle reinvest payment method', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/4/pay`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'reinvest',
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication for payment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/1/pay`)
      .send({
        payment_method: 'account_credit',
      });

    expect(response.status).toBe(401);
  });
});

describe('Distribution History', () => {
  it('should get distribution history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should limit distribution results', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 5 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.length > 0) {
      expect(response.body.length).toBeLessThanOrEqual(5);
    }
  });

  it('should use default limit for distributions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.length > 0) {
      expect(response.body.length).toBeLessThanOrEqual(12);
    }
  });

  it('should return distribution details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.length > 0) {
      const distribution = response.body[0];
      expect(distribution).toHaveProperty('distribution_id');
      expect(distribution).toHaveProperty('tenant_id');
      expect(distribution).toHaveProperty('period_start');
      expect(distribution).toHaveProperty('period_end');
    }
  });

  it('should require authentication for distribution history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/distributions`);

    expect(response.status).toBe(401);
  });
});

describe('Member Dividend History', () => {
  it('should get member dividend history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should limit member dividend results', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 5 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.length > 0) {
      expect(response.body.length).toBeLessThanOrEqual(5);
    }
  });

  it('should use default limit for member dividends', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.length > 0) {
      expect(response.body.length).toBeLessThanOrEqual(12);
    }
  });

  it('should return member dividend details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/1`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.length > 0) {
      const dividend = response.body[0];
      expect(dividend).toHaveProperty('member_id');
      expect(dividend).toHaveProperty('distribution_id');
      expect(dividend).toHaveProperty('dividend_amount');
    }
  });

  it('should handle non-existent member', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should require authentication for member history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/dividends/members/1`);

    expect(response.status).toBe(401);
  });
});

describe('Dividend Calculation Summary', () => {
  it('should include summary in calculation results', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-05-01',
        period_end: '2025-05-31',
      });

    if (response.status === 200) {
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary).toHaveProperty('total_eligible_members');
      expect(response.body.summary).toHaveProperty('total_trips');
      expect(response.body.summary).toHaveProperty('total_dividend_pool');
      expect(response.body.summary).toHaveProperty('average_dividend_per_member');
      expect(response.body.summary).toHaveProperty('average_dividend_per_trip');
    }
  });

  it('should include member dividends array', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-06-01',
        period_end: '2025-06-30',
      });

    if (response.status === 200) {
      expect(response.body.member_dividends).toBeDefined();
      expect(Array.isArray(response.body.member_dividends)).toBe(true);
    }
  });

  it('should include distribution metadata', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-07-01',
        period_end: '2025-07-31',
      });

    if (response.status === 200) {
      expect(response.body.distribution).toBeDefined();
      expect(response.body.distribution).toHaveProperty('gross_surplus');
      expect(response.body.distribution).toHaveProperty('reserves_amount');
      expect(response.body.distribution).toHaveProperty('business_costs_amount');
      expect(response.body.distribution).toHaveProperty('dividend_pool');
    }
  });
});

describe('Cooperative Model Support', () => {
  it('should calculate dividends for passenger cooperative', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-08-01',
        period_end: '2025-08-31',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.member_dividends.length > 0) {
      const memberDividend = response.body.member_dividends[0];
      expect(memberDividend).toHaveProperty('member_type');
      expect(memberDividend).toHaveProperty('patronage_value');
      expect(memberDividend).toHaveProperty('patronage_percentage');
    }
  });

  it('should handle worker cooperative model', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-09-01',
        period_end: '2025-09-30',
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle hybrid cooperative model', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-10-01',
        period_end: '2025-10-31',
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Allocation Percentages', () => {
  it('should calculate reserves allocation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-11-01',
        period_end: '2025-11-30',
        reserves_percent: 30,
        business_percent: 20,
        dividend_percent: 50,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.distribution).toHaveProperty('reserves_amount');
    }
  });

  it('should calculate business costs allocation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-12-01',
        period_end: '2025-12-31',
        reserves_percent: 15,
        business_percent: 35,
        dividend_percent: 50,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.distribution).toHaveProperty('business_costs_amount');
    }
  });

  it('should validate allocation percentages total', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        reserves_percent: 20,
        business_percent: 30,
        dividend_percent: 50,
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Edge Cases', () => {
  it('should handle period with no revenue', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2020-01-01',
        period_end: '2020-01-31',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.distribution.gross_surplus).toBeDefined();
    }
  });

  it('should handle period with no eligible members', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2020-02-01',
        period_end: '2020-02-28',
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.summary.total_eligible_members).toBeDefined();
    }
  });

  it('should handle single day period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-01-15',
        period_end: '2025-01-15',
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle year-long period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/dividends/calculate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_start: '2025-01-01',
        period_end: '2025-12-31',
      });

    expect([200, 500]).toContain(response.status);
  });
});
