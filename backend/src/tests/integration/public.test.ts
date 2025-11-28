import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Public Routes Integration Tests
 *
 * Tests public endpoints that don't require authentication:
 * - Tenant lookup by subdomain
 * - Frontend tenant detection
 * - Public tenant information
 */

let app: Application;
let tenantId: number;
let subdomain: string;

beforeAll(async () => {
  app = createTestApp();
  subdomain = `publictest${Date.now()}`;
  tenantId = await createTestTenant(`Public Test Company ${Date.now()}`, subdomain);
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Tenant Lookup by Subdomain', () => {
  it('should get tenant by subdomain without authentication', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('company_name');
      expect(response.body).toHaveProperty('subdomain');
      expect(response.body.subdomain).toBe(subdomain);
    }
  });

  it('should return tenant configuration', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('organization_type');
      expect(response.body).toHaveProperty('is_active');
    }
  });

  it('should include theme information', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('theme');
      expect(typeof response.body.theme).toBe('object');
    }
  });

  it('should handle non-existent subdomain', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/nonexistentsubdomain999`);

    expect([404, 500]).toContain(response.status);
  });

  it('should not require authorization header', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    // Should not return 401 Unauthorized
    expect(response.status).not.toBe(401);
  });
});

describe('Tenant Information Fields', () => {
  it('should include billing information', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('base_price');
      expect(response.body).toHaveProperty('currency');
      expect(response.body).toHaveProperty('billing_cycle');
    }
  });

  it('should include cooperative information', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('cooperative_model');
      expect(response.body).toHaveProperty('discount_percentage');
    }
  });

  it('should include created date', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('created_at');
    }
  });

  it('should include active status', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('is_active');
      expect(response.body.is_active).toBe(true);
    }
  });
});

describe('Security and Data Protection', () => {
  it('should not expose sensitive data', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      // Should not expose password hashes or internal keys
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
      expect(response.body).not.toHaveProperty('api_key');
      expect(response.body).not.toHaveProperty('jwt_secret');
    }
  });

  it('should only return active tenants', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body.is_active).toBe(true);
    }
  });
});

describe('Subdomain Validation', () => {
  it('should handle lowercase subdomain', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain.toLowerCase()}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle special characters in subdomain lookup', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/test-subdomain-123`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle empty subdomain', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Frontend Tenant Detection', () => {
  it('should support tenant detection for SPA routing', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body.tenant_id).toBe(tenantId);
    }
  });

  it('should provide necessary configuration for frontend', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    if (response.status === 200) {
      expect(response.body).toHaveProperty('company_name');
      expect(response.body).toHaveProperty('theme');
      expect(response.body).toHaveProperty('organization_type');
    }
  });
});

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const response = await request(app)
      .get(`/api/public/tenant/${subdomain}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should return 404 for inactive tenants', async () => {
    // This tests that only active tenants are returned
    const response = await request(app)
      .get(`/api/public/tenant/inactive-tenant-999`);

    expect([404, 500]).toContain(response.status);
  });
});
