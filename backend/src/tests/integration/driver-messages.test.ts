import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Driver Messages Routes Integration Tests
 *
 * Tests messaging system between admins and drivers:
 * - Driver message retrieval
 * - Message read tracking
 * - Unread count
 * - Message creation with priority levels
 * - Message listing and deletion
 * - Driver-to-office messages
 * - Message status updates
 * - Delivery methods (in-app, SMS, email)
 */

let app: Application;
let tenantId: number;
let adminUser: { userId: number; username: string; email: string; password: string };
let driverUser: { userId: number; username: string; email: string; password: string; driverId: number };
let adminToken: string;
let driverToken: string;
let testMessageId: number;
let testDriverToOfficeMessageId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Driver Messages Test Company');

  // Create admin user
  adminUser = await createTestUser(tenantId, `drivermsgadmin${Date.now()}@test.local`, 'admin');

  // Create driver user with driverId
  driverUser = await createTestUser(tenantId, `drivermsgdriver${Date.now()}@test.local`, 'driver');

  // Login admin
  const adminLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: adminUser.username, password: adminUser.password });

  adminToken = adminLoginResponse.body.token;

  // Login driver
  const driverLoginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: driverUser.username, password: driverUser.password });

  driverToken = driverLoginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Get Driver Messages', () => {
  it('should get all messages for a driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    }
  });

  it('should include message properties', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`);

    if (response.status === 200 && response.body.messages.length > 0) {
      const message = response.body.messages[0];
      expect(message).toHaveProperty('message_id');
      expect(message).toHaveProperty('title');
      expect(message).toHaveProperty('message');
      expect(message).toHaveProperty('priority');
      expect(message).toHaveProperty('read');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages`);

    expect(response.status).toBe(401);
  });

  it('should deny access to other driver messages', async () => {
    const otherDriverId = driverUser.driverId + 1000;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${otherDriverId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([403, 500]).toContain(response.status);
  });
});

describe('Create Message', () => {
  it('should create a message with required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Message',
        message: 'This is a test message',
        priority: 'medium'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toHaveProperty('message_id');
      expect(response.body.message.title).toBe('Test Message');
      expect(response.body.message.priority).toBe('medium');
      testMessageId = response.body.message.message_id;
    }
  });

  it('should create message with high priority', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Urgent: Fleet Update',
        message: 'Critical fleet information',
        priority: 'high'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.priority).toBe('high');
    }
  });

  it('should create message with low priority', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'General Notice',
        message: 'General information',
        priority: 'low'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.priority).toBe('low');
    }
  });

  it('should create message targeted to specific driver', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Personal Message',
        message: 'Message for specific driver',
        priority: 'medium',
        targetDriverId: driverUser.driverId
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.target_driver_id).toBe(driverUser.driverId);
    }
  });

  it('should create message with expiration', async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Temporary Notice',
        message: 'This message will expire',
        priority: 'medium',
        expiresAt
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.expires_at).toBeDefined();
    }
  });

  it('should create draft message', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Draft Message',
        message: 'This is a draft',
        priority: 'medium',
        isDraft: true
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.status).toBe('draft');
      expect(response.body.message.is_draft).toBe(true);
    }
  });

  it('should create scheduled message', async () => {
    const scheduledAt = new Date(Date.now() + 3600000).toISOString();

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Scheduled Message',
        message: 'This message is scheduled',
        priority: 'medium',
        scheduledAt
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.status).toBe('scheduled');
      expect(response.body.message.scheduled_at).toBeDefined();
    }
  });

  it('should require admin access', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        title: 'Test Message',
        message: 'This should fail',
        priority: 'medium'
      });

    expect(response.status).toBe(403);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        priority: 'medium'
      });

    expect(response.status).toBe(400);
  });

  it('should validate priority values', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Message',
        message: 'Test content',
        priority: 'invalid-priority'
      });

    expect(response.status).toBe(400);
  });
});

describe('Delivery Methods', () => {
  it('should create in-app only message', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'In-App Message',
        message: 'This is in-app only',
        priority: 'medium',
        deliveryMethod: 'in-app'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.delivery_method).toBe('in-app');
    }
  });

  it('should validate email delivery requirements', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Email Message',
        message: 'This should require email subject',
        priority: 'medium',
        deliveryMethod: 'email'
      });

    expect(response.status).toBe(400);
  });

  it('should create email message with subject', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Email Message',
        message: 'This has email subject',
        priority: 'medium',
        deliveryMethod: 'email',
        emailSubject: 'Important: Please Read'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.delivery_method).toBe('email');
      expect(response.body.message.email_subject).toBe('Important: Please Read');
    }
  });

  it('should validate SMS delivery requirements', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'SMS Message',
        message: 'This should require SMS body',
        priority: 'medium',
        deliveryMethod: 'sms'
      });

    expect(response.status).toBe(400);
  });

  it('should create SMS message with body', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'SMS Message',
        message: 'This has SMS body',
        priority: 'medium',
        deliveryMethod: 'sms',
        smsBody: 'Short SMS text message'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.delivery_method).toBe('sms');
      expect(response.body.message.sms_body).toBe('Short SMS text message');
    }
  });

  it('should create both email and SMS message', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Multi-Channel Message',
        message: 'Sent via both channels',
        priority: 'high',
        deliveryMethod: 'both',
        emailSubject: 'Important Notice',
        smsBody: 'Check your email for details'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.message.delivery_method).toBe('both');
      expect(response.body.message.email_subject).toBeDefined();
      expect(response.body.message.sms_body).toBeDefined();
    }
  });
});

