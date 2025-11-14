# 🚀 Deployment & Operations Guide

## Travel Support Platform - Commercial Deployment Checklist

This guide covers everything you need to deploy and operate the Travel Support Platform in a production environment.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Email Configuration](#email-configuration)
5. [Deployment Options](#deployment-options)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Backup Strategy](#backup-strategy)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ Critical Requirements

- [ ] **PostgreSQL Database** (v14+) provisioned
- [ ] **Node.js** (v18+) runtime environment
- [ ] **SSL Certificate** for HTTPS
- [ ] **Domain Name** configured with DNS
- [ ] **SMTP Email Service** account created
- [ ] **Environment Variables** configured (see `.env.example`)
- [ ] **Backup Strategy** implemented
- [ ] **Monitoring Service** configured

### ⚠️ Important Recommendations

- [ ] **Sentry Account** for error tracking
- [ ] **Staging Environment** for testing
- [ ] **CI/CD Pipeline** configured
- [ ] **Load Balancer** if expecting high traffic
- [ ] **CDN** for static assets
- [ ] **Redis Cache** for performance

---

## Database Setup

### Option 1: Railway (Recommended for Quick Start)

1. **Create PostgreSQL Database**
   ```bash
   # Railway will provide a DATABASE_URL
   # Example: postgresql://user:pass@host:port/dbname
   ```

2. **Run Migrations**
   ```bash
   cd backend

   # Set DATABASE_URL
   export DATABASE_URL="your_railway_database_url"

   # Run migrations
   node run-audit-logs-migration.js
   node run-password-reset-migration.js
   ```

3. **Configure Backups**
   - Railway provides automated daily backups
   - Enable backup retention in Railway dashboard
   - Test restore process monthly

### Option 2: Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql@14
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE travel_support_prod;
   CREATE USER travel_app WITH PASSWORD 'strong_password_here';
   GRANT ALL PRIVILEGES ON DATABASE travel_support_prod TO travel_app;
   ```

3. **Run Migrations**
   ```bash
   cd backend

   # Configure database connection in .env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=travel_support_prod
   DB_USER=travel_app
   DB_PASSWORD=strong_password_here

   # Run migrations
   node run-audit-logs-migration.js
   node run-password-reset-migration.js
   ```

4. **Setup Automated Backups**
   ```bash
   # Create backup script
   cat > /usr/local/bin/backup-travel-db.sh <<'EOF'
   #!/bin/bash
   BACKUP_DIR="/var/backups/travel-support"
   DATE=$(date +%Y%m%d_%H%M%S)
   FILENAME="travel_support_$DATE.sql.gz"

   mkdir -p $BACKUP_DIR
   pg_dump travel_support_prod | gzip > "$BACKUP_DIR/$FILENAME"

   # Delete backups older than 30 days
   find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
   EOF

   chmod +x /usr/local/bin/backup-travel-db.sh

   # Add to crontab (daily at 2 AM)
   echo "0 2 * * * /usr/local/bin/backup-travel-db.sh" | crontab -
   ```

---

## Environment Configuration

### Generate Secure Keys

```bash
# Generate JWT Secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production .env Example

```bash
# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.yourdomain.com
DOMAIN_SUFFIX=yourdomain.com

# Database (Railway)
DATABASE_URL=postgresql://user:pass@host:5432/database

# Security (CRITICAL - Generate unique values!)
JWT_SECRET=<generated_64_byte_hex>
JWT_EXPIRATION=24h
ENCRYPTION_KEY=<generated_32_byte_hex>

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-app@gmail.com
SMTP_PASS=your_app_specific_password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info

# External Services
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

---

## Email Configuration

### Option 1: Gmail (Development/Small Scale)

1. **Enable 2-Factor Authentication**
   - Go to Google Account Settings
   - Security → 2-Step Verification

2. **Generate App-Specific Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password

3. **Configure .env**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=generated_app_password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify sender identity
   - Create API key

2. **Configure .env**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   ```

### Option 3: AWS SES (Cost-Effective for High Volume)

1. **Setup AWS SES**
   - Create IAM user with SES permissions
   - Verify domain
   - Request production access

2. **Configure .env**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_aws_access_key_id
   SMTP_PASS=your_aws_secret_access_key
   ```

### Test Email Configuration

```bash
cd backend
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your_app_password'
  }
});
transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'your-email@gmail.com',
  subject: 'Test Email',
  text: 'Email configuration works!'
}, (err, info) => {
  if (err) console.error('Error:', err);
  else console.log('Success:', info.messageId);
});
"
```

---

## Deployment Options

### Option 1: Railway (Simplest)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create New Project**
   ```bash
   cd backend
   railway init
   railway add # Add PostgreSQL
   ```

3. **Configure Environment**
   ```bash
   # Set all environment variables in Railway dashboard
   railway variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Setup Custom Domain**
   - Go to Railway dashboard
   - Settings → Domains
   - Add custom domain
   - Configure DNS CNAME record

### Option 2: Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
cd backend
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<your_secret>
# ... set all other vars from .env.example

# Deploy
git push heroku main

# Run migrations
heroku run node run-audit-logs-migration.js
heroku run node run-password-reset-migration.js
```

### Option 3: Docker + Self-Hosted

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .

   EXPOSE 3000

   CMD ["node", "src/server.js"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'

   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/travel_support
       depends_on:
         - db
       restart: always

     db:
       image: postgres:14
       environment:
         - POSTGRES_DB=travel_support
         - POSTGRES_PASSWORD=password
       volumes:
         - pgdata:/var/lib/postgresql/data
       restart: always

   volumes:
     pgdata:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

---

## Post-Deployment Setup

### 1. Verify Health Endpoints

```bash
# Basic health check
curl https://your-domain.com/health

