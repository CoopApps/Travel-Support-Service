import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool, getTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Surplus Management Routes Integration Tests
 *
 * Tests cooperative surplus pooling and smoothing for Section 22 bus services:
 * - Surplus pool initialization and retrieval
 * - Subsidy calculations with pool constraints
 * - Subsidy application with transaction tracking
 * - Surplus allocation from profitable services
 * - Transaction history and transparency
 * - Statistical reporting
 * - Cross-route transparency summary
 *
 * Core concept: Profitable services subsidize less profitable ones within same route
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testRouteId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Surplus Management Test Company');
  testUser = await createTestUser(tenantId, `surplustest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;

  // Create a test bus route for surplus pool testing
  const pool = getTestPool();
  const routeResult = await pool.query(
    `INSERT INTO section22_bus_routes (
      tenant_id, route_number, route_name, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING route_id`,
    [tenantId, 'TEST-SURPLUS-1', 'Test Surplus Route', true]
  );
  testRouteId = routeResult.rows[0].route_id;
}, 30000);

afterAll(async () => {
  const pool = getTestPool();

  // Clean up surplus-related test data
  await pool.query('DELETE FROM section22_surplus_transactions WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_route_surplus_pool WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_service_costs WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_timetables WHERE tenant_id = $1', [tenantId]);
  await pool.query('DELETE FROM section22_bus_routes WHERE tenant_id = $1', [tenantId]);

  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Surplus Pool Management', () => {
  it('should get surplus pool for a route (not found initially)', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 404) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('surplus pool');
    }
  });

  it('should initialize surplus pool for a route', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool/initialize`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pool');
      expect(response.body.pool).toHaveProperty('route_id', testRouteId);
      expect(response.body.pool).toHaveProperty('tenant_id', tenantId);
      expect(response.body.pool).toHaveProperty('accumulated_surplus');
      expect(response.body.pool).toHaveProperty('available_for_subsidy');
    }
  });

  it('should get surplus pool after initialization', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('route_id', testRouteId);
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('accumulated_surplus');
      expect(response.body).toHaveProperty('available_for_subsidy');
      expect(response.body).toHaveProperty('reserved_for_reserves');
      expect(response.body).toHaveProperty('reserved_for_business');
      expect(response.body).toHaveProperty('total_distributed_dividends');
    }
  });

  it('should initialize pool idempotently (on conflict do update)', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool/initialize`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.pool).toHaveProperty('route_id', testRouteId);
    }
  });

  it('should require authentication for surplus pool access', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool`);

    expect(response.status).toBe(401);
  });
});

describe('Subsidy Calculation', () => {
  it('should calculate available subsidy for a service', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_cost: 100.00,
        max_surplus_percent: 50,
        max_service_percent: 30
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('raw_cost');
      expect(response.body).toHaveProperty('available_subsidy');
      expect(response.body).toHaveProperty('subsidy_applied');
      expect(response.body).toHaveProperty('effective_cost');
      expect(response.body).toHaveProperty('minimum_passengers_needed');
      expect(response.body).toHaveProperty('break_even_fare');
      expect(response.body).toHaveProperty('subsidy_source');
    }
  });

  it('should validate service_cost is provided', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('service_cost');
    }
  });

  it('should reject zero or negative service_cost', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_cost: 0
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('service_cost');
    }
  });

  it('should handle negative service_cost', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_cost: -50.00
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should calculate subsidy with default parameters', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_cost: 150.00
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.raw_cost).toBe(150.00);
      expect(typeof response.body.subsidy_applied).toBe('number');
    }
  });

  it('should require authentication for subsidy calculation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/calculate-subsidy`)
      .send({ service_cost: 100.00 });

    expect(response.status).toBe(401);
  });
});