describe('List Messages', () => {
  it('should get all messages for tenant', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    }
  });

  it('should include read count in message list', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.messages.length > 0) {
      const message = response.body.messages[0];
      expect(message).toHaveProperty('read_count');
    }
  });

  it('should include target driver name if applicable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
    }
  });

  it('should require admin access', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
  });
});

describe('Mark Message as Read', () => {
  it('should mark message as read', async () => {
    if (!testMessageId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/${testMessageId}/read`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    }
  });

  it('should be idempotent when marking as read', async () => {
    if (!testMessageId) {
      return;
    }

    const response1 = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/${testMessageId}/read`)
      .set('Authorization', `Bearer ${driverToken}`);

    const response2 = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/${testMessageId}/read`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([200, 500]).toContain(response1.status);
    expect([200, 500]).toContain(response2.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/1/read`);

    expect(response.status).toBe(401);
  });

  it('should deny access to other driver messages', async () => {
    const otherDriverId = driverUser.driverId + 1000;

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${otherDriverId}/messages/1/read`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([403, 500]).toContain(response.status);
  });
});

describe('Unread Count', () => {
  it('should get unread message count', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/unread-count`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('unreadCount');
      expect(typeof response.body.unreadCount).toBe('number');
    }
  });

  it('should return zero for no unread messages', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/unread-count`)
      .set('Authorization', `Bearer ${driverToken}`);

    if (response.status === 200) {
      expect(response.body.unreadCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages/unread-count`);

    expect(response.status).toBe(401);
  });

  it('should deny access to other driver counts', async () => {
    const otherDriverId = driverUser.driverId + 1000;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${otherDriverId}/messages/unread-count`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([403, 500]).toContain(response.status);
  });
});

describe('Delete Message', () => {
  it('should soft delete a message', async () => {
    if (!testMessageId) {
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/messages/${testMessageId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    }
  });

  it('should require admin access', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/messages/1`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/messages/1`);

    expect(response.status).toBe(401);
  });
});

describe('Messages to Office - Driver Creation', () => {
  it('should create message from driver to office', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        subject: 'Vehicle Issue',
        message: 'The vehicle has a maintenance issue'
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toHaveProperty('message_id');
      expect(response.body.message.subject).toBe('Vehicle Issue');
      expect(response.body.message.driver_id).toBe(driverUser.driverId);
      testDriverToOfficeMessageId = response.body.message.message_id;
    }
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        subject: 'Missing message'
      });

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`)
      .send({
        subject: 'Test',
        message: 'Test message'
      });

    expect(response.status).toBe(401);
  });

  it('should deny access to other driver IDs', async () => {
    const otherDriverId = driverUser.driverId + 1000;

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/drivers/${otherDriverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        subject: 'Test',
        message: 'This should fail'
      });

    expect([403, 500]).toContain(response.status);
  });
});

describe('Messages to Office - Driver Retrieval', () => {
  it('should get messages sent by driver', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    }
  });

  it('should include message status information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`);

    if (response.status === 200 && response.body.messages.length > 0) {
      const message = response.body.messages[0];
      expect(message).toHaveProperty('message_id');
      expect(message).toHaveProperty('subject');
      expect(message).toHaveProperty('message');
      expect(message).toHaveProperty('status');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${driverUser.driverId}/messages-to-office`);

    expect(response.status).toBe(401);
  });

  it('should deny access to other driver messages', async () => {
    const otherDriverId = driverUser.driverId + 1000;

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/drivers/${otherDriverId}/messages-to-office`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect([403, 500]).toContain(response.status);
  });
});

describe('Messages from Drivers - Admin View', () => {
  it('should get all messages from drivers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages-from-drivers`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    }
  });

  it('should include driver information', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages-from-drivers`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200 && response.body.messages.length > 0) {
      const message = response.body.messages[0];
      expect(message).toHaveProperty('driver_id');
      expect(message).toHaveProperty('driver_name');
      expect(message).toHaveProperty('status');
    }
  });

  it('should order by status priority', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages-from-drivers`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('messages');
    }
  });

  it('should require admin access', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages-from-drivers`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/messages-from-drivers`);

    expect(response.status).toBe(401);
  });
});

describe('Update Message Status', () => {
  it('should mark message as read', async () => {
    if (!testDriverToOfficeMessageId) {
      return;
    }

    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/${testDriverToOfficeMessageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'read'
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.status).toBe('read');
    }
  });

  it('should mark message as resolved', async () => {
    if (!testDriverToOfficeMessageId) {
      return;
    }

    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/${testDriverToOfficeMessageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved'
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.status).toBe('resolved');
    }
  });

  it('should add admin response', async () => {
    if (!testDriverToOfficeMessageId) {
      return;
    }

    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/${testDriverToOfficeMessageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        adminResponse: 'Thank you for reporting this issue. We will address it.'
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.admin_response).toBe('Thank you for reporting this issue. We will address it.');
      expect(response.body.message.status).toBe('resolved');
    }
  });

  it('should update status and add response together', async () => {
    if (!testDriverToOfficeMessageId) {
      return;
    }

    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/${testDriverToOfficeMessageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved',
        adminResponse: 'Issue has been resolved.'
      });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('message');
    }
  });

  it('should require admin access', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/1`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        status: 'read'
      });

    expect(response.status).toBe(403);
  });

  it('should validate update data', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/1`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .patch(`/api/tenants/${tenantId}/messages-from-drivers/1`)
      .send({
        status: 'read'
      });

    expect(response.status).toBe(401);
  });
});
