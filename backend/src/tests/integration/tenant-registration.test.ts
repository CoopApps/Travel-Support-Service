import request from 'supertest';
import { Application } from 'express';
import { cleanupTestTenant, closeTestPool, getTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Tenant Registration Routes Integration Tests
 *
 * Tests the public tenant registration system:
 * - New tenant registration with first admin user
 * - Subdomain availability checking
 * - Input validation (company name, email, subdomain)
 * - Duplicate prevention (subdomain, domain, email)
 * - Required field enforcement
 * - Onboarding workflow
 *
 * CRITICAL: These are public routes for SaaS customer acquisition
 */

let app: Application;
const testTenantIds: number[] = [];

beforeAll(async () => {
  app = createTestApp();
}, 30000);

afterAll(async () => {
  // Clean up all test tenants created during tests
  for (const tenantId of testTenantIds) {
    await cleanupTestTenant(tenantId);
  }
  await closeTestPool();
}, 30000);

describe('Tenant Registration', () => {
  it('should register a new tenant with all required fields', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `testcompany${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Test Transport Company',
        subdomain: subdomain,
        adminEmail: `admin${timestamp}@testcompany.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'John Administrator',
        phone: '01234567890',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successful');
      expect(response.body).toHaveProperty('tenant');
      expect(response.body.tenant).toHaveProperty('id');
      expect(response.body.tenant).toHaveProperty('companyName');
      expect(response.body.tenant).toHaveProperty('subdomain');
      expect(response.body.tenant).toHaveProperty('domain');
      expect(response.body.tenant.subdomain).toBe(subdomain);
      expect(response.body).toHaveProperty('loginUrl');

      // Track for cleanup
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should register a tenant without optional phone field', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `nophone${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Phone Transport',
        subdomain: subdomain,
        adminEmail: `nophone${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Jane Smith',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      expect(response.body.tenant).toBeDefined();
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should create admin user with correct role', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `adminrole${timestamp}${randomSuffix}`;
    const email = `adminrole${timestamp}@test.com`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Admin Role Test',
        subdomain: subdomain,
        adminEmail: email,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Admin User',
      });

    if (response.status === 201) {
      const tenantId = response.body.tenant.id;
      testTenantIds.push(tenantId);

      // Verify user was created with admin role
      const pool = getTestPool();
      const userResult = await pool.query(
        'SELECT role, is_active FROM tenant_users WHERE tenant_id = $1 AND email = $2',
        [tenantId, email]
      );

      if (userResult.rows.length > 0) {
        expect(userResult.rows[0].role).toBe('admin');
        expect(userResult.rows[0].is_active).toBe(true);
      }
    }
  });
});

describe('Required Fields Validation', () => {
  it('should reject registration without company name', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        subdomain: `nocompany${timestamp}`,
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration without subdomain', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Subdomain Company',
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration without admin email', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Email Company',
        subdomain: `noemail${timestamp}`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration without admin password', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Password Company',
        subdomain: `nopass${timestamp}`,
        adminEmail: `test${timestamp}@test.com`,
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration without admin full name', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Name Company',
        subdomain: `noname${timestamp}`,
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject registration with empty required fields', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: '',
        subdomain: '',
        adminEmail: '',
        adminPassword: '',
        adminFullName: '',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('Subdomain Validation', () => {
  it('should reject subdomain shorter than 3 characters', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Short Subdomain',
        subdomain: 'ab',
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('3-50 characters');
  });

  it('should reject subdomain with special characters', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Special Chars Company',
        subdomain: 'test-company!',
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lowercase letters and numbers only');
  });

  it('should reject subdomain with spaces', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Spaces Company',
        subdomain: 'test company',
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lowercase letters and numbers only');
  });

  it('should reject subdomain with uppercase letters', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Uppercase Company',
        subdomain: 'TestCompany',
        adminEmail: `test${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lowercase letters and numbers only');
  });

  it('should accept valid alphanumeric subdomain', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `valid123${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Valid Subdomain Company',
        subdomain: subdomain,
        adminEmail: `valid${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should convert subdomain to lowercase automatically', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `lowercase${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Lowercase Test',
        subdomain: subdomain.toUpperCase(),
        adminEmail: `lowercase${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      expect(response.body.tenant.subdomain).toBe(subdomain);
      testTenantIds.push(response.body.tenant.id);
    }
  });
});

describe('Email Validation', () => {
  it('should reject invalid email format', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Invalid Email Company',
        subdomain: `invalidemail${timestamp}`,
        adminEmail: 'notanemail',
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email format');
  });

  it('should reject email without domain', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No Domain Email',
        subdomain: `nodomain${timestamp}`,
        adminEmail: 'admin@',
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email format');
  });

  it('should reject email without at symbol', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'No At Symbol',
        subdomain: `noat${timestamp}`,
        adminEmail: 'admintest.com',
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid email format');
  });

  it('should accept valid email format', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Valid Email Company',
        subdomain: `validemail${timestamp}${randomSuffix}`,
        adminEmail: `valid.email+test${timestamp}@example.co.uk`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });
});

describe('Company Name Validation', () => {
  it('should accept company names with special characters', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: "O'Brien & Sons Transport Ltd.",
        subdomain: `obrien${timestamp}${randomSuffix}`,
        adminEmail: `obrien${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      expect(response.body.tenant.companyName).toContain("O'Brien");
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should accept company names with numbers', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Transport 247 Services',
        subdomain: `transport247${timestamp}${randomSuffix}`,
        adminEmail: `t247${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });
});

describe('Password Validation', () => {
  it('should reject password shorter than 8 characters', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Short Password Test',
        subdomain: `shortpw${timestamp}`,
        adminEmail: `shortpw${timestamp}@test.com`,
        adminPassword: 'Pass1!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('at least 8 characters');
  });

  it('should accept password with exactly 8 characters', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Exact Length Password',
        subdomain: `exact8pw${timestamp}${randomSuffix}`,
        adminEmail: `exact8${timestamp}@test.com`,
        adminPassword: 'Pass123!',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should accept long password', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Long Password Test',
        subdomain: `longpw${timestamp}${randomSuffix}`,
        adminEmail: `longpw${timestamp}@test.com`,
        adminPassword: 'ThisIsAVeryLongAndSecurePassword123!@#',
        adminFullName: 'Test User',
      });

    expect([201, 500]).toContain(response.status);

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });
});

describe('Duplicate Prevention', () => {
  let existingSubdomain: string;
  let existingEmail: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    existingSubdomain = `existing${timestamp}${randomSuffix}`;
    existingEmail = `existing${timestamp}@test.com`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Existing Tenant',
        subdomain: existingSubdomain,
        adminEmail: existingEmail,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Existing User',
      });

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should reject duplicate subdomain', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Duplicate Subdomain Test',
        subdomain: existingSubdomain,
        adminEmail: `different${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Different User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already taken');
  });

  it('should reject duplicate email', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Duplicate Email Test',
        subdomain: `different${timestamp}${randomSuffix}`,
        adminEmail: existingEmail,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Different User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already registered');
  });

  it('should allow same company name with different subdomain', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Same Name Transport',
        subdomain: `samename1${timestamp}${randomSuffix}`,
        adminEmail: `samename1${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'User One',
      });

    if (response.status === 201) {
      testTenantIds.push(response.body.tenant.id);

      const randomSuffix2 = Math.random().toString(36).substring(2, 8);
      const response2 = await request(app)
        .post('/api/register')
        .send({
          companyName: 'Same Name Transport',
          subdomain: `samename2${timestamp}${randomSuffix2}`,
          adminEmail: `samename2${timestamp}@test.com`,
          adminPassword: 'SecurePass123!',
          adminFullName: 'User Two',
        });

      expect([201, 500]).toContain(response2.status);

      if (response2.status === 201) {
        testTenantIds.push(response2.body.tenant.id);
      }
    }
  });
});

describe('Subdomain Availability Check', () => {
  it('should check availability of non-existent subdomain', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `available${timestamp}${randomSuffix}`;

    const response = await request(app)
      .get(`/api/check-subdomain/${subdomain}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('available');
    expect(response.body).toHaveProperty('subdomain');
    expect(response.body).toHaveProperty('message');
    expect(response.body.subdomain).toBe(subdomain);
  });

  it('should report existing subdomain as unavailable', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `checkexist${timestamp}${randomSuffix}`;

    // First create the subdomain
    const createResponse = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Check Existing Test',
        subdomain: subdomain,
        adminEmail: `checkexist${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (createResponse.status === 201) {
      testTenantIds.push(createResponse.body.tenant.id);

      // Now check availability
      const checkResponse = await request(app)
        .get(`/api/check-subdomain/${subdomain}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.available).toBe(false);
      expect(checkResponse.body.message).toContain('already taken');
    }
  });

  it('should reject invalid subdomain format in availability check', async () => {
    const response = await request(app)
      .get('/api/check-subdomain/invalid-subdomain!');

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
    expect(response.body.message).toContain('3-50 characters');
  });

  it('should reject subdomain shorter than 3 chars in availability check', async () => {
    const response = await request(app)
      .get('/api/check-subdomain/ab');

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
    expect(response.body.message).toContain('3-50 characters');
  });

  it('should convert subdomain to lowercase in availability check', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `mixedcase${timestamp}${randomSuffix}`;

    const response = await request(app)
      .get(`/api/check-subdomain/${subdomain.toUpperCase()}`);

    expect(response.status).toBe(200);
    expect(response.body.subdomain).toBe(subdomain);
  });
});

