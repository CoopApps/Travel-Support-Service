# Railway Database Migration Guide

## Problem

After deploying the Section 19/22 compliance features, the production database on Railway doesn't have the new columns and tables, causing 500 errors on driver and other endpoints.

## Solution

Run the compliance migration on the Railway database.

## Option 1: Run from Railway CLI (Recommended)

1. Install Railway CLI if you haven't already:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run the migration:
   ```bash
   railway run node backend/run-railway-migration.js
   ```

   This will:
   - Connect to your Railway database automatically
   - Run the `add-section-19-22-compliance.sql` migration
   - Add all new columns and tables

## Option 2: Run Locally with Railway DATABASE_URL

1. Get your DATABASE_URL from Railway:
   - Go to your Railway project
   - Click on your Postgres service
   - Copy the `DATABASE_URL` variable

2. Run the migration locally:
   ```bash
   cd backend
   DATABASE_URL="your_railway_database_url_here" node run-railway-migration.js
   ```

## Option 3: Run Directly in Railway Dashboard

1. Go to Railway Dashboard → Your Project → Postgres
2. Click "Query" tab
3. Copy and paste the entire contents of `backend/migrations/add-section-19-22-compliance.sql`
4. Click "Run Query"

**Note**: This option may timeout for large migrations

## Verification

After running the migration, verify it worked:

1. Check the app - driver endpoints should work:
   - Visit: `https://your-app.railway.app/`
   - Navigate to Drivers page
   - Should load without 500 errors

2. Check database directly:
   ```sql
   -- Check new columns exist
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'tenant_drivers' 
   AND column_name IN ('is_volunteer', 'pcv_license_number', 'midas_certified');
   
   -- Check new tables exist
   SELECT tablename 
   FROM pg_tables 
   WHERE tablename IN (
     'local_bus_service_registrations',
     'tenant_financial_surplus',
     'section19_passenger_class_definitions',
     'permit_compliance_alerts'
   );
   ```

## What the Migration Does

The migration adds Section 19/22 permit compliance features:

### Enhanced Tables (new columns added):
- **tenant_organizational_permits**: 13 new columns for permit compliance
- **tenants**: 3 new columns for EU exemption tracking
- **tenant_drivers**: 18 new columns for licensing compliance
- **tenant_vehicles**: 14 new columns for permit compliance

### New Tables Created:
- **local_bus_service_registrations**: Section 22 service registrations
- **tenant_financial_surplus**: Annual financial tracking
- **section19_passenger_class_definitions**: Passenger eligibility (Classes A-F)
- **permit_compliance_alerts**: Compliance monitoring

### Reference Data Inserted:
- 6 standard passenger class definitions (A-F)
- 8 Traffic Commissioner area definitions (UK regions)

## Troubleshooting

### Error: "column already exists"
The migration has already been run. No action needed.

### Error: "permission denied"
Make sure you're using the correct DATABASE_URL with appropriate permissions.

### Error: "database connection failed"
Check that:
- DATABASE_URL is correct
- Your IP is whitelisted (if Railway has IP restrictions)
- The database service is running

### Still getting 500 errors after migration
1. Restart your Railway deployment:
   ```bash
   railway up
   ```
2. Check Railway logs for specific errors:
   ```bash
   railway logs
   ```

## Need Help?

Check the Railway logs for specific error messages:
```bash
railway logs --tail 100
```

Or review the migration file directly:
```
backend/migrations/add-section-19-22-compliance.sql
```
