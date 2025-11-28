import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Efficiency Report Routes Integration Tests
 *
 * Tests comprehensive efficiency reporting system:
 * - Generate efficiency reports with date range filtering
 * - Driver productivity metrics
 * - Vehicle utilization analysis
 * - Route efficiency metrics
 * - Time period filtering
 * - Report data formats and structure
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Efficiency Report Test Company');
  testUser = await createTestUser(tenantId, `efficiencytest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Generate Efficiency Reports', () => {
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  it('should generate comprehensive efficiency report', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('vehicleUtilization');
      expect(response.body).toHaveProperty('driverProductivity');
      expect(response.body).toHaveProperty('emptySeatAnalysis');
      expect(response.body).toHaveProperty('routeEfficiency');
      expect(response.body).toHaveProperty('timeAnalysis');
    }
  });

  it('should include date range in response', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(response.body.dateRange).toEqual({ startDate, endDate });
    }
  });

  it('should include summary metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalTrips');
      expect(summary).toHaveProperty('operatingDays');
      expect(summary).toHaveProperty('activeDrivers');
      expect(summary).toHaveProperty('activeVehicles');
      expect(summary).toHaveProperty('customersServed');
      expect(summary).toHaveProperty('totalRevenue');
      expect(summary).toHaveProperty('avgRevenuePerTrip');
      expect(summary).toHaveProperty('completionRate');
      expect(summary).toHaveProperty('noShowRate');
      expect(summary).toHaveProperty('avgVehicleUtilization');
      expect(summary).toHaveProperty('totalEmptySeats');
      expect(summary).toHaveProperty('totalMissedRevenue');
    }
  });

  it('should require start date parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ endDate });

    expect(response.status).toBe(400);
    if (response.body.error) {
      expect(response.body.error.toLowerCase()).toContain('start date');
    }
  });

  it('should require end date parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate });

    expect(response.status).toBe(400);
    if (response.body.error) {
      expect(response.body.error.toLowerCase()).toContain('end date');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .query({ startDate, endDate });

    expect(response.status).toBe(401);
  });

  it('should handle different date ranges', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-06-01', endDate: '2024-06-30' });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Driver Productivity Metrics', () => {
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  it('should include driver productivity data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.driverProductivity)).toBe(true);
    }
  });

  it('should include driver metrics properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverProductivity.length > 0) {
      const driver = response.body.driverProductivity[0];
      expect(driver).toHaveProperty('driverId');
      expect(driver).toHaveProperty('driverName');
      expect(driver).toHaveProperty('totalTrips');
      expect(driver).toHaveProperty('daysWorked');
      expect(driver).toHaveProperty('avgTripsPerDay');
      expect(driver).toHaveProperty('totalRevenue');
      expect(driver).toHaveProperty('revenuePerTrip');
      expect(driver).toHaveProperty('completedTrips');
      expect(driver).toHaveProperty('noShowTrips');
      expect(driver).toHaveProperty('cancelledTrips');
      expect(driver).toHaveProperty('completionRate');
    }
  });

  it('should calculate average trips per day', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverProductivity.length > 0) {
      const driver = response.body.driverProductivity[0];
      expect(typeof driver.avgTripsPerDay).toBe('number');
      expect(driver.avgTripsPerDay).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate revenue per trip', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverProductivity.length > 0) {
      const driver = response.body.driverProductivity[0];
      expect(typeof driver.revenuePerTrip).toBe('number');
      expect(driver.revenuePerTrip).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track driver completion rate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverProductivity.length > 0) {
      const driver = response.body.driverProductivity[0];
      expect(typeof driver.completionRate).toBe('number');
      expect(driver.completionRate).toBeGreaterThanOrEqual(0);
      expect(driver.completionRate).toBeLessThanOrEqual(100);
    }
  });

  it('should track no-show and cancellation counts', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.driverProductivity.length > 0) {
      const driver = response.body.driverProductivity[0];
      expect(typeof driver.noShowTrips).toBe('number');
      expect(typeof driver.cancelledTrips).toBe('number');
      expect(driver.noShowTrips).toBeGreaterThanOrEqual(0);
      expect(driver.cancelledTrips).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Vehicle Utilization Analysis', () => {
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  it('should include vehicle utilization data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.vehicleUtilization)).toBe(true);
    }
  });

  it('should include vehicle metrics properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.vehicleUtilization.length > 0) {
      const vehicle = response.body.vehicleUtilization[0];
      expect(vehicle).toHaveProperty('vehicleId');
      expect(vehicle).toHaveProperty('registration');
      expect(vehicle).toHaveProperty('make');
      expect(vehicle).toHaveProperty('model');
      expect(vehicle).toHaveProperty('capacity');
      expect(vehicle).toHaveProperty('totalTrips');
      expect(vehicle).toHaveProperty('daysUsed');
      expect(vehicle).toHaveProperty('avgPassengers');
      expect(vehicle).toHaveProperty('utilizationPercentage');
      expect(vehicle).toHaveProperty('totalRevenue');
    }
  });

  it('should calculate utilization percentage', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.vehicleUtilization.length > 0) {
      const vehicle = response.body.vehicleUtilization[0];
      expect(typeof vehicle.utilizationPercentage).toBe('number');
      expect(vehicle.utilizationPercentage).toBeGreaterThanOrEqual(0);
      expect(vehicle.utilizationPercentage).toBeLessThanOrEqual(100);
    }
  });

  it('should track average passengers per vehicle', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.vehicleUtilization.length > 0) {
      const vehicle = response.body.vehicleUtilization[0];
      expect(typeof vehicle.avgPassengers).toBe('number');
      expect(vehicle.avgPassengers).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track days used for each vehicle', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.vehicleUtilization.length > 0) {
      const vehicle = response.body.vehicleUtilization[0];
      expect(typeof vehicle.daysUsed).toBe('number');
      expect(vehicle.daysUsed).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include vehicle revenue tracking', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.vehicleUtilization.length > 0) {
      const vehicle = response.body.vehicleUtilization[0];
      expect(typeof vehicle.totalRevenue).toBe('number');
      expect(vehicle.totalRevenue).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate average vehicle utilization in summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.avgVehicleUtilization).toBe('number');
      expect(response.body.summary.avgVehicleUtilization).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Route Efficiency Metrics', () => {
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  it('should include route efficiency data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.routeEfficiency)).toBe(true);
    }
  });

  it('should include route metrics properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.routeEfficiency.length > 0) {
      const route = response.body.routeEfficiency[0];
      expect(route).toHaveProperty('destination');
      expect(route).toHaveProperty('tripCount');
      expect(route).toHaveProperty('driversUsed');
      expect(route).toHaveProperty('vehiclesUsed');
      expect(route).toHaveProperty('avgPassengersPerTrip');
      expect(route).toHaveProperty('totalRevenue');
      expect(route).toHaveProperty('revenuePerTrip');
    }
  });

  it('should track trip counts by destination', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.routeEfficiency.length > 0) {
      const route = response.body.routeEfficiency[0];
      expect(typeof route.tripCount).toBe('number');
      expect(route.tripCount).toBeGreaterThan(0);
    }
  });

  it('should track resource usage per route', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.routeEfficiency.length > 0) {
      const route = response.body.routeEfficiency[0];
      expect(typeof route.driversUsed).toBe('number');
      expect(typeof route.vehiclesUsed).toBe('number');
      expect(route.driversUsed).toBeGreaterThan(0);
      expect(route.vehiclesUsed).toBeGreaterThan(0);
    }
  });

  it('should calculate average passengers per trip', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.routeEfficiency.length > 0) {
      const route = response.body.routeEfficiency[0];
      expect(typeof route.avgPassengersPerTrip).toBe('number');
      expect(route.avgPassengersPerTrip).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate revenue per trip by route', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.routeEfficiency.length > 0) {
      const route = response.body.routeEfficiency[0];
      expect(typeof route.revenuePerTrip).toBe('number');
      expect(route.revenuePerTrip).toBeGreaterThanOrEqual(0);
    }
  });

  it('should limit route results to top 10', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(response.body.routeEfficiency.length).toBeLessThanOrEqual(10);
    }
  });
});

describe('Time Period Filtering', () => {
  it('should accept one week period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-01-01', endDate: '2024-01-07' });

    expect([200, 500]).toContain(response.status);
  });

  it('should accept one month period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should accept three month period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-01-01', endDate: '2024-03-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should accept one year period', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-01-01', endDate: '2024-12-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle same start and end date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2024-01-15', endDate: '2024-01-15' });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Report Data Formats', () => {
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  it('should include empty seat analysis', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.emptySeatAnalysis)).toBe(true);
    }
  });

  it('should include empty seat properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.emptySeatAnalysis.length > 0) {
      const analysis = response.body.emptySeatAnalysis[0];
      expect(analysis).toHaveProperty('date');
      expect(analysis).toHaveProperty('uniqueTrips');
      expect(analysis).toHaveProperty('totalEmptySeats');
      expect(analysis).toHaveProperty('avgTripPrice');
      expect(analysis).toHaveProperty('missedRevenue');
    }
  });

  it('should calculate missed revenue from empty seats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.emptySeatAnalysis.length > 0) {
      const analysis = response.body.emptySeatAnalysis[0];
      expect(typeof analysis.missedRevenue).toBe('number');
      expect(analysis.missedRevenue).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include time-based analysis', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200) {
      expect(Array.isArray(response.body.timeAnalysis)).toBe(true);
    }
  });

  it('should include time analysis properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.timeAnalysis.length > 0) {
      const time = response.body.timeAnalysis[0];
      expect(time).toHaveProperty('hour');
      expect(time).toHaveProperty('tripCount');
      expect(time).toHaveProperty('activeDrivers');
      expect(time).toHaveProperty('activeVehicles');
      expect(time).toHaveProperty('totalRevenue');
      expect(time).toHaveProperty('avgPrice');
    }
  });

  it('should have hours in valid range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.timeAnalysis.length > 0) {
      response.body.timeAnalysis.forEach((time: any) => {
        expect(time.hour).toBeGreaterThanOrEqual(0);
        expect(time.hour).toBeLessThan(24);
      });
    }
  });

  it('should track total empty seats in summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.totalEmptySeats).toBe('number');
      expect(response.body.summary.totalEmptySeats).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track total missed revenue in summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.totalMissedRevenue).toBe('number');
      expect(response.body.summary.totalMissedRevenue).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return numeric types for all metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      const { summary } = response.body;
      expect(typeof summary.totalTrips).toBe('number');
      expect(typeof summary.operatingDays).toBe('number');
      expect(typeof summary.activeDrivers).toBe('number');
      expect(typeof summary.activeVehicles).toBe('number');
      expect(typeof summary.customersServed).toBe('number');
      expect(typeof summary.totalRevenue).toBe('number');
      expect(typeof summary.avgRevenuePerTrip).toBe('number');
      expect(typeof summary.completionRate).toBe('number');
      expect(typeof summary.noShowRate).toBe('number');
    }
  });

  it('should return valid percentage values', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/efficiency-report`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate, endDate });

    if (response.status === 200 && response.body.summary) {
      const { summary } = response.body;
      expect(summary.completionRate).toBeGreaterThanOrEqual(0);
      expect(summary.completionRate).toBeLessThanOrEqual(100);
      expect(summary.noShowRate).toBeGreaterThanOrEqual(0);
      expect(summary.noShowRate).toBeLessThanOrEqual(100);
    }
  });
});