# Detailed health check
curl https://your-domain.com/health/detailed
```

### 2. Test Authentication

```bash
# Test login rate limiting
for i in {1..6}; do
  curl -X POST https://your-domain.com/api/tenants/1/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# Should get rate limited (429) after 5 attempts
```

### 3. Create First Tenant

```bash
# Test tenant registration
curl -X POST https://your-domain.com/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company Ltd",
    "subdomain": "testcompany",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "adminEmail": "admin@testcompany.com",
    "adminPassword": "SecurePassword123!"
  }'
```

### 4. Test Password Reset

```bash
# Request password reset
curl -X POST https://your-domain.com/api/tenants/1/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@testcompany.com"}'

# Check email inbox for reset link
```

---

## Monitoring & Alerts

### Sentry Setup (Error Monitoring)

1. **Create Sentry Account**
   - Sign up at https://sentry.io
   - Create new project (Node.js/Express)
   - Copy DSN

2. **Configure Environment**
   ```bash
   SENTRY_DSN=https://your-key@sentry.io/your-project-id
   ```

3. **Verify Integration**
   - Check Sentry dashboard after deployment
   - Trigger a test error to confirm

### Uptime Monitoring

#### Option 1: UptimeRobot (Free)

1. Sign up at https://uptimerobot.com
2. Add Monitor:
   - Type: HTTP(s)
   - URL: https://your-domain.com/health
   - Interval: 5 minutes
3. Configure alerts (email, SMS, Slack)

#### Option 2: Pingdom

1. Sign up at https://www.pingdom.com
2. Add Uptime Check
3. Configure alert contacts

### Application Monitoring

```bash
# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start src/server.js --name travel-support

# Enable monitoring
pm2 monitor

# Setup startup script
pm2 startup
pm2 save
```

---

## Backup Strategy

### Database Backups

#### Automated Backups (Railway)
- Railway provides automatic daily backups
- Retention: 7 days on free tier, 30+ days on paid
- Verify: Railway Dashboard → Database → Backups

#### Manual Backup
```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_$(date +%Y%m%d).sql

# Upload to S3 (optional)
aws s3 cp backup_*.sql.gz s3://your-backup-bucket/
```

### Test Restore Process

```bash
# Create test database
createdb travel_support_test

# Restore backup
gunzip -c backup_20250114.sql.gz | psql travel_support_test

# Verify data
psql travel_support_test -c "SELECT COUNT(*) FROM tenants;"

# Drop test database
dropdb travel_support_test
```

---

## Security Hardening

### 1. SSL/TLS Certificate

```bash
# Using Let's Encrypt (free)
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

### 2. Security Headers

Verify these headers are set (check in `src/server.ts`):

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 3. Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 4. Database Security

```sql
-- Create read-only user for reports
CREATE USER travel_readonly WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE travel_support_prod TO travel_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO travel_readonly;

-- Revoke public access
REVOKE ALL ON DATABASE travel_support_prod FROM PUBLIC;
```

### 5. Regular Security Audits

```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically if possible
npm audit fix

# Check for outdated packages
npm outdated
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
# Look for "Database connection test successful" in logs
docker logs <container-id> | grep "Database connection"
```

### Email Not Sending

```bash
# Check SMTP configuration
node -e "console.log(process.env.SMTP_HOST, process.env.SMTP_USER)"

# Check logs for email errors
grep "email" /var/log/travel-support/app.log

# Test SMTP connection
telnet smtp.gmail.com 587
```

### High Memory Usage

```bash
# Check Node.js memory
pm2 monit

# Increase memory limit if needed
NODE_OPTIONS=--max-old-space-size=4096 pm2 start src/server.js
```

### Rate Limiting Too Aggressive

```bash
# Temporarily increase limits in .env
RATE_LIMIT_MAX_REQUESTS=200
AUTH_RATE_LIMIT_MAX_REQUESTS=10

# Restart application
pm2 restart travel-support
```

---

## Production Checklist

### Before Going Live

- [ ] Database backups tested and automated
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Environment variables set correctly
- [ ] Email sending tested (password reset, welcome emails)
- [ ] Sentry error tracking configured
- [ ] Uptime monitoring alerts configured
- [ ] Health endpoints returning 200 OK
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Audit logging working
- [ ] Test tenant registration flow
- [ ] Test password reset flow
- [ ] Load testing completed (50+ concurrent users)
- [ ] Documentation reviewed
- [ ] Incident response plan documented
- [ ] Support process defined

### Post-Launch Monitoring

#### Week 1
- [ ] Check error rates daily (Sentry)
- [ ] Monitor uptime (should be 99.9%+)
- [ ] Review audit logs for suspicious activity
- [ ] Verify email delivery rates
- [ ] Check database performance

#### Ongoing
- [ ] Weekly backup restoration test
- [ ] Monthly security audit
- [ ] Quarterly dependency updates
- [ ] Annual penetration testing

---

## Support & Maintenance

### Log Locations

```bash
# Application logs (PM2)
pm2 logs travel-support

# System logs (Ubuntu)
/var/log/syslog

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log
```

### Common Commands

```bash
# Restart application
pm2 restart travel-support

# View application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Database migrations
node run-audit-logs-migration.js

# Clear Redis cache (if using)
redis-cli FLUSHALL
```

---

## Need Help?

- **Documentation**: Check `/CLAUDE.md` for codebase overview
- **GitHub Issues**: https://github.com/your-org/travel-support/issues
- **Email Support**: support@yourdomain.com

---

**Last Updated**: November 2025
**Version**: 2.0.0
