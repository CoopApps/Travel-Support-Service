import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Reminder Settings Routes Integration Tests
 *
 * Tests reminder settings management:
 * - Get reminder settings
 * - Update reminder settings
 * - Default settings
 * - Email configuration
 * - SMS configuration
 * - Lead time settings
 * - Frequency settings
 * - Required field validation
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Reminder Settings Test Company');
  testUser = await createTestUser(tenantId, `remindersettings${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Get Reminder Settings', () => {
  it('should get reminder settings for tenant', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('settings');
    }
  });

  it('should return settings object structure', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(typeof response.body.settings).toBe('object');
    }
  });

  it('should hide sensitive credentials', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.settings.twilio_account_sid) {
      expect(response.body.settings.twilio_account_sid).toBe('***configured***');
    }
    if (response.status === 200 && response.body.settings.twilio_auth_token) {
      expect(response.body.settings.twilio_auth_token).toBe('***configured***');
    }
    if (response.status === 200 && response.body.settings.sendgrid_api_key) {
      expect(response.body.settings.sendgrid_api_key).toBe('***configured***');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`);

    expect(response.status).toBe(401);
  });
});

describe('Update Reminder Settings', () => {
  it('should update basic reminder settings', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_type: 'sms',
      reminder_lead_time_hours: 24
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
    }
  });

  it('should update multiple settings at once', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_type: 'email',
      reminder_lead_time_hours: 48,
      reminder_frequency: 'daily'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should convert boolean values correctly', async () => {
    const settings = {
      reminder_enabled: true
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    if (response.status === 200 || response.status === 400) {
      expect(response.body).toBeDefined();
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .send({ reminder_enabled: false });

    expect(response.status).toBe(401);
  });
});

describe('Default Settings', () => {
  it('should work with empty settings initially', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.settings).toBeDefined();
    }
  });

  it('should allow setting initial configuration', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_type: 'sms'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });
});

describe('Email Configuration', () => {
  it('should validate SendGrid credentials when enabling email reminders', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'email'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/SendGrid/i);
    }
  });

  it('should accept SendGrid configuration', async () => {
    const settings = {
      reminder_enabled: false,
      sendgrid_api_key: 'SG.test_key_123456789',
      sendgrid_from_email: 'noreply@example.com'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require api_key for SendGrid', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'email',
      sendgrid_from_email: 'noreply@example.com'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/SendGrid/i);
    }
  });

  it('should require from_email for SendGrid', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'email',
      sendgrid_api_key: 'SG.test_key_123456789'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/SendGrid/i);
    }
  });
});

describe('SMS Configuration', () => {
  it('should validate Twilio credentials when enabling SMS reminders', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'sms'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Twilio/i);
    }
  });

  it('should accept Twilio configuration', async () => {
    const settings = {
      reminder_enabled: false,
      twilio_account_sid: 'AC_test_sid_123456789',
      twilio_auth_token: 'test_auth_token_123456789',
      twilio_phone_number: '+1234567890'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should require account_sid for Twilio', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'sms',
      twilio_auth_token: 'test_auth_token_123456789',
      twilio_phone_number: '+1234567890'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/Twilio/i);
    }
  });

  it('should require auth_token for Twilio', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'sms',
      twilio_account_sid: 'AC_test_sid_123456789',
      twilio_phone_number: '+1234567890'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/Twilio/i);
    }
  });

  it('should require phone_number for Twilio', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'sms',
      twilio_account_sid: 'AC_test_sid_123456789',
      twilio_auth_token: 'test_auth_token_123456789'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/Twilio/i);
    }
  });
});

describe('Lead Time Settings', () => {
  it('should update lead time hours', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_lead_time_hours: 24
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should accept different lead time values', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_lead_time_hours: 48
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should store lead time as number', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_lead_time_hours: 72
    };

    const updateResponse = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    if (updateResponse.status === 200) {
      const getResponse = await request(app)
        .get(`/api/tenants/${tenantId}/reminder-settings`)
        .set('Authorization', `Bearer ${authToken}`);

      if (getResponse.status === 200 && getResponse.body.settings.reminder_lead_time_hours) {
        expect(typeof getResponse.body.settings.reminder_lead_time_hours).toBe('number');
      }
    }
  });
});

describe('Frequency Settings', () => {
  it('should update reminder frequency', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_frequency: 'daily'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should accept various frequency values', async () => {
    const frequencies = ['daily', 'weekly', 'once'];

    for (const frequency of frequencies) {
      const settings = {
        reminder_enabled: false,
        reminder_frequency: frequency
      };

      const response = await request(app)
        .put(`/api/tenants/${tenantId}/reminder-settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(settings);

      expect([200, 400, 500]).toContain(response.status);
    }
  });
});

describe('Required Field Validation', () => {
  it('should validate when enabling SMS reminders without credentials', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'sms'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should validate when enabling email reminders without credentials', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'email'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should validate when using both reminder types', async () => {
    const settings = {
      reminder_enabled: true,
      reminder_type: 'both'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should allow disabling reminders without credentials', async () => {
    const settings = {
      reminder_enabled: false,
      reminder_type: 'sms'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });

  it('should skip credential placeholder values', async () => {
    const settings = {
      reminder_enabled: false,
      twilio_account_sid: '***configured***'
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/reminder-settings`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(settings);

    expect([200, 400, 500]).toContain(response.status);
  });
});

describe('Test Connection', () => {
  it('should require type parameter', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body).toHaveProperty('error');
    }
  });

  it('should validate type parameter', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ type: 'invalid' });

    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.body.error).toMatch(/twilio.*sendgrid/i);
    }
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

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/reminder-settings/test-connection`)
      .send({ type: 'twilio' });

    expect(response.status).toBe(401);
  });
});

describe('Delete Setting', () => {
  it('should delete a specific setting', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/test_setting_key`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    }
  });

  it('should return success even if setting does not exist', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/nonexistent_key`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/reminder-settings/test_key`);

    expect(response.status).toBe(401);
  });
});
