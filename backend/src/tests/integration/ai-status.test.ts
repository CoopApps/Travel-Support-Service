/**
 * Integration tests for AI Status Routes
 *
 * Tests all admin-only endpoints for viewing AI feature status,
 * configuration, budget tracking, and health checks.
 */

import request from 'supertest';
import { Application } from 'express';
import { getDbClient, closePool } from '../../config/database';
import { getAIConfig, reloadAIConfig } from '../../config/ai.config';

// Import server instance for testing
const app: Application = require('../../server').default || require('../../server');

describe('AI Status Routes Integration Tests', () => {
  let tenantId: number;
  let adminToken: string;
  let userId: number;

  beforeAll(async () => {
    // Clean up any existing test data
    const client = await getDbClient();
    try {
      // Delete test tenant if exists
      await client.query('DELETE FROM tenants WHERE subdomain = $1', ['ai-test']);

      // Create test tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (company_name, subdomain, domain, subscription_tier, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING tenant_id`,
        ['AI Test Org', 'ai-test', 'ai-test.travelapp.co.uk', 'premium']
      );
      tenantId = tenantResult.rows[0].tenant_id;

      // Create admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      const userResult = await client.query(
        `INSERT INTO users (tenant_id, username, email, password, role, first_name, last_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING user_id`,
        [tenantId, 'admin-ai', 'admin-ai@test.com', hashedPassword, 'admin', 'Admin', 'User']
      );
      userId = userResult.rows[0].user_id;
    } finally {
      await client.end();
    }

    // Login to get token
    const loginResponse = await request(app)
      .post(`/api/tenants/${tenantId}/login`)
      .send({
        email: 'admin-ai@test.com',
        password: 'TestPassword123!'
      });

    adminToken = loginResponse.body.token;
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    const client = await getDbClient();
    try {
      await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]);
    } finally {
      await client.end();
      await closePool();
    }
  }, 30000);

  describe('GET /api/tenants/:tenantId/ai/status', () => {
    it('should return AI features status for admin', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('globalStatus');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('budget');
      expect(Array.isArray(response.body.data.features)).toBe(true);
    });

    it('should return budget information', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const budget = response.body.data.budget;
      expect(budget).toHaveProperty('dailySpent');
      expect(budget).toHaveProperty('dailyLimit');
      expect(budget).toHaveProperty('percentUsed');
      expect(typeof budget.dailySpent).toBe('number');
      expect(typeof budget.dailyLimit).toBe('number');
    });

    it('should show warning when budget approaches limit', async () => {
      // Note: This test relies on budget tracking implementation
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const budget = response.body.data.budget;
      if (budget.percentUsed >= 80) {
        expect(budget.warning).toBeTruthy();
      }
      if (budget.budgetExceeded) {
        expect(budget.critical).toBeTruthy();
      }
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      // Create non-admin user
      const client = await getDbClient();
      let staffUserId: number;
      let staffToken: string;

      try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('StaffPassword123!', 10);

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, username, email, password, role, first_name, last_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING user_id`,
          [tenantId, 'staff-user', 'staff@test.com', hashedPassword, 'staff', 'Staff', 'User']
        );
        staffUserId = userResult.rows[0].user_id;

        // Login as staff
        const loginResponse = await request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({
            email: 'staff@test.com',
            password: 'StaffPassword123!'
          });
        staffToken = loginResponse.body.token;

        // Try to access AI status
        await request(app)
          .get(`/api/tenants/${tenantId}/ai/status`)
          .set('Authorization', `Bearer ${staffToken}`)
          .expect(403);

        // Clean up
        await client.query('DELETE FROM users WHERE user_id = $1', [staffUserId]);
      } finally {
        await client.end();
      }
    });
  });

  describe('GET /api/tenants/:tenantId/ai/config', () => {
    it('should return AI configuration for admin', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('globalEnabled');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data).toHaveProperty('budget');
      expect(response.body.data).toHaveProperty('services');
    });

    it('should sanitize sensitive API keys', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const services = response.body.data.services;
      // API keys should be shown as 'configured' or 'not configured', not the actual key
      if (services.openAIApiKey) {
        expect(services.openAIApiKey).toMatch(/^(configured|not configured)$/);
      }
      if (services.googleMapsApiKey) {
        expect(services.googleMapsApiKey).toMatch(/^(configured|not configured)$/);
      }
    });

    it('should return 403 for non-admin users', async () => {
      const client = await getDbClient();
      let driverUserId: number;
      let driverToken: string;

      try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('DriverPassword123!', 10);

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, username, email, password, role, first_name, last_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING user_id`,
          [tenantId, 'driver-user', 'driver@test.com', hashedPassword, 'driver', 'Driver', 'User']
        );
        driverUserId = userResult.rows[0].user_id;

        const loginResponse = await request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({
            email: 'driver@test.com',
            password: 'DriverPassword123!'
          });
        driverToken = loginResponse.body.token;

        await request(app)
          .get(`/api/tenants/${tenantId}/ai/config`)
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);

        await client.query('DELETE FROM users WHERE user_id = $1', [driverUserId]);
      } finally {
        await client.end();
      }
    });
  });

  describe('GET /api/tenants/:tenantId/ai/budget', () => {
    it('should return current budget status', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/budget`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('budget');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('recommendations');

      const budget = response.body.data.budget;
      expect(budget).toHaveProperty('dailySpent');
      expect(budget).toHaveProperty('dailyLimit');
      expect(budget).toHaveProperty('percentUsed');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('budgetExceeded');
    });

    it('should include alerts for budget warnings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/budget`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const alerts = response.body.data.alerts;
      expect(alerts).toHaveProperty('warning');
      expect(alerts).toHaveProperty('critical');
      expect(typeof alerts.warning).toBe('boolean');
      expect(typeof alerts.critical).toBe('boolean');
    });

    it('should provide recommendations when budget is high', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/budget`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const recommendations = response.body.data.recommendations;
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/tenants/${tenantId}/ai/budget`)
        .expect(401);
    });
  });

  describe('GET /api/tenants/:tenantId/ai/health', () => {
    it('should return health status of AI services', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/health`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('issues');

      const services = response.body.data.services;
      expect(services).toHaveProperty('pythonService');
      expect(services).toHaveProperty('openAI');
      expect(services).toHaveProperty('googleMaps');
    });

    it('should check for configuration issues', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/health`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const issues = response.body.data.issues;
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      const client = await getDbClient();
      let customerUserId: number;
      let customerToken: string;

      try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('CustomerPassword123!', 10);

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, username, email, password, role, first_name, last_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING user_id`,
          [tenantId, 'customer-user', 'customer@test.com', hashedPassword, 'customer', 'Customer', 'User']
        );
        customerUserId = userResult.rows[0].user_id;

        const loginResponse = await request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({
            email: 'customer@test.com',
            password: 'CustomerPassword123!'
          });
        customerToken = loginResponse.body.token;

        await request(app)
          .get(`/api/tenants/${tenantId}/ai/health`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);

        await client.query('DELETE FROM users WHERE user_id = $1', [customerUserId]);
      } finally {
        await client.end();
      }
    });
  });

  describe('POST /api/tenants/:tenantId/ai/reload-config', () => {
    it('should reload AI configuration for admin', async () => {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/ai/reload-config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('AI configuration reloaded');
      expect(response.body.data).toHaveProperty('globalEnabled');
      expect(response.body.data).toHaveProperty('featuresEnabled');
      expect(Array.isArray(response.body.data.featuresEnabled)).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      const client = await getDbClient();
      let managerUserId: number;
      let managerToken: string;

      try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('ManagerPassword123!', 10);

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, username, email, password, role, first_name, last_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING user_id`,
          [tenantId, 'manager-user', 'manager@test.com', hashedPassword, 'manager', 'Manager', 'User']
        );
        managerUserId = userResult.rows[0].user_id;

        const loginResponse = await request(app)
          .post(`/api/tenants/${tenantId}/login`)
          .send({
            email: 'manager@test.com',
            password: 'ManagerPassword123!'
          });
        managerToken = loginResponse.body.token;

        await request(app)
          .post(`/api/tenants/${tenantId}/ai/reload-config`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);

        await client.query('DELETE FROM users WHERE user_id = $1', [managerUserId]);
      } finally {
        await client.end();
      }
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/tenants/${tenantId}/ai/reload-config`)
        .expect(401);
    });
  });

  describe('AI Features Configuration', () => {
    it('should list all available AI features', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const features = response.body.data.features;
      expect(features.length).toBeGreaterThan(0);

      // Check for expected AI features
      const featureNames = features.map((f: any) => f.name);
      expect(featureNames).toContain('Route Optimization');
      expect(featureNames).toContain('Demand Forecasting');
      expect(featureNames).toContain('Predictive Maintenance');
      expect(featureNames).toContain('No-Show Prediction');
    });

    it('should show feature configuration status', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const features = response.body.data.features;
      features.forEach((feature: any) => {
        expect(feature).toHaveProperty('name');
        expect(feature).toHaveProperty('enabled');
        expect(feature).toHaveProperty('description');
        expect(feature).toHaveProperty('hasValidConfig');
        expect(typeof feature.enabled).toBe('boolean');
        expect(typeof feature.hasValidConfig).toBe('boolean');
      });
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce tenant isolation', async () => {
      // Create another tenant
      const client = await getDbClient();
      let otherTenantId: number;

      try {
        const tenantResult = await client.query(
          `INSERT INTO tenants (company_name, subdomain, domain, subscription_tier, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING tenant_id`,
          ['Other Org', 'other-ai', 'other-ai.travelapp.co.uk', 'premium']
        );
        otherTenantId = tenantResult.rows[0].tenant_id;

        // Try to access other tenant's AI status with our admin token
        const response = await request(app)
          .get(`/api/tenants/${otherTenantId}/ai/status`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should either be 403 or 401 depending on verifyTenantAccess implementation
        expect([401, 403]).toContain(response.status);

        // Clean up
        await client.query('DELETE FROM tenants WHERE tenant_id = $1', [otherTenantId]);
      } finally {
        await client.end();
      }
    });

    it('should require valid JWT token', async () => {
      await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with missing Authorization header', async () => {
      await request(app)
        .get(`/api/tenants/${tenantId}/ai/status`)
        .expect(401);
    });
  });
});
