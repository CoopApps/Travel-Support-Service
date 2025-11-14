# 💾 Database Backup Setup Guide

## Critical: Enable Backups BEFORE Going Live

**Why**: One database failure = ALL customer data lost forever. Not acceptable for commercial use.

---

## Option 1: Railway (Automated - Recommended)

**Best For**: Quick setup, automated backups, easy restore

### Steps:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Select your project
   - Click on your PostgreSQL database

2. **Enable Backups**
   - Go to "Backups" tab
   - Click "Enable Backups"
   - Choose retention period:
     - Free tier: 7 days
     - Paid: 30+ days recommended

3. **Configure Schedule**
   - Automatic: Daily at 2 AM UTC
   - Manual: Click "Create Backup" anytime

4. **Test Restore**
   ```bash
   # In Railway dashboard:
   # 1. Go to Backups tab
   # 2. Find latest backup
   # 3. Click "Restore"
   # 4. Create new database from backup
   # 5. Test data integrity
   # 6. Delete test database
   ```

**Cost**:
- Free tier: 7-day retention
- Pro ($20/mo): 30-day retention

---

## Option 2: Manual Backups (Self-Hosted)

**Best For**: Full control, long-term retention, cost savings

### Setup Automated Backup Script

1. **Create Backup Script**

```bash
# Create script file
nano /usr/local/bin/backup-travel-db.sh
```

```bash
#!/bin/bash
# Travel Support Database Backup Script

# Configuration
BACKUP_DIR="/var/backups/travel-support"
DATABASE_URL="your-database-url-here"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="travel_support_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup at $(date)"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"

# Check if backup succeeded
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $FILENAME"

    # Delete old backups
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "🗑️  Deleted backups older than $RETENTION_DAYS days"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Optional: Upload to S3 for off-site backup
# aws s3 cp "$BACKUP_DIR/$FILENAME" s3://your-bucket/backups/

echo "Backup completed at $(date)"
```

2. **Make Script Executable**

```bash
chmod +x /usr/local/bin/backup-travel-db.sh
```

3. **Test Backup**

```bash
# Run manually to test
/usr/local/bin/backup-travel-db.sh

# Check backup was created
ls -lh /var/backups/travel-support/
```

4. **Schedule with Cron**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-travel-db.sh >> /var/log/travel-backup.log 2>&1
```

---

## Option 3: Cloud Storage Backup

### A. AWS S3 (Recommended for Production)

```bash
#!/bin/bash
# Backup to AWS S3

DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="travel_support_$DATE.sql.gz"

# Create backup
pg_dump "$DATABASE_URL" | gzip > "/tmp/$FILENAME"

# Upload to S3
aws s3 cp "/tmp/$FILENAME" "s3://your-backup-bucket/backups/$FILENAME"

# Delete local copy
rm "/tmp/$FILENAME"

# Set lifecycle policy to delete after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-backup-bucket \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json**:
```json
{
  "Rules": [{
    "Id": "DeleteOldBackups",
    "Status": "Enabled",
    "Prefix": "backups/",
    "Expiration": {
      "Days": 90
    }
  }]
}
```

**Cost**: ~$0.023 per GB per month

### B. Google Cloud Storage

```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Backup to GCS
pg_dump "$DATABASE_URL" | gzip | gsutil cp - "gs://your-bucket/backups/travel_$DATE.sql.gz"
```

---

## Testing Restore Process

**CRITICAL**: Test restoration monthly to ensure backups actually work!

### Test Restore Steps:

1. **Create Test Database**

```bash
# Create empty test database
createdb travel_support_test
```

2. **Restore from Backup**

```bash
# For gzipped backup
gunzip -c backup_20250114.sql.gz | psql travel_support_test

# For plain SQL backup
psql travel_support_test < backup_20250114.sql
```

3. **Verify Data**

```bash
psql travel_support_test -c "
SELECT
  'tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'tenant_users', COUNT(*) FROM tenant_users
UNION ALL
SELECT 'customers', COUNT(*) FROM tenant_customers
UNION ALL
SELECT 'drivers', COUNT(*) FROM tenant_drivers;
"
```

