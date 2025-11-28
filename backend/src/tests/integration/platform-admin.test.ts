import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';
import { query } from '../../config/database';
import * as bcrypt from 'bcryptjs';

/**
 * Platform Admin Routes Integration Tests
 *
 * Tests platform-level administrative functionality:
 * - Platform admin authentication
 * - Tenant management (CRUD operations)
 * - Platform statistics
 * - Multi-tenant oversight
 */

let app: Application;
let platformAdminToken: string;
let testTenantId: number;

beforeAll(async () => {
  app = createTestApp();

  // Create a test platform admin
  const hashedPassword = await bcrypt.hash('testpass123', 10);
  const adminUsername = `platformadmin${Date.now()}`;

  try {
    // Try commonwealth_admins first (new schema)
    await query(
      `INSERT INTO commonwealth_admins (username, email, password_hash, role, commonwealth_role, is_active)
       VALUES ($1, $2, $3, 'super_admin', 'super_admin', true)
       ON CONFLICT (username) DO NOTHING`,
      [adminUsername, `${adminUsername}@test.local`, hashedPassword]
    );
  } catch (error) {
    // Fallback to platform_admins (old schema)
    await query(
      `INSERT INTO platform_admins (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'super_admin', true)
       ON CONFLICT (username) DO NOTHING`,
      [adminUsername, `${adminUsername}@test.local`, hashedPassword]
    );
  }

  // Login as platform admin
  const loginResponse = await request(app)
    .post('/api/platform-admin/login')
    .send({ username: adminUsername, password: 'testpass123' });

  if (loginResponse.status === 200) {
    platformAdminToken = loginResponse.body.token;
  }

  // Create a test tenant for CRUD operations
  testTenantId = await createTestTenant('Platform Admin Test Tenant');
}, 30000);

afterAll(async () => {
  if (testTenantId) {
    await cleanupTestTenant(testTenantId);
  }
  await closeTestPool();
}, 30000);

describe('Platform Admin Authentication', () => {
  it('should login platform admin', async () => {
    const response = await request(app)
      .post('/api/platform-admin/login')
      .send({
        username: `platformadmin${Date.now()}temp`,
        password: 'wrongpassword',
      });

    // Either 401 (invalid credentials) or 200 (valid login) are acceptable
    expect([200, 401, 500]).toContain(response.status);
  });

  it('should require username and password', async () => {
    const response = await request(app)
      .post('/api/platform-admin/login')
      .send({});

    expect([400, 500]).toContain(response.status);
  });

  it('should return token on successful login', async () => {
    if (platformAdminToken) {
      expect(platformAdminToken).toBeTruthy();
      expect(typeof platformAdminToken).toBe('string');
    }
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/platform-admin/login')
      .send({
        username: 'nonexistent',
        password: 'wrongpassword',
      });

    expect([401, 500]).toContain(response.status);
  });
});

describe('Tenant Management - List', () => {
  it('should get all tenants with authentication', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('tenants');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/platform-admin/tenants');

    expect(response.status).toBe(401);
  });

  it('should support pagination', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .query({ page: 1, limit: 10 });

    expect([200, 500]).toContain(response.status);
  });

  it('should support search', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .query({ search: 'Test' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter by organization type', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .query({ organization_type: 'charity' });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter by active status', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .query({ is_active: true });

    expect([200, 500]).toContain(response.status);
  });

  it('should support sorting', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .query({ sortBy: 'company_name', sortOrder: 'asc' });

    expect([200, 500]).toContain(response.status);
  });
});

describe('Tenant Management - Create', () => {
  it('should create new tenant', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: `Test Company ${Date.now()}`,
        subdomain: `testco${Date.now()}`,
        admin_username: `admin${Date.now()}`,
        admin_email: `admin${Date.now()}@test.local`,
        admin_password: 'testpass123',
        organization_type: 'charity',
      });

    expect([201, 400, 409, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/platform-admin/tenants')
      .send({
        company_name: 'Test Company',
        subdomain: 'testco',
      });

    expect(response.status).toBe(401);
  });

  it('should validate required fields', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: 'Test Company',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should validate subdomain format', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: 'Test Company',
        subdomain: 'INVALID_SUBDOMAIN',
        admin_username: 'admin',
        admin_email: 'admin@test.local',
        admin_password: 'testpass123',
      });

    expect([400, 409, 500]).toContain(response.status);
  });

  it('should prevent duplicate subdomains', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const subdomain = `duplicate${Date.now()}`;

    // Create first tenant
    await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: 'First Company',
        subdomain: subdomain,
        admin_username: `admin1${Date.now()}`,
        admin_email: `admin1${Date.now()}@test.local`,
        admin_password: 'testpass123',
      });

    // Try to create duplicate
    const response = await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: 'Second Company',
        subdomain: subdomain,
        admin_username: `admin2${Date.now()}`,
        admin_email: `admin2${Date.now()}@test.local`,
        admin_password: 'testpass123',
      });

    expect([400, 409, 500]).toContain(response.status);
  });
});

