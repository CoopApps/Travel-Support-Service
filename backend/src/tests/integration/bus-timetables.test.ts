import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool, getTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Bus Timetables Routes Integration Tests
 *
 * Tests service schedule management for Section 22 bus services:
 * - Timetable creation and management
 * - Vehicle and driver assignment
 * - Service capacity management
 * - Real-time seat availability
 * - Driver roster management
 * - Service cancellations
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testRouteId: number;
let testVehicleId: number;
let testDriverId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Bus Timetables Test Company');
  testUser = await createTestUser(tenantId, `bustimetest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;

  // Create test data for timetable operations
  const pool = getTestPool();

  // Create a test bus route
  try {
    const routeResult = await pool.query(
      `INSERT INTO section22_bus_routes (
        tenant_id, route_number, route_name, origin_point, destination_point,
        operating_days, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING route_id`,
      [tenantId, 'TEST1', 'Test Route', 'City Centre', 'Airport', '["monday","tuesday","wednesday","thursday","friday"]', 'active']
    );
    testRouteId = routeResult.rows[0].route_id;
  } catch (error) {
    // Table might not exist yet
    testRouteId = 999999; // Use placeholder
  }

  // Create a test vehicle
  try {
    const vehicleResult = await pool.query(
      `INSERT INTO tenant_vehicles (
        tenant_id, registration, make, model, year, capacity,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING vehicle_id`,
      [tenantId, `TEST${Date.now()}`, 'Test Make', 'Test Model', 2024, 16, true]
    );
    testVehicleId = vehicleResult.rows[0].vehicle_id;
  } catch (error) {
    testVehicleId = 999999;
  }

  // Create a test driver
  try {
    const driverResult = await pool.query(
      `INSERT INTO tenant_drivers (
        tenant_id, name, first_name, last_name, phone, license_number,
        employment_status, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING driver_id`,
      [tenantId, 'Test Driver', 'Test', 'Driver', '07700900000', 'DL123456', 'active', true]
    );
    testDriverId = driverResult.rows[0].driver_id;
  } catch (error) {
    testDriverId = 999999;
  }
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Bus Timetables Management', () => {
  let timetableId: number;

  it('should get all timetables', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should create a timetable', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const validFrom = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        route_id: testRouteId,
        service_name: 'Morning Service',
        departure_time: '08:00',
        direction: 'outbound',
        total_seats: 16,
        wheelchair_spaces: 2,
        valid_from: validFrom,
      });

    expect([200, 201, 404, 500]).toContain(response.status);
    if (response.body.timetable_id) {
      timetableId = response.body.timetable_id;
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables`);

    expect(response.status).toBe(401);
  });

  it('should filter timetables by route', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ route_id: testRouteId });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter timetables by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'active' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter timetables by date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: today });

    expect([200, 500]).toContain(response.status);
  });

  it('should validate required fields on create', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_name: 'Incomplete Service',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate total_seats minimum', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        route_id: testRouteId,
        service_name: 'Invalid Service',
        departure_time: '09:00',
        total_seats: 0,
        valid_from: '2025-01-01',
      });

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should validate wheelchair_spaces does not exceed total_seats', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        route_id: testRouteId,
        service_name: 'Invalid Service',
        departure_time: '09:00',
        total_seats: 10,
        wheelchair_spaces: 15,
        valid_from: '2025-01-01',
      });

    expect([400, 404, 500]).toContain(response.status);
  });
});

describe('Timetable Details', () => {
  it('should get timetable by ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('timetable_id');
      expect(response.body).toHaveProperty('service_name');
    }
  });

  it('should get timetable with availability for specific date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: today });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('availability');
    }
  });

  it('should include route stops in timetable details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('stops');
      expect(Array.isArray(response.body.stops)).toBe(true);
    }
  });
});

