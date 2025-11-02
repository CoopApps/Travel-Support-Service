# Monitoring & Alerts Setup Guide

## Overview

Production monitoring provides error tracking, performance monitoring, uptime alerts, and usage analytics.

## Recommended Free Stack

1. **Sentry** - Error tracking (5,000 errors/month free)
2. **UptimeRobot** - Uptime monitoring (50 monitors free)
3. **Built-in Health Checks** - Already implemented!
4. **Winston Logging** - Already implemented!

**Total Cost: $0/month**

## Setup Sentry (Error Tracking)

Sentry is already in dependencies (`@sentry/node`)!

### 1. Create Sentry Account
- Go to https://sentry.io
- Create account (free tier)
- Create new Node.js project
- Copy DSN

### 2. Add to Environment
```bash
SENTRY_DSN=https://your-key@sentry.io/your-project
```

### 3. Configure Sentry
Already configured! Just set the DSN environment variable.

### 4. Test Error Tracking
```bash
# Visit this endpoint (remove in production!)
curl https://your-domain.com/test/error
```

Check Sentry dashboard for the error.

## Setup UptimeRobot (Uptime Monitoring)

Free tier: 50 monitors, 5-minute intervals

### 1. Create Account
- Go to https://uptimerobot.com
- Create free account

### 2. Add Monitor
- Monitor Type: HTTP(s)
- URL: `https://your-domain.com/health`
- Interval: 5 minutes

### 3. Configure Alerts
- Email notifications
- SMS (paid tier)
- Webhook to Slack/Discord

**Benefits:**
- Get alerted when API goes down
- Track uptime percentage
- Monitor response times

## Built-In Monitoring (Already Implemented!)

### Health Check Endpoints
```bash
# Basic health check
curl https://your-domain.com/health

# Detailed check with database status
curl https://your-domain.com/health/detailed
```

### Request Logging
- All HTTP requests logged
- Slow request detection (>1000ms)
- User and tenant tracking
- Request IDs for tracing

### Cache Statistics
```typescript
import { getCacheStats } from './utils/cache';
const stats = getCacheStats();
console.log('Hit rate:', stats.global.hitRate);
```

## Alerting Rules

### Critical Alerts (Immediate Action)

1. **API Down**
   - Setup: UptimeRobot on `/health`
   - Alert: SMS + Email
   - Action: Check logs, restart service

2. **Database Connection Lost**
   - Setup: Monitor `/health/detailed`
   - Alert: Email when returns 503
   - Action: Check database status

3. **High Error Rate**
   - Setup: Sentry alert rule (>10 errors/min)
   - Alert: Email
   - Action: Check Sentry for details

### Warning Alerts (Review Daily)

1. **Slow Requests** - Already logged (>1000ms)
2. **Low Cache Hit Rate** - Check cache stats
3. **High Query Count** - Review N+1 patterns

## Monitoring Dashboard

Create admin status endpoint:

```typescript
router.get('/admin/status', adminAuth, async (req, res) => {
  const cacheStats = getCacheStats();

  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      hitRate: cacheStats.global.hitRate,
      keys: cacheStats.global.keys,
    },
    timestamp: new Date().toISOString(),
  });
});
```

## Cost Comparison

| Service | Free Tier | Paid |
|---------|-----------|------|
| Sentry | 5K errors/mo | $26/mo |
| UptimeRobot | 50 monitors | $7/mo |
| Datadog | Limited | $15/host/mo |
| New Relic | 100GB/mo | $99/mo |

## Implementation Checklist

### Immediate (Before Production)
- [ ] Set up Sentry account
- [ ] Add SENTRY_DSN to environment
- [ ] Configure UptimeRobot monitoring
- [ ] Test health check endpoints
- [ ] Configure email alerts

### First Week
- [ ] Review error reports daily
- [ ] Monitor slow query logs
- [ ] Check cache hit rates
- [ ] Verify alerts working

### First Month
- [ ] Review usage patterns
- [ ] Optimize based on metrics
- [ ] Adjust cache TTLs
- [ ] Fine-tune alert thresholds

## Summary

**Setup Time:** 30 minutes
**Cost:** $0/month (free tiers)
**Coverage:** Errors, uptime, performance, logs

All core monitoring infrastructure is already built-in!
