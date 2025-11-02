# Quick Deploy Guide - Your Travel Support App

Your app is a **TypeScript + Express + PostgreSQL** application. Here's how to deploy it.

## 📋 Your Current Setup

```
✅ TypeScript backend (src/server.ts)
✅ Build script (npm run build → dist/server.js)
✅ Environment variables ready
✅ PostgreSQL database
✅ Good security (helmet, cors, compression)
```

## 🚀 Deploy to Railway.app (5 Minutes)

### Step 1: Prepare Code

Your code looks deployment-ready! Just verify these files exist:

```bash
cd "d:\projects\travel-support-app -test\conversion"

# Check package.json has correct scripts
# ✅ "build": "tsc"
# ✅ "start": "node dist/server.js"
```

### Step 2: Create `.gitignore` (if not exists)

```bash
cd backend
```

Create `.gitignore`:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

### Step 3: Initialize Git & Push to GitHub

```bash
# In the conversion directory
cd "d:\projects\travel-support-app -test\conversion"

# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Prepare for deployment"

# Create GitHub repo at https://github.com/new
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/travel-support-app.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy on Railway

1. **Go to https://railway.app** and sign up
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will auto-detect it's a Node.js app

### Step 5: Add PostgreSQL

1. In your project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway creates the database automatically

### Step 6: Configure Environment Variables

Click your service → **"Variables"** → Add these:

```env
# Database (Railway auto-provides these)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Or individual fields
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Connection pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Server
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=CHANGE_THIS_TO_LONG_RANDOM_STRING_abc123xyz789

# APIs
GOOGLE_MAPS_API_KEY=your_api_key

# Application
SYSTEM_TIMEZONE=Europe/London
```

**Important:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 7: Configure Build Settings

Railway should auto-detect, but verify:

**Build Command:** `npm run build`
**Start Command:** `npm start`
**Root Directory:** `/backend` (or leave empty if package.json is at root)

### Step 8: Run Database Migrations

Once deployed, use Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx ts-node src/migrations/run-all.ts

# Or manually connect and run SQL
```

### Step 9: Get Your URL

1. Go to your service in Railway
2. Click **"Settings"** → **"Domains"**
3. Click **"Generate Domain"**
4. You'll get: `your-app.railway.app`

### Step 10: Test It!

```bash
# Test health check
curl https://your-app.railway.app/api/health

# Test login
curl -X POST https://your-app.railway.app/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sheffieldtransport.co.uk","password":"admin123"}'
```

---

## 🎯 Alternative: Render.com (Free Tier)

### Quick Setup

1. Go to https://render.com
2. Sign up with GitHub
3. **New** → **Web Service**
4. Connect your repo
5. Configure:
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm start`
   - **Environment:** Add all variables above

---

## 📊 Deployment Checklist

Before deploying, verify:

### Code Readiness
- [x] TypeScript compiles successfully (`npm run build`)
- [x] Server uses `process.env.PORT`
- [x] Database uses environment variables
- [x] No hardcoded secrets
- [x] `.env` in `.gitignore`

### Security
- [ ] Change JWT_SECRET to production value
- [x] CORS configured (currently localhost only - update for production)
- [x] Helmet.js enabled
- [x] Rate limiting in place

### Database
- [ ] Backup current database
- [ ] Migration scripts ready
- [ ] Test data prepared (or cleared)

---

## 🔧 Quick Fixes Before Deployment

### Fix 1: Update CORS for Production

Edit `backend/src/server.ts` around line 76:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  // Add your production domain:
  'https://your-app.railway.app',
  'https://yourdomain.com',
];
```

Or use environment variable:

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];
```

Then in Railway, add:
```env
ALLOWED_ORIGINS=https://your-app.railway.app,https://yourdomain.com
```

### Fix 2: Ensure Build Works Locally

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Check dist/ folder was created
dir dist

# Test the built version
npm start
```

---

## 💰 Cost Estimate

### Railway.app
- Free: $5 credit/month
- After credit: ~$10-15/month
- Always running (no cold starts)

### Render.com
- Free tier: $0/month
- Spins down after 15 min inactivity
- Paid: $7/month web + $7/month database

---

## 🚨 Common Deployment Issues

### Issue: "Cannot find module 'dist/server.js'"
**Fix:** Make sure build command runs before start:
- Build: `npm run build`
- Start: `npm start`

### Issue: TypeScript errors during build
**Fix:** Run `npm run build` locally first to catch errors

### Issue: Database connection fails
**Fix:** Use Railway's provided DATABASE_URL or individual DB_* variables

### Issue: CORS errors from frontend
**Fix:** Add your production domain to `allowedOrigins` in server.ts

---

## 📱 Multi-Tenant Subdomain Setup (Later)

For subdomain routing (sat.yourdomain.com, etc.):

1. **Buy domain** (Namecheap, GoDaddy)
2. **Add DNS records:**
   ```
   Type: CNAME
   Name: *
   Value: your-app.railway.app
   ```
3. **In Railway:** Settings → Domains → Add custom domain
4. **Update CORS:** Add wildcard or specific subdomains

---

## ✅ You're Ready If...

- [ ] Code is on GitHub
- [ ] TypeScript builds successfully
- [ ] Environment variables documented
- [ ] JWT_SECRET generated
- [ ] Platform chosen (Railway or Render)
- [ ] Database backup created

## 🎯 Next Steps

1. **Choose platform:** Railway (recommended) or Render
2. **Follow steps above** (takes 5-10 minutes)
3. **Test thoroughly** after deployment
4. **Monitor logs** for first 24 hours

Need help? Let me know which platform you choose and I'll guide you through it!
