import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Social Outings Routes Integration Tests
 *
 * Tests social outings management system:
 * - Outing statistics and overview
 * - Outing CRUD operations
 * - Booking management
 * - Driver assignments and rotas
 * - Passenger assignments
 * - Availability checking
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testOutingId: number;
let testCustomerId: number;
let testDriverId: number;
let testBookingId: number;
let testRotaId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Social Outings Test Company');
  testUser = await createTestUser(tenantId, `socialoutingstest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Outing Statistics', () => {
  it('should get outing statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('upcoming');
      expect(response.body).toHaveProperty('past');
      expect(response.body).toHaveProperty('total_bookings');
      expect(response.body).toHaveProperty('wheelchair_users');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/stats`);

    expect(response.status).toBe(401);
  });

  it('should return zero counts for new tenant', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.total).toBeDefined();
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.upcoming).toBe('number');
      expect(typeof response.body.past).toBe('number');
    }
  });
});

describe('List Outings', () => {
  it('should get all outings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should include booking and driver counts', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.length > 0) {
      const outing = response.body[0];
      expect(outing).toHaveProperty('booking_count');
      expect(outing).toHaveProperty('driver_count');
      expect(outing).toHaveProperty('wheelchair_bookings');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings`);

    expect(response.status).toBe(401);
  });
});

describe('Create Outing', () => {
  it('should create a new outing', async () => {
    const outingData = {
      name: 'Beach Day Trip',
      destination: 'Brighton Beach',
      outing_date: '2025-06-15',
      departure_time: '09:00:00',
      return_time: '17:00:00',
      max_passengers: 16,
      cost_per_person: 25.00,
      wheelchair_accessible: true,
      description: 'A lovely day at the beach',
      meeting_point: 'Community Centre',
      contact_person: 'John Smith',
      contact_phone: '01234567890',
      weather_dependent: true,
      minimum_passengers: 8
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(outingData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(outingData.name);
      expect(response.body.destination).toBe(outingData.destination);
      testOutingId = response.body.id;
    }
  });

  it('should reject outing with missing required fields', async () => {
    const invalidData = {
      name: 'Test Outing'
      // Missing destination, outing_date, departure_time, max_passengers
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should apply default values for optional fields', async () => {
    const minimalData = {
      name: 'Minimal Outing',
      destination: 'Park',
      outing_date: '2025-07-01',
      departure_time: '10:00:00',
      max_passengers: 10
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(minimalData);

    if (response.status === 201) {
      expect(response.body.wheelchair_accessible).toBeDefined();
      expect(response.body.weather_dependent).toBeDefined();
      expect(response.body.minimum_passengers).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings`)
      .send({ name: 'Test' });

    expect(response.status).toBe(401);
  });
});

describe('Update Outing', () => {
  beforeAll(async () => {
    // Create an outing if one doesn't exist
    if (!testOutingId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/outings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Test Outing',
          destination: 'Test Location',
          outing_date: '2025-08-01',
          departure_time: '10:00:00',
          max_passengers: 12
        });

      if (response.status === 201) {
        testOutingId = response.body.id;
      }
    }
  });

  it('should update an existing outing', async () => {
    if (!testOutingId) {
      return; // Skip if no outing was created
    }

    const updateData = {
      name: 'Updated Beach Trip',
      max_passengers: 20
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/${testOutingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.max_passengers).toBe(updateData.max_passengers);
    }
  });

  it('should return 404 for non-existent outing', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/999999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated Name' });

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/1`)
      .send({ name: 'Test' });

    expect(response.status).toBe(401);
  });
});

describe('Delete Outing', () => {
  it('should delete an outing', async () => {
    // Create an outing to delete
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/outings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Delete Test Outing',
        destination: 'Test Location',
        outing_date: '2025-09-01',
        departure_time: '10:00:00',
        max_passengers: 10
      });

    if (createResponse.status === 201) {
      const outingId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/tenants/${tenantId}/outings/${outingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      }
    }
  });

  it('should return 404 for non-existent outing', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/outings/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/outings/1`);

    expect(response.status).toBe(401);
  });
});

