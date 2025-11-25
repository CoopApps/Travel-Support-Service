import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, TenantAccessError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { AUTH_COOKIE_NAME, clearAuthCookie } from '../utils/cookieAuth';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: number;
  tenantId: number;
  role: string;
  email: string;
  customerId?: number | null;
  driverId?: number | null;
  isDriver?: boolean;
  isCustomer?: boolean;
}

/**
 * Extended Request Interface
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Verify Tenant Access Middleware
 *
 * This middleware:
 * 1. Validates the JWT token (from httpOnly cookie or Authorization header)
 * 2. Extracts user information
 * 3. Ensures the user can only access their own tenant's data
 * 4. Prevents cross-tenant data access (critical security feature)
 *
 * SECURITY: Prefers httpOnly cookies over Authorization header
 */
export function verifyTenantAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    let token: string | undefined;

    // SECURITY: Check httpOnly cookie first (preferred method - XSS safe)
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
      logger.debug('verifyTenantAccess - token found in httpOnly cookie', {
        path: req.path
      });
    }
    // Fallback to Authorization header (for backward compatibility)
    else {
      const authHeader = req.headers.authorization;

      logger.debug('verifyTenantAccess - checking auth header', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 10),
        path: req.path
      });

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        logger.debug('verifyTenantAccess - using legacy Authorization header', {
          path: req.path
        });
      }
    }

    if (!token) {
      logger.warn('No valid authentication token', {
        hasCookies: !!req.cookies,
        hasAuthHeader: !!req.headers.authorization,
        path: req.path
      });
      throw new AuthenticationError('No token provided');
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      throw new Error('Authentication system misconfigured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    logger.debug('Token decoded successfully', {
      userId: decoded.userId,
      tokenTenantId: decoded.tenantId,
      role: decoded.role
    });

    // Extract tenant ID from route parameters
    const requestedTenantId = parseInt(req.params.tenantId, 10);

    logger.debug('Comparing tenant IDs', {
      tokenTenantId: decoded.tenantId,
      requestedTenantId,
      match: decoded.tenantId === requestedTenantId
    });

    // Verify tenant access
    if (decoded.tenantId !== requestedTenantId) {
      logger.warn('Tenant access violation attempt', {
        userId: decoded.userId,
        userTenantId: decoded.tenantId,
        requestedTenantId,
        path: req.path,
      });
      throw new TenantAccessError();
    }

    // Attach user info to request
    req.user = decoded;

    logger.debug('Tenant access granted', {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      path: req.path
    });

    next();
  } catch (error) {
    // SECURITY: Clear invalid/expired cookies to prevent stale auth
    clearAuthCookie(res);

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 * SECURITY: Checks httpOnly cookie first, then Authorization header
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    let token: string | undefined;

    // Check httpOnly cookie first (preferred)
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // Fallback to Authorization header
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = decoded;
      }
    }
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 * Use after verifyTenantAccess
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Role authorization failed', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      return next(new TenantAccessError());
    }

    next();
  };
}
