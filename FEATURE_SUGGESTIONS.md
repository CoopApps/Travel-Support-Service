# Feature Suggestions for Travel Support Application

**Date:** 2025-11-02
**Status:** Future Enhancements
**Current Focus:** Complete technical improvements first (sanitization + optimization)

---

## 🎯 Overview

This document contains feature suggestions identified during systematic code assessment. These are **future enhancements** to be considered after completing current technical improvements (sanitization, performance optimization, consistency).

**Note:** Multi-tenant architecture requires special consideration for features involving external integrations (payments, notifications, etc.)

---

## 🚨 High-Impact Features

### 1. Real-Time Trip Tracking & Notifications
**Priority:** HIGH
**Estimated Time:** 40-60 hours
**ROI:** ⭐⭐⭐⭐⭐

**What's Missing:**
- No WebSocket/real-time updates
- No live GPS tracking for drivers
- No "driver is 5 minutes away" notifications
- Customers can't see trip status in real-time

**Why Important:**
- Modern customer expectation (like Uber/Lyft)
- Reduces "where is my driver?" phone calls
- Significantly improves customer experience
- Competitive advantage

**Technical Implementation:**
```typescript
// WebSocket server for live updates
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('join:trip', (tripId) => {
    socket.join(`trip:${tripId}`);
  });

  // Driver sends location updates
  socket.on('driver:location', (data) => {
    // Broadcast to customer watching this trip
    socket.to(`trip:${data.tripId}`).emit('driver:location', {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      speed: data.speed,
      eta: calculateETA(data)
    });
  });

  // Trip status changes
  socket.on('trip:status', (data) => {
    socket.to(`trip:${data.tripId}`).emit('trip:status', data.status);
  });
});
```

**Database Changes:**
```sql
CREATE TABLE trip_location_history (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES tenant_trips(trip_id),
  driver_id INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  accuracy DECIMAL(5, 2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_location ON trip_location_history(trip_id, recorded_at DESC);
```

**Dependencies:**
- socket.io
- @googlemaps/google-maps-services-js (for ETA calculation)

---

### 2. Automated Notifications (SMS/Email)
**Priority:** HIGH
**Estimated Time:** 20-30 hours
**ROI:** ⭐⭐⭐⭐⭐

**What's Missing:**
- No trip reminders (1 day before, 1 hour before)
- No booking confirmations
- No driver assignment notifications
- No permit/DBS expiry alerts
- No invoice payment reminders

**Why Important:**
- Reduces no-shows
- Improves communication
- Professional customer experience
- Automated compliance tracking

**Multi-Tenant Consideration:**
Each tenant needs their own notification configuration:

```sql
CREATE TABLE tenant_notification_config (
  config_id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(tenant_id),

  -- SMS Provider (Twilio)
  sms_enabled BOOLEAN DEFAULT false,
  twilio_account_sid_encrypted TEXT,
  twilio_auth_token_encrypted TEXT,
  twilio_phone_number VARCHAR(20),

  -- Email Provider (SendGrid)
  email_enabled BOOLEAN DEFAULT false,
  sendgrid_api_key_encrypted TEXT,
  from_email VARCHAR(255),
  from_name VARCHAR(255),

  -- Notification preferences
  send_trip_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  send_booking_confirmations BOOLEAN DEFAULT true,
  send_invoice_reminders BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation:**
```typescript
// backend/src/services/notificationService.ts
import twilio from 'twilio';
import sendgrid from '@sendgrid/mail';
import { decryptCredential } from '../utils/paymentCredentials';

export async function sendTripReminder(tripId: number) {
  const trip = await getTripDetails(tripId);
  const config = await getTenantNotificationConfig(trip.tenant_id);

  if (!config) return;

  // SMS reminder
  if (config.sms_enabled && trip.customer_phone) {
    const client = twilio(
      decryptCredential(config.twilio_account_sid_encrypted),
      decryptCredential(config.twilio_auth_token_encrypted)
    );

    await client.messages.create({
      to: trip.customer_phone,
      from: config.twilio_phone_number,
      body: `Trip reminder: ${trip.destination} tomorrow at ${trip.pickup_time}`
    });
  }

  // Email reminder
  if (config.email_enabled && trip.customer_email) {
    sendgrid.setApiKey(decryptCredential(config.sendgrid_api_key_encrypted));

    await sendgrid.send({
      to: trip.customer_email,
      from: { email: config.from_email, name: config.from_name },
      subject: 'Trip Reminder - Tomorrow',
      html: renderTripReminderEmail(trip)
    });
  }
}