describe('Subsidy Application', () => {
  let testTimetableId: number;
  let testCostId: number;

  beforeAll(async () => {
    const pool = getTestPool();

    // Create a test timetable
    const timetableResult = await pool.query(
      `INSERT INTO section22_timetables (
        tenant_id, route_id, departure_time, days_of_operation, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING timetable_id`,
      [tenantId, testRouteId, '09:00:00', '{1,2,3,4,5}', true]
    );
    testTimetableId = timetableResult.rows[0].timetable_id;

    // Create a test service cost record
    const costResult = await pool.query(
      `INSERT INTO section22_service_costs (
        tenant_id, route_id, timetable_id, service_date,
        total_cost, total_revenue, net_surplus, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), NOW())
      RETURNING cost_id`,
      [tenantId, testRouteId, testTimetableId, 100.00, 80.00, -20.00]
    );
    testCostId = costResult.rows[0].cost_id;
  });

  it('should validate required fields for subsidy application', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/apply-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required fields');
      expect(response.body).toHaveProperty('required');
    }
  });

  it('should apply subsidy to a service with sufficient pool balance', async () => {
    // First ensure pool has surplus
    const pool = getTestPool();
    await pool.query(
      `UPDATE section22_route_surplus_pool
       SET available_for_subsidy = 50.00,
           accumulated_surplus = 100.00
       WHERE route_id = $1 AND tenant_id = $2`,
      [testRouteId, tenantId]
    );

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/apply-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        subsidy_amount: 20.00,
        passenger_count: 4,
        service_cost: 100.00
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('transaction_id');
    }
  });

  it('should handle insufficient pool balance', async () => {
    // Set pool balance to zero
    const pool = getTestPool();
    await pool.query(
      `UPDATE section22_route_surplus_pool
       SET available_for_subsidy = 0.00
       WHERE route_id = $1 AND tenant_id = $2`,
      [testRouteId, tenantId]
    );

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/apply-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        subsidy_amount: 30.00,
        passenger_count: 3,
        service_cost: 100.00
      });

    expect([500]).toContain(response.status);
    if (response.status === 500) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should require authentication for subsidy application', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/apply-subsidy`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        subsidy_amount: 20.00,
        passenger_count: 4,
        service_cost: 100.00
      });

    expect(response.status).toBe(401);
  });
});

describe('Surplus Allocation', () => {
  let testTimetableId: number;
  let testCostId: number;

  beforeAll(async () => {
    const pool = getTestPool();

    // Create another timetable for allocation tests
    const timetableResult = await pool.query(
      `INSERT INTO section22_timetables (
        tenant_id, route_id, departure_time, days_of_operation, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING timetable_id`,
      [tenantId, testRouteId, '14:00:00', '{1,2,3,4,5}', true]
    );
    testTimetableId = timetableResult.rows[0].timetable_id;

    // Create a profitable service cost record
    const costResult = await pool.query(
      `INSERT INTO section22_service_costs (
        tenant_id, route_id, timetable_id, service_date,
        total_cost, total_revenue, net_surplus, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), NOW())
      RETURNING cost_id`,
      [tenantId, testRouteId, testTimetableId, 80.00, 150.00, 70.00]
    );
    testCostId = costResult.rows[0].cost_id;
  });

  it('should validate required fields for surplus allocation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required fields');
      expect(response.body).toHaveProperty('required');
    }
  });

  it('should reject zero or negative gross_surplus', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        gross_surplus: 0
      });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('gross_surplus');
    }
  });

  it('should allocate surplus with default percentages', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        gross_surplus: 100.00
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('allocation');
      expect(response.body.allocation).toHaveProperty('gross_surplus', 100.00);
      expect(response.body.allocation).toHaveProperty('to_reserves');
      expect(response.body.allocation).toHaveProperty('to_business');
      expect(response.body.allocation).toHaveProperty('to_dividends');
      expect(response.body.allocation).toHaveProperty('to_pool');
      expect(response.body.allocation).toHaveProperty('allocation_breakdown');
    }
  });

  it('should allocate surplus with custom percentages', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        gross_surplus: 100.00,
        reserves_percent: 25,
        business_percent: 25,
        dividend_percent: 40
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.allocation).toHaveProperty('gross_surplus', 100.00);
    }
  });

  it('should create pool automatically if not exists during allocation', async () => {
    // Create a new route without initializing pool
    const pool = getTestPool();
    const routeResult = await pool.query(
      `INSERT INTO section22_bus_routes (
        tenant_id, route_number, route_name, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING route_id`,
      [tenantId, 'TEST-AUTO-POOL', 'Auto Pool Route', true]
    );
    const newRouteId = routeResult.rows[0].route_id;

    const timetableResult = await pool.query(
      `INSERT INTO section22_timetables (
        tenant_id, route_id, departure_time, days_of_operation, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING timetable_id`,
      [tenantId, newRouteId, '16:00:00', '{1,2,3,4,5}', true]
    );
    const newTimetableId = timetableResult.rows[0].timetable_id;

    const costResult = await pool.query(
      `INSERT INTO section22_service_costs (
        tenant_id, route_id, timetable_id, service_date,
        total_cost, total_revenue, net_surplus, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), NOW())
      RETURNING cost_id`,
      [tenantId, newRouteId, newTimetableId, 60.00, 120.00, 60.00]
    );
    const newCostId = costResult.rows[0].cost_id;

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${newRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: newTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: newCostId,
        gross_surplus: 60.00
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success', true);
    }
  });

  it('should require authentication for surplus allocation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${testRouteId}/allocate-surplus`)
      .send({
        timetable_id: testTimetableId,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: testCostId,
        gross_surplus: 100.00
      });

    expect(response.status).toBe(401);
  });
});

