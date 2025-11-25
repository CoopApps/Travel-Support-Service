/**
 * Security Tests: Tenant Isolation
 *
 * These tests verify that the multi-tenant system properly:
 * 1. Prevents users from accessing other tenants' data
 * 2. Validates tenant ID in all requests
 * 3. Row-Level Security functions work correctly
 */

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  queryWithTenant: jest.fn(),
  queryOneWithTenant: jest.fn(),
  setTenantContext: jest.fn(),
  getDbClient: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn(),
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const JWT_SECRET = 'test-secret-key';
process.env.JWT_SECRET = JWT_SECRET;

describe('Tenant Isolation Security', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    jest.clearAllMocks();
  });

  describe('Tenant ID Validation', () => {
    it('should reject non-numeric tenant IDs', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ tenantId: req.params.tenantId });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      // Try with SQL injection attempt
      await request(app)
        .get('/tenants/1;DROP%20TABLE%20users/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403); // Should be forbidden (tenant mismatch)
    });

    it('should reject negative tenant IDs', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ tenantId: req.params.tenantId });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      await request(app)
        .get('/tenants/-1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403); // Tenant mismatch
    });
  });

  describe('Cross-Tenant Data Access Prevention', () => {
    it('should not allow accessing customer data from another tenant', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      // User belongs to tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/customers/:customerId', verifyTenantAccess as any, (req: any, res) => {
        res.json({
          tenantId: req.user.tenantId,
          customerId: req.params.customerId,
        });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      // Try to access tenant 2's customers
      await request(app)
        .get('/tenants/2/customers/123')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403);
    });

    it('should not allow modifying data in another tenant', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      // User belongs to tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.put('/tenants/:tenantId/customers/:customerId', verifyTenantAccess as any, (req: any, res) => {
        res.json({ updated: true });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      // Try to update tenant 2's customer
      await request(app)
        .put('/tenants/2/customers/123')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('should not allow deleting data in another tenant', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      // User belongs to tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.delete('/tenants/:tenantId/customers/:customerId', verifyTenantAccess as any, (req: any, res) => {
        res.json({ deleted: true });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      // Try to delete tenant 2's customer
      await request(app)
        .delete('/tenants/2/customers/123')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403);
    });
  });

  describe('Token Tenant Claim Validation', () => {
    it('should reject tokens with mismatched tenant claims', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      // Token claims tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      // Request tenant 999 (not in token)
      await request(app)
        .get('/tenants/999/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403);
    });

    it('should accept tokens with matching tenant claims', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      // Token claims tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user, allowed: true });
      });

      // Request tenant 1 (matches token)
      const response = await request(app)
        .get('/tenants/1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(true);
    });
  });

  describe('RLS Helper Functions', () => {
    it('should set tenant context correctly', async () => {
      const db = await import('../../config/database');
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      await db.setTenantContext(mockClient as any, 123);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT set_config($1, $2, true)',
        ['app.current_tenant_id', '123']
      );
    });

    it('should execute queries with tenant context', async () => {
      const db = await import('../../config/database');
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
        release: jest.fn(),
      };

      (db.getDbClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await db.queryWithTenant(123, 'SELECT * FROM test');

      // Should set tenant context first
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'SELECT set_config($1, $2, true)',
        ['app.current_tenant_id', '123']
      );

      // Then execute the actual query
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM test',
        undefined
      );

      // Should release client
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

describe('Audit Logging for Security Events', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    jest.clearAllMocks();
  });

  it('should log cross-tenant access attempts', async () => {
    const { logger } = await import('../../utils/logger');
    const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
    const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

    const token = jwt.sign(
      { userId: 1, tenantId: 1, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
      res.json({ user: req.user });
    });

    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });

    await request(app)
      .get('/tenants/2/test')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .expect(403);

    // Should have logged the violation attempt
    expect(logger.warn).toHaveBeenCalledWith(
      'Tenant access violation attempt',
      expect.objectContaining({
        userId: 1,
        userTenantId: 1,
        requestedTenantId: 2,
      })
    );
  });

  it('should log authentication failures', async () => {
    const { logger } = await import('../../utils/logger');
    const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');
    const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

    app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
      res.json({ user: req.user });
    });

    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });

    // Invalid token
    await request(app)
      .get('/tenants/1/test')
      .set('Cookie', `${AUTH_COOKIE_NAME}=invalid-token`)
      .expect(401);

    // Should have logged something about the failure
    expect(logger.warn).toHaveBeenCalled();
  });
});