// Cron job for daily reminders
import cron from 'node-cron';

cron.schedule('0 9 * * *', async () => {
  const upcomingTrips = await query(`
    SELECT * FROM tenant_trips
    WHERE trip_date = CURRENT_DATE + INTERVAL '1 day'
      AND status = 'scheduled'
  `);

  for (const trip of upcomingTrips) {
    await sendTripReminder(trip.trip_id);
  }
});
```

**Dependencies:**
- twilio
- @sendgrid/mail
- node-cron

**Estimated Costs (per tenant):**
- Twilio: ~$0.0075 per SMS (UK)
- SendGrid: Free tier (100 emails/day), then ~$15/month

---

### 3. Payment Gateway Integration (Multi-Tenant)
**Priority:** HIGH
**Estimated Time:** 75 hours (with multi-tenant architecture)
**ROI:** ⭐⭐⭐⭐⭐

**Challenge:** Each tenant needs different payment configuration

**What's Missing:**
- Invoices exist but no online payment
- No Stripe/PayPal integration
- No automated payment collection
- No payment reminders

**Why Important:**
- Improved cash flow
- Reduced admin overhead
- Professional customer experience
- Automated reconciliation

**Solution 1: Tenant-Specific Gateway Credentials (Complex)**
Each tenant provides their own Stripe/PayPal credentials.

**Solution 2: Stripe Connect (Recommended)**
Platform uses Stripe Connect, tenants get sub-accounts.

```typescript
// Platform-level Stripe Connect setup
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create connected account for new tenant
export async function setupTenantPayments(tenantId: number, email: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });

  // Store connected account ID
  await query(
    `INSERT INTO tenant_payment_config (tenant_id, provider, stripe_account_id)
     VALUES ($1, 'stripe_connect', $2)`,
    [tenantId, account.id]
  );

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL}/tenant/payment-setup`,
    return_url: `${process.env.APP_URL}/tenant/payment-complete`,
    type: 'account_onboarding'
  });

  return accountLink.url;
}

// Process payment for invoice
export async function processInvoicePayment(invoiceId: number, paymentMethodId: string) {
  const invoice = await getInvoice(invoiceId);
  const config = await getTenantPaymentConfig(invoice.tenant_id);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(invoice.total_amount * 100),
    currency: 'gbp',
    payment_method: paymentMethodId,
    confirm: true,
    transfer_data: {
      destination: config.stripe_account_id // Money goes to tenant
    },
    application_fee_amount: Math.round(invoice.total_amount * 0.02 * 100) // 2% platform fee
  }, {
    stripeAccount: config.stripe_account_id
  });

  // Record payment
  await query(
    `INSERT INTO tenant_payments (tenant_id, invoice_id, amount, transaction_id, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [invoice.tenant_id, invoiceId, invoice.total_amount, paymentIntent.id, paymentIntent.status]
  );

  return paymentIntent;
}
```

**Database Schema:**
```sql
CREATE TABLE tenant_payment_config (
  config_id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(tenant_id),
  provider VARCHAR(50), -- 'stripe_connect', 'manual', etc.
  stripe_account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_payments (
  payment_id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  invoice_id INTEGER,
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Alternative: Manual Payment Tracking Only (20 hours)**
Skip online payments, just track manual/bank transfer payments:

```typescript
router.post('/tenants/:tenantId/invoices/:invoiceId/record-payment', async (req, res) => {
  const { amount, paymentMethod, reference } = req.body;

  await query(
    `INSERT INTO tenant_payments (
      tenant_id, invoice_id, amount, payment_method, reference, status
    ) VALUES ($1, $2, $3, $4, $5, 'completed')`,
    [tenantId, invoiceId, amount, paymentMethod, reference]
  );

  await query(
    `UPDATE tenant_invoices SET payment_status = 'paid' WHERE invoice_id = $1`,
    [invoiceId]
  );

  res.json({ message: 'Payment recorded' });
});
```

**Recommendation:** Start with manual payment tracking (20 hours), add Stripe Connect later (additional 55 hours)

---

### 4. Route Optimization & Navigation
**Priority:** MEDIUM
**Estimated Time:** 40-50 hours
**ROI:** ⭐⭐⭐

**What's Missing:**
- No intelligent routing
- No multi-stop optimization
- No traffic-aware scheduling
- No turn-by-turn navigation for drivers

**Why Important:**
- Fuel savings
- Time efficiency
- More trips per day
- Better customer service (accurate ETAs)

**Implementation:**
```typescript
import { Client } from '@googlemaps/google-maps-services-js';

const googleMaps = new Client({});

export async function optimizeRoute(trips: Array<{
  pickup_address: string;
  dropoff_address: string;
}>) {
  // Create waypoints
  const waypoints = [];
  for (const trip of trips) {
    waypoints.push({ location: trip.pickup_address, stopover: true });
    waypoints.push({ location: trip.dropoff_address, stopover: true });
  }

  const response = await googleMaps.directions({
    params: {
      origin: 'Depot Address',
      destination: 'Depot Address',
      waypoints: waypoints,
      optimize: true,
      key: process.env.GOOGLE_MAPS_API_KEY!
    }
  });

  return {
    optimizedOrder: response.data.routes[0].waypoint_order,
    totalDistance: response.data.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0),
    totalDuration: response.data.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0)
  };
}
```

**Dependencies:**
- @googlemaps/google-maps-services-js
- Google Maps API key (with Directions API enabled)

**Costs:**
- Google Maps Directions API: $5 per 1000 requests
- Route Optimization: $10 per 1000 requests

---

### 5. Reporting & Analytics Dashboard
**Priority:** MEDIUM
**Estimated Time:** 30-40 hours
**ROI:** ⭐⭐⭐

**What's Missing:**
- No visual charts/graphs
- No export to Excel/PDF
- No financial period reports
- No driver performance metrics
- No customer satisfaction trends

**Why Important:**
- Business insights
- Data-driven decisions
- Professional reporting for stakeholders
- Compliance audits

**Implementation:**
```typescript
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Excel export
router.get('/tenants/:tenantId/reports/monthly-revenue', async (req, res) => {
  const { startDate, endDate } = req.query;

  const data = await query(`
    SELECT
      DATE_TRUNC('month', trip_date) as month,
      COUNT(*) as trip_count,
      SUM(price) as revenue,
      AVG(price) as avg_price
    FROM tenant_trips
    WHERE tenant_id = $1 AND trip_date BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC('month', trip_date)
    ORDER BY month
  `, [tenantId, startDate, endDate]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Revenue Report');

  sheet.columns = [
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Trips', key: 'trip_count', width: 10 },
    { header: 'Revenue', key: 'revenue', width: 15 },
    { header: 'Avg Price', key: 'avg_price', width: 15 }
  ];

  sheet.addRows(data);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.xlsx');

  await workbook.xlsx.write(res);
});

// Dashboard stats with charts (frontend uses Chart.js)
router.get('/tenants/:tenantId/dashboard/analytics', async (req, res) => {
  const stats = await query(`
    SELECT
      COUNT(*) as total_trips,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
      SUM(price) as total_revenue,
      AVG(price) as avg_trip_price
    FROM tenant_trips
    WHERE tenant_id = $1 AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
  `, [tenantId]);

  const tripsByDay = await query(`
    SELECT trip_date, COUNT(*) as count
    FROM tenant_trips
    WHERE tenant_id = $1 AND trip_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY trip_date
    ORDER BY trip_date
  `, [tenantId]);

  res.json({
    stats: stats[0],
    chartData: {
      labels: tripsByDay.map(d => d.trip_date),
      datasets: [{
        label: 'Trips per Day',
        data: tripsByDay.map(d => d.count)
      }]
    }
  });
});
```

**Dependencies:**
- exceljs
- pdfkit
- chart.js (frontend)

---

### 6. Automated Compliance Monitoring
**Priority:** MEDIUM
**Estimated Time:** 15-20 hours
**ROI:** ⭐⭐⭐⭐

**What's Missing:**
- No automated DBS renewal reminders
- No permit expiry notifications
- No MOT/insurance tracking with alerts
- No document expiry dashboard

**Why Important:**
- Compliance risk reduction
- Avoid operating with expired documents
- Professional fleet management
- Peace of mind

**Implementation:**
```typescript
import cron from 'node-cron';

// Daily compliance check (runs at 9 AM)
cron.schedule('0 9 * * *', async () => {
  const tenants = await query('SELECT tenant_id FROM tenants WHERE is_active = true');

  for (const tenant of tenants) {
    await checkDriverCompliance(tenant.tenant_id);
    await checkVehicleCompliance(tenant.tenant_id);
  }
});

async function checkDriverCompliance(tenantId: number) {
  // Check DBS expiring in 30 days
  const expiringDBS = await query(`
    SELECT driver_id, name, dbs_expiry_date
    FROM tenant_drivers
    WHERE tenant_id = $1
      AND dbs_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND is_active = true
  `, [tenantId]);

  for (const driver of expiringDBS) {
    await sendComplianceAlert({
      tenantId,
      type: 'dbs_expiry',
      subject: `DBS Expiring: ${driver.name}`,
      message: `DBS check for ${driver.name} expires on ${driver.dbs_expiry_date}. Please arrange renewal.`,
      severity: 'high'
    });
  }

  // Check Section 19/22 permits
  const expiringPermits = await query(`
    SELECT driver_id, name, section19_driver_expiry, section22_driver_expiry
    FROM tenant_drivers
    WHERE tenant_id = $1
      AND (section19_driver_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        OR section22_driver_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
      AND is_active = true
  `, [tenantId]);

  for (const driver of expiringPermits) {
    await sendComplianceAlert({
      tenantId,
      type: 'permit_expiry',
      subject: `Permit Expiring: ${driver.name}`,
      message: `Driver permit for ${driver.name} expiring soon`,
      severity: 'high'
    });
  }
}

async function checkVehicleCompliance(tenantId: number) {
  // Check MOT expiring
  const expiringMOT = await query(`
    SELECT vehicle_id, registration, mot_expiry
    FROM tenant_vehicles
    WHERE tenant_id = $1
      AND mot_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND is_active = true
  `, [tenantId]);

  for (const vehicle of expiringMOT) {
    await sendComplianceAlert({
      tenantId,
      type: 'mot_expiry',
      subject: `MOT Expiring: ${vehicle.registration}`,
      message: `MOT for vehicle ${vehicle.registration} expires on ${vehicle.mot_expiry}`,
      severity: 'critical'
    });
  }

  // Check insurance expiring
  const expiringInsurance = await query(`
    SELECT vehicle_id, registration, insurance_expiry
    FROM tenant_vehicles
    WHERE tenant_id = $1
      AND insurance_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND is_active = true
  `, [tenantId]);

  for (const vehicle of expiringInsurance) {
    await sendComplianceAlert({
      tenantId,
      type: 'insurance_expiry',
      subject: `Insurance Expiring: ${vehicle.registration}`,
      message: `Insurance for vehicle ${vehicle.registration} expires on ${vehicle.insurance_expiry}`,
      severity: 'critical'
    });
  }
}

// Store alerts in database
async function sendComplianceAlert(alert: {
  tenantId: number;
  type: string;
  subject: string;
  message: string;
  severity: string;
}) {
  // Insert into alerts table
  await query(`
    INSERT INTO tenant_compliance_alerts (
      tenant_id, alert_type, subject, message, severity, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
  `, [alert.tenantId, alert.type, alert.subject, alert.message, alert.severity]);

  // Send email to tenant admins
  const admins = await query(`
    SELECT email FROM tenant_users
    WHERE tenant_id = $1 AND role IN ('admin', 'manager') AND is_active = true
  `, [alert.tenantId]);

  for (const admin of admins) {
    // Use notification service to send email
    await sendEmail({
      to: admin.email,
      subject: `[COMPLIANCE] ${alert.subject}`,
      body: alert.message
    });
  }
}
```

**Database Schema:**
```sql
CREATE TABLE tenant_compliance_alerts (
  alert_id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(tenant_id),
  alert_type VARCHAR(50), -- 'dbs_expiry', 'permit_expiry', 'mot_expiry', etc.
  subject VARCHAR(255),
  message TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_alerts ON tenant_compliance_alerts(tenant_id, is_resolved, created_at DESC);
```

**Dependencies:**
- node-cron

---

## 🟢 Nice-to-Have Features

### 7. Mobile App APIs
**Priority:** LOW (Strategic)
**Estimated Time:** 60-80 hours
**ROI:** ⭐⭐⭐⭐ (long-term)

Push notifications, offline mode, QR code check-in.

### 8. Customer Feedback & Rating System
**Priority:** LOW
**Estimated Time:** 15-20 hours
**ROI:** ⭐⭐⭐

Post-trip ratings, driver feedback, NPS tracking.

### 9. Calendar Integration
**Priority:** LOW
**Estimated Time:** 20-30 hours
**ROI:** ⭐⭐

Google Calendar, Outlook sync, iCal export.

### 10. Automated Schedule Generation (AI)
**Priority:** LOW (Strategic)
**Estimated Time:** 60-80 hours
**ROI:** ⭐⭐⭐⭐ (long-term)

ML-based schedule optimization, auto-assign drivers.

---

## 📊 Priority Matrix

| Feature | Impact | Effort | ROI | When |
|---------|--------|--------|-----|------|
| Real-time Tracking | Very High | High | ⭐⭐⭐⭐⭐ | Phase 2 |
| SMS/Email Notifications | Very High | Low | ⭐⭐⭐⭐⭐ | Phase 1 (Quick Win) |
| Payment Gateway | Very High | High | ⭐⭐⭐⭐⭐ | Phase 2 |
| Compliance Monitoring | High | Low | ⭐⭐⭐⭐ | Phase 1 (Quick Win) |
| Route Optimization | Medium | High | ⭐⭐⭐ | Phase 3 |
| Reporting/Analytics | Medium | Medium | ⭐⭐⭐ | Phase 2 |
| Feedback System | Medium | Low | ⭐⭐⭐ | Phase 2 |
| Calendar Sync | Low | Medium | ⭐⭐ | Phase 4 |
| Mobile App | High | Very High | ⭐⭐⭐⭐ | Phase 3-4 |
| Auto-Scheduling AI | High | Very High | ⭐⭐⭐⭐ | Phase 4 |

---

## 🎯 Recommended Implementation Timeline

### Phase 1: Quick Wins (4-6 weeks) - After Current Fixes
1. SMS/Email notifications (Twilio + SendGrid) - 3 weeks
2. Compliance monitoring cron jobs - 1 week
3. Trip feedback/rating system - 1 week
4. Manual payment tracking - 1 week

**Total:** ~6 weeks
**Cost:** Notification services ($0-50/month per tenant)

### Phase 2: Revenue Impact (6-8 weeks)
5. Payment gateway (Stripe Connect) - 6 weeks
6. Real-time trip tracking (WebSocket) - 6 weeks
7. Reporting & export features - 3 weeks

**Total:** ~15 weeks
**Cost:** Stripe fees (2.9% + 20p per transaction)

### Phase 3: Strategic (3-6 months)
8. Mobile app development - 3 months
9. Route optimization engine - 2 months
10. Automated scheduling AI - 2 months

---

## 💰 Cost Estimates

### Infrastructure Costs (per tenant)
- **Twilio SMS:** ~£0.0075 per message
- **SendGrid Email:** Free (100/day), then £15/month
- **Google Maps API:** £5 per 1000 requests
- **Stripe Connect:** 2.9% + 20p per transaction
- **WebSocket Server:** Covered by existing infrastructure

### Development Costs
- **Quick Wins (Phase 1):** 4-6 weeks
- **Revenue Features (Phase 2):** 15 weeks
- **Strategic (Phase 3):** 7 months

---

## 🚫 Current Focus: Technical Improvements FIRST

**DO NOT implement these features until:**
1. ✅ Input sanitization complete (all modules)
2. ✅ Performance optimization complete (N+1 queries fixed)
3. ✅ Caching layer implemented
4. ✅ Response format standardized
5. ✅ System deployed to production

**Estimated time for current fixes:** 30-93 hours (depending on option chosen)

---

## 📝 Notes

- All features consider multi-tenant architecture
- Encryption required for tenant-specific credentials
- Each tenant can enable/disable features independently
- Cost structure should be passed to tenants (or built into subscription tiers)
- Features requiring external APIs need per-tenant configuration

**Status:** DEFERRED - Complete technical improvements first
**Next Review:** After production deployment

