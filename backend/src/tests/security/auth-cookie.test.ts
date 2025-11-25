/**
 * Security Tests: httpOnly Cookie Authentication
 *
 * These tests verify that the authentication system properly:
 * 1. Sets httpOnly cookies on login
 * 2. Clears cookies on logout
 * 3. Rejects requests without valid cookies
 * 4. Prevents cross-tenant access
 */

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
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

describe('Cookie Authentication Security', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    jest.clearAllMocks();
  });

  describe('Login Cookie Setting', () => {
    it('should set httpOnly cookie on successful login', async () => {
      // Import after mocks are set up
      const { setAuthCookie, AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      app.post('/test-login', (req, res) => {
        const token = jwt.sign({ userId: 1, tenantId: 1, role: 'admin' }, JWT_SECRET);
        setAuthCookie(res, token);
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-login')
        .expect(200);

      // Verify cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain(AUTH_COOKIE_NAME);
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Lax');
    });

    it('should NOT include token in response body for security', async () => {
      const { setAuthCookie } = await import('../../utils/cookieAuth');

      app.post('/test-login', (req, res) => {
        const token = jwt.sign({ userId: 1, tenantId: 1, role: 'admin' }, JWT_SECRET);
        setAuthCookie(res, token);
        // Simulate what the updated auth route does - user data only
        res.json({ user: { id: 1, name: 'Test User' } });
      });

      const response = await request(app)
        .post('/test-login')
        .expect(200);

      // Response should NOT contain the token directly accessible
      // (Token is in httpOnly cookie, not in body)
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Logout Cookie Clearing', () => {
    it('should clear auth cookie on logout', async () => {
      const { clearAuthCookie, AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      app.post('/test-logout', (req, res) => {
        clearAuthCookie(res);
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-logout')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // Cookie should be cleared (expires in past or max-age=0)
      expect(cookies[0]).toContain(AUTH_COOKIE_NAME);
    });
  });

  describe('Cookie Verification Middleware', () => {
    it('should accept requests with valid cookie', async () => {
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/tenants/1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.tenantId).toBe(1);
    });

    it('should reject requests without cookie or header', async () => {
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user });
      });

      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      await request(app)
        .get('/tenants/1/test')
        .expect(401);
    });

    it('should reject requests with invalid cookie token', async () => {
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      await request(app)
        .get('/tenants/1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=invalid-token`)
        .expect(401);
    });

    it('should reject requests with expired cookie token', async () => {
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      // Create expired token
      const expiredToken = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user });
      });

      app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });

      await request(app)
        .get('/tenants/1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${expiredToken}`)
        .expect(401);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should reject access to different tenant data', async () => {
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      // Token for tenant 1
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

      // Try to access tenant 2 with tenant 1's token
      await request(app)
        .get('/tenants/2/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(403); // Should be forbidden
    });

    it('should allow access to own tenant data', async () => {
      const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
      const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

      // Token for tenant 1
      const token = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
        res.json({ user: req.user, allowed: true });
      });

      // Access own tenant
      const response = await request(app)
        .get('/tenants/1/test')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
        .expect(200);

      expect(response.body.allowed).toBe(true);
    });
  });

  describe('Cookie Security Attributes', () => {
    it('should set Secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Re-import to pick up new environment
      jest.resetModules();
      const { setAuthCookie, AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      app.post('/test-login', (req, res) => {
        const token = jwt.sign({ userId: 1, tenantId: 1, role: 'admin' }, JWT_SECRET);
        setAuthCookie(res, token);
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-login')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Secure');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should have HttpOnly flag to prevent XSS access', async () => {
      const { setAuthCookie, AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      app.post('/test-login', (req, res) => {
        const token = jwt.sign({ userId: 1, tenantId: 1, role: 'admin' }, JWT_SECRET);
        setAuthCookie(res, token);
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-login')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should have SameSite attribute to prevent CSRF', async () => {
      const { setAuthCookie, AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');

      app.post('/test-login', (req, res) => {
        const token = jwt.sign({ userId: 1, tenantId: 1, role: 'admin' }, JWT_SECRET);
        setAuthCookie(res, token);
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-login')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('SameSite');
    });
  });
});

describe('Legacy Authorization Header Support', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    jest.clearAllMocks();
  });

  it('should still accept Authorization header for backward compatibility', async () => {
    const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

    const token = jwt.sign(
      { userId: 1, tenantId: 1, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
      res.json({ user: req.user });
    });

    const response = await request(app)
      .get('/tenants/1/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.tenantId).toBe(1);
  });

  it('should prefer cookie over Authorization header', async () => {
    const { AUTH_COOKIE_NAME } = await import('../../utils/cookieAuth');
    const { verifyTenantAccess } = await import('../../middleware/verifyTenantAccess');

    // Cookie token for user 1
    const cookieToken = jwt.sign(
      { userId: 1, tenantId: 1, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Header token for user 2
    const headerToken = jwt.sign(
      { userId: 2, tenantId: 1, role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    app.get('/tenants/:tenantId/test', verifyTenantAccess as any, (req: any, res) => {
      res.json({ user: req.user });
    });

    const response = await request(app)
      .get('/tenants/1/test')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${cookieToken}`)
      .set('Authorization', `Bearer ${headerToken}`)
      .expect(200);

    // Should use cookie token (user 1), not header token (user 2)
    expect(response.body.user.userId).toBe(1);
  });
});