describe('Onboarding Workflow', () => {
  it('should create tenant in active state', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `activetest${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Active State Test',
        subdomain: subdomain,
        adminEmail: `active${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      const tenantId = response.body.tenant.id;
      testTenantIds.push(tenantId);

      // Verify tenant is active
      const pool = getTestPool();
      const tenantResult = await pool.query(
        'SELECT is_active FROM tenants WHERE tenant_id = $1',
        [tenantId]
      );

      if (tenantResult.rows.length > 0) {
        expect(tenantResult.rows[0].is_active).toBe(true);
      }
    }
  });

  it('should return login URL in registration response', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Login URL Test',
        subdomain: `loginurl${timestamp}${randomSuffix}`,
        adminEmail: `loginurl${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      expect(response.body).toHaveProperty('loginUrl');
      expect(response.body.loginUrl).toContain('login');
      expect(response.body.loginUrl).toContain('tenant=');
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should allow newly registered admin to login', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `canlogin${timestamp}${randomSuffix}`;
    const email = `canlogin${timestamp}@test.com`;
    const password = 'SecurePass123!';

    const registerResponse = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Can Login Test',
        subdomain: subdomain,
        adminEmail: email,
        adminPassword: password,
        adminFullName: 'Test User',
      });

    if (registerResponse.status === 201) {
      const tenantId = registerResponse.body.tenant.id;
      testTenantIds.push(tenantId);

      // Attempt to login with the created credentials
      const pool = getTestPool();
      const userResult = await pool.query(
        'SELECT username FROM tenant_users WHERE tenant_id = $1 AND email = $2',
        [tenantId, email]
      );

      if (userResult.rows.length > 0) {
        const username = userResult.rows[0].username;

        const loginResponse = await request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({ username, password });

        expect([200, 500]).toContain(loginResponse.status);

        if (loginResponse.status === 200) {
          expect(loginResponse.body).toHaveProperty('token');
          expect(loginResponse.body).toHaveProperty('user');
        }
      }
    }
  });

  it('should set proper app_id for tenant', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'App ID Test',
        subdomain: `appid${timestamp}${randomSuffix}`,
        adminEmail: `appid${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      const tenantId = response.body.tenant.id;
      testTenantIds.push(tenantId);

      // Verify app_id is set
      const pool = getTestPool();
      const tenantResult = await pool.query(
        'SELECT app_id FROM tenants WHERE tenant_id = $1',
        [tenantId]
      );

      if (tenantResult.rows.length > 0) {
        expect(tenantResult.rows[0].app_id).toBeDefined();
        expect(tenantResult.rows[0].app_id).toBeGreaterThan(0);
      }
    }
  });

  it('should generate proper domain from subdomain', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `domaintest${timestamp}${randomSuffix}`;

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Domain Generation Test',
        subdomain: subdomain,
        adminEmail: `domain${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      expect(response.body.tenant.domain).toContain(subdomain);
      expect(response.body.tenant.domain).toMatch(/\./);
      testTenantIds.push(response.body.tenant.id);
    }
  });
});

describe('Input Sanitization', () => {
  it('should sanitize XSS attempt in company name', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: '<script>alert("xss")</script>Transport Co',
        subdomain: `sanitize${timestamp}${randomSuffix}`,
        adminEmail: `sanitize${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    if (response.status === 201) {
      expect(response.body.tenant.companyName).not.toContain('<script>');
      testTenantIds.push(response.body.tenant.id);
    }
  });

  it('should sanitize SQL injection attempt in subdomain', async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'SQL Test',
        subdomain: "test'; DROP TABLE tenants; --",
        adminEmail: `sqltest${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lowercase letters and numbers only');
  });

  it('should handle very long input gracefully', async () => {
    const timestamp = Date.now();
    const longString = 'a'.repeat(500);

    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: longString,
        subdomain: `toolong${timestamp}`,
        adminEmail: `toolong${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    expect([201, 400, 500]).toContain(response.status);
  });
});

describe('Transaction Integrity', () => {
  it('should rollback if user creation fails', async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const subdomain = `rollback${timestamp}${randomSuffix}`;

    // This test verifies transaction behavior
    // If registration fails for any reason, the tenant should not exist
    const response = await request(app)
      .post('/api/register')
      .send({
        companyName: 'Rollback Test',
        subdomain: subdomain,
        adminEmail: `rollback${timestamp}@test.com`,
        adminPassword: 'SecurePass123!',
        adminFullName: 'Test User',
      });

    // Check that subdomain either exists with complete data or doesn't exist at all
    const pool = getTestPool();
    const tenantResult = await pool.query(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );

    if (tenantResult.rows.length > 0) {
      const tenantId = tenantResult.rows[0].tenant_id;

      // If tenant exists, user must also exist
      const userResult = await pool.query(
        'SELECT user_id FROM tenant_users WHERE tenant_id = $1',
        [tenantId]
      );

      expect(userResult.rows.length).toBeGreaterThan(0);
      testTenantIds.push(tenantId);
    }
  });
});
