import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiting';
import { sanitizeInput, sanitizeInteger } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Tenant Registration Routes
 *
 * Public endpoints for new tenant signup
 * CRITICAL for SaaS commercial use
 */

/**
 * @route POST /api/register
 * @desc Register new tenant (organization) with first admin user
 * @access Public
 * @description Allows new customers to sign up for the service
 */
router.post(
  '/register',
  authRateLimiter, // Rate limit to prevent abuse
  asyncHandler(async (req, res) => {
    const {
      companyName,
      subdomain,
      adminEmail,
      adminPassword,
      adminFullName,
      phone,
    } = req.body;

    // Validate required fields
    if (!companyName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
      throw new ValidationError(
        'Company name, subdomain, admin email, password, and full name are required'
      );
    }

    // Sanitize inputs
    const sanitizedCompanyName = sanitizeInput(companyName, { maxLength: 255 });
    const sanitizedSubdomain = sanitizeInput(subdomain, {
      alphanumericOnly: true,
      maxLength: 50,
    }).toLowerCase();
    const sanitizedEmail = sanitizeInput(adminEmail, { maxLength: 255 }).toLowerCase();
    const sanitizedFullName = sanitizeInput(adminFullName, { maxLength: 255 });
    const sanitizedPhone = phone ? sanitizeInput(phone, { maxLength: 20 }) : null;

    // Validate subdomain format (alphanumeric, no spaces, 3-50 chars)
    if (!/^[a-z0-9]{3,50}$/.test(sanitizedSubdomain)) {
      throw new ValidationError(
        'Subdomain must be 3-50 characters, lowercase letters and numbers only'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Check if subdomain already exists
    const existingSubdomain = await queryOne<{ tenant_id: number }>(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [sanitizedSubdomain]
    );

    if (existingSubdomain) {
      throw new ValidationError('Subdomain already taken. Please choose another.');
    }

    // Check if domain already exists (using subdomain as domain for simplicity)
    const domain = `${sanitizedSubdomain}.${process.env.DOMAIN_SUFFIX || 'travelapp.co.uk'}`;
    const existingDomain = await queryOne<{ tenant_id: number }>(
      'SELECT tenant_id FROM tenants WHERE domain = $1',
      [domain]
    );

    if (existingDomain) {
      throw new ValidationError('Domain already exists');
    }

    // Check if email already exists across all tenants
    const existingEmail = await queryOne<{ user_id: number }>(
      'SELECT user_id FROM tenant_users WHERE email = $1',
      [sanitizedEmail]
    );

    if (existingEmail) {
      throw new ValidationError('Email already registered. Please use a different email.');
    }

    // Get app_id for travel_support
    const appResult = await queryOne<{ app_id: number }>(
      `SELECT app_id FROM commonwealth_apps WHERE app_code = 'travel_support' LIMIT 1`
    );
    const appId = appResult?.app_id || 1;

    try {
      // Start transaction
      await query('BEGIN');

      // Create tenant
      const tenantResult = await queryOne<{ tenant_id: number }>(
        `INSERT INTO tenants (
          company_name,
          subdomain,
          domain,
          app_id,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING tenant_id`,
        [sanitizedCompanyName, sanitizedSubdomain, domain, appId]
      );

      const tenantId = tenantResult.tenant_id;

      // Hash admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create first admin user
      const username = sanitizedEmail.split('@')[0]; // Use email prefix as username
      await query(
        `INSERT INTO tenant_users (
          tenant_id,
          username,
          email,
          password_hash,
          full_name,
          phone,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'admin', true, NOW(), NOW())`,
        [tenantId, username, sanitizedEmail, hashedPassword, sanitizedFullName, sanitizedPhone]
      );

      // Commit transaction
      await query('COMMIT');

      logger.info('New tenant registered', {
        tenantId,
        companyName: sanitizedCompanyName,
        subdomain: sanitizedSubdomain,
        adminEmail: sanitizedEmail,
      });

      // Send welcome email (non-blocking - don't fail registration if email fails)
      try {
        const { sendWelcomeEmail } = await import('../services/emailService');
        const emailResult = await sendWelcomeEmail(
          sanitizedEmail,
          sanitizedFullName,
          sanitizedCompanyName,
          tenantId,
          sanitizedSubdomain
        );

        logger.info('Welcome email sent to new tenant', {
          tenantId,
          emailSent: emailResult.success,
          emailError: emailResult.error
        });
      } catch (emailError) {
        // Log but don't fail - email is not critical for registration
        logger.warn('Failed to send welcome email', {
          tenantId,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }

      // Return success with tenant info
      res.status(201).json({
        message: 'Registration successful! You can now log in.',
        tenant: {
          id: tenantId,
          companyName: sanitizedCompanyName,
          subdomain: sanitizedSubdomain,
          domain,
        },
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?tenant=${tenantId}`,
      });
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK');
      logger.error('Tenant registration failed', { error });
      throw error;
    }
  })
);

/**
 * @route GET /api/check-subdomain/:subdomain
 * @desc Check if subdomain is available
 * @access Public
 * @description Allows users to check subdomain availability before registration
 */
router.get(
  '/check-subdomain/:subdomain',
  asyncHandler(async (req, res) => {
    const subdomain = sanitizeInput(req.params.subdomain, {
      alphanumericOnly: true,
      maxLength: 50,
    }).toLowerCase();

    // Validate subdomain format
    if (!/^[a-z0-9]{3,50}$/.test(subdomain)) {
      res.json({
        available: false,
        message: 'Subdomain must be 3-50 characters, lowercase letters and numbers only',
      });
      return;
    }

    // Check if subdomain exists
    const existing = await queryOne<{ tenant_id: number }>(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );

    res.json({
      available: !existing,
      subdomain,
      message: existing ? 'Subdomain already taken' : 'Subdomain available',
    });
  })
);

export default router;