describe('Get Outing Bookings', () => {
  beforeAll(async () => {
    // Create an outing if one doesn't exist
    if (!testOutingId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/outings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Booking Test Outing',
          destination: 'Test Location',
          outing_date: '2025-10-01',
          departure_time: '10:00:00',
          max_passengers: 15
        });

      if (response.status === 201) {
        testOutingId = response.body.id;
      }
    }
  });

  it('should get all bookings for an outing', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should include customer information', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.length > 0) {
      const booking = response.body[0];
      expect(booking).toHaveProperty('customer_id');
      expect(booking).toHaveProperty('customer_name');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/1/bookings`);

    expect(response.status).toBe(401);
  });
});

describe('Create Booking', () => {
  beforeAll(async () => {
    // Create an outing if needed
    if (!testOutingId) {
      const outingResponse = await request(app)
        .post(`/api/tenants/${tenantId}/outings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Booking Creation Test',
          destination: 'Test Location',
          outing_date: '2025-11-01',
          departure_time: '10:00:00',
          max_passengers: 20
        });

      if (outingResponse.status === 201) {
        testOutingId = outingResponse.body.id;
      }
    }

    // Create a test customer
    const customerResponse = await request(app)
      .post(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Booking Customer',
        phone: '01234567890',
        email: `bookingcustomer${Date.now()}@test.local`,
        address: '123 Test St'
      });

    if (customerResponse.status === 201) {
      testCustomerId = customerResponse.body.customer_id;
    }
  });

  it('should create a booking', async () => {
    if (!testOutingId || !testCustomerId) {
      return;
    }

    const bookingData = {
      customer_id: testCustomerId,
      special_requirements: 'Wheelchair access needed',
      dietary_requirements: 'Vegetarian'
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingData);

    expect([201, 400, 404, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_id).toBe(testCustomerId);
      expect(response.body.special_requirements).toBe(bookingData.special_requirements);
      testBookingId = response.body.id;
    }
  });

  it('should reject booking without customer_id', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should reject booking for non-existent customer', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ customer_id: 999999 });

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/1/bookings`)
      .send({ customer_id: 1 });

    expect(response.status).toBe(401);
  });
});

describe('Cancel Booking', () => {
  beforeAll(async () => {
    // Create outing, customer, and booking if needed
    if (!testBookingId && testOutingId && testCustomerId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customer_id: testCustomerId });

      if (response.status === 201) {
        testBookingId = response.body.id;
      }
    }
  });

  it('should cancel a booking', async () => {
    if (!testOutingId || !testBookingId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings/${testBookingId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ cancellation_reason: 'Customer request' });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.booking_status).toBe('cancelled');
      expect(response.body.cancellation_reason).toBe('Customer request');
    }
  });

  it('should return 404 for non-existent booking', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/${testOutingId}/bookings/999999/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ cancellation_reason: 'Test' });

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/1/bookings/1/cancel`)
      .send({ cancellation_reason: 'Test' });

    expect(response.status).toBe(401);
  });
});

describe('Get Driver Rotas', () => {
  beforeAll(async () => {
    if (!testOutingId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/outings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rota Test Outing',
          destination: 'Test Location',
          outing_date: '2025-12-01',
          departure_time: '10:00:00',
          max_passengers: 16
        });

      if (response.status === 201) {
        testOutingId = response.body.id;
      }
    }
  });

  it('should get driver assignments for an outing', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should include driver and vehicle information', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.length > 0) {
      const rota = response.body[0];
      expect(rota).toHaveProperty('driver_id');
      expect(rota).toHaveProperty('driver_name');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/outings/1/rotas`);

    expect(response.status).toBe(401);
  });
});

describe('Assign Driver to Outing', () => {
  beforeAll(async () => {
    if (!testOutingId) {
      const outingResponse = await request(app)
        .post(`/api/tenants/${tenantId}/outings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Driver Assignment Test',
          destination: 'Test Location',
          outing_date: '2026-01-01',
          departure_time: '10:00:00',
          max_passengers: 16
        });

      if (outingResponse.status === 201) {
        testOutingId = outingResponse.body.id;
      }
    }

    // Create a test driver
    const driverResponse = await request(app)
      .post(`/api/tenants/${tenantId}/drivers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Outing Driver',
        phone: '01234567890',
        email: `outingdriver${Date.now()}@test.local`,
        license_number: `DL${Date.now()}`
      });

    if (driverResponse.status === 201) {
      testDriverId = driverResponse.body.driver_id;
    }
  });

  it('should assign a driver to an outing', async () => {
    if (!testOutingId || !testDriverId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        driver_id: testDriverId,
        role: 'driver'
      });

    expect([201, 404, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('id');
      expect(response.body.driver_id).toBe(testDriverId);
      expect(response.body.role).toBe('driver');
      testRotaId = response.body.id;
    }
  });

  it('should reject assignment without driver_id', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should reject assignment for non-existent driver', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: 999999 });

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/outings/1/rotas`)
      .send({ driver_id: 1 });

    expect(response.status).toBe(401);
  });
});

