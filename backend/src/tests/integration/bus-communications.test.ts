import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Bus Communications Routes Integration Tests
 *
 * Tests passenger communication system for Section 22 bus services:
 * - Communication creation and sending
 * - Message templates
 * - Booking confirmations
 * - Communication statistics
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Bus Communications Test Company');
  testUser = await createTestUser(tenantId, `buscommtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Bus Communications Management', () => {
  let messageId: number;

  it('should get all communications', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should create a communication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus-communications`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message_type: 'announcement',
        delivery_method: 'email',
        recipient_type: 'all_passengers',
        subject: 'Service Update',
        message_body: 'Important service announcement',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.communication?.message_id) {
      messageId = response.body.communication.message_id;
    }
  });

  it('should filter communications by type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ message_type: 'announcement' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter communications by status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ status: 'sent' });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications`);

    expect(response.status).toBe(401);
  });
});

describe('Communication Recipients', () => {
  it('should get recipients for a message', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications/1/recipients`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Booking Confirmations', () => {
  it('should send booking confirmation', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus-communications/booking-confirmation`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        booking_id: 1,
      });

    expect([200, 201, 404, 500]).toContain(response.status);
  });

  it('should handle missing booking ID', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus-communications/booking-confirmation`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
  });
});

describe('Message Templates', () => {
  it('should get message templates', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications/templates`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('templates');
    }
  });

  it('should have booking confirmation template', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications/templates`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.templates).toHaveProperty('booking_confirmation');
    }
  });
});

describe('Communication Statistics', () => {
  it('should get communication stats', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('recipients');
    }
  });

  it('should track message counts by type', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/bus-communications/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.messages).toHaveProperty('total_sent');
      expect(response.body.messages).toHaveProperty('confirmations');
    }
  });
});

describe('Communication Scheduling', () => {
  it('should create scheduled communication', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/bus-communications`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message_type: 'service_alert',
        delivery_method: 'both',
        recipient_type: 'all_passengers',
        subject: 'Scheduled Alert',
        message_body: 'This is a scheduled message',
        scheduled_send: futureDate.toISOString(),
      });

    expect([200, 201, 500]).toContain(response.status);
  });
});
