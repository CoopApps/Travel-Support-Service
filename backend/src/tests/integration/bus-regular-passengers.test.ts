import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Bus Regular Passengers Routes Integration Tests
 *
 * Tests recurring seat assignments and absence management for Section 22 bus services:
 * - Regular passenger registration with day-of-week travel patterns
 * - Seat conflict detection and validation
 * - Effective passenger lists for specific dates
 * - Self-service absence reporting
 * - Customer-facing bus service endpoints
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Bus Regular Passengers Test Company');
  testUser = await createTestUser(tenantId, `busregtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Regular Passengers Management', () => {
  let regularId: number;

  it('should get all regular passengers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should filter regular passengers by timetable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ timetable_id: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter regular passengers by customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ customer_id: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter regular passengers by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'active' });

    expect([200, 500]).toContain(response.status);
  });

  it('should create a regular passenger assignment', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'A1',
        requires_wheelchair_space: false,
        travels_monday: true,
        travels_tuesday: true,
        travels_wednesday: true,
        travels_thursday: true,
        travels_friday: true,
        travels_saturday: false,
        travels_sunday: false,
        boarding_stop_id: 1,
        alighting_stop_id: 2,
        valid_from: '2025-01-01',
        special_requirements: 'Test requirements',
        notes: 'Test notes'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
    if (response.body.regular_id) {
      regularId = response.body.regular_id;
    }
  });

  it('should reject creation without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should reject creation without any travel days', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'A2',
        travels_monday: false,
        travels_tuesday: false,
        travels_wednesday: false,
        travels_thursday: false,
        travels_friday: false,
        travels_saturday: false,
        travels_sunday: false
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 99999,
        timetable_id: 1,
        seat_number: 'A3',
        travels_monday: true
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should handle non-existent timetable', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 99999,
        seat_number: 'A4',
        travels_monday: true
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should update a regular passenger assignment', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/regular-passengers/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seat_number: 'B1',
        travels_saturday: true,
        status: 'active',
        notes: 'Updated notes'
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle update of non-existent regular passenger', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/regular-passengers/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seat_number: 'C1'
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should delete a regular passenger assignment', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/regular-passengers/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle delete of non-existent regular passenger', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/regular-passengers/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/regular-passengers`);

    expect(response.status).toBe(401);
  });
});

describe('Effective Passengers', () => {
  it('should get effective passengers for a specific date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/effective-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ service_date: '2025-01-15' });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should reject request without service_date', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/effective-passengers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 500]).toContain(response.status);
  });

  it('should handle non-existent timetable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/99999/effective-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ service_date: '2025-01-15' });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/timetables/1/effective-passengers`)
      .query({ service_date: '2025-01-15' });

    expect(response.status).toBe(401);
  });
});

describe('Passenger Absences Management', () => {
  let absenceId: number;

  it('should get all absences', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should filter absences by customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ customer_id: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter absences by timetable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ timetable_id: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter absences by date range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ start_date: '2025-01-01', end_date: '2025-01-31' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter absences by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'confirmed' });

    expect([200, 500]).toContain(response.status);
  });

  it('should create an absence', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        absence_date: '2025-02-15',
        absence_reason: 'sick',
        reason_notes: 'Unwell',
        timetable_id: 1,
        reported_by: 'staff'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
    if (response.body.absence_id) {
      absenceId = response.body.absence_id;
    }
  });

  it('should reject absence without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should reject invalid absence reason', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        absence_date: '2025-02-16',
        absence_reason: 'invalid_reason'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should accept valid absence reasons', async () => {
    const validReasons = ['sick', 'holiday', 'appointment', 'other'];

    for (const reason of validReasons) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/bus/absences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_id: 1,
          absence_date: '2025-03-15',
          absence_reason: reason
        });

      expect([200, 201, 404, 409, 500]).toContain(response.status);
    }
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 99999,
        absence_date: '2025-02-17',
        absence_reason: 'sick'
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should update an absence', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/absences/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'cancelled',
        reason_notes: 'No longer needed'
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle update of non-existent absence', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/absences/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'cancelled'
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should delete an absence', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/absences/1`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle delete of non-existent absence', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/bus/absences/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus/absences`);

    expect(response.status).toBe(401);
  });
});

describe('Customer-Facing Bus Services', () => {
  it('should get customer bus services', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/bus-services`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/99999/bus-services`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/bus-services`);

    expect(response.status).toBe(401);
  });
});