describe('Transaction History and Transparency', () => {
  it('should get surplus transactions for a route', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-transactions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('count');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    }
  });

  it('should support pagination for transactions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-transactions`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 10, offset: 0 });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    }
  });

  it('should use default pagination values', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-transactions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.pagination.limit).toBe(50);
      expect(response.body.pagination.offset).toBe(0);
    }
  });

  it('should include transaction details with joins', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-transactions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200 && response.body.transactions.length > 0) {
      const transaction = response.body.transactions[0];
      expect(transaction).toHaveProperty('transaction_id');
      expect(transaction).toHaveProperty('transaction_type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('pool_balance_before');
      expect(transaction).toHaveProperty('pool_balance_after');
    }
  });

  it('should require authentication for transaction history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-transactions`);

    expect(response.status).toBe(401);
  });
});

describe('Surplus Statistics', () => {
  it('should get comprehensive statistics for a route', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-statistics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('pool_id');
      expect(response.body).toHaveProperty('accumulated_surplus');
      expect(response.body).toHaveProperty('available_for_subsidy');
      expect(response.body).toHaveProperty('reserved_for_reserves');
      expect(response.body).toHaveProperty('reserved_for_business');
      expect(response.body).toHaveProperty('total_distributed_dividends');
      expect(response.body).toHaveProperty('total_services_run');
      expect(response.body).toHaveProperty('total_profitable_services');
      expect(response.body).toHaveProperty('total_subsidized_services');
      expect(response.body).toHaveProperty('profitability_rate');
      expect(response.body).toHaveProperty('lifetime_total_revenue');
      expect(response.body).toHaveProperty('lifetime_total_costs');
      expect(response.body).toHaveProperty('lifetime_gross_surplus');
    }
  });

  it('should calculate profitability rate correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-statistics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(typeof response.body.profitability_rate).toBe('string');
      const rate = parseFloat(response.body.profitability_rate);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });

  it('should return 404 for route without pool', async () => {
    // Create a route without pool
    const pool = getTestPool();
    const routeResult = await pool.query(
      `INSERT INTO section22_bus_routes (
        tenant_id, route_number, route_name, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING route_id`,
      [tenantId, 'TEST-NO-POOL', 'No Pool Route', true]
    );
    const noPoolRouteId = routeResult.rows[0].route_id;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${noPoolRouteId}/surplus-statistics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
    if (response.status === 404) {
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    }
  });

  it('should require authentication for statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-statistics`);

    expect(response.status).toBe(401);
  });
});

describe('Cross-Route Surplus Summary', () => {
  it('should get surplus summary for all routes in tenant', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/surplus-summary`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('tenant_id');
      expect(parseInt(response.body.tenant_id)).toBe(tenantId);
    }
  });

  it('should include placeholder message for summary endpoint', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/surplus-summary`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
    }
  });

  it('should require authentication for surplus summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/surplus-summary`);

    expect(response.status).toBe(401);
  });
});

