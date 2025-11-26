import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Test Helpers
 *
 * Common utilities for integration tests including:
 * - Authentication helpers (login, token generation)
 * - Test data generators
 * - Request helpers with auth
 * - Response assertion helpers
 */

// ====================
// Authentication Helpers
// ====================

interface AuthenticatedAgent {
  get: (url: string) => request.Test;
  post: (url: string) => request.Test;
  put: (url: string) => request.Test;
  patch: (url: string) => request.Test;
  delete: (url: string) => request.Test;
  token: string;
}

/**
 * Login a user and return authenticated request agent
 */
export async function loginAsUser(
  app: Application,
  tenantId: number,
  username: string,
  password: string
): Promise<AuthenticatedAgent> {
  const response = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username, password });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  const token = response.body.token;

  return {
    token,
    get: (url: string) =>
      request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(
  userId: number,
  tenantId: number,
  role: string = 'admin',
  email: string = 'test@test.local'
): string {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
  return jwt.sign(
    { userId, tenantId, role, email },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(
  userId: number,
  tenantId: number
): string {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
  return jwt.sign(
    { userId, tenantId, role: 'admin', email: 'test@test.local' },
    secret,
    { expiresIn: '-1h' } // Already expired
  );
}

// ====================
// Test Data Generators
// ====================

/**
 * Generate unique test data
 */
export const testData = {
  /**
   * Generate unique email
   */
  email: (prefix: string = 'test') => `${prefix}${Date.now()}@test.local`,

  /**
   * Generate unique subdomain
   */
  subdomain: (prefix: string = 'test') => `${prefix}${Date.now()}`,

  /**
   * Generate customer data
   */
  customer: (overrides: Record<string, any> = {}) => ({
    name: `Test Customer ${Date.now()}`,
    email: `customer${Date.now()}@test.local`,
    phone: '01onal234567',
    address: '123 Test Street',
    postcode: 'TE1 1ST',
    mobility_requirements: 'None',
    notes: 'Test customer',
    ...overrides,
  }),

  /**
   * Generate driver data
   */
  driver: (overrides: Record<string, any> = {}) => ({
    name: `Test Driver ${Date.now()}`,
    email: `driver${Date.now()}@test.local`,
    phone: '01234567890',
    license_number: `LIC${Date.now()}`,
    license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dbs_check_date: new Date().toISOString().split('T')[0],
    dbs_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    emergency_contact: 'Emergency Contact',
    emergency_phone: '09876543210',
    ...overrides,
  }),

  /**
   * Generate vehicle data
   */
  vehicle: (overrides: Record<string, any> = {}) => ({
    registration: `TEST${Date.now().toString().slice(-4)}`,
    make: 'Test Make',
    model: 'Test Model',
    year: new Date().getFullYear(),
    capacity: 4,
    wheelchair_accessible: false,
    mot_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ...overrides,
  }),

  /**
   * Generate trip data
   */
  trip: (customerId: number, driverId?: number, vehicleId?: number, overrides: Record<string, any> = {}) => ({
    customer_id: customerId,
    driver_id: driverId,
    vehicle_id: vehicleId,
    pickup_address: '123 Pickup Street',
    pickup_postcode: 'PU1 1CK',
    dropoff_address: '456 Dropoff Avenue',
    dropoff_postcode: 'DR0 0PF',
    scheduled_pickup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estimated_duration: 30,
    passenger_count: 1,
    notes: 'Test trip',
    ...overrides,
  }),

  /**
   * Generate holiday data
   */
  holiday: (driverId: number, overrides: Record<string, any> = {}) => ({
    driver_id: driverId,
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: 'Annual leave',
    status: 'pending',
    ...overrides,
  }),

  /**
   * Generate maintenance record data
   */
  maintenance: (vehicleId: number, overrides: Record<string, any> = {}) => ({
    vehicle_id: vehicleId,
    type: 'service',
    description: 'Regular service',
    date: new Date().toISOString().split('T')[0],
    cost: 150.00,
    mileage: 50000,
    next_due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ...overrides,
  }),
};

// ====================
// Response Assertion Helpers
// ====================

/**
 * Assert response is successful with expected structure
 */
export function expectSuccess(response: request.Response, statusCode: number = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.type).toMatch(/json/);
}

/**
 * Assert response is an error with message
 */
export function expectError(
  response: request.Response,
  statusCode: number,
  messageContains?: string
) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (messageContains) {
    expect(response.body.error.toLowerCase()).toContain(messageContains.toLowerCase());
  }
}

/**
 * Assert response is paginated list
 */
export function expectPaginated(response: request.Response, itemsProperty: string = 'data') {
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty(itemsProperty);
  expect(Array.isArray(response.body[itemsProperty])).toBe(true);
  // Many paginated responses have pagination info
  if (response.body.pagination) {
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
  }
}

/**
 * Assert response contains specific fields
 */
export function expectFields(response: request.Response, fields: string[]) {
  fields.forEach((field) => {
    expect(response.body).toHaveProperty(field);
  });
}

/**
 * Assert response does NOT contain sensitive fields
 */
export function expectNoSensitiveFields(response: request.Response) {
  const sensitiveFields = [
    'password',
    'password_hash',
    'passwordHash',
    'secret',
    'api_key',
    'apiKey',
    'token',
  ];

  const checkObject = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      if (sensitiveFields.includes(key.toLowerCase())) {
        fail(`Sensitive field '${currentPath}' found in response`);
      }
      if (typeof obj[key] === 'object') {
        checkObject(obj[key], currentPath);
      }
    });
  };

  checkObject(response.body);
}

// ====================
// Request Helpers
// ====================

/**
 * Make authenticated request with token
 */
export function authRequest(app: Application, token: string) {
  return {
    get: (url: string) =>
      request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Helper to wait for async operations in tests
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random string for unique test data
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