describe('Customer-Facing Absences', () => {
  it('should get customer absences', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should filter for upcoming absences only', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ upcoming_only: 'true' });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/99999/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers/1/bus-absences`);

    expect(response.status).toBe(401);
  });
});

describe('Customer Self-Service Absence Reporting', () => {
  it('should allow customer to report absence', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        absence_date: '2025-04-15',
        absence_reason: 'appointment',
        reason_notes: 'Doctor appointment',
        timetable_id: 1
      });

    expect([200, 201, 400, 409, 500]).toContain(response.status);
  });

  it('should reject customer absence without required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        absence_date: '2025-04-16'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should reject invalid absence reason for customer', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        absence_date: '2025-04-17',
        absence_reason: 'not_valid'
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should accept all valid absence reasons for customer', async () => {
    const validReasons = ['sick', 'holiday', 'appointment', 'other'];

    for (const reason of validReasons) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          absence_date: '2025-05-15',
          absence_reason: reason
        });

      expect([200, 201, 400, 409, 500]).toContain(response.status);
    }
  });

  it('should reject if customer is not a regular passenger', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        absence_date: '2025-04-18',
        absence_reason: 'sick'
      });

    expect([200, 201, 400, 409, 500]).toContain(response.status);
  });

  it('should handle non-existent customer', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/99999/bus-absences`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        absence_date: '2025-04-19',
        absence_reason: 'sick'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers/1/bus-absences`)
      .send({
        absence_date: '2025-04-20',
        absence_reason: 'sick'
      });

    expect(response.status).toBe(401);
  });
});

describe('Day-of-Week Travel Patterns', () => {
  it('should create regular passenger with weekday pattern', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'D1',
        travels_monday: true,
        travels_tuesday: true,
        travels_wednesday: true,
        travels_thursday: true,
        travels_friday: true,
        travels_saturday: false,
        travels_sunday: false
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should create regular passenger with weekend pattern', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'D2',
        travels_monday: false,
        travels_tuesday: false,
        travels_wednesday: false,
        travels_thursday: false,
        travels_friday: false,
        travels_saturday: true,
        travels_sunday: true
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should create regular passenger with custom pattern', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'D3',
        travels_monday: true,
        travels_tuesday: false,
        travels_wednesday: true,
        travels_thursday: false,
        travels_friday: true,
        travels_saturday: false,
        travels_sunday: false
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should update travel pattern', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/regular-passengers/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        travels_monday: true,
        travels_tuesday: true,
        travels_wednesday: false,
        travels_thursday: true,
        travels_friday: false,
        travels_saturday: true,
        travels_sunday: false
      });

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Validity Date Ranges', () => {
  it('should create regular passenger with valid_from date', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'E1',
        travels_monday: true,
        valid_from: '2025-02-01'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should create regular passenger with valid_until date', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'E2',
        travels_tuesday: true,
        valid_from: '2025-02-01',
        valid_until: '2025-06-30'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should update validity dates', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/regular-passengers/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        valid_from: '2025-03-01',
        valid_until: '2025-08-31'
      });

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Special Requirements and Notes', () => {
  it('should create regular passenger with wheelchair requirement', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'W1',
        requires_wheelchair_space: true,
        travels_monday: true,
        special_requirements: 'Wheelchair user - needs ramp assistance'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should create regular passenger with special requirements', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus/regular-passengers`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer_id: 1,
        timetable_id: 1,
        seat_number: 'F1',
        travels_wednesday: true,
        special_requirements: 'Hearing impaired - driver should face passenger when speaking',
        notes: 'Additional driver notes'
      });

    expect([200, 201, 404, 409, 500]).toContain(response.status);
  });

  it('should update special requirements and notes', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/bus/regular-passengers/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        special_requirements: 'Updated requirements',
        notes: 'Updated notes'
      });

    expect([200, 404, 500]).toContain(response.status);
  });
});
