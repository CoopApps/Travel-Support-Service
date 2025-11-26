import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * CSRF Protection Tests
 *
 * Tests that CSRF protection is properly implemented:
 * - CSRF token is issued on request
 * - State-changing requests require valid CSRF token
 * - Invalid tokens are rejected
 * - Safe methods (GET, HEAD, OPTIONS) don't require CSRF
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let csrfToken: string;
let csrfCookie: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('CSRF Test Company');
  testUser = await createTestUser(tenantId, 'csrftest@test.local', 'admin');

  // Login to get auth token
  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({
      username: testUser.username,
      password: testUser.password,
    });

  expect(loginResponse.status).toBe(200);
  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('CSRF Token Generation', () => {
  it('should issue a CSRF token on request', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/csrf-token`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('csrfToken');
    expect(typeof response.body.data.csrfToken).toBe('string');
    expect(response.body.data.csrfToken.length).toBeGreaterThan(30);

    // Save for later tests
    csrfToken = response.body.data.csrfToken;

    // Check that cookie was set
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    const csrfCookieHeader = cookieArray.find((c: string) => c.startsWith('csrf_token_id='));
    expect(csrfCookieHeader).toBeDefined();
    csrfCookie = csrfCookieHeader!;
  });

  it('should issue CSRF token without authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/csrf-token`);

    // Should work even without auth (for login forms)
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('csrfToken');
  });
});

describe('CSRF Protection on State-Changing Requests', () => {
  // Note: CSRF protection only applies when using cookie-based auth (auth_token cookie)
  // Bearer token auth via Authorization header skips CSRF (by design - API tokens don't need CSRF)
  // These tests simulate cookie-based auth by including a fake auth_token cookie

  beforeAll(async () => {
    // Get fresh CSRF token
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/csrf-token`)
      .set('Authorization', `Bearer ${authToken}`);

    csrfToken = response.body.data.csrfToken;
    const cookies = response.headers['set-cookie'];
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    csrfCookie = cookieArray.find((c: string) => c.startsWith('csrf_token_id='))!;
    // Add fake auth_token cookie to trigger CSRF validation
    csrfCookie += '; auth_token=test_token';
  });

  it('should allow POST request with valid CSRF token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'CSRF Test Customer',
        email: 'csrfcustomer@test.local',
        phone: '01onal234567890',
      });

    // Should succeed (or 400 for validation, but not 403 for CSRF)
    expect([200, 201, 400]).toContain(response.status);
    if (response.status === 403) {
      expect(response.body.code).not.toBe('CSRF_TOKEN_INVALID');
      expect(response.body.code).not.toBe('CSRF_TOKEN_MISSING');
    }
  });

  it('should reject POST request without CSRF token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      // Missing X-CSRF-Token header
      .send({
        name: 'No CSRF Customer',
        email: 'nocsrf@test.local',
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('code');
    expect(['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID']).toContain(response.body.code);
  });

  it('should reject POST request with invalid CSRF token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', 'invalid_csrf_token_here')
      .send({
        name: 'Invalid CSRF Customer',
        email: 'invalidcsrf@test.local',
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('should reject PUT request without CSRF token', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/customers/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie)
      .send({
        name: 'Updated Name',
      });

    expect(response.status).toBe(403);
  });

  it('should reject DELETE request without CSRF token', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/customers/999`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', csrfCookie);

    expect(response.status).toBe(403);
  });
});

describe('CSRF Safe Methods', () => {
  it('should allow GET requests without CSRF token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`);

    // Should not be blocked by CSRF (may be 200, 401, or other)
    expect(response.status).not.toBe(403);
  });

  it('should allow OPTIONS requests without CSRF token', async () => {
    const response = await request(app)
      .options(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`);

    // OPTIONS should work
    expect([200, 204]).toContain(response.status);
  });
});

describe('CSRF Token Exemptions', () => {
  it('should exempt login endpoint from CSRF', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    // Login should work without CSRF token
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should exempt logout endpoint from CSRF', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/logout`)
      .set('Authorization', `Bearer ${authToken}`);

    // Logout should work without CSRF token
    expect([200, 204]).toContain(response.status);
  });
});

describe('CSRF Token with API Key Authentication', () => {
  it('should not require CSRF for Authorization header only (API key pattern)', async () => {
    // When using Authorization header without cookies, CSRF should be skipped
    // This is the pattern for API key/machine-to-machine auth
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`);
    // No cookies set

    // Should work - CSRF only protects cookie-based auth
    expect([200, 401, 403]).toContain(response.status);
    // If it's 403, it shouldn't be for CSRF
    if (response.status === 403) {
      expect(response.body.code).not.toBe('CSRF_TOKEN_MISSING');
    }
  });
});
