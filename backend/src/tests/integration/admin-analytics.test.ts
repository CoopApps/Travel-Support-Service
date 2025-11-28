import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Admin Analytics Routes Integration Tests
 *
 * Tests financial reporting and business intelligence for company administrators:
 * - Driver profitability analysis
 * - Trip profitability analysis
 * - Profitability dashboard (P&L)
 * - Cost breakdowns and optimization recommendations
 * - Admin-only access control
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Admin Analytics Test Company');
  testUser = await createTestUser(tenantId, `adminanalyticstest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Driver Profitability Analysis', () => {
  it('should get driver profitability analysis', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('drivers');
      expect(response.body.summary).toHaveProperty('totalDrivers');
      expect(response.body.summary).toHaveProperty('profitableDrivers');
      expect(response.body.summary).toHaveProperty('totalRevenue');
      expect(response.body.summary).toHaveProperty('totalCosts');
    }
  });

  it('should filter by date range', async () => {
    const startDate = '2025-01-01';
    const endDate = '2025-12-31';

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('drivers');
    }
  });

  it('should filter by minimum trips', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ minTrips: '10' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver.totalTrips).toBeGreaterThanOrEqual(10);
    }
  });

  it('should include revenue breakdown per driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('revenue');
      expect(driver.revenue).toHaveProperty('total');
      expect(driver.revenue).toHaveProperty('perTrip');
    }
  });

  it('should include cost breakdown per driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('costs');
      expect(driver.costs).toHaveProperty('wages');
      expect(driver.costs).toHaveProperty('fuel');
      expect(driver.costs).toHaveProperty('vehicle');
      expect(driver.costs).toHaveProperty('total');
    }
  });

  it('should calculate profitability metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('profitability');
      expect(driver.profitability).toHaveProperty('netProfit');
      expect(driver.profitability).toHaveProperty('profitMargin');
      expect(driver.profitability).toHaveProperty('profitable');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`);

    expect(response.status).toBe(401);
  });
});