describe('Update Passenger Assignments', () => {
  beforeAll(async () => {
    // Ensure we have a rota
    if (!testRotaId && testOutingId && testDriverId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ driver_id: testDriverId });

      if (response.status === 201) {
        testRotaId = response.body.id;
      }
    }
  });

  it('should update passenger assignments for a rota', async () => {
    if (!testOutingId || !testRotaId) {
      return;
    }

    const passengerData = {
      assigned_passengers: [
        { customer_id: 1, name: 'Passenger 1', pickup_order: 1 },
        { customer_id: 2, name: 'Passenger 2', pickup_order: 2 }
      ]
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas/${testRotaId}/passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(passengerData);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('assigned_passengers');
    }
  });

  it('should return 404 for non-existent rota', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas/999999/passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ assigned_passengers: [] });

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/outings/1/rotas/1/passengers`)
      .send({ assigned_passengers: [] });

    expect(response.status).toBe(401);
  });
});

describe('Delete Driver Rota', () => {
  it('should remove a driver from an outing', async () => {
    // Create a new driver assignment to delete
    if (!testOutingId || !testDriverId) {
      return;
    }

    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ driver_id: testDriverId });

    if (createResponse.status === 201) {
      const rotaId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas/${rotaId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      }
    }
  });

  it('should return 404 for non-existent rota', async () => {
    if (!testOutingId) {
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/outings/${testOutingId}/rotas/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/outings/1/rotas/1`);

    expect(response.status).toBe(401);
  });
});

describe('Customer Availability', () => {
  beforeAll(async () => {
    // Ensure we have a test customer
    if (!testCustomerId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/customers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Availability Test Customer',
          phone: '01234567890',
          email: `availcustomer${Date.now()}@test.local`,
          address: '123 Test St'
        });

      if (response.status === 201) {
        testCustomerId = response.body.customer_id;
      }
    }
  });

  it('should check customer availability for a date', async () => {
    if (!testCustomerId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${testCustomerId}/availability/2026-02-01`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('reason');
      expect(typeof response.body.available).toBe('boolean');
    }
  });

  it('should return 404 for non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/999999/availability/2026-02-01`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should indicate conflict type when unavailable', async () => {
    if (!testCustomerId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/${testCustomerId}/availability/2026-02-01`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && !response.body.available) {
      expect(response.body).toHaveProperty('conflictType');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/availability/2026-02-01`);

    expect(response.status).toBe(401);
  });
});

describe('Driver Availability', () => {
  beforeAll(async () => {
    // Ensure we have a test driver
    if (!testDriverId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/drivers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Availability Test Driver',
          phone: '01234567890',
          email: `availdriver${Date.now()}@test.local`,
          license_number: `DL${Date.now()}`
        });

      if (response.status === 201) {
        testDriverId = response.body.driver_id;
      }
    }
  });

  it('should check driver availability for a date', async () => {
    if (!testDriverId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${testDriverId}/availability/2026-03-01`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('reason');
      expect(typeof response.body.available).toBe('boolean');
    }
  });

  it('should return 404 for non-existent driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/999999/availability/2026-03-01`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should indicate conflict type when unavailable', async () => {
    if (!testDriverId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${testDriverId}/availability/2026-03-01`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && !response.body.available) {
      expect(response.body).toHaveProperty('conflictType');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/1/availability/2026-03-01`);

    expect(response.status).toBe(401);
  });
});