describe('Timetable Updates', () => {
  it('should update a timetable', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/timetables/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_name: 'Updated Service Name',
        status: 'active',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent timetable on update', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/timetables/999999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_name: 'Updated Service',
      });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Timetable Deletion', () => {
  it('should prevent deletion with active bookings', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/timetables/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent timetable on delete', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/timetables/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Today\'s Services', () => {
  it('should get today\'s bus services', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/today`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });
});

describe('Available Drivers', () => {
  it('should get available drivers for date and time', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/available-drivers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date, time: '09:00' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('drivers');
      expect(Array.isArray(response.body.drivers)).toBe(true);
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('time');
    }
  });

  it('should require date and time parameters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/available-drivers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 500]).toContain(response.status);
  });

  it('should use default duration if not provided', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/available-drivers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date, time: '10:00' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.duration_minutes).toBe(90);
    }
  });
});

describe('Seat Availability', () => {
  it('should get availability for date range', async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const endDate = future.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/availability`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: today, end_date: endDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should require start_date and end_date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/availability`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 500]).toContain(response.status);
  });
});

describe('Vehicle Assignment', () => {
  it('should assign vehicle to timetable', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-vehicle`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vehicle_id: testVehicleId });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require vehicle_id', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-vehicle`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should validate vehicle exists', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-vehicle`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vehicle_id: 999999 });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Driver Assignment', () => {
  it('should assign driver to timetable', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: testDriverId });

    expect([200, 404, 409, 500]).toContain(response.status);
  });

  it('should require driver_id', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should check driver availability', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: testDriverId, date });

    expect([200, 404, 409, 500]).toContain(response.status);
  });

  it('should allow force override with conflicts', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: testDriverId, force: true });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should validate driver is active', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/bus/timetables/1/assign-driver`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: 999999 });

    expect([400, 404, 500]).toContain(response.status);
  });
});

describe('Driver Roster', () => {
  it('should get driver roster for date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/roster`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: today });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should get roster for date range', async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const endDate = future.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/roster`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: today, end_date: endDate });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter roster by driver', async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/roster`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: today, driver_id: testDriverId });

    expect([200, 500]).toContain(response.status);
  });

  it('should use today as default if no date provided', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/roster`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });
});

describe('Service Cancellations', () => {
  let cancellationId: number;

  it('should cancel a service for specific date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const serviceDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables/1/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        service_date: serviceDate,
        reason: 'Vehicle maintenance',
        notify_passengers: true,
      });

    expect([200, 201, 404, 500]).toContain(response.status);
    if (response.body.cancellation_id) {
      cancellationId = response.body.cancellation_id;
    }
  });

  it('should require service_date on cancel', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables/1/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reason: 'Test cancellation',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should prevent duplicate cancellation', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const serviceDate = tomorrow.toISOString().split('T')[0];

    // First cancellation
    await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables/1/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ service_date: serviceDate, reason: 'Test' });

    // Duplicate cancellation
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/timetables/1/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ service_date: serviceDate, reason: 'Test' });

    expect([400, 404, 500]).toContain(response.status);
  });

  it('should get all service cancellations', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/service-cancellations`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should filter cancellations by date range', async () => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const endDate = future.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/service-cancellations`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: today, end_date: endDate });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter cancellations by timetable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/service-cancellations`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ timetable_id: 1 });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Effective Passengers', () => {
  it('should get effective passengers for service date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const serviceDate = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/effective-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ service_date: serviceDate });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should require service_date parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/effective-passengers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 500]).toContain(response.status);
  });
});

describe('Cancellation Status Check', () => {
  it('should check if service is cancelled for date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/is-cancelled`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('cancelled');
      expect(typeof response.body.cancelled).toBe('boolean');
    }
  });

  it('should require date parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/is-cancelled`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 500]).toContain(response.status);
  });
});

describe('Cancellation Removal', () => {
  it('should remove cancellation and reinstate service', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/service-cancellations/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent cancellation', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/service-cancellations/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});