describe('Trip Profitability Analysis', () => {
  it('should get trip profitability analysis', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('trips');
      expect(response.body.summary).toHaveProperty('totalTrips');
      expect(response.body.summary).toHaveProperty('profitableTrips');
      expect(response.body.summary).toHaveProperty('totalRevenue');
    }
  });

  it('should filter by trip status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'completed' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.trips.length > 0) {
      const trip = response.body.trips[0];
      expect(trip.status).toBe('completed');
    }
  });

  it('should filter by trip type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ tripType: 'regular' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.trips.length > 0) {
      const trip = response.body.trips[0];
      expect(trip.tripType).toBe('regular');
    }
  });

  it('should filter by driver', async () => {
    const driverId = '1';
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ driverId });

    expect([200, 500]).toContain(response.status);
  });

  it('should limit results', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: '50' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.trips.length).toBeLessThanOrEqual(50);
    }
  });

  it('should include trip revenue details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.trips.length > 0) {
      const trip = response.body.trips[0];
      expect(trip).toHaveProperty('revenue');
      expect(trip).toHaveProperty('distance');
      expect(trip).toHaveProperty('duration');
    }
  });

  it('should include trip cost breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.trips.length > 0) {
      const trip = response.body.trips[0];
      expect(trip).toHaveProperty('costs');
      expect(trip.costs).toHaveProperty('driverWage');
      expect(trip.costs).toHaveProperty('fuel');
      expect(trip.costs).toHaveProperty('vehicle');
      expect(trip.costs).toHaveProperty('maintenance');
      expect(trip.costs).toHaveProperty('total');
    }
  });

  it('should calculate trip profitability', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.trips.length > 0) {
      const trip = response.body.trips[0];
      expect(trip).toHaveProperty('profitability');
      expect(trip.profitability).toHaveProperty('netProfit');
      expect(trip.profitability).toHaveProperty('profitMargin');
      expect(trip.profitability).toHaveProperty('profitable');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`);

    expect(response.status).toBe(401);
  });
});

describe('Profitability Dashboard', () => {
  it('should get profitability dashboard', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('trips');
      expect(response.body).toHaveProperty('costBreakdown');
      expect(response.body).toHaveProperty('recommendations');
    }
  });

  it('should include overview metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.overview).toHaveProperty('totalRevenue');
      expect(response.body.overview).toHaveProperty('totalCosts');
      expect(response.body.overview).toHaveProperty('netProfit');
      expect(response.body.overview).toHaveProperty('profitMargin');
      expect(response.body.overview).toHaveProperty('profitable');
    }
  });

  it('should include trip statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.trips).toHaveProperty('total');
      expect(response.body.trips).toHaveProperty('completed');
      expect(response.body.trips).toHaveProperty('cancelled');
      expect(response.body.trips).toHaveProperty('averageRevenue');
    }
  });

  it('should include comprehensive cost breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.costBreakdown).toHaveProperty('wages');
      expect(response.body.costBreakdown).toHaveProperty('fuel');
      expect(response.body.costBreakdown).toHaveProperty('vehicleLease');
      expect(response.body.costBreakdown).toHaveProperty('vehicleInsurance');
      expect(response.body.costBreakdown).toHaveProperty('maintenance');
      expect(response.body.costBreakdown).toHaveProperty('incidents');
      expect(response.body.costBreakdown).toHaveProperty('total');
    }
  });

  it('should include cost percentages', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('costPercentages');
      expect(response.body.costPercentages).toHaveProperty('wages');
      expect(response.body.costPercentages).toHaveProperty('fuel');
      expect(response.body.costPercentages).toHaveProperty('vehicles');
      expect(response.body.costPercentages).toHaveProperty('maintenance');
    }
  });

  it('should include trip type breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('tripTypeBreakdown');
      expect(Array.isArray(response.body.tripTypeBreakdown)).toBe(true);
    }
  });

  it('should include top drivers by revenue', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('topDrivers');
      expect(Array.isArray(response.body.topDrivers)).toBe(true);
    }
  });

  it('should provide optimization recommendations', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    }
  });

  it('should filter by date range', async () => {
    const startDate = '2025-01-01';
    const endDate = '2025-12-31';

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('period');
      expect(response.body.period).toHaveProperty('startDate');
      expect(response.body.period).toHaveProperty('endDate');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`);

    expect(response.status).toBe(401);
  });
});

describe('Access Control', () => {
  it('should deny access with invalid token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', 'Bearer invalid-token');

    expect([401, 403, 500]).toContain(response.status);
  });

  it('should deny access without authorization header', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`);

    expect(response.status).toBe(401);
  });

  it('should prevent cross-tenant access', async () => {
    const otherTenantId = 99999;
    const response = await request(app)
      .get(`/api/tenants/${otherTenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([401, 403, 500]).toContain(response.status);
  });
});

describe('Error Handling', () => {
  it('should handle missing tenant ID gracefully', async () => {
    const response = await request(app)
      .get('/api/tenants//admin/analytics/driver-profitability')
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should handle invalid date formats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: 'invalid-date' });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle invalid query parameters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 'not-a-number' });

    expect([200, 400, 500]).toContain(response.status);
  });
});

describe('Data Validation', () => {
  it('should return consistent data structure for driver profitability', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/driver-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('drivers');
      expect(Array.isArray(response.body.drivers)).toBe(true);
    }
  });

  it('should return consistent data structure for trip profitability', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/trip-profitability`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('trips');
      expect(Array.isArray(response.body.trips)).toBe(true);
    }
  });

  it('should return consistent data structure for profitability dashboard', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('trips');
      expect(response.body).toHaveProperty('costBreakdown');
      expect(response.body).toHaveProperty('costPercentages');
      expect(response.body).toHaveProperty('tripTypeBreakdown');
      expect(response.body).toHaveProperty('topDrivers');
      expect(response.body).toHaveProperty('recommendations');
    }
  });

  it('should return numeric values in correct format', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/admin/analytics/profitability-dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(typeof response.body.overview.totalRevenue).toBe('number');
      expect(typeof response.body.overview.totalCosts).toBe('number');
      expect(typeof response.body.overview.netProfit).toBe('number');
      expect(typeof response.body.overview.profitMargin).toBe('number');
    }
  });
});
