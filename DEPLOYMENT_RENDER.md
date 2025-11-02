# Deploying to Render.com

## Why Render?
- ✅ Free tier available
- ✅ Free PostgreSQL database (90 days, then $7/month)
- ✅ Easy setup
- ✅ Automatic SSL
- ✅ Great for testing

## Step 1: Prepare Your Code

### Update `package.json`
```json
{
  "scripts": {
    "start": "node backend/server.js",
    "build": "echo 'No build needed'"
  },
  "engines": {
    "node": "18.x"
  }
}
```

## Step 2: Push to GitHub

```bash
cd "d:\projects\travel-support-app -test\conversion"
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/travel-support-app.git
git push -u origin main
```

## Step 3: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

## Step 4: Create PostgreSQL Database

1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Fill in:
   - **Name:** travel-support-db
   - **Database:** travel_support_prod
   - **User:** (auto-generated)
   - **Region:** Choose closest to your users
   - **Plan:** Free (expires after 90 days)
4. Click "Create Database"
5. **Save the connection details!**

## Step 5: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:

### Basic Settings
- **Name:** travel-support-app
- **Region:** Same as database
- **Branch:** main
- **Root Directory:** (leave empty)
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `node backend/server.js`

### Environment Variables

Click "Advanced" → Add environment variables:

```env
DB_HOST=<from Render PostgreSQL dashboard>
DB_PORT=5432
DB_NAME=travel_support_prod
DB_USER=<from Render PostgreSQL dashboard>
DB_PASSWORD=<from Render PostgreSQL dashboard>
DB_POOL_MIN=2
DB_POOL_MAX=10

# Or use Internal Database URL from Render
DATABASE_URL=<Internal Database URL from Render>

PORT=3000
JWT_SECRET=your-production-secret-change-this
GOOGLE_MAPS_API_KEY=your_key
SYSTEM_TIMEZONE=Europe/London
NODE_ENV=production
```

### Plan
- **Instance Type:** Free
- **Auto-Deploy:** Yes (deploys on git push)

4. Click "Create Web Service"

## Step 6: Run Database Migrations

### Option A: Use Render Shell

1. Go to your web service
2. Click "Shell" tab
3. Run:
```bash
node backend/setup-database.js
node backend/create-subscription-tables.js
node backend/deploy-tenant.js
```

### Option B: Connect with psql

```bash
# Get connection string from Render dashboard
psql <External Database URL>

# Run your SQL scripts
\i /path/to/your/schema.sql
```

## Step 7: Configure Custom Domain (Optional)

1. In your web service, go to "Settings"
2. Scroll to "Custom Domain"
3. Add your domain
4. Add DNS records at your domain provider:
   ```
   Type: CNAME
   Name: www (or subdomain)
   Value: your-app.onrender.com
   ```

### Multi-Tenant Subdomains

For wildcard subdomains:
1. Add DNS record:
   ```
   Type: CNAME
   Name: *
   Value: your-app.onrender.com
   ```
2. In Render, add each subdomain separately or use a reverse proxy

## Step 8: Test Deployment

```bash
# Test main endpoint
curl https://your-app.onrender.com/

# Test login
curl -X POST https://your-app.onrender.com/api/tenants/2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## Monitoring

### View Logs
- Render dashboard → Your service → "Logs" tab
- Real-time log streaming

### Metrics
- Render dashboard → "Metrics" tab
- Shows CPU, memory, bandwidth usage

## Important Notes

### Free Tier Limitations
- ⚠️ **Spins down after 15 minutes of inactivity**
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for one service 24/7)
- Database free for 90 days, then $7/month

### Keep Free Service Active
Add a cron job to ping your app:
```bash
# Use a service like cron-job.org
# Ping https://your-app.onrender.com every 10 minutes
```

## Upgrading to Paid

If you need 24/7 uptime:
- **Starter:** $7/month (no spin-down)
- **Standard:** $25/month (more resources)

## Automatic Deployments

Render auto-deploys on git push:
```bash
git add .
git commit -m "Update"
git push
# Render automatically deploys!
```

## Troubleshooting

### Build Fails
Check "Logs" → Build logs
Common issues:
- Missing dependencies in package.json
- Wrong Node version

### Database Connection Error
- Verify DATABASE_URL or individual DB_* variables
- Use "Internal Database URL" (faster) not "External"
- Check database is in same region as web service

### App Crashes
- Check runtime logs
- Verify PORT is set correctly
- Check environment variables

## Cost Estimate

- **Free tier:** $0/month (with limitations)
- **Paid:** ~$14/month ($7 database + $7 web service)

## Backup Strategy

Render doesn't auto-backup free databases:

### Manual Backup
```bash
# Get External Database URL from Render
pg_dump <External Database URL> > backup.sql
```

### Automated Backup (paid plans only)
- Available on $7/month database plan

## Next Steps

1. ✅ Deploy app
2. ✅ Test all endpoints
3. ⚠️ Setup monitoring (e.g., UptimeRobot)
4. ⚠️ Configure backups
5. ⚠️ Add custom domain
6. ⚠️ Consider upgrading if spin-down is an issue
