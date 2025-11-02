# Deploying to Railway.app

## Prerequisites
- GitHub account
- Railway account (sign up at https://railway.app)
- Your code in a git repository

## Step 1: Prepare Your Code

### 1.1 Create `.gitignore` (if not exists)
```
node_modules/
.env
*.log
.DS_Store
```

### 1.2 Update `package.json` scripts

Make sure you have:
```json
{
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 1.3 Create a startup script (optional but recommended)

Create `backend/start.sh`:
```bash
#!/bin/bash
cd backend
node server.js
```

## Step 2: Initialize Git Repository

```bash
cd "d:\projects\travel-support-app -test\conversion"

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"
```

## Step 3: Push to GitHub

```bash
# Create a new repository on GitHub (https://github.com/new)
# Then:

git remote add origin https://github.com/YOUR_USERNAME/travel-support-app.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy on Railway

### 4.1 Create New Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Click "Deploy Now"

### 4.2 Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a database and provide connection details

### 4.3 Configure Environment Variables

Click on your service → "Variables" → Add these:

```env
# Database (Railway provides these automatically, but verify)
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_POOL_MIN=2
DB_POOL_MAX=10

# Or use single DATABASE_URL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Application
PORT=3000
JWT_SECRET=your-production-jwt-secret-change-this
GOOGLE_MAPS_API_KEY=your_api_key_here
SYSTEM_TIMEZONE=Europe/London
NODE_ENV=production
```

### 4.4 Set Start Command

In Railway service settings:
- **Start Command:** `node backend/server.js`
- **Root Directory:** Leave empty (or set to `/` if needed)

## Step 5: Run Database Migrations

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run node backend/setup-database.js
railway run node backend/create-subscription-tables.js
```

### Option B: Connect Directly

1. Get database credentials from Railway dashboard
2. Connect using pgAdmin or psql:
```bash
psql postgresql://user:password@host:port/database
```
3. Run your SQL scripts manually

## Step 6: Setup Custom Domain

### 6.1 In Railway
1. Click on your service
2. Go to "Settings" → "Domains"
3. Click "Generate Domain" (you'll get a `.railway.app` domain)
4. Or add custom domain

### 6.2 For Multi-Tenant Subdomains

**Option 1: Wildcard subdomain (if you own a domain)**
1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. Add DNS records:
   ```
   Type: A
   Name: @
   Value: [Railway IP from dashboard]

   Type: CNAME
   Name: *
   Value: your-app.railway.app
   ```

**Option 2: Use Railway subdomains for testing**
- Main app: `your-app.railway.app`
- Tenant 1: `tenant1-your-app.railway.app` (create separate service)
- Tenant 2: `tenant2-your-app.railway.app` (create separate service)

## Step 7: Deploy Tenants

Run your deployment script:
```bash
railway run node backend/deploy-tenant.js
```

Or manually insert tenant records into the database.

## Step 8: Test Your Deployment

```bash
# Test main endpoint
curl https://your-app.railway.app/

# Test login
curl -X POST https://your-app.railway.app/api/tenants/2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Test with subdomain (if configured)
curl https://sat.your-domain.com/
```

## Monitoring & Logs

### View Logs
- Railway dashboard → Your service → "Deployments" → Click deployment → View logs
- Or use CLI: `railway logs`

### Check Metrics
- Railway dashboard shows CPU, Memory, Network usage

## Troubleshooting

### App Won't Start
```bash
# Check logs in Railway dashboard
# Common issues:
# - Wrong start command
# - Missing environment variables
# - Database connection failed
```

### Database Connection Error
```bash
# Verify environment variables match Railway Postgres
# Check that DB_HOST uses Railway's internal hostname
```

### Port Issues
```bash
# Railway automatically assigns PORT
# Make sure your server.js uses process.env.PORT
const PORT = process.env.PORT || 3000;
```

## Cost Estimate

Railway pricing:
- **Free tier:** $5 credit/month
- **Pro plan:** $20/month
- **Usage-based:** ~$0.01/hour for hobby apps

For testing: Free tier should be sufficient.

## Automatic Deployments

Railway automatically redeploys when you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
# Railway automatically deploys!
```

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (Railway does this automatically)
- [ ] Set NODE_ENV=production
- [ ] Review CORS settings for production domains
- [ ] Backup database regularly

## Next Steps

1. Test all endpoints
2. Setup monitoring/alerts
3. Configure backups
4. Add custom domain
5. Setup SSL certificates (automatic on Railway)
6. Configure multi-tenant routing
