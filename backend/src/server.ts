import express, { Application } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
// Driver management and dashboard routes added

// Load environment variables
dotenv.config();

// Validate environment variables before starting server
import { validateEnvironment } from './utils/validateEnv';
validateEnvironment();

// Initialize Sentry for error tracking (must be before other imports)
import { initializeSentry } from './config/sentry';
import Sentry from '@sentry/node';

// Import utilities and middleware
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { testConnection, closePool } from './config/database';
import { startInvoiceAutomationScheduler } from './services/invoiceAutomation';
import { startDividendScheduler } from './services/dividendScheduler.service';

// Import middleware
import { detectSubdomain } from './middleware/subdomainDetection';
import { apiRateLimiter, authRateLimiter as _authRateLimiter } from './middleware/rateLimiting';
import { httpLogger, requestIdMiddleware, slowRequestLogger } from './middleware/requestLogger';
import { auditMiddleware } from './middleware/auditLogger';

// Import Swagger documentation
import { setupSwagger } from './config/swagger';

// Import routes
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import tenantRegistrationRoutes from './routes/tenant-registration.routes';
import customerRoutes from './routes/customer.routes';
import customerReminderRoutes from './routes/customer-reminder.routes';
import driverRoutes from './routes/driver.routes';
import driverDashboardRoutes from './routes/driver-dashboard.routes';
import customerDashboardRoutes from './routes/customer-dashboard.routes';
import driverDashboardAdminRoutes from './routes/driver-dashboard-admin.routes';
import customerDashboardAdminRoutes from './routes/customer-dashboard-admin.routes';
import dashboardRoutes from './routes/dashboard.routes';
import tripRoutes from './routes/trip.routes';
import vehicleRoutes from './routes/vehicle.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import platformAdminRoutes from './routes/platform-admin.routes';
import tenantUsersRoutes from './routes/tenant-users.routes';
import publicRoutes from './routes/public.routes';
import socialOutingsRoutes from './routes/social-outings.routes';
import providersRoutes from './routes/providers.routes';
import fuelcardRoutes from './routes/fuelcard.routes';
import holidayRoutes from './routes/holiday.routes';
import safeguardingRoutes from './routes/safeguarding.routes';
import analyticsRoutes from './routes/analytics.routes';
import routeOptimizerRoutes from './routes/route-optimizer.routes';
import capacityAlertsRoutes from './routes/capacity-alerts.routes';
import efficiencyReportRoutes from './routes/efficiency-report.routes';
import smartDriverAssignmentRoutes from './routes/smart-driver-assignment.routes';
import conflictDetectionRoutes from './routes/conflict-detection.routes';
import reminderRoutes from './routes/reminder.routes';
import reminderSettingsRoutes from './routes/reminder-settings.routes';
import lateArrivalRoutes from './routes/late-arrival.routes';
import driverSubmissionsRoutes from './routes/driver-submissions.routes';
import driverMessagesRoutes from './routes/driver-messages.routes';
import messagesRoutes from './routes/messages.routes';
import invoiceRoutes from './routes/invoice.routes';
import permitsRoutes from './routes/permits.routes';
import trainingRoutes from './routes/training-minimal.routes';
import payrollRoutes from './routes/payroll.routes';
import officeStaffRoutes from './routes/office-staff.routes';
import costCenterRoutes from './routes/cost-center.routes';
import timesheetRoutes from './routes/timesheet.routes';
import tenantSettingsRoutes from './routes/tenant-settings.routes';
import feedbackRoutes from './routes/feedback.routes';
import documentRoutes from './routes/documents.routes';
import adminAnalyticsRoutes from './routes/admin-analytics.routes';
import cooperativeRoutes from './routes/cooperative.routes';
import votingRoutes from './routes/voting.routes';
import profitDistributionRoutes from './routes/profit-distribution.routes';
import serviceRegistrationsRoutes from './routes/service-registrations.routes';
import financialSurplusRoutes from './routes/financial-surplus.routes';
import passengerClassRoutes from './routes/passenger-class.routes';
import complianceAlertsRoutes from './routes/compliance-alerts.routes';
import busRoutesRoutes from './routes/bus-routes.routes';
import busTimetablesRoutes from './routes/bus-timetables.routes';
import busBookingsRoutes from './routes/bus-bookings.routes';
import fareCalculationRoutes from './routes/fare-calculation.routes';
import section22ComplianceRoutes from './routes/section22-compliance.routes';
import busCommunicationsRoutes from './routes/bus-communications.routes';
import busAnalyticsRoutes from './routes/bus-analytics.routes';
import customerRouteProposalsRoutes from './routes/customer-route-proposals.routes';
import surplusManagementRoutes from './routes/surplus-management.routes';
import cooperativeMembersRoutes from './routes/cooperative-members.routes';
import dividendRoutes from './routes/dividend.routes';
import dividendSchedulerRoutes from './routes/dividend-scheduler.routes';

/**
 * Main Server File - Stage 4
 *
 * This Express server now includes:
 * - Authentication endpoints (Stage 2)
 * - Customer management CRUD (Stage 4)
 *
 * Stage 4 serves as the template for all future features.
 */

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3001', 10); // Use 3001 to avoid conflict with old system

// Initialize Sentry error tracking
const isSentryEnabled = initializeSentry(app);

