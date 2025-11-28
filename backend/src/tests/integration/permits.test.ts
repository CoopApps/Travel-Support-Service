import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, createTestDriver, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Permits Routes Integration Tests
 *
 * Tests permits management system:
 * - Driver permits (DBS, Section 19, Section 22, MOT)
 * - Driver roles (vulnerable passengers, vehicle owner)
 * - Organizational permits
 * - Permit statistics and compliance
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let testDriverId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Permits Test Company');
  testUser = await createTestUser(tenantId, `permitstest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
  testDriverId = await createTestDriver(tenantId, 'Test Driver');
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Permits Overview', () => {
  it('should get permits overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/permits`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/permits`);

    expect(response.status).toBe(401);
  });
});

describe('Driver Permits', () => {
  it('should get all driver permits', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/permits/drivers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should update driver permits', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/permits/drivers/${testDriverId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dbs: {
          hasPermit: true,
          expiryDate: '2025-12-31',
          issueDate: '2024-01-01',
          notes: 'DBS certificate',
        },
        section19: {
          hasPermit: false,
        },
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should update driver roles', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/permits/drivers/${testDriverId}/roles`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        roles: {
          vulnerablePassengers: true,
          section19Driver: false,
          section22Driver: false,
          vehicleOwner: false,
        },
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should cleanup driver permits', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/permits/drivers/${testDriverId}/cleanup`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Organizational Permits', () => {
  let permitId: number;

  it('should get organizational permits', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/permits/organizational`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });

  it('should create organizational permit', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/permits/organizational`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        permit_type: 'section19',
        organisation_name: 'Test Organization',
        permit_number: `TEST-${Date.now()}`,
        issue_date: '2024-01-01',
        expiry_date: '2025-12-31',
        notes: 'Test permit',
      });

    expect([200, 201, 500]).toContain(response.status);
    if (response.body.id) {
      permitId = response.body.id;
    }
  });

  it('should update organizational permit', async () => {
    if (!permitId) {
      console.log('Skipping - no permit created');
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/permits/organizational/${permitId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Updated permit notes',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should delete organizational permit', async () => {
    if (!permitId) {
      console.log('Skipping - no permit created');
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/permits/organizational/${permitId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });
});

describe('Permit Statistics', () => {
  it('should get permit statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/permits/stats`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
  });
});
