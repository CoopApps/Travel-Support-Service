import express, { Application } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to regular .env

// Import middleware
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import { requestIdMiddleware } from '../../middleware/requestLogger';

// Import routes for testing - Core
import authRoutes from '../../routes/auth.routes';
import tenantRegistrationRoutes from '../../routes/tenant-registration.routes';
import healthRoutes from '../../routes/health.routes';

// Import routes - Entity Management
import customerRoutes from '../../routes/customer.routes';
import driverRoutes from '../../routes/driver.routes';
import vehicleRoutes from '../../routes/vehicle.routes';
import tripRoutes from '../../routes/trip.routes';

// Import routes - Tenant Management
import tenantSettingsRoutes from '../../routes/tenant-settings.routes';
import tenantUsersRoutes from '../../routes/tenant-users.routes';

// Import routes - Compliance & Security
import gdprRoutes from '../../routes/gdpr.routes';
import trainingRoutes from '../../routes/training-minimal.routes';
import permitsRoutes from '../../routes/permits.routes';
import safeguardingRoutes from '../../routes/safeguarding.routes';

// Import routes - Operations
import dashboardRoutes from '../../routes/dashboard.routes';
import analyticsRoutes from '../../routes/analytics.routes';
import maintenanceRoutes from '../../routes/maintenance.routes';
import holidayRoutes from '../../routes/holiday.routes';

// Import routes - Communication
import messagesRoutes from '../../routes/messages.routes';
import feedbackRoutes from '../../routes/feedback.routes';

// Import routes - Financial
import invoiceRoutes from '../../routes/invoice.routes';
import fareCalculationRoutes from '../../routes/fare-calculation.routes';

// Import routes - Documents
import documentsRoutes from '../../routes/documents.routes';

/**
 * Create Test Express App
 *
 * Creates a comprehensive Express application for integration testing.
 * Includes all routes that need testing for coverage.
 */
export function createTestApp(): Application {
  const app: Application = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request tracking (useful for debugging tests)
  app.use(requestIdMiddleware);

  // Mount API routes - Core (Public)
  app.use('/api', authRoutes);
  app.use('/api', tenantRegistrationRoutes);
  app.use('/api', healthRoutes);

  // Mount API routes - Entity Management
  app.use('/api', customerRoutes);
  app.use('/api', driverRoutes);
  app.use('/api', vehicleRoutes);
  app.use('/api', tripRoutes);

  // Mount API routes - Tenant Management
  app.use('/api', tenantSettingsRoutes);
  app.use('/api', tenantUsersRoutes);

  // Mount API routes - Compliance & Security
  app.use('/api', gdprRoutes);
  app.use('/api', trainingRoutes);
  app.use('/api', permitsRoutes);
  app.use('/api', safeguardingRoutes);

  // Mount API routes - Operations
  app.use('/api', dashboardRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', maintenanceRoutes);
  app.use('/api', holidayRoutes);

  // Mount API routes - Communication
  app.use('/api', messagesRoutes);
  app.use('/api', feedbackRoutes);

  // Mount API routes - Financial
  app.use('/api', invoiceRoutes);
  app.use('/api', fareCalculationRoutes);

  // Mount API routes - Documents
  app.use('/api', documentsRoutes);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Create minimal test app (for faster tests that don't need all routes)
 */
export function createMinimalTestApp(): Application {
  const app: Application = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(requestIdMiddleware);

  // Only essential routes
  app.use('/api', authRoutes);
  app.use('/api', healthRoutes);

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