// Trust Railway proxy for X-Forwarded-* headers
app.set('trust proxy', true);

// Sentry request handler MUST be the first middleware (only if enabled)
if (isSentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
}

// Enhanced security headers with Helmet
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Vite needs inline scripts in production
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:", "http://localhost:*"], // Allow API calls
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // X-Frame-Options (clickjacking protection)
  frameguard: {
    action: 'deny',
  },
  // X-Content-Type-Options (MIME sniffing protection)
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Hide X-Powered-By header
  hidePoweredBy: true,
}));

// CORS configuration - allow credentials and Authorization header
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://travel-supportbackend-production.up.railway.app',
    ];

    // Check if origin is in allowed list, is a subdomain of localhost, or is a Railway deployment
    if (
      allowedOrigins.includes(origin) ||
      origin.match(/^http:\/\/.*\.localhost:(5173|5174)$/) ||
      origin.match(/^https:\/\/.*\.railway\.app$/)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response compression
app.use(compression());

// Request ID for tracing
app.use(requestIdMiddleware);

// HTTP request logging
app.use(httpLogger);

// Audit logging for compliance
app.use(auditMiddleware);

// Slow request detection (warn if >1000ms)
app.use(slowRequestLogger(1000));

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    stage: 'multi-tenant',
  });
});

// Setup API documentation (Swagger)
setupSwagger(app);

// Health check routes (must be first - no middleware)
app.use(healthRoutes);

// Serve static frontend files BEFORE subdomain detection
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Public routes (no authentication or subdomain detection required)
app.use('/api', publicRoutes);

// Subdomain detection middleware (applies to all routes below)
app.use(detectSubdomain);

// Platform Admin Routes (no subdomain required)
app.use('/api', platformAdminRoutes);
app.use('/api', tenantUsersRoutes);

// Tenant-specific API Routes
app.use('/api', authRoutes);
app.use('/api', tenantRegistrationRoutes); // Public tenant registration
app.use('/api', customerRoutes);
app.use('/api', customerReminderRoutes);
app.use('/api', driverRoutes);
app.use('/api', driverDashboardRoutes);
app.use('/api', customerDashboardRoutes);
app.use('/api', driverDashboardAdminRoutes);
app.use('/api', customerDashboardAdminRoutes);
app.use('/api', tripRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', maintenanceRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', socialOutingsRoutes);
app.use('/api', providersRoutes);
app.use('/api', fuelcardRoutes);
app.use('/api', holidayRoutes);
app.use('/api', safeguardingRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', routeOptimizerRoutes);
app.use('/api', capacityAlertsRoutes);
app.use('/api', efficiencyReportRoutes);
app.use('/api', smartDriverAssignmentRoutes);
app.use('/api', conflictDetectionRoutes);
app.use('/api', reminderRoutes);
app.use('/api', reminderSettingsRoutes);
app.use('/api', lateArrivalRoutes);
app.use('/api', driverSubmissionsRoutes);
app.use('/api', driverMessagesRoutes);
app.use('/api', messagesRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', permitsRoutes);
app.use('/api', trainingRoutes);
app.use('/api', payrollRoutes);
app.use('/api', officeStaffRoutes);
app.use('/api', costCenterRoutes);
app.use('/api', timesheetRoutes);
app.use('/api', tenantSettingsRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', documentRoutes);
app.use('/api', adminAnalyticsRoutes);
app.use('/api', cooperativeRoutes);
app.use('/api', votingRoutes);
app.use('/api', profitDistributionRoutes);
app.use('/api', serviceRegistrationsRoutes);
app.use('/api', financialSurplusRoutes);
app.use('/api', passengerClassRoutes);
app.use('/api', complianceAlertsRoutes);
app.use('/api', busRoutesRoutes);
app.use('/api', busTimetablesRoutes);
app.use('/api', busBookingsRoutes);
app.use('/api', fareCalculationRoutes);
app.use('/api', section22ComplianceRoutes);
app.use('/api', busCommunicationsRoutes);
app.use('/api', busAnalyticsRoutes);
app.use('/api', customerRouteProposalsRoutes);
app.use('/api', surplusManagementRoutes);
app.use('/api', cooperativeMembersRoutes);
app.use('/api', dividendRoutes);
app.use('/api', dividendSchedulerRoutes);

// Catch-all route for React Router - must be after all API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling
app.use(notFoundHandler);

// Sentry error handler MUST be before custom error handler (only if enabled)
if (isSentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

/**
 * Start Server
 */
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start listening on all interfaces (0.0.0.0) for Railway
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('🚀 Server started (Stage 4)', {
        port: PORT,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        stage: 4,
      });
      logger.info('Available endpoints:', {
        health: `http://localhost:${PORT}/health`,
        login: `http://localhost:${PORT}/api/tenants/:tenantId/login`,
        verify: `http://localhost:${PORT}/api/tenants/:tenantId/verify`,
        customers: `http://localhost:${PORT}/api/tenants/:tenantId/customers`,
      });

      // Start automated invoice generation scheduler
      startInvoiceAutomationScheduler();
      logger.info('✅ Invoice automation scheduler initialized');

      // Start automated dividend calculation scheduler
      // Runs on 1st of each month at 1:00 AM by default
      startDividendScheduler();
      logger.info('✅ Dividend automation scheduler initialized');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

// Start the server
startServer();

export default app;


 