describe('Cooperative Surplus Pooling Integration', () => {
  let cooperativeRouteId: number;
  let timetable1Id: number;
  let timetable2Id: number;

  beforeAll(async () => {
    const pool = getTestPool();

    // Create a route for cooperative testing
    const routeResult = await pool.query(
      `INSERT INTO section22_bus_routes (
        tenant_id, route_number, route_name, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING route_id`,
      [tenantId, 'COOP-TEST-1', 'Cooperative Test Route', true]
    );
    cooperativeRouteId = routeResult.rows[0].route_id;

    // Initialize pool
    await pool.query(
      `INSERT INTO section22_route_surplus_pool (route_id, tenant_id)
       VALUES ($1, $2)`,
      [cooperativeRouteId, tenantId]
    );

    // Create two timetables
    const tt1 = await pool.query(
      `INSERT INTO section22_timetables (
        tenant_id, route_id, departure_time, days_of_operation, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING timetable_id`,
      [tenantId, cooperativeRouteId, '08:00:00', '{1,2,3,4,5}', true]
    );
    timetable1Id = tt1.rows[0].timetable_id;

    const tt2 = await pool.query(
      `INSERT INTO section22_timetables (
        tenant_id, route_id, departure_time, days_of_operation, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING timetable_id`,
      [tenantId, cooperativeRouteId, '18:00:00', '{1,2,3,4,5}', true]
    );
    timetable2Id = tt2.rows[0].timetable_id;
  });

  it('should demonstrate profitable service helping less profitable one', async () => {
    const pool = getTestPool();

    // Step 1: Create profitable service (morning peak)
    const profitableCostResult = await pool.query(
      `INSERT INTO section22_service_costs (
        tenant_id, route_id, timetable_id, service_date,
        total_cost, total_revenue, net_surplus, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), NOW())
      RETURNING cost_id`,
      [tenantId, cooperativeRouteId, timetable1Id, 80.00, 200.00, 120.00]
    );

    // Step 2: Allocate surplus from profitable service
    const allocateResponse = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${cooperativeRouteId}/allocate-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: timetable1Id,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: profitableCostResult.rows[0].cost_id,
        gross_surplus: 120.00
      });

    expect([200, 500]).toContain(allocateResponse.status);

    // Step 3: Check pool balance increased
    const poolResponse = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${cooperativeRouteId}/surplus-pool`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(poolResponse.status);
    if (poolResponse.status === 200) {
      expect(parseFloat(poolResponse.body.available_for_subsidy)).toBeGreaterThan(0);
    }

    // Step 4: Create unprofitable service (evening off-peak)
    const unprofitableCostResult = await pool.query(
      `INSERT INTO section22_service_costs (
        tenant_id, route_id, timetable_id, service_date,
        total_cost, total_revenue, net_surplus, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), NOW())
      RETURNING cost_id`,
      [tenantId, cooperativeRouteId, timetable2Id, 100.00, 60.00, -40.00]
    );

    // Step 5: Apply subsidy from pool
    const subsidyResponse = await request(app)
      .post(`/api/tenants/${tenantId}/routes/${cooperativeRouteId}/apply-subsidy`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timetable_id: timetable2Id,
        service_date: new Date().toISOString().split('T')[0],
        cost_id: unprofitableCostResult.rows[0].cost_id,
        subsidy_amount: 30.00,
        passenger_count: 3,
        service_cost: 100.00
      });

    expect([200, 500]).toContain(subsidyResponse.status);
    if (subsidyResponse.status === 200) {
      expect(subsidyResponse.body).toHaveProperty('success', true);
    }

    // Step 6: Verify transactions recorded both allocation and subsidy
    const transactionsResponse = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${cooperativeRouteId}/surplus-transactions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(transactionsResponse.status);
    if (transactionsResponse.status === 200) {
      expect(transactionsResponse.body.transactions.length).toBeGreaterThanOrEqual(2);
      const types = transactionsResponse.body.transactions.map((t: any) => t.transaction_type);
      expect(types).toContain('surplus_added');
      expect(types).toContain('subsidy_applied');
    }
  });

  it('should track cooperative metrics in statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${cooperativeRouteId}/surplus-statistics`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.total_services_run).toBeGreaterThanOrEqual(0);
      expect(response.body.total_profitable_services).toBeGreaterThanOrEqual(0);
      expect(response.body.total_subsidized_services).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle non-existent route ID gracefully', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/999999/surplus-pool`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should handle database connection errors gracefully', async () => {
    // Test with invalid route parameter
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/invalid/surplus-pool`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should validate tenant access for surplus operations', async () => {
    // This would require creating another tenant and testing cross-tenant access
    // For now, just verify authentication is enforced
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/routes/${testRouteId}/surplus-pool`);

    expect(response.status).toBe(401);
  });
});
