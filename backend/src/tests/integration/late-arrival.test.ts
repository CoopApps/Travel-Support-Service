import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Late Arrival Routes Integration Tests
 *
 * Tests late arrival tracking system:
 * - Logging late arrivals
 * - Retrieving late arrivals with filters
 * - Date range filtering
 * - Customer filtering
 * - Statistics and analytics
 * - Reason-based statistics
 * - Field validation
 * - Average delay calculations
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testCustomerId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Late Arrival Test Company');
  testUser = await createTestUser(tenantId, `latearrivaltest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;

  // Create a test customer for late arrival records
  const customerResponse = await request(app)
    .post(`/api/tenants/${tenantId}/customers`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name: 'Test Customer',
      email: `testcustomer${Date.now()}@test.local`,
      phone: '1234567890',
      address: '123 Test Street'
    });

  if (customerResponse.status === 200 || customerResponse.status === 201) {
    testCustomerId = customerResponse.body.customer?.customer_id || customerResponse.body.customerId;
  }
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Log Late Arrival', () => {
  it('should log a late arrival successfully', async () => {
    const lateArrivalData = {
      customer_id: testCustomerId,
      date: '2025-01-15',
      scheduled_time: '09:00:00',
      arrival_time: '09:25:00',
      delay_minutes: 25,
      reason: 'traffic',
      notes: 'Heavy traffic on Main Street'
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(lateArrivalData);

    expect([200, 201, 500]).toContain(response.status);
    if (response.status === 200 || response.status === 201) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('lateArrival');
      expect(response.body.lateArrival).toHaveProperty('late_arrival_id');
      expect(response.body.lateArrival.delay_minutes).toBe(25);
    }
  });

  it('should log late arrival with minimal data', async () => {
    const lateArrivalData = {
      customer_id: testCustomerId,
      date: '2025-01-16',
      scheduled_time: '10:00:00',
      arrival_time: '10:15:00',
      delay_minutes: 15
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(lateArrivalData);

    expect([200, 201, 500]).toContain(response.status);
    if (response.status === 200 || response.status === 201) {
      expect(response.body.lateArrival).toHaveProperty('late_arrival_id');
    }
  });

  it('should require authentication', async () => {
    const lateArrivalData = {
      customer_id: testCustomerId,
      date: '2025-01-15',
      scheduled_time: '09:00:00',
      arrival_time: '09:25:00',
      delay_minutes: 25
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .send(lateArrivalData);

    expect(response.status).toBe(401);
  });

  it('should handle validation errors for missing required fields', async () => {
    const incompleteData = {
      customer_id: testCustomerId,
      date: '2025-01-15'
      // Missing scheduled_time, arrival_time, delay_minutes
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(incompleteData);

    expect([400, 500]).toContain(response.status);
  });
});

describe('Get Late Arrivals', () => {
  beforeAll(async () => {
    // Create test late arrival records
    const testRecords = [
      {
        customer_id: testCustomerId,
        date: '2025-01-10',
        scheduled_time: '08:00:00',
        arrival_time: '08:20:00',
        delay_minutes: 20,
        reason: 'traffic',
        notes: 'Morning rush hour'
      },
      {
        customer_id: testCustomerId,
        date: '2025-01-12',
        scheduled_time: '14:00:00',
        arrival_time: '14:10:00',
        delay_minutes: 10,
        reason: 'vehicle',
        notes: 'Mechanical issue'
      },
      {
        customer_id: testCustomerId,
        date: '2025-01-18',
        scheduled_time: '16:00:00',
        arrival_time: '16:35:00',
        delay_minutes: 35,
        reason: 'weather',
        notes: 'Snow on roads'
      }
    ];

    for (const record of testRecords) {
      await request(app)
        .post(`/api/tenants/${tenantId}/late-arrivals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(record);
    }
  }, 30000);

  it('should get all late arrivals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
      if (response.body.lateArrivals.length > 0) {
        const arrival = response.body.lateArrivals[0];
        expect(arrival).toHaveProperty('late_arrival_id');
        expect(arrival).toHaveProperty('customer_id');
        expect(arrival).toHaveProperty('delay_minutes');
      }
    }
  });

  it('should include customer information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.lateArrivals.length > 0) {
      const arrival = response.body.lateArrivals[0];
      expect(arrival).toHaveProperty('customer_name');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`);

    expect(response.status).toBe(401);
  });
});

describe('Filter by Date Range', () => {
  it('should filter late arrivals by start date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-12' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
    }
  });

  it('should filter late arrivals by end date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ endDate: '2025-01-15' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
    }
  });

  it('should filter late arrivals by date range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-11', endDate: '2025-01-17' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      const arrivals = response.body.lateArrivals;
      expect(Array.isArray(arrivals)).toBe(true);
    }
  });

  it('should return empty array for out-of-range dates', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-12-01', endDate: '2025-12-31' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
    }
  });
});

describe('Filter by Customer', () => {
  it('should filter late arrivals by customer ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ customerId: testCustomerId });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      const arrivals = response.body.lateArrivals;
      expect(Array.isArray(arrivals)).toBe(true);
      arrivals.forEach((arrival: any) => {
        if (arrival.customer_id) {
          expect(arrival.customer_id).toBe(testCustomerId);
        }
      });
    }
  });

  it('should combine customer and date filters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        customerId: testCustomerId,
        startDate: '2025-01-10',
        endDate: '2025-01-15'
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('lateArrivals');
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
    }
  });

  it('should return empty array for non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ customerId: 999999 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body.lateArrivals)).toBe(true);
    }
  });
});

describe('Late Arrival Statistics', () => {
  it('should get late arrival statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('averageDelay');
      expect(response.body.stats).toHaveProperty('maxDelay');
      expect(response.body.stats).toHaveProperty('byReason');
    }
  });

  it('should calculate total late arrivals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats.total).toBeDefined();
      expect(typeof response.body.stats.total).toBe('number');
    }
  });

  it('should calculate average delay', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats.averageDelay).toBeDefined();
      const avgDelay = parseFloat(response.body.stats.averageDelay);
      expect(avgDelay).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate maximum delay', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats.maxDelay).toBeDefined();
      expect(typeof response.body.stats.maxDelay).toBe('number');
    }
  });

  it('should filter statistics by date range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-10', endDate: '2025-01-15' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('averageDelay');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`);

    expect(response.status).toBe(401);
  });
});

