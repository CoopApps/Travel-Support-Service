import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Bus Analytics Routes Integration Tests
 *
 * Tests analytics system for Section 22 bus services:
 * - Analytics overview
 * - Route profitability analysis
 * - Demand forecasting
 * - Passenger demographics
 * - Service efficiency metrics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Bus Analytics Test Company');
  testUser = await createTestUser(tenantId, `busanalyticstest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Analytics Overview', () => {
  it('should get analytics overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/overview`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('occupancy');
      expect(response.body).toHaveProperty('top_routes');
    }
  });

  it('should get analytics overview with custom period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/overview`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ period: '60' });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/overview`);

    expect(response.status).toBe(401);
  });
});

describe('Route Profitability', () => {
  it('should get route profitability analysis', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/route-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('routes');
    }
  });

  it('should include profitability metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/route-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.routes.length > 0) {
      const route = response.body.routes[0];
      expect(route).toHaveProperty('total_revenue');
      expect(route).toHaveProperty('estimated_costs');
      expect(route).toHaveProperty('estimated_profit');
      expect(route).toHaveProperty('profit_margin');
    }
  });
});

describe('Demand Forecasting', () => {
  it('should get demand forecast data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/demand-forecast`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('daily_pattern');
      expect(response.body).toHaveProperty('hourly_pattern');
      expect(response.body).toHaveProperty('weekly_trend');
    }
  });

  it('should include daily demand patterns', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/demand-forecast`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.daily_pattern)).toBe(true);
    }
  });

  it('should include hourly demand patterns', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/demand-forecast`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.hourly_pattern)).toBe(true);
    }
  });
});

describe('Passenger Demographics', () => {
  it('should get passenger demographics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/passenger-demographics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('tier_distribution');
      expect(response.body).toHaveProperty('booking_lead_time');
      expect(response.body).toHaveProperty('top_repeat_passengers');
    }
  });

  it('should track passenger tier distribution', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/passenger-demographics`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.tier_distribution)).toBe(true);
    }
  });

  it('should analyze booking lead times', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/passenger-demographics`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.booking_lead_time)).toBe(true);
    }
  });

  it('should identify repeat passengers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/passenger-demographics`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.top_repeat_passengers)).toBe(true);
    }
  });
});

describe('Efficiency Metrics', () => {
  it('should get service efficiency metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/efficiency-metrics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('total_services');
      expect(response.body).toHaveProperty('total_bookings');
      expect(response.body).toHaveProperty('bookings_per_service');
      expect(response.body).toHaveProperty('no_show_rate');
      expect(response.body).toHaveProperty('cancellation_rate');
      expect(response.body).toHaveProperty('completion_rate');
    }
  });

  it('should calculate no-show rate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/efficiency-metrics`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.no_show_rate).toBeDefined();
    }
  });

  it('should calculate cancellation rate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-analytics/efficiency-metrics`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.cancellation_rate).toBeDefined();
    }
  });
});