4. **Test Application**

```bash
# Update .env to point to test database temporarily
DATABASE_URL=postgresql://localhost/travel_support_test

# Start server and test login
npm run dev
```

5. **Clean Up**

```bash
# Drop test database
dropdb travel_support_test
```

---

## Backup Verification Checklist

Test this monthly:

- [ ] Backup file created successfully
- [ ] Backup file size is reasonable (not 0 bytes!)
- [ ] Restore to test database works
- [ ] All tables present in restored database
- [ ] Row counts match production
- [ ] Application can connect to restored database
- [ ] Can login and view data
- [ ] No data corruption detected

---

## Disaster Recovery Plan

### If Database Fails:

1. **Stay Calm** - You have backups!

2. **Assess Damage**
   ```bash
   # Can you connect?
   psql $DATABASE_URL -c "SELECT 1;"

   # Check table counts
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM tenants;"
   ```

3. **Restore from Latest Backup**
   ```bash
   # Find latest backup
   ls -lt /var/backups/travel-support/ | head -1

   # Restore
   gunzip -c latest_backup.sql.gz | psql $DATABASE_URL
   ```

4. **Verify Restoration**
   - Check all tables exist
   - Verify row counts
   - Test login
   - Check recent data

5. **Notify Affected Users**
   - Be transparent
   - Explain what happened
   - Confirm their data is safe

6. **Review & Improve**
   - What caused the failure?
   - How can we prevent it?
   - Update backup frequency?

---

## Backup Best Practices

### DO:
✅ Test restore monthly
✅ Store backups off-site (different location than database)
✅ Encrypt backups if they contain sensitive data
✅ Keep at least 30 days of backups
✅ Monitor backup job success
✅ Document restore procedure

### DON'T:
❌ Assume backups work without testing
❌ Store backups on same server as database
❌ Delete old backups without verification
❌ Wait for disaster to test restore
❌ Forget to backup before major changes

---

## Monitoring Backup Health

### Setup Alerts:

```bash
#!/bin/bash
# Check if backup ran in last 24 hours

BACKUP_DIR="/var/backups/travel-support"
LATEST=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -1 | wc -l)

if [ $LATEST -eq 0 ]; then
    # Send alert (email, Slack, etc.)
    echo "⚠️ WARNING: No backup in last 24 hours!" | mail -s "Backup Alert" admin@example.com
fi
```

### Add to Monitoring Dashboard:
- Last backup timestamp
- Backup file size
- Backup success/failure count
- Days since last successful restore test

---

## Quick Start Checklist

For immediate production readiness:

### Railway Users:
- [ ] Enable automated backups (5 minutes)
- [ ] Set 7-day retention minimum
- [ ] Test restore once (15 minutes)
- [ ] Schedule monthly restore tests

### Self-Hosted Users:
- [ ] Create backup script (15 minutes)
- [ ] Schedule cron job (5 minutes)
- [ ] Test backup creation (5 minutes)
- [ ] Test restore process (15 minutes)
- [ ] Set up S3/GCS upload (optional)

---

## Current Status

✅ Database exists with 188 tables
✅ 5 tenants in system
⚠️ **NO BACKUPS CONFIGURED YET**

**Next Step**:
1. If using Railway: Enable backups in dashboard (5 mins)
2. If self-hosted: Run backup script setup (30 mins)

---

## Cost Comparison

| Option | Setup Time | Cost | Retention | Auto-Restore |
|--------|------------|------|-----------|--------------|
| **Railway** | 5 mins | Free-$20/mo | 7-30 days | ✅ Yes |
| **Manual + Local** | 30 mins | Free | Unlimited | ❌ No |
| **Manual + S3** | 1 hour | ~$1/mo | 90 days | ❌ No |
| **Manual + GCS** | 1 hour | ~$1/mo | 90 days | ❌ No |

**Recommendation**: Use Railway for simplicity, add S3 later for long-term retention.

---

## Need Help?

- Railway Backups: https://docs.railway.app/databases/backups
- PostgreSQL pg_dump: https://www.postgresql.org/docs/current/app-pgdump.html
- AWS S3: https://aws.amazon.com/s3/
