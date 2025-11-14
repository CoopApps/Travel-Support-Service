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
