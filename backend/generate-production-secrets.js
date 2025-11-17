#!/usr/bin/env node

/**
 * Production Secrets Generator
 *
 * Generates cryptographically secure secrets for production deployment.
 *
 * Usage:
 *   node generate-production-secrets.js
 *
 * This will generate:
 * - JWT_SECRET (64 characters)
 * - ENCRYPTION_KEY (64 hex characters)
 * - SESSION_SECRET (64 characters)
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Production Secrets...\n');
console.log('=' .repeat(80));

// Generate JWT Secret (64 random bytes as base64)
const jwtSecret = crypto.randomBytes(64).toString('base64').substring(0, 64);
console.log('\n1. JWT_SECRET (64 characters):');
console.log(`   ${jwtSecret}`);

// Generate Encryption Key (64 hex characters = 32 bytes)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('\n2. ENCRYPTION_KEY (64 hex characters):');
console.log(`   ${encryptionKey}`);

// Generate Session Secret (64 random bytes as base64)
const sessionSecret = crypto.randomBytes(64).toString('base64').substring(0, 64);
console.log('\n3. SESSION_SECRET (64 characters):');
console.log(`   ${sessionSecret}`);

console.log('\n' + '=' .repeat(80));

// Generate complete .env.production template
const envTemplate = `# Production Environment Configuration
# Generated: ${new Date().toISOString()}
# ⚠️  DO NOT commit this file to Git! Add .env.production to .gitignore

# ============================================================================
# CRITICAL SECURITY SETTINGS
# ============================================================================

# Node Environment
NODE_ENV=production

# JWT Authentication Secret (64+ characters)
JWT_SECRET=${jwtSecret}

# Encryption Key for sensitive data (64 hex characters)
ENCRYPTION_KEY=${encryptionKey}

# Session Secret for cookie signing (64+ characters)
SESSION_SECRET=${sessionSecret}

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

DB_HOST=your-production-db-host.com
DB_PORT=5432
DB_NAME=travel_support_production
DB_USER=your_db_user
DB_PASSWORD=*** REPLACE WITH STRONG PASSWORD ***

# Database SSL Configuration (REQUIRED for production)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
# Optional: Provide certificate files if needed
# DB_SSL_CA=/path/to/ca-certificate.crt
# DB_SSL_KEY=/path/to/client-key.key
# DB_SSL_CERT=/path/to/client-cert.crt

# ============================================================================
# PRODUCTION SECURITY SETTINGS
# ============================================================================

# Force HTTPS (highly recommended for production)
FORCE_HTTPS=true

# Cookie Security
COOKIE_SECURE=true
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=strict

# Allowed CORS Origins (comma-separated, no spaces)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Disable Swagger API documentation in production
ENABLE_SWAGGER_DOCS=false

# Disable debug mode in production
ENABLE_DEBUG_MODE=false

# Disable source maps in production (already configured in build)
ENABLE_SOURCE_MAPS=false

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================

PORT=3000
SYSTEM_TIMEZONE=Europe/London

# File Upload Limits (10MB)
MAX_FILE_SIZE=10485760

# ============================================================================
# OPTIONAL SERVICES
# ============================================================================

# Google Maps API (for route optimization)
GOOGLE_MAPS_API_KEY=*** REPLACE WITH YOUR API KEY ***

# Sentry Error Tracking (recommended for production)
SENTRY_DSN=*** REPLACE WITH YOUR SENTRY DSN ***

# Email Service (if using email notifications)
# SMTP_HOST=smtp.yourprovider.com
# SMTP_PORT=587
# SMTP_USER=your_email@domain.com
# SMTP_PASSWORD=*** REPLACE WITH SMTP PASSWORD ***
# SMTP_FROM=noreply@yourdomain.com

# SMS Service (if using SMS notifications)
# SMS_PROVIDER=twilio
# SMS_API_KEY=*** REPLACE WITH SMS API KEY ***
# SMS_API_SECRET=*** REPLACE WITH SMS API SECRET ***
# SMS_FROM_NUMBER=+441234567890

# ============================================================================
# LICENSING (if applicable)
# ============================================================================

# LICENSE_KEY=*** REPLACE WITH LICENSE KEY ***
# CUSTOMER_ID=*** REPLACE WITH CUSTOMER ID ***

# ============================================================================
# BACKUP AND MAINTENANCE
# ============================================================================

# Backup retention days
# BACKUP_RETENTION_DAYS=30

# Maintenance mode
# MAINTENANCE_MODE=false
# MAINTENANCE_MESSAGE=System is under maintenance. Please try again later.
`;

console.log('\n\n📄 Complete .env.production Template:\n');
console.log('Saving to: backend/.env.production');
console.log('');

// Write the .env.production file
const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '.env.production');

try {
  fs.writeFileSync(envFilePath, envTemplate, 'utf8');
  console.log('✅ .env.production file created successfully!');
  console.log('');
  console.log('⚠️  IMPORTANT SECURITY STEPS:');
  console.log('');
  console.log('1. Add .env.production to your .gitignore file:');
  console.log('   echo ".env.production" >> .gitignore');
  console.log('');
  console.log('2. Complete the configuration by replacing these placeholders:');
  console.log('   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  console.log('   - ALLOWED_ORIGINS (your production domain)');
  console.log('   - GOOGLE_MAPS_API_KEY (if using route optimization)');
  console.log('   - SENTRY_DSN (if using error tracking)');
  console.log('');
  console.log('3. Store secrets securely:');
  console.log('   - Use environment variables in your hosting platform');
  console.log('   - Never commit .env.production to Git');
  console.log('   - Keep a secure backup in password manager');
  console.log('');
  console.log('4. Verify production configuration:');
  console.log('   NODE_ENV=production node src/server.ts');
  console.log('   (Should display production security validation checks)');
  console.log('');
} catch (error) {
  console.error('❌ Error creating .env.production file:', error.message);
  console.log('');
  console.log('Manual creation required. Copy the template above to:');
  console.log(`  ${envFilePath}`);
  console.log('');
}

console.log('=' .repeat(80));
console.log('');
console.log('🔒 Secrets generated successfully!');
console.log('');
console.log('NEXT STEPS:');
console.log('1. Review and complete .env.production configuration');
console.log('2. Add .env.production to .gitignore');
console.log('3. Deploy to production environment');
console.log('4. Verify security settings with NODE_ENV=production');
console.log('');
