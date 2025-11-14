import express, { Application } from 'express';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to regular .env

// Import middleware
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import { requestIdMiddleware } from '../../middleware/requestLogger';

// Import routes for testing
import authRoutes from '../../routes/auth.routes';
import tenantRegistrationRoutes from '../../routes/tenant-registration.routes';
import customerRoutes from '../../routes/customer.routes';
import driverRoutes from '../../routes/driver.routes';
import trainingRoutes from '../../routes/training-minimal.routes';

/**
 * Create Test Express App
 *
 * Creates a minimal Express application for integration testing.
 * Only includes essential middleware and routes needed for tests.
 */
export function createTestApp(): Application {
  const app: Application = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request tracking (optional for tests but useful for debugging)
  app.use(requestIdMiddleware);

  // Mount API routes
  app.use('/api', authRoutes);
  app.use('/api', tenantRegistrationRoutes);
  app.use('/api', customerRoutes);
  app.use('/api', driverRoutes);
  app.use('/api', trainingRoutes);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Get test JWT secret
 */
export function getTestJwtSecret(): string {
  return process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';
}
