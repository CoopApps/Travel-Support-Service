# Pre-Deployment Checklist

Before deploying to production, make sure your app is ready.

## ✅ Code Preparation

### 1. Environment Variables
- [ ] All secrets in `.env` file (not hardcoded)
- [ ] `.env` added to `.gitignore`
- [ ] Environment variables documented
- [ ] Production values ready (different from dev)

### 2. Database Configuration
- [ ] Connection pooling configured
- [ ] Database credentials use environment variables
- [ ] Migration scripts ready
- [ ] Seed data scripts ready (if needed)

### 3. Server Configuration
- [ ] Server uses `process.env.PORT` (not hardcoded port)
- [ ] Server binds to `0.0.0.0` (not just `localhost`)
- [ ] CORS configured for production domains
- [ ] Trust proxy configured (if behind load balancer)

### 4. Security
- [ ] JWT_SECRET is strong and unique
- [ ] No API keys committed to git
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting configured
- [ ] Helmet.js or similar security headers
- [ ] HTTPS enforced (most platforms do this automatically)

### 5. Error Handling
- [ ] Global error handler in place
- [ ] Errors don't expose sensitive information
- [ ] Logging configured (don't log passwords!)
- [ ] 404 handler for undefined routes

### 6. Dependencies
- [ ] `package.json` has all dependencies listed
- [ ] No `devDependencies` required for production
- [ ] Node version specified in `package.json`
- [ ] Lock file committed (`package-lock.json`)

---

## 🔍 Quick Checks

### Check 1: Server Port Configuration

Open `backend/server.js` and verify:

```javascript
// ✅ Good - uses environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// ❌ Bad - hardcoded
const PORT = 3000;
app.listen(PORT, 'localhost', () => { ... });
```

### Check 2: Database Configuration

```javascript
// ✅ Good - from environment
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// ❌ Bad - hardcoded
const pool = new Pool({
    host: 'localhost',
    database: 'travel_support_dev',
    user: 'postgres',
    password: '1234',
});
```

### Check 3: CORS Configuration

```javascript
// ✅ Good - configurable
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://your-domain.com',
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// ❌ Bad - allows everything in production
app.use(cors({ origin: '*' }));
```

### Check 4: Error Handling

```javascript
// ✅ Good - safe error messages
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// ❌ Bad - exposes details
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.stack });
});
```

---

## 📝 Files to Create/Update

### 1. Create `.gitignore`

Create `d:\projects\travel-support-app -test\conversion\.gitignore`:

```
# Dependencies
node_modules/
backend/node_modules/

# Environment
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*
logs/

# OS
.DS_Store
Thumbs.db
.idea/
.vscode/

# Build
dist/
build/

# Database
*.sqlite
*.db
```

### 2. Update `package.json`

Ensure you have:

```json
{
  "name": "travel-support-app",
  "version": "1.0.0",
  "description": "Multi-tenant travel support system",
  "main": "backend/server.js",
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 3. Create `.env.example`

Create a template for others:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_support_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_POOL_MIN=2
DB_POOL_MAX=20

# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=change-this-to-a-long-random-string

# External APIs
GOOGLE_MAPS_API_KEY=your_api_key_here

# Application
SYSTEM_TIMEZONE=Europe/London

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 🚀 Deployment Readiness Test

Run these tests locally before deploying:

### Test 1: Environment Variables
```bash
# Remove .env temporarily
mv backend/.env backend/.env.backup

# Try to start server (should fail or show warnings)
npm start

# Restore .env
mv backend/.env.backup backend/.env
```

### Test 2: Production Database Connection
```bash
# Set production-like environment
export NODE_ENV=production
export DB_HOST=your-test-db-host

# Try to connect
npm start
```

### Test 3: API Endpoints
```bash
# Start server
npm start

# Test health check
curl http://localhost:3000/

# Test login
curl -X POST http://localhost:3000/api/tenants/2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Test authenticated endpoint
curl http://localhost:3000/api/tenants/2/customers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Deployment Day Checklist

When you're ready to deploy:

### Before Deployment
- [ ] All code committed to git
- [ ] Tests passing (if you have tests)
- [ ] `.env` file NOT committed
- [ ] Database backup created
- [ ] Deployment platform account created
- [ ] Domain purchased (if using custom domain)

### During Deployment
- [ ] Create database on platform
- [ ] Set environment variables
- [ ] Deploy application
- [ ] Run database migrations
- [ ] Deploy tenant data (if applicable)

### After Deployment
- [ ] Test all major endpoints
- [ ] Check logs for errors
- [ ] Verify database connections
- [ ] Test authentication flow
- [ ] Test multi-tenant routing (subdomains)
- [ ] Monitor for first 24 hours

---

## 🔧 Common Issues & Fixes

### Issue: "Cannot find module"
**Fix:** Make sure all dependencies are in `package.json`, not just installed locally

### Issue: "Connection refused" (database)
**Fix:** Check DATABASE_URL or DB_* variables match platform's provided values

### Issue: "Application error" or crashes on startup
**Fix:** Check logs, usually missing environment variable

### Issue: "Port already in use"
**Fix:** Make sure you're using `process.env.PORT`

### Issue: CORS errors
**Fix:** Add your production domain to ALLOWED_ORIGINS

---

## 🎯 Ready to Deploy?

If you can check most of these boxes, you're ready:

- [ ] Server starts without errors locally
- [ ] All environment variables documented
- [ ] Database connection uses environment variables
- [ ] No hardcoded secrets in code
- [ ] `.gitignore` configured properly
- [ ] `package.json` has start script
- [ ] Node version specified
- [ ] Platform chosen (Railway, Render, etc.)

**Next step:** Follow the deployment guide for your chosen platform!

- [Railway Deployment Guide](DEPLOYMENT_RAILWAY.md)
- [Render Deployment Guide](DEPLOYMENT_RENDER.md)
- [Platform Comparison](DEPLOYMENT_COMPARISON.md)
