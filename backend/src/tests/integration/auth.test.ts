import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Authentication Integration Tests
 *
 * Tests the critical authentication flow:
 * - User login with valid credentials
 * - User login with invalid credentials
 * - JWT token generation
 * - Protected route access with token
 * - Token expiration handling
 *
 * CRITICAL for security - ensures only authorized users can access the system
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };

beforeAll(async () => {
  // Create test Express app with all routes
  app = createTestApp();

  // Create test tenant and user
  tenantId = await createTestTenant('Auth Test Company');
  testUser = await createTestUser(tenantId, 'authtest@test.local', 'admin');
}, 30000);

afterAll(async () => {
  // Clean up test data
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('POST /api/tenants/:tenantId/login', () => {
  it('should login with valid credentials and return JWT token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: testUser.password,
      })
      .expect('Content-Type', /json/);

    // Should return 200 OK
    expect(response.status).toBe(200);

    // Should return a token
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');

    // Should return user information
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.tenantId).toBe(tenantId);
    expect(response.body.user.role).toBe('admin');

    // Should NOT return password
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('should reject login with invalid username', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: 'nonexistent',
        password: testUser.password,
      })
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);

    // Should not return a token
    expect(response.body).not.toHaveProperty('token');

    // Should return an error message
    expect(response.body).toHaveProperty('error');
  });

  it('should reject login with invalid password', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: 'WrongPassword123!',
      })
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);

    // Should not return a token
    expect(response.body).not.toHaveProperty('token');

    // Should return an error message
    expect(response.body).toHaveProperty('error');
  });

  it('should reject login with missing credentials', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        // Missing password
      })
      .expect('Content-Type', /json/);

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
  });

});

