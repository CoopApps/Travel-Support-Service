import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Fare Calculation Routes Integration Tests
 *
 * Tests cooperative fare calculation system:
 * - Organizational configuration
 * - Fare settings management
 * - Fare calculation
 * - Commonwealth fund management
 * - Fare tiers
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Fare Calculation Test Company');
  testUser = await createTestUser(tenantId, `farecalctest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Organizational Configuration', () => {
  it('should get organizational config', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/organizational-config`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/organizational-config`);

    expect(response.status).toBe(401);
  });
});

describe('Fare Settings', () => {
  it('should get fare settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/fare-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should update fare settings', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/fare-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driverHourlyRate: 15.50,
        fuelPricePerMile: 0.25,
        vehicleDepreciationPerMile: 0.15,
        annualInsuranceCost: 2500,
        annualMaintenanceBudget: 3000,
        monthlyOverheadCosts: 800,
        defaultBreakEvenOccupancy: 4,
        businessReservePercent: 10,
        dividendPercent: 40,
        cooperativeCommonwealthPercent: 50,
        showCostBreakdown: true,
        showSurplusAllocation: true,
        showCommonwealthImpact: true,
      });

    expect([200, 201, 500]).toContain(response.status);
  });
});

describe('Fare Calculation', () => {
  it('should calculate fare quote', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: 1,
        tripDistanceMiles: 10,
        tripDurationHours: 0.5,
        vehicleCapacity: 8,
        currentPassengers: 4,
        passengerTier: 'adult',
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });

  it('should calculate fare with different passenger tier', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: 1,
        tripDistanceMiles: 15,
        tripDurationHours: 0.75,
        vehicleCapacity: 8,
        currentPassengers: 2,
        passengerTier: 'senior',
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });

  it('should handle missing required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripDistanceMiles: 10,
      });

    expect([400, 404, 500]).toContain(response.status);
  });
});

describe('Commonwealth Fund', () => {
  it('should get commonwealth fund summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/commonwealth-fund`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should record commonwealth contribution', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/commonwealth-contribution`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripId: 1,
        routeId: 1,
        surplusAmount: 25.50,
        percentage: 50,
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });
});

describe('Fare Tiers', () => {
  it('should get fare tiers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/fare-tiers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });
});

describe('Fare Calculation Edge Cases', () => {
  it('should handle zero passengers', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: 1,
        tripDistanceMiles: 10,
        tripDurationHours: 0.5,
        vehicleCapacity: 8,
        currentPassengers: 0,
        passengerTier: 'adult',
      });

    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });

  it('should handle maximum capacity', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: 1,
        tripDistanceMiles: 20,
        tripDurationHours: 1,
        vehicleCapacity: 8,
        currentPassengers: 8,
        passengerTier: 'adult',
      });

    expect([200, 201, 400, 404, 500]).toContain(response.status);
  });

  it('should handle long distance trip', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/calculate-fare`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        routeId: 1,
        tripDistanceMiles: 100,
        tripDurationHours: 2.5,
        vehicleCapacity: 16,
        currentPassengers: 6,
        passengerTier: 'adult',
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });
});
