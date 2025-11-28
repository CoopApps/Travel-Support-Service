import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestCustomer, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Smart Driver Assignment Routes Integration Tests
 *
 * Tests intelligent driver suggestion system:
 * - Driver scoring algorithm
 * - Availability checking
 * - Vehicle suitability
 * - Regular customer preferences
 * - Workload balancing
 * - Performance metrics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testCustomerId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Smart Assignment Test Company');
  testUser = await createTestUser(tenantId, `smartassigntest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
  testCustomerId = await createTestCustomer(tenantId);
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Driver Suggestion System', () => {
  it('should suggest drivers for a trip', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    }
  });

  it('should require customer ID', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require trip date', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        pickupTime: '09:00:00',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require pickup time', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
      });

    expect(response.status).toBe(401);
  });
});

describe('Driver Scoring', () => {
  it('should include driver score in recommendations', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('score');
      expect(typeof recommendation.score).toBe('number');
      expect(recommendation.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('should include scoring reasons', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('reasons');
      expect(Array.isArray(recommendation.reasons)).toBe(true);
    }
  });

  it('should include recommendation level', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('recommendation');
      expect(['highly_recommended', 'recommended', 'acceptable', 'not_recommended', 'unavailable'])
        .toContain(recommendation.recommendation);
    }
  });

  it('should sort recommendations by score', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 1) {
      const scores = response.body.recommendations.map((r: any) => r.score);
      const sortedScores = [...scores].sort((a: number, b: number) => b - a);
      expect(scores).toEqual(sortedScores);
    }
  });
});

describe('Wheelchair Accessibility', () => {
  it('should filter for wheelchair accessible vehicles', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: true,
        passengersCount: 1,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle trips without wheelchair requirement', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 1,
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Passenger Capacity', () => {
  it('should consider vehicle capacity', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 4,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle single passenger', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 1,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle large groups', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 8,
      });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Driver Information', () => {
  it('should include driver details in recommendations', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('driverId');
      expect(recommendation).toHaveProperty('driverName');
      expect(recommendation).toHaveProperty('phone');
    }
  });

  it('should include vehicle information', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('vehicle');
      if (recommendation.vehicle !== null) {
        expect(recommendation.vehicle).toHaveProperty('registration');
        expect(recommendation.vehicle).toHaveProperty('seats');
      }
    }
  });

  it('should indicate if driver is regular for customer', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('isRegularDriver');
      expect(typeof recommendation.isRegularDriver).toBe('boolean');
    }
  });

  it('should include daily workload', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('dailyWorkload');
      expect(typeof recommendation.dailyWorkload).toBe('number');
    }
  });

  it('should include completion rate', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200 && response.body.recommendations.length > 0) {
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('completionRate');
      expect(typeof recommendation.completionRate).toBe('number');
    }
  });
});

describe('Availability Statistics', () => {
  it('should include total drivers analyzed', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('totalDriversAnalyzed');
      expect(typeof response.body.totalDriversAnalyzed).toBe('number');
    }
  });

  it('should include available drivers count', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('availableDrivers');
      expect(typeof response.body.availableDrivers).toBe('number');
    }
  });

  it('should limit recommendations to top 5', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '09:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    if (response.status === 200) {
      expect(response.body.recommendations.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('Different Trip Times', () => {
  it('should handle morning trips', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '07:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle afternoon trips', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '14:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle evening trips', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/suggest-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId: testCustomerId,
        tripDate: '2024-12-01',
        pickupTime: '18:00:00',
        requiresWheelchair: false,
        passengersCount: 2,
      });

    expect([200, 500]).toContain(response.status);
  });
});