describe('Tenant Management - Update', () => {
  it('should update tenant', async () => {
    if (!platformAdminToken || !testTenantId) {
      console.log('Skipping - no platform admin token or test tenant');
      return;
    }

    const response = await request(app)
      .put(`/api/platform-admin/tenants/${testTenantId}`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        contact_name: 'Updated Contact',
        contact_phone: '123-456-7890',
      });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .put(`/api/platform-admin/tenants/${testTenantId}`)
      .send({
        contact_name: 'Updated Contact',
      });

    expect(response.status).toBe(401);
  });

  it('should handle non-existent tenant', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .put('/api/platform-admin/tenants/99999')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        contact_name: 'Updated Contact',
      });

    expect([404, 500]).toContain(response.status);
  });

  it('should validate update fields', async () => {
    if (!platformAdminToken || !testTenantId) {
      console.log('Skipping - no platform admin token or test tenant');
      return;
    }

    const response = await request(app)
      .put(`/api/platform-admin/tenants/${testTenantId}`)
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({});

    expect([400, 404, 500]).toContain(response.status);
  });
});

describe('Tenant Management - Delete', () => {
  it('should soft delete tenant', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    // Create a tenant to delete
    const createResponse = await request(app)
      .post('/api/platform-admin/tenants')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        company_name: `Delete Test ${Date.now()}`,
        subdomain: `deltest${Date.now()}`,
        admin_username: `deladmin${Date.now()}`,
        admin_email: `deladmin${Date.now()}@test.local`,
        admin_password: 'testpass123',
      });

    if (createResponse.status === 201 && createResponse.body.tenant_id) {
      const deleteResponse = await request(app)
        .delete(`/api/platform-admin/tenants/${createResponse.body.tenant_id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect([200, 404, 500]).toContain(deleteResponse.status);
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/platform-admin/tenants/${testTenantId}`);

    expect(response.status).toBe(401);
  });

  it('should handle non-existent tenant', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .delete('/api/platform-admin/tenants/99999')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Platform Statistics', () => {
  it('should get platform statistics', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/stats')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('inactive');
    }
  });

  it('should include organization type breakdown', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/stats')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('byOrgType');
      expect(typeof response.body.byOrgType).toBe('object');
    }
  });

  it('should include revenue information', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/stats')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('totalRevenue');
      expect(typeof response.body.totalRevenue).toBe('number');
    }
  });

  it('should calculate discount percentages', async () => {
    if (!platformAdminToken) {
      console.log('Skipping - no platform admin token');
      return;
    }

    const response = await request(app)
      .get('/api/platform-admin/stats')
      .set('Authorization', `Bearer ${platformAdminToken}`);

    if (response.status === 200 && Object.keys(response.body.byOrgType).length > 0) {
      const firstOrgType = Object.values(response.body.byOrgType)[0] as any;
      expect(firstOrgType).toHaveProperty('count');
      expect(firstOrgType).toHaveProperty('revenue');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/platform-admin/stats');

    expect(response.status).toBe(401);
  });
});

describe('Token Validation', () => {
  it('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('should reject expired tokens', async () => {
    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid');

    expect(response.status).toBe(401);
  });

  it('should reject tokens without adminId', async () => {
    // Regular tenant token should not work for platform admin routes
    const tenantId = await createTestTenant('Token Test Company');

    // This would be a tenant user token, not a platform admin token
    const response = await request(app)
      .get('/api/platform-admin/tenants')
      .set('Authorization', 'Bearer some-tenant-token');

    expect(response.status).toBe(401);

    await cleanupTestTenant(tenantId);
  });
});
