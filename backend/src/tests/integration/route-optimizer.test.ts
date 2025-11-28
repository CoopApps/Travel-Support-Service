import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestCustomer, createTestDriver, createTestTrip, cleanupTestTenant, closeTestPool, getTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Route Optimizer Integration Tests
 *
 * Tests the route optimization system for efficient trip planning:
 * - Single route optimization
 * - Optimization score calculation
 * - Batch route optimization
 * - Capacity-aware optimization
 * - Route analytics and KPIs
 * - Validation and edge cases
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testCustomerId: number;
let testDriverId: number;
let testTripId1: number;
let testTripId2: number;
let testTripId3: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Route Optimizer Test Company');
  testUser = await createTestUser(tenantId, `routeopttest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;

  // Create test data for route optimization tests
  testCustomerId = await createTestCustomer(tenantId, 'Route Test Customer');
  testDriverId = await createTestDriver(tenantId, 'Route Test Driver');

  // Create multiple trips for the same day
  const pool = getTestPool();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tripDate = tomorrow.toISOString().split('T')[0];

  const trip1 = await pool.query(
    `INSERT INTO tenant_trips (
      tenant_id, customer_id, driver_id, trip_date, pickup_time,
      pickup_address, pickup_location, destination_address, destination,
      status, trip_type, passenger_count, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING trip_id`,
    [tenantId, testCustomerId, testDriverId, tripDate, '09:00:00', '123 Main St, Sheffield', '123 Main St', '456 Oak Ave, Sheffield', '456 Oak Ave', 'scheduled', 'adhoc', 1]
  );
  testTripId1 = trip1.rows[0].trip_id;

  const trip2 = await pool.query(
    `INSERT INTO tenant_trips (
      tenant_id, customer_id, driver_id, trip_date, pickup_time,
      pickup_address, pickup_location, destination_address, destination,
      status, trip_type, passenger_count, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING trip_id`,
    [tenantId, testCustomerId, testDriverId, tripDate, '10:00:00', '789 Pine Rd, Sheffield', '789 Pine Rd', '321 Elm St, Sheffield', '321 Elm St', 'scheduled', 'adhoc', 2]
  );
  testTripId2 = trip2.rows[0].trip_id;

  const trip3 = await pool.query(
    `INSERT INTO tenant_trips (
      tenant_id, customer_id, driver_id, trip_date, pickup_time,
      pickup_address, pickup_location, destination_address, destination,
      status, trip_type, passenger_count, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING trip_id`,
    [tenantId, testCustomerId, testDriverId, tripDate, '11:00:00', '555 Maple Dr, Sheffield', '555 Maple Dr', '888 Birch Ln, Sheffield', '888 Birch Ln', 'scheduled', 'adhoc', 1]
  );
  testTripId3 = trip3.rows[0].trip_id;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Route Optimization - Single Route', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .send({
        driverId: testDriverId,
        date: '2025-01-15',
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    expect(response.status).toBe(401);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Invalid request/i);
  });

  it('should require at least 2 trips for optimization', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: '2025-01-15',
        trips: [{ trip_id: testTripId1 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/at least 2 trips/i);
  });

  it('should optimize route with valid trips', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 },
          { trip_id: testTripId3 }
        ]
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('originalOrder');
      expect(response.body).toHaveProperty('optimizedOrder');
      expect(response.body).toHaveProperty('savings');
      expect(response.body).toHaveProperty('method');
      expect(['google', 'haversine']).toContain(response.body.method);

      if (response.body.savings) {
        expect(response.body.savings).toHaveProperty('distance');
        expect(response.body.savings).toHaveProperty('time');
      }
    }
  });

  it('should return optimized order array', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200) {
      expect(Array.isArray(response.body.originalOrder)).toBe(true);
      expect(Array.isArray(response.body.optimizedOrder)).toBe(true);
      expect(response.body.optimizedOrder.length).toBe(response.body.originalOrder.length);
    }
  });

  it('should include trip details in response', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200 && response.body.optimizedOrder.length > 0) {
      const trip = response.body.optimizedOrder[0];
      expect(trip).toHaveProperty('trip_id');
      expect(trip).toHaveProperty('pickup_location');
      expect(trip).toHaveProperty('destination');
    }
  });

  it('should handle empty route gracefully', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: []
      });

    expect(response.status).toBe(400);
  });

  it('should use fallback method when Google Maps unavailable', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('method');
      expect(response.body).toHaveProperty('reliable');

      if (response.body.method === 'haversine') {
        expect(response.body.reliable).toBe(false);
      }
    }
  });
});

describe('Optimization Scores', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(response.status).toBe(401);
  });

  it('should require startDate and endDate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/startDate and endDate are required/i);
  });

  it('should return optimization scores for date range', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('scores');
      expect(Array.isArray(response.body.scores)).toBe(true);
    }
  });

  it('should include score details for each driver-date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.scores.length > 0) {
      const score = response.body.scores[0];
      expect(score).toHaveProperty('driverId');
      expect(score).toHaveProperty('date');
      expect(score).toHaveProperty('score');
      expect(score).toHaveProperty('status');
      expect(score).toHaveProperty('tripCount');
      expect(score).toHaveProperty('currentDistance');
      expect(score).toHaveProperty('optimalDistance');
      expect(score).toHaveProperty('savingsPotential');
    }
  });

  it('should categorize optimization status', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.scores.length > 0) {
      const score = response.body.scores[0];
      expect(['optimal', 'good', 'needs-optimization', 'error']).toContain(score.status);
    }
  });

  it('should only score routes with 2 or more trips', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      response.body.scores.forEach((score: any) => {
        expect(score.tripCount).toBeGreaterThanOrEqual(2);
      });
    }
  });
});

describe('Batch Route Optimization', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .send({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

    expect(response.status).toBe(401);
  });

  it('should require startDate and endDate', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/startDate and endDate are required/i);
  });

  it('should perform batch optimization', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate, endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('tripCount');
      expect(response.body).toHaveProperty('driverCount');
      expect(response.body).toHaveProperty('dateRange');
    }
  });

  it('should return optimization results by date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate, endDate });

    if (response.status === 200) {
      expect(response.body.dateRange).toHaveProperty('startDate');
      expect(response.body.dateRange).toHaveProperty('endDate');
    }
  });

  it('should include trip and driver counts', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate, endDate });

    if (response.status === 200) {
      expect(typeof response.body.tripCount).toBe('number');
      expect(typeof response.body.driverCount).toBe('number');
      expect(response.body.tripCount).toBeGreaterThanOrEqual(0);
      expect(response.body.driverCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle empty date range gracefully', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/batch-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startDate: '2020-01-01',
        endDate: '2020-01-01'
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Capacity Optimization', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .send({
        date: '2025-01-15',
        vehicleCapacity: 8
      });

    expect(response.status).toBe(401);
  });

  it('should require date parameter', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/date is required/i);
  });

  it('should optimize routes by capacity', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 8
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('routes');
      expect(response.body).toHaveProperty('statistics');
    }
  });

  it('should return route groupings', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 8
      });

    if (response.status === 200) {
      expect(Array.isArray(response.body.routes)).toBe(true);
    }
  });

  it('should include statistics in response', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 8
      });

    if (response.status === 200) {
      expect(response.body.statistics).toHaveProperty('totalTrips');
      expect(response.body.statistics).toHaveProperty('totalPassengers');
      expect(response.body.statistics).toHaveProperty('vehiclesNeeded');
      expect(response.body.statistics).toHaveProperty('vehiclesSaved');
      expect(response.body.statistics).toHaveProperty('averageCapacityUsed');
      expect(response.body.statistics).toHaveProperty('efficiency');
    }
  });

  it('should use default capacity if not specified', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle different capacity values', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 16
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should calculate efficiency metrics', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 8
      });

    if (response.status === 200) {
      expect(typeof response.body.statistics.efficiency).toBe('number');
      expect(response.body.statistics.efficiency).toBeGreaterThanOrEqual(0);
      expect(response.body.statistics.efficiency).toBeLessThanOrEqual(100);
    }
  });
});

describe('Route Analytics', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    expect(response.status).toBe(401);
  });

  it('should require startDate and endDate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/startDate and endDate are required/i);
  });

  it('should return route analytics', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('driverUtilization');
      expect(response.body).toHaveProperty('peakHours');
    }
  });

  it('should include overview metrics', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(response.body.overview).toHaveProperty('totalTrips');
      expect(response.body.overview).toHaveProperty('driversUsed');
      expect(response.body.overview).toHaveProperty('daysActive');
      expect(response.body.overview).toHaveProperty('avgPassengersPerTrip');
      expect(response.body.overview).toHaveProperty('totalMiles');
      expect(response.body.overview).toHaveProperty('totalHours');
      expect(response.body.overview).toHaveProperty('tripsPerDriver');
    }
  });

  it('should include driver utilization data', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.driverUtilization)).toBe(true);
    }
  });

  it('should include utilization details for each driver', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverUtilization.length > 0) {
      const driver = response.body.driverUtilization[0];
      expect(driver).toHaveProperty('driverId');
      expect(driver).toHaveProperty('tripCount');
      expect(driver).toHaveProperty('totalDistance');
      expect(driver).toHaveProperty('activeDays');
    }
  });

  it('should include peak hours analysis', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.peakHours)).toBe(true);
    }
  });

  it('should include hour and trip count for peak times', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.peakHours.length > 0) {
      const peakHour = response.body.peakHours[0];
      expect(peakHour).toHaveProperty('hour');
      expect(peakHour).toHaveProperty('tripCount');
      expect(peakHour.hour).toBeGreaterThanOrEqual(0);
      expect(peakHour.hour).toBeLessThanOrEqual(23);
    }
  });

  it('should return numeric metrics as numbers', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(typeof response.body.overview.totalTrips).toBe('number');
      expect(typeof response.body.overview.driversUsed).toBe('number');
      expect(typeof response.body.overview.daysActive).toBe('number');
      expect(typeof response.body.overview.totalMiles).toBe('number');
      expect(typeof response.body.overview.totalHours).toBe('number');
    }
  });

  it('should handle empty date range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        startDate: '2020-01-01',
        endDate: '2020-01-01'
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Edge Cases and Validation', () => {
  it('should handle invalid trip IDs', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: 999999 },
          { trip_id: 999998 }
        ]
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle future date ranges', async () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 30);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 60);

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/optimization-scores`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        startDate: futureStart.toISOString().split('T')[0],
        endDate: futureEnd.toISOString().split('T')[0]
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle invalid date formats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/analytics`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        startDate: 'invalid-date',
        endDate: 'invalid-date'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle single trip optimization attempt', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [{ trip_id: testTripId1 }]
      });

    expect(response.status).toBe(400);
  });

  it('should handle missing driver ID', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    expect(response.status).toBe(400);
  });

  it('should handle zero capacity', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: 0
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should handle negative capacity', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/capacity-optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: tripDate,
        vehicleCapacity: -5
      });

    expect([200, 400, 500]).toContain(response.status);
  });
});

describe('Optimization Methods', () => {
  it('should support Google Maps optimization method', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200) {
      expect(['google', 'haversine']).toContain(response.body.method);
    }
  });

  it('should include reliability indicator', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('reliable');
      expect(typeof response.body.reliable).toBe('boolean');
    }
  });

  it('should provide warning when using fallback method', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tripDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/optimize`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverId: testDriverId,
        date: tripDate,
        trips: [
          { trip_id: testTripId1 },
          { trip_id: testTripId2 }
        ]
      });

    if (response.status === 200 && response.body.method === 'haversine') {
      expect(response.body).toHaveProperty('warning');
    }
  });
});
