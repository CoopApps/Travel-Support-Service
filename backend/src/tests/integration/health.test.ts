import request from 'supertest';
import { Application } from 'express';
import { createMinimalTestApp } from '../setup/testApp';
import { expectSuccess } from '../setup/testHelpers';

/**
 * Health Check Routes Integration Tests
 *
 * Tests system health endpoints:
 * - GET /health (basic health check)
 * - GET /health/detailed (detailed with DB status)
 * - GET /health/ready (readiness probe)
 * - GET /health/live (liveness probe)
 *
 * These endpoints are PUBLIC and require no authentication.
 * They're used by load balancers, monitoring services, and Kubernetes.
 */

let app: Application;

beforeAll(() => {
  app = createMinimalTestApp();
});

describe('GET /health - Basic Health Check', () => {
  it('should return 200 and health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    expectSuccess(response, 200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptime');
    expect(response.body.data).toHaveProperty('environment');

    expect(response.body.data.status).toBe('healthy');
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should include version information', async () => {
    const response = await request(app).get('/api/health');

    expectSuccess(response, 200);
    expect(response.body.data).toHaveProperty('version');
  });

  it('should include environment', async () => {
    const response = await request(app).get('/api/health');

    expectSuccess(response, 200);
    expect(['development', 'test', 'production']).toContain(response.body.data.environment);
  });
});

describe('GET /health/detailed - Detailed Health Check', () => {
  it('should return detailed health with all checks', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect('Content-Type', /json/);

    // May be 200 or 503 depending on database availability
    expect([200, 503]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('checks');
      expect(response.body.data.checks).toHaveProperty('memory');
    }
  });

  it('should include database check in response', async () => {
    const response = await request(app).get('/api/health/detailed');

    if (response.status === 200) {
      expect(response.body.data.checks).toHaveProperty('database');
      expect(response.body.data.checks.database).toHaveProperty('status');
    }
  });

  it('should include memory statistics', async () => {
    const response = await request(app).get('/api/health/detailed');

    if (response.status === 200) {
      expect(response.body.data.checks).toHaveProperty('memory');
      expect(response.body.data.checks.memory).toHaveProperty('heapUsed');
      expect(response.body.data.checks.memory).toHaveProperty('heapTotal');
      expect(response.body.data.checks.memory).toHaveProperty('rss');
    }
  });

  it('should include response time', async () => {
    const response = await request(app).get('/api/health/detailed');

    if (response.status === 200) {
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data.responseTime).toMatch(/^\d+ms$/);
    }
  });

  it('should include database pool stats when available', async () => {
    const response = await request(app).get('/api/health/detailed');

    if (response.status === 200 && response.body.data.checks.databasePool) {
      expect(response.body.data.checks.databasePool).toHaveProperty('status');
    }
  });

  it('should include cache stats when available', async () => {
    const response = await request(app).get('/api/health/detailed');

    if (response.status === 200 && response.body.data.checks.cache) {
      expect(response.body.data.checks.cache).toHaveProperty('status');
    }
  });
});

describe('GET /health/ready - Readiness Probe', () => {
  it('should return readiness status', async () => {
    const response = await request(app)
      .get('/api/health/ready')
      .expect('Content-Type', /json/);

    // May be 200 or 503 depending on database availability
    expect([200, 503]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body.data).toHaveProperty('ready', true);
      expect(response.body.data).toHaveProperty('timestamp');
    }
  });

  it('should respond quickly (under 5 seconds)', async () => {
    const startTime = Date.now();
    await request(app).get('/api/health/ready');
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000);
  });
});

describe('GET /health/live - Liveness Probe', () => {
  it('should return alive status', async () => {
    const response = await request(app)
      .get('/api/health/live')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toHaveProperty('alive', true);
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptime');
  });

  it('should always respond (even if DB is down)', async () => {
    // Liveness probe should always succeed if the server is running
    const response = await request(app).get('/api/health/live');

    expect(response.status).toBe(200);
    expect(response.body.data.alive).toBe(true);
  });

  it('should respond very quickly (under 100ms)', async () => {
    const startTime = Date.now();
    await request(app).get('/api/health/live');
    const duration = Date.now() - startTime;

    // Liveness should be very fast as it doesn't check external services
    expect(duration).toBeLessThan(100);
  });

  it('should include server uptime', async () => {
    const response = await request(app).get('/api/health/live');

    expect(response.body.data.uptime).toBeDefined();
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('Health Endpoint Security', () => {
  it('should not expose sensitive information', async () => {
    const response = await request(app).get('/api/health');

    // Should not contain any of these
    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('password');
    expect(responseString).not.toContain('secret');
    expect(responseString).not.toContain('api_key');
    expect(responseString).not.toContain('DATABASE_URL');
  });

  it('should not expose database credentials in detailed check', async () => {
    const response = await request(app).get('/api/health/detailed');

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('password');
    expect(responseString).not.toContain('postgres:');
    expect(responseString).not.toContain('DB_PASSWORD');
  });
});