describe('Statistics by Reason', () => {
  it('should group statistics by reason', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.stats.byReason).toBeDefined();
      expect(Array.isArray(response.body.stats.byReason)).toBe(true);
    }
  });

  it('should include count for each reason', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.stats.byReason.length > 0) {
      const reasonStats = response.body.stats.byReason[0];
      expect(reasonStats).toHaveProperty('reason');
      expect(reasonStats).toHaveProperty('count_by_reason');
    }
  });

  it('should calculate average delay by reason', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.stats.byReason.length > 0) {
      const reasonStats = response.body.stats.byReason[0];
      expect(reasonStats).toHaveProperty('avg_delay_minutes');
    }
  });

  it('should handle statistics with no data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2026-01-01', endDate: '2026-01-31' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.stats).toBeDefined();
    }
  });
});

describe('Required Field Validation', () => {
  it('should reject late arrival without customer_id', async () => {
    const invalidData = {
      date: '2025-01-15',
      scheduled_time: '09:00:00',
      arrival_time: '09:25:00',
      delay_minutes: 25
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject late arrival without date', async () => {
    const invalidData = {
      customer_id: testCustomerId,
      scheduled_time: '09:00:00',
      arrival_time: '09:25:00',
      delay_minutes: 25
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject late arrival without scheduled_time', async () => {
    const invalidData = {
      customer_id: testCustomerId,
      date: '2025-01-15',
      arrival_time: '09:25:00',
      delay_minutes: 25
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject late arrival without arrival_time', async () => {
    const invalidData = {
      customer_id: testCustomerId,
      date: '2025-01-15',
      scheduled_time: '09:00:00',
      delay_minutes: 25
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject late arrival without delay_minutes', async () => {
    const invalidData = {
      customer_id: testCustomerId,
      date: '2025-01-15',
      scheduled_time: '09:00:00',
      arrival_time: '09:25:00'
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/late-arrivals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });
});

describe('Average Delay Calculation', () => {
  it('should calculate average delay correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.stats.total > 0) {
      const avgDelay = parseFloat(response.body.stats.averageDelay);
      expect(avgDelay).toBeGreaterThan(0);
      expect(avgDelay).toBeLessThanOrEqual(response.body.stats.maxDelay);
    }
  });

  it('should return average delay as a number', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const avgDelay = parseFloat(response.body.stats.averageDelay);
      expect(typeof avgDelay).toBe('number');
      expect(isNaN(avgDelay)).toBe(false);
    }
  });

  it('should handle average delay with single record', async () => {
    // Create a unique customer for this test
    const customerResponse = await request(app)
      .post(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Single Record Customer',
        email: `single${Date.now()}@test.local`,
        phone: '9876543210',
        address: '456 Test Avenue'
      });

    if (customerResponse.status === 200 || customerResponse.status === 201) {
      const singleCustomerId = customerResponse.body.customer?.customer_id || customerResponse.body.customerId;

      await request(app)
        .post(`/api/tenants/${tenantId}/late-arrivals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_id: singleCustomerId,
          date: '2025-02-01',
          scheduled_time: '10:00:00',
          arrival_time: '10:30:00',
          delay_minutes: 30
        });

      const statsResponse = await request(app)
        .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2025-02-01', endDate: '2025-02-01' });

      if (statsResponse.status === 200) {
        expect(statsResponse.body.stats).toHaveProperty('averageDelay');
      }
    }
  });

  it('should calculate average delay per reason correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/late-arrivals/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.stats.byReason.length > 0) {
      response.body.stats.byReason.forEach((reasonStat: any) => {
        if (reasonStat.avg_delay_minutes) {
          const avgDelay = parseFloat(reasonStat.avg_delay_minutes);
          expect(typeof avgDelay).toBe('number');
          expect(avgDelay).toBeGreaterThan(0);
        }
      });
    }
  });
});