describe('Protected Route Access', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get a valid token
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    // Ensure we got a token
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe('string');

    authToken = response.body.token;
  });

  it('should allow access to protected route with valid token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/);

    // Should return 200 OK
    expect(response.status).toBe(200);
  });

  it('should deny access to protected route without token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
  });

  it('should deny access to protected route with invalid token', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', 'Bearer invalid_token_here')
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
  });

  it('should deny access to protected route with malformed authorization header', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/customers`)
      .set('Authorization', 'InvalidFormat token')
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
  });
});

describe('JWT Token Validation', () => {
  it('should include correct user information in token payload', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    // Ensure login was successful
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    const token = response.body.token;
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Decode token (without verification) to check payload
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);

    // Ensure token was decoded successfully
    expect(decoded).not.toBeNull();
    expect(decoded).toBeDefined();
    expect(typeof decoded).toBe('object');

    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('tenantId');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('email');
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.email).toBe(testUser.email);
  });
});

describe('POST /api/tenants/:tenantId/refresh - Token Refresh', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get a valid token
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    authToken = response.body.token;
  });

  it('should refresh a valid token and return a new one', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/refresh`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/);

    // Should return 200 OK
    expect(response.status).toBe(200);

    // Should return a new token
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token).not.toBe(authToken); // Should be a new token

    // Should return user information
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.tenantId).toBe(tenantId);
  });

  it('should reject token refresh without token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/refresh`)
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
  });

  it('should reject token refresh with invalid token', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/refresh`)
      .set('Authorization', 'Bearer invalid_token')
      .expect('Content-Type', /json/);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
  });
});

describe('Password Reset Flow', () => {
  describe('POST /api/tenants/:tenantId/forgot-password', () => {
    it('should accept forgot password request for valid email', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/forgot-password`)
        .send({
          email: testUser.email,
        })
        .expect('Content-Type', /json/);

      // Should return 200 OK (always, to prevent email enumeration)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link');
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/forgot-password`)
        .send({
          email: 'nonexistent@example.com',
        })
        .expect('Content-Type', /json/);

      // Should still return 200 OK (to prevent email enumeration attacks)
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject forgot password without email', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/forgot-password`)
        .send({})
        .expect('Content-Type', /json/);

      // Should return 400 Bad Request
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tenants/:tenantId/reset-password', () => {
    let resetToken: string;

    beforeAll(async () => {
      // Create a password reset token
      const { query } = require('../../config/database');
      const crypto = require('crypto');

      const token = crypto.randomBytes(32).toString('hex');
      resetToken = token;
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await query(
        `INSERT INTO password_reset_tokens (user_id, tenant_id, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [testUser.userId, tenantId, hashedToken, expiresAt]
      );
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewSecurePassword123!';

      const response = await request(app)
        .post(`/api/tenants/${tenantId}/reset-password`)
        .send({
          token: resetToken,
          newPassword,
        })
        .expect('Content-Type', /json/);

      // Should return 200 OK
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successful');

      // Verify we can login with new password
      const loginResponse = await request(app)
        .post(`/api/tenants/${tenantId}/login`)
        .send({
          username: testUser.username,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      // Reset password back to original for other tests
      const { query } = require('../../config/database');
      const bcrypt = require('bcrypt');
      const originalHash = await bcrypt.hash(testUser.password, 10);
      await query(
        'UPDATE tenant_users SET password_hash = $1 WHERE user_id = $2',
        [originalHash, testUser.userId]
      );
    });

    it('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/reset-password`)
        .send({
          token: 'invalid_token_here',
          newPassword: 'NewPassword123!',
        })
        .expect('Content-Type', /json/);

      // Should return 401 Unauthorized
      expect(response.status).toBe(401);
    });

    it('should reject reset with weak password', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/reset-password`)
        .send({
          token: resetToken,
          newPassword: '123', // Too short
        })
        .expect('Content-Type', /json/);

      // Should return 400 Bad Request
      expect(response.status).toBe(400);
    });
  });
});

describe('POST /api/register - Tenant Registration', () => {
  it('should register a new tenant with valid data', async () => {
    const uniqueSubdomain = `testcompany${Date.now()}`;
    const uniqueEmail = `admin${Date.now()}@testcompany.com`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Test Company Ltd',
        subdomain: uniqueSubdomain,
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: uniqueEmail,
        adminPassword: 'SecurePassword123!',
      })
      .expect('Content-Type', /json/);

    // Should return 201 Created
    expect(response.status).toBe(201);

    // Should return tenant info
    expect(response.body).toHaveProperty('tenantId');
    expect(response.body).toHaveProperty('subdomain', uniqueSubdomain);

    // Should return auth token and user
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(uniqueEmail);

    // Clean up: Delete the test tenant
    const { query } = require('../../config/database');
    await query('DELETE FROM tenant_users WHERE tenant_id = $1', [response.body.tenantId]);
    await query('DELETE FROM tenants WHERE tenant_id = $1', [response.body.tenantId]);
  });

  it('should reject registration with duplicate subdomain', async () => {
    const uniqueSubdomain = `duplicate${Date.now()}`;
    const uniqueEmail1 = `admin1${Date.now()}@test.com`;
    const uniqueEmail2 = `admin2${Date.now()}@test.com`;

    // First registration
    const response1 = await request(app)
      .post('/api/register')
      .send({
        companyName: 'First Company',
        subdomain: uniqueSubdomain,
        adminFirstName: 'First',
        adminLastName: 'Admin',
        adminEmail: uniqueEmail1,
        adminPassword: 'Password123!',
      });

    expect(response1.status).toBe(201);
    const tenantId = response1.body.tenantId;

    // Second registration with same subdomain
    const response2 = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Second Company',
        subdomain: uniqueSubdomain, // Duplicate!
        adminFirstName: 'Second',
        adminLastName: 'Admin',
        adminEmail: uniqueEmail2,
        adminPassword: 'Password123!',
      })
      .expect('Content-Type', /json/);

    // Should return 400 Bad Request
    expect(response2.status).toBe(400);
    expect(response2.body).toHaveProperty('error');

    // Clean up
    const { query } = require('../../config/database');
    await query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenantId]);
    await query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]);
  });

  it('should reject registration with missing required fields', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Incomplete Company',
        // Missing subdomain, adminEmail, adminPassword, etc.
      })
      .expect('Content-Type', /json/);

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
  });

  it('should reject registration with invalid email format', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Invalid Email Company',
        subdomain: `test${Date.now()}`,
        adminFirstName: 'Test',
        adminLastName: 'User',
        adminEmail: 'not-an-email', // Invalid email
        adminPassword: 'Password123!',
      })
      .expect('Content-Type', /json/);

    // Should return 400 Bad Request
    expect(response.status).toBe(400);
  });
});

describe('GET /api/check-subdomain/:subdomain - Subdomain Availability', () => {
  it('should return available for unused subdomain', async () => {
    const uniqueSubdomain = `available${Date.now()}`;

    const response = await request(app)
      .get(`/api/check-subdomain/${uniqueSubdomain}`)
      .expect('Content-Type', /json/);

    // Should return 200 OK
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('available', true);
  });

  it('should return unavailable for existing subdomain', async () => {
    // Use the existing test tenant's subdomain (which we know exists)
    const { query } = require('../../config/database');
    const result = await query('SELECT subdomain FROM tenants WHERE tenant_id = $1', [tenantId]);
    const existingSubdomain = result[0].subdomain;

    const response = await request(app)
      .get(`/api/check-subdomain/${existingSubdomain}`)
      .expect('Content-Type', /json/);

    // Should return 200 OK
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('available', false);
  });
});

// Rate limiting test runs LAST to avoid interfering with other tests
describe('Rate Limiting', () => {
  it('should rate limit excessive login attempts', async () => {
    // Make multiple failed login attempts
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({
            username: testUser.username,
            password: 'WrongPassword',
          })
      );
    }

    const responses = await Promise.all(attempts);

    // At least one should be rate limited (429)
    const rateLimited = responses.some((r) => r.status === 429);
    expect(rateLimited).toBe(true);
  }, 10000);
});
