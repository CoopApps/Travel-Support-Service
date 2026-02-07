import express, { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

const router: Router = express.Router();

/**
 * Health Check Routes for Home Care Co-operative System
 *
 * Provides health and readiness endpoints for monitoring.
 */

/**
 * @route GET /health/live
 * @desc Liveness probe - is the server running?
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route GET /health/ready
 * @desc Readiness probe - is the server ready to accept traffic?
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'healthy',
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unhealthy',
      },
    });
  }
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check with system metrics
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Database check
    const dbStart = Date.now();
    const client = await pool.connect();
    const dbResult = await client.query('SELECT NOW() as now, current_database() as db');
    client.release();
    const dbLatency = Date.now() - dbStart;

    // Pool stats
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    // Memory usage
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: {
        database: {
          status: 'healthy',
          latency: dbLatency,
          database: dbResult.rows[0].db,
          serverTime: dbResult.rows[0].now,
        },
        pool: poolStats,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        },
      },
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
