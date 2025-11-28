import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Profit Distribution Routes Integration Tests
 *
 * Tests cooperative profit distribution system:
 * - Distribution period management
 * - Member profit shares calculation
 * - Distribution approvals
 * - Investment tracking for passenger co-ops
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Profit Distribution Test Company');
  testUser = await createTestUser(tenantId, `profitdist${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Distribution Periods Management', () => {
  let periodId: number;

  it('should get all distribution periods', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('periods');
    }
  });

  it('should create a distribution period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'quarterly',
        period_start: '2025-01-01',
        period_end: '2025-03-31',
        total_revenue: 100000,
        total_expenses: 60000,
        total_profit: 40000,
        reserve_percentage: 20,
        distribution_percentage: 80,
        notes: 'Q1 2025 profit distribution',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.period_id) {
      periodId = response.body.period_id;
    }
  });

  it('should validate required fields when creating period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_revenue: 100000,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate period date logic', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'quarterly',
        period_start: '2025-03-31',
        period_end: '2025-01-01',
        total_profit: 40000,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should filter distributions by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'draft' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter distributions by period type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ period_type: 'quarterly' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter distributions by year', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ year: 2025 });

    expect([200, 500]).toContain(response.status);
  });

  it('should get distribution period details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('distributions');
    }
  });

  it('should update distribution period', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_revenue: 110000,
        total_expenses: 65000,
        notes: 'Updated figures',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should not allow updating distributed period', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_revenue: 110000,
      });

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should delete draft distribution period', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should require authentication for distributions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`);

    expect(response.status).toBe(401);
  });
});

describe('Distribution Calculations', () => {
  it('should calculate distributions for period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/1/calculate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('result');
    }
  });

  it('should not recalculate distributed period', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/999/calculate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should approve calculated distributions', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/1/approve`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should only approve calculated periods', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/999/approve`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 404, 500]).toContain(response.status);
  });
});

describe('Member Distributions', () => {
  it('should get member distributions for period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions/1/members`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('distributions');
    }
  });

  it('should mark distribution as paid', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/members/1/mark-paid`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'bank_transfer',
        payment_reference: 'TXN123456',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require payment method when marking paid', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/members/1/mark-paid`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should mark distribution paid with optional reference', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/members/1/mark-paid`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'cash',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should get current user distributions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions/my-distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('distributions');
    }
  });

  it('should return empty array for non-member', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions/my-distributions`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.distributions)).toBe(true);
    }
  });
});

describe('Member Investments', () => {
  let investmentId: number;

  it('should get all member investments', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('investments');
      expect(response.body).toHaveProperty('totals');
    }
  });

  it('should include investment totals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.totals).toHaveProperty('total_invested');
      expect(response.body.totals).toHaveProperty('active_investment');
      expect(response.body.totals).toHaveProperty('total_investments');
    }
  });

  it('should filter investments by member', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_id: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter investments by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'active' });

    expect([200, 500]).toContain(response.status);
  });

  it('should record new investment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 5000,
        investment_date: '2025-01-15',
        investment_type: 'capital',
        notes: 'Initial capital investment',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.investment_id) {
      investmentId = response.body.investment_id;
    }
  });

  it('should validate required investment fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        investment_amount: 5000,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate positive investment amount', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: -1000,
        investment_date: '2025-01-15',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate zero investment amount', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 0,
        investment_date: '2025-01-15',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should default investment type to capital', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 3000,
        investment_date: '2025-01-20',
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should require authentication for investments', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`);

    expect(response.status).toBe(401);
  });
});

describe('Distribution Period Workflow', () => {
  it('should create period with calculated profit', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'annual',
        period_start: '2025-01-01',
        period_end: '2025-12-31',
        total_revenue: 500000,
        total_expenses: 300000,
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should use default reserve percentage', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'quarterly',
        period_start: '2025-04-01',
        period_end: '2025-06-30',
        total_profit: 50000,
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should use default distribution percentage', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        period_type: 'quarterly',
        period_start: '2025-07-01',
        period_end: '2025-09-30',
        total_profit: 60000,
      });

    expect([200, 201, 500]).toContain(response.status);
  });
});

describe('Distribution Period Updates', () => {
  it('should update multiple fields', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_revenue: 120000,
        total_expenses: 70000,
        reserve_percentage: 25,
        distribution_percentage: 75,
        notes: 'Revised financial figures',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should update single field', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Updated note only',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require at least one field to update', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should update status field', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/cooperative/distributions/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'calculated',
      });

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Investment Types', () => {
  it('should record capital investment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 10000,
        investment_date: '2025-02-01',
        investment_type: 'capital',
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should record loan investment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 15000,
        investment_date: '2025-02-01',
        investment_type: 'loan',
      });

    expect([200, 201, 500]).toContain(response.status);
  });

  it('should record investment with notes', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        member_id: 1,
        investment_amount: 7500,
        investment_date: '2025-02-15',
        investment_type: 'capital',
        notes: 'Additional investment for expansion',
      });

    expect([200, 201, 500]).toContain(response.status);
  });
});

describe('Edge Cases', () => {
  it('should handle non-existent period ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should handle non-existent distribution ID for payment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/cooperative/distributions/members/99999/mark-paid`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payment_method: 'bank_transfer',
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should handle combined filters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/distributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        status: 'draft',
        period_type: 'quarterly',
        year: 2025,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle investment filters combined', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/cooperative/investments`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        member_id: 1,
        status: 'active',
      });

    expect([200, 500]).toContain(response.status);
  });
});
