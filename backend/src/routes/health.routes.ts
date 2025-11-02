import express, { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { successResponse, ErrorResponses } from '../utils/responseWrapper';

const router: Router = express.Router();

/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring server and database health.
 * These endpoints are typically used by:
 * - Load balancers
 * - Monitoring services (UptimeRobot, Pingdom, etc.)
 * - Deployment platforms (Railway, Render, etc.)
 * - Kubernetes liveness/readiness probes
 */

/**
 * @route GET /health
 * @desc Basic health check - Returns 200 if server is running
 * @access Public
 */
router.get('/health', (_req: Request, res: Response) => {
  successResponse(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check - Includes database connection check
 * @access Public
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {},
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbTime = Date.now() - dbStart;

    health.checks.database = {
      status: 'healthy',
      responseTime: `${dbTime}ms`,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    // Return 503 Service Unavailable if database is down
    return ErrorResponses.serviceUnavailable(res, 'Database connection failed');
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: 'healthy',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
  };

  // Check if memory usage is too high (> 90% of heap total)
  if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
    health.checks.memory.status = 'warning';
    health.checks.memory.message = 'High memory usage detected';
  }

  // Overall response time
  health.responseTime = `${Date.now() - startTime}ms`;

  // Return 200 if healthy, 503 if unhealthy
  const statusCode = health.status === 'healthy' ? 200 : 503;
  return successResponse(res, health, undefined, statusCode);
});

/**
 * @route GET /health/ready
 * @desc Readiness probe - Checks if app is ready to serve traffic
 * @access Public
 * @description Used by Kubernetes and other orchestrators
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check database is ready
    await pool.query('SELECT 1');

    successResponse(res, {
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    ErrorResponses.serviceUnavailable(res, 'Application not ready');
  }
});

/**
 * @route GET /health/live
 * @desc Liveness probe - Checks if app is alive (not deadlocked)
 * @access Public
 * @description Used by Kubernetes and other orchestrators
 */
router.get('/health/live', (_req: Request, res: Response) => {
  // If we can respond to this request, we're alive
  successResponse(res, {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
