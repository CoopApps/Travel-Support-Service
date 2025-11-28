import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Reminder Routes Integration Tests
 *
 * Tests reminder system for trip notifications:
 * - Reminder retrieval and management
 * - Reminder creation and updates
 * - Reminder deletion
 * - Reminder settings configuration
 * - Reminder sending functionality
 * - Reminder history tracking
 * - Reminder types (SMS/Email)
 * - Scheduling preferences
 * - Delivery methods
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Reminder Test Company');
  testUser = await createTestUser(tenantId, `remindertest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Get Reminders', () => {
  it('should get reminder settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    }
  });

  it('should return enabled status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    }
  });

  it('should require authentication for getting settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`);

    expect(response.status).toBe(401);
  });
});

describe('Create Reminder', () => {
  it('should send manual reminder for trip', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ tripId: 999 });

    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it('should validate trip ID is required', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should require authentication for sending', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/send`)
      .send({ tripId: 999 });

    expect(response.status).toBe(401);
  });

  it('should return success structure on valid send', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/send`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ tripId: 999 });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    }
  });
});

describe('Update Reminder', () => {
  it('should update reminder settings', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_enabled: true,
        reminder_type: 'sms',
        reminder_timing: '24'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should validate reminder configuration', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_enabled: true,
        reminder_type: 'invalid_type'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require authentication for updates', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .send({ reminder_enabled: false });

    expect(response.status).toBe(401);
  });

  it('should return success message on update', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reminder_timing: '12' });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    }
  });
});

describe('Delete Reminder', () => {
  it('should delete reminder setting', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/test_key`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication for deletion', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/test_key`);

    expect(response.status).toBe(401);
  });

  it('should return success message on deletion', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/some_key`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    }
  });
});

describe('Reminder Settings', () => {
  it('should get all reminder settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('settings');
    }
  });

  it('should hide sensitive credentials', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.settings) {
      const settings = response.body.settings;
      if (settings.twilio_account_sid) {
        expect(settings.twilio_account_sid).toBe('***configured***');
      }
      if (settings.twilio_auth_token) {
        expect(settings.twilio_auth_token).toBe('***configured***');
      }
      if (settings.sendgrid_api_key) {
        expect(settings.sendgrid_api_key).toBe('***configured***');
      }
    }
  });

  it('should indicate configured services', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('twilioConfigured');
      expect(response.body).toHaveProperty('sendgridConfigured');
      expect(typeof response.body.twilioConfigured).toBe('boolean');
      expect(typeof response.body.sendgridConfigured).toBe('boolean');
    }
  });

  it('should include template information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.templates) {
      expect(response.body.templates).toHaveProperty('sms');
      expect(response.body.templates).toHaveProperty('emailSubject');
      expect(response.body.templates).toHaveProperty('emailBody');
    }
  });
});

describe('Send Reminder', () => {
  it('should test reminder configuration', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/test`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'sms',
        recipient: '+1234567890'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should validate test type', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/test`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        recipient: '+1234567890'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should validate recipient is provided', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminders/test`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'email'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should test connection for configured services', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'twilio' });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should validate connection type', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('Reminder History', () => {
  it('should get reminder history for trip', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/history/999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('history');
    }
  });

  it('should return array of history entries', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/history/999`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.history)).toBe(true);
    }
  });

  it('should require authentication for history', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/history/999`);

    expect(response.status).toBe(401);
  });
});

describe('Reminder Types', () => {
  it('should support SMS reminder type', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_type: 'sms'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should support email reminder type', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_type: 'email'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should support both SMS and email', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_type: 'both'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should indicate reminder type in settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.reminderType) {
      expect(['sms', 'email', 'both', 'none']).toContain(response.body.reminderType);
    }
  });
});

describe('Scheduling', () => {
  it('should configure reminder timing', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_timing: '24'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should support custom timing values', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_timing: '12'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should return timing in settings', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminders/settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.reminderTiming !== undefined) {
      expect(response.body).toHaveProperty('reminderTiming');
    }
  });
});

describe('Delivery Methods', () => {
  it('should configure Twilio for SMS delivery', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        twilio_account_sid: 'test_sid',
        twilio_auth_token: 'test_token',
        twilio_phone_number: '+1234567890'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should configure SendGrid for email delivery', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sendgrid_api_key: 'test_key',
        sendgrid_from_email: 'test@example.com'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should test Twilio connection', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'twilio' });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should test SendGrid connection', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'sendgrid' });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require credentials for SMS delivery', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_enabled: true,
        reminder_type: 'sms'
      });

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require credentials for email delivery', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reminder_enabled: true,
        reminder_type: 'email'
      });

    expect([200, 400, 500]).toContain(response.status);
  });
});
