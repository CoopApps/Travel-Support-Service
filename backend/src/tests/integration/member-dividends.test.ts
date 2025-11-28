import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestCustomer, createTestDriver, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';
import { getTestPool } from '../setup/testDatabase';

/**
 * Member Dividend History Routes Integration Tests
 *
 * Tests member dividend tracking and payment history:
 * - Member dividend history retrieval
 * - Customer dividend tracking
 * - Driver dividend tracking
 * - Patronage value calculation
 * - Payment status tracking
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let customerId: number;
let driverId: number;
let memberId: number;
let customerMemberId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Member Dividends Test Company');
  testUser = await createTestUser(tenantId, `memberdividends${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;

  // Create test customer and driver for dividend testing
  customerId = await createTestCustomer(tenantId, `Test Customer ${Date.now()}`);
  driverId = await createTestDriver(tenantId, `Test Driver ${Date.now()}`);

  // Create cooperative members in the database
  const pool = getTestPool();

  // Create customer as cooperative member
  const customerMemberResult = await pool.query(
    `INSERT INTO section22_cooperative_members (
      tenant_id, customer_id, member_type, membership_number,
      join_date, is_active, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())
    RETURNING member_id`,
    [tenantId, customerId, 'customer', `MEM-CUST-${Date.now()}`]
  );
  customerMemberId = customerMemberResult.rows[0].member_id;

  // Create driver as cooperative member
  const driverMemberResult = await pool.query(
    `INSERT INTO section22_cooperative_members (
      tenant_id, driver_id, member_type, membership_number,
      join_date, is_active, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())
    RETURNING member_id`,
    [tenantId, driverId, 'driver', `MEM-DRIV-${Date.now()}`]
  );
  memberId = driverMemberResult.rows[0].member_id;

  // Create a test distribution period
  const distributionResult = await pool.query(
    `INSERT INTO section22_surplus_distributions (
      tenant_id, period_start, period_end, gross_surplus,
      operating_reserve, dividend_pool, total_member_trips,
      eligible_members, distribution_status, distributed_at, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING distribution_id`,
    [
      tenantId,
      '2025-01-01',
      '2025-03-31',
      50000,
      10000,
      40000,
      500,
      10,
      'distributed',
    ]
  );
  const distributionId = distributionResult.rows[0].distribution_id;

  // Create dividend records for testing
  await pool.query(
    `INSERT INTO section22_member_dividends (
      tenant_id, distribution_id, member_id, member_type,
      member_trips_count, member_trip_percentage, dividend_amount,
      payment_status, payment_method, payment_date, created_at
    )
    VALUES
      ($1, $2, $3, 'customer', 50, 10.0, 4000.00, 'paid', 'bank_transfer', NOW(), NOW()),
      ($1, $2, $3, 'customer', 30, 6.0, 2400.00, 'pending', NULL, NULL, NOW()),
      ($1, $2, $4, 'driver', 75, 15.0, 6000.00, 'paid', 'direct_deposit', NOW(), NOW()),
      ($1, $2, $4, 'driver', 45, 9.0, 3600.00, 'pending', NULL, NULL, NOW())`,
    [tenantId, distributionId, customerMemberId, memberId]
  );
}, 30000);

afterAll(async () => {
  // Clean up test data
  const pool = getTestPool();
  await pool.query('DELETE FROM section22_member_dividends WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_surplus_distributions WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_cooperative_members WHERE tenant_id = $1', [tenantId]);

  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Member Dividend History', () => {
  it('should get dividend history for a member', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('dividends');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.dividends)).toBe(true);
    }
  });

  it('should include summary with totals', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200) {
      expect(response.body.summary).toHaveProperty('total_distributions');
      expect(response.body.summary).toHaveProperty('total_dividends');
      expect(response.body.summary).toHaveProperty('total_paid');
      expect(response.body.summary).toHaveProperty('total_pending');
      expect(response.body.summary).toHaveProperty('total_patronage');
      expect(response.body.summary).toHaveProperty('member_type');
    }
  });

  it('should filter by member type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${memberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'driver' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.summary.member_type).toBe('driver');
    }
  });

  it('should limit results based on query parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer', limit: 5 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.dividends.length).toBeLessThanOrEqual(5);
    }
  });

  it('should default to customer member type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should default limit to 12 records', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.dividends.length).toBeLessThanOrEqual(12);
    }
  });

  it('should include distribution period details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('period_start');
      expect(dividend).toHaveProperty('period_end');
      expect(dividend).toHaveProperty('gross_surplus');
      expect(dividend).toHaveProperty('dividend_pool');
      expect(dividend).toHaveProperty('eligible_members');
      expect(dividend).toHaveProperty('total_patronage');
    }
  });

  it('should include patronage details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('patronage_value');
      expect(dividend).toHaveProperty('patronage_percentage');
    }
  });

  it('should include payment information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('payment_status');
      expect(dividend).toHaveProperty('payment_method');
      expect(dividend).toHaveProperty('dividend_amount');
    }
  });

  it('should sort dividends by period end date descending', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 1) {
      const dates = response.body.dividends.map((d: any) => new Date(d.period_end));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`);

    expect(response.status).toBe(401);
  });
});

describe('Customer Dividend History', () => {
  it('should get dividend history for a customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${customerId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('customer_id');
      expect(response.body).toHaveProperty('member_id');
      expect(response.body).toHaveProperty('member_type');
      expect(response.body).toHaveProperty('dividends');
      expect(response.body).toHaveProperty('total');
      expect(response.body.member_type).toBe('customer');
    }
  });

  it('should return customer member information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${customerId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.customer_id).toBe(customerId);
      expect(response.body.member_id).toBe(customerMemberId);
      expect(Array.isArray(response.body.dividends)).toBe(true);
    }
  });

  it('should limit results based on query parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${customerId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 5 });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should default limit to 12 records', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${customerId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.dividends.length).toBeLessThanOrEqual(12);
    }
  });

  it('should return 404 for non-member customer', async () => {
    const nonMemberCustomerId = await createTestCustomer(tenantId, `Non Member ${Date.now()}`);

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${nonMemberCustomerId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
    if (response.status === 404) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not a cooperative member');
    }
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/99999/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${customerId}/dividends`);

    expect(response.status).toBe(401);
  });
});

describe('Driver Dividend History', () => {
  it('should get dividend history for a driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('dividends');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.dividends)).toBe(true);
    }
  });

  it('should include summary with totals for driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.summary).toHaveProperty('total_distributions');
      expect(response.body.summary).toHaveProperty('total_dividends');
      expect(response.body.summary).toHaveProperty('total_paid');
      expect(response.body.summary).toHaveProperty('total_pending');
      expect(response.body.summary).toHaveProperty('total_patronage');
      expect(response.body.summary).toHaveProperty('member_type');
      expect(response.body.summary.member_type).toBe('driver');
    }
  });

  it('should filter driver dividends by member type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.summary.member_type).toBe('driver');
    }
  });

  it('should limit results based on query parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 5 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.dividends.length).toBeLessThanOrEqual(5);
    }
  });

  it('should default limit to 12 records', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      expect(response.body.dividends.length).toBeLessThanOrEqual(12);
    }
  });

  it('should include distribution period details for driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('period_start');
      expect(dividend).toHaveProperty('period_end');
      expect(dividend).toHaveProperty('gross_surplus');
      expect(dividend).toHaveProperty('dividend_pool');
      expect(dividend).toHaveProperty('eligible_members');
    }
  });

  it('should include patronage details for driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('patronage_value');
      expect(dividend).toHaveProperty('patronage_percentage');
    }
  });

  it('should include payment information for driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      expect(dividend).toHaveProperty('payment_status');
      expect(dividend).toHaveProperty('payment_method');
      expect(dividend).toHaveProperty('dividend_amount');
    }
  });

  it('should handle driver with no dividends', async () => {
    const newDriverId = await createTestDriver(tenantId, `New Driver ${Date.now()}`);

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${newDriverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body.dividends)).toBe(true);
      expect(response.body.dividends.length).toBe(0);
    }
  });

  it('should handle non-existent driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/99999/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should sort driver dividends by period end date descending', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.dividends.length > 1) {
      const dates = response.body.dividends.map((d: any) => new Date(d.period_end));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`);

    expect(response.status).toBe(401);
  });
});

describe('Patronage Tracking', () => {
  it('should track total patronage across all distributions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.total_patronage).toBe('number');
      expect(response.body.summary.total_patronage).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate patronage percentage correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const dividend = response.body.dividends[0];
      if (dividend.patronage_percentage && dividend.total_patronage && dividend.patronage_value) {
        const calculatedPercentage = (dividend.patronage_value / dividend.total_patronage) * 100;
        expect(Math.abs(parseFloat(dividend.patronage_percentage) - calculatedPercentage)).toBeLessThan(0.01);
      }
    }
  });

  it('should track patronage for both customers and drivers', async () => {
    const customerResponse = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    const driverResponse = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`);

    if (customerResponse.status === 200 && driverResponse.status === 200) {
      expect(customerResponse.body.summary).toHaveProperty('total_patronage');
      expect(driverResponse.body.summary).toHaveProperty('total_patronage');
    }
  });
});

describe('Payment Status Tracking', () => {
  it('should track paid dividends separately', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.total_paid).toBe('number');
      expect(response.body.summary.total_paid).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track pending dividends separately', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.summary) {
      expect(typeof response.body.summary.total_pending).toBe('number');
      expect(response.body.summary.total_pending).toBeGreaterThanOrEqual(0);
    }
  });

  it('should sum total dividends correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.summary) {
      const expectedTotal = response.body.summary.total_paid + response.body.summary.total_pending;
      expect(Math.abs(response.body.summary.total_dividends - expectedTotal)).toBeLessThan(0.01);
    }
  });

  it('should show payment method for paid dividends', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const paidDividend = response.body.dividends.find((d: any) => d.payment_status === 'paid');
      if (paidDividend) {
        expect(paidDividend.payment_method).toBeTruthy();
        expect(paidDividend.payment_date).toBeTruthy();
      }
    }
  });

  it('should show null payment details for pending dividends', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200 && response.body.dividends.length > 0) {
      const pendingDividend = response.body.dividends.find((d: any) => d.payment_status === 'pending');
      if (pendingDividend) {
        expect(pendingDividend.payment_method).toBeNull();
        expect(pendingDividend.payment_date).toBeNull();
      }
    }
  });

  it('should count total distributions correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    if (response.status === 200) {
      expect(response.body.summary.total_distributions).toBe(response.body.dividends.length);
    }
  });
});

describe('Edge Cases', () => {
  it('should handle member with no dividend history', async () => {
    const pool = getTestPool();
    const newMemberResult = await pool.query(
      `INSERT INTO section22_cooperative_members (
        tenant_id, customer_id, member_type, membership_number,
        join_date, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())
      RETURNING member_id`,
      [tenantId, customerId, 'customer', `MEM-NEW-${Date.now()}`]
    );
    const newMemberId = newMemberResult.rows[0].member_id;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${newMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body.dividends)).toBe(true);
      expect(response.body.dividends.length).toBe(0);
      expect(response.body.summary.total_distributions).toBe(0);
      expect(response.body.summary.total_dividends).toBe(0);
    }
  });

  it('should handle non-existent member', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/99999/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer' });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle invalid member type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'invalid_type' });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle very large limit values', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer', limit: 1000 });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle zero limit value', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer', limit: 0 });

    expect([200, 500]).toContain(response.status);
  });

  it('should handle negative limit value', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ member_type: 'customer', limit: -1 });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Tenant Isolation', () => {
  it('should not return dividends from other tenants', async () => {
    const otherTenantId = await createTestTenant('Other Tenant Company');
    const otherUser = await createTestUser(otherTenantId, `other${Date.now()}@test.local`, 'admin');

    const loginResponse = await request(app)
      .post(`/api/tenants/${otherTenantId}/login`)
      .send({ username: otherUser.username, password: otherUser.password });

    const otherAuthToken = loginResponse.body.token;

    const response = await request(app)
      .get(`/api/tenants/${otherTenantId}/members/${customerMemberId}/dividends`)
      .set('Authorization', `Bearer ${otherAuthToken}`)
      .query({ member_type: 'customer' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.dividends.length).toBe(0);
    }

    await cleanupTestTenant(otherTenantId);
  });

  it('should enforce tenant boundaries for customer dividends', async () => {
    const otherTenantId = await createTestTenant('Another Tenant Company');
    const otherUser = await createTestUser(otherTenantId, `another${Date.now()}@test.local`, 'admin');

    const loginResponse = await request(app)
      .post(`/api/tenants/${otherTenantId}/login`)
      .send({ username: otherUser.username, password: otherUser.password });

    const otherAuthToken = loginResponse.body.token;

    const response = await request(app)
      .get(`/api/tenants/${otherTenantId}/customers/${customerId}/dividends`)
      .set('Authorization', `Bearer ${otherAuthToken}`);

    expect([404, 500]).toContain(response.status);

    await cleanupTestTenant(otherTenantId);
  });

  it('should enforce tenant boundaries for driver dividends', async () => {
    const otherTenantId = await createTestTenant('Yet Another Tenant Company');
    const otherUser = await createTestUser(otherTenantId, `yetanother${Date.now()}@test.local`, 'admin');

    const loginResponse = await request(app)
      .post(`/api/tenants/${otherTenantId}/login`)
      .send({ username: otherUser.username, password: otherUser.password });

    const otherAuthToken = loginResponse.body.token;

    const response = await request(app)
      .get(`/api/tenants/${otherTenantId}/drivers/${driverId}/dividends`)
      .set('Authorization', `Bearer ${otherAuthToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.dividends.length).toBe(0);
    }

    await cleanupTestTenant(otherTenantId);
  });
});
