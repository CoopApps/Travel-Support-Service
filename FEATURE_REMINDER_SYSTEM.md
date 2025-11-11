# 📨 SMS/Email Reminder System - Feature Documentation

## Overview

The SMS/Email Reminder System sends automated reminders to customers before their scheduled trips. This feature is **OPTIONAL** and **DISABLED by default**, requiring explicit admin configuration and API credentials.

**Status:** ✅ Backend Complete | ⏳ Frontend UI Pending

**Implementation Date:** 2025-01-10

---

## ⚠️ IMPORTANT: Optional Feature

**This feature is OPTIONAL and DISABLED by default.**

Requirements before enabling:
1. Twilio account + API credentials (for SMS)
2. SendGrid account + API key (for email)
3. Admin must explicitly enable and configure
4. Customers can opt-out at any time

---

## What It Does

**Automated Reminders:**
- Sends SMS or Email reminders before trip pickup time
- Configurable timing (default: 60 minutes before)
- Template-based messages with trip details
- Respects customer opt-in/opt-out preferences

**Manual Reminders:**
- Operations staff can send reminders on-demand
- Test functionality before go-live
- View reminder history per trip

**Administration:**
- Enable/disable per tenant
- Configure Twilio or SendGrid credentials
- Customize message templates
- Set reminder timing
- Test connections before enabling

---

## Backend Implementation ✅ COMPLETE

### 1. Database Migration

**File:** `backend/src/migrations/add-reminder-system.sql` (300+ lines)

**Tables Created:**

**tenant_settings:**
- Key-value storage for tenant configuration
- Stores reminder settings, API credentials, templates
- Encrypted credential storage recommended

**reminder_history:**
- Tracks all sent reminders
- Stores delivery status and provider responses
- Enables audit trail and troubleshooting

**Fields Added to tenant_customers:**
- `reminder_opt_in` (boolean, default: true) - Customer opt-in status
- `reminder_preference` (varchar) - Preference: 'sms', 'email', 'both', 'none'

**Default Settings Inserted:**
- `reminder_enabled`: false (DISABLED by default)
- `reminder_type`: 'sms'
- `reminder_timing`: 60 (minutes)
- `reminder_template_sms`: Default SMS template with variables
- `reminder_template_email_subject`: Default email subject
- `reminder_template_email_body`: Default email HTML template

**To Run Migration:**
```bash
cd backend
psql -d your_database_name -f src/migrations/add-reminder-system.sql
```

---

### 2. Reminder Service

**File:** `backend/src/services/reminderService.ts` (450+ lines)

**Functions:**

**`getTenantReminderSettings(tenantId)`**
- Loads reminder configuration from database
- Returns null if reminders disabled
- Parses settings into typed object

**`sendTripReminder(tenantId, tripId)`**
- Main function to send reminder for a trip
- Checks if reminders enabled and customer opted in
- Sends via SMS, Email, or both based on settings
- Logs to reminder_history table
- Returns success/failure status

**`getUpcomingTripsForReminders(tenantId)`**
- Called by scheduled job (cron)
- Finds trips needing reminders in next X minutes
- Filters by customer opt-in
- Prevents duplicate reminders (checks history)

**`getTripReminderHistory(tenantId, tripId)`**
- Returns all reminders sent for a trip
- Shows delivery status and timestamps

**Template Variables:**
- `{{customer_name}}` - Customer full name
- `{{pickup_time}}` - Pickup time
- `{{pickup_location}}` - Pickup address
- `{{destination}}` - Destination address
- `{{trip_date}}` - Trip date
- `{{driver_name}}` - Driver name
- `{{driver_phone}}` - Driver phone number

**SMS Integration (Twilio):**
- API: `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
- Authentication: Basic Auth (SID + Auth Token)
- Returns: Message SID for tracking

**Email Integration (SendGrid):**
- API: `https://api.sendgrid.com/v3/mail/send`
- Authentication: Bearer token (API Key)
- Supports HTML templates
- Returns: Message ID in response headers

---

### 3. Reminder Routes

**File:** `backend/src/routes/reminder.routes.ts` (150+ lines)

**Endpoints:**

**POST `/api/tenants/:tenantId/reminders/send`**
- Send reminder manually for specific trip
- Body: `{ tripId: number }`
- Returns: Success status and delivery results

**GET `/api/tenants/:tenantId/reminders/history/:tripId`**
- Get all reminders sent for a trip
- Returns: Array of reminder history records

**GET `/api/tenants/:tenantId/reminders/settings`**
- Get current reminder configuration (safe - hides credentials)
- Returns: Enabled status, type, timing, template preview

**POST `/api/tenants/:tenantId/reminders/test`**
- Test reminder configuration
- Body: `{ type: 'sms' | 'email', recipient: string }`
- Note: Redirects to reminder-settings/test-connection

---

### 4. Reminder Settings Routes

**File:** `backend/src/routes/reminder-settings.routes.ts` (260+ lines)

**Endpoints:**

**GET `/api/tenants/:tenantId/reminder-settings`**
- Get all reminder settings for admin panel
- Returns: Settings object with credentials masked

**PUT `/api/tenants/:tenantId/reminder-settings`**
- Update reminder settings
- Body: Object with setting keys/values
- Validates credentials before enabling
- Upserts to tenant_settings table

**POST `/api/tenants/:tenantId/reminder-settings/test-connection`**
- Test Twilio or SendGrid connection
- Body: `{ type: 'twilio' | 'sendgrid' }`
- Makes real API call to validate credentials
- Returns: Connection status and account info

**DELETE `/api/tenants/:tenantId/reminder-settings/:key`**
- Delete specific setting (e.g., clear old API key)
- Use when changing providers

---

### 5. Server Registration ✅

Routes registered in `backend/src/server.ts`:
- Line 57-58: Import statements
- Line 231-232: Route registration

---

## Frontend Implementation ⏳ PENDING

### Required UI Components

**1. Reminder Settings Page (Admin Only)**

**Location:** `frontend/src/components/admin/ReminderSettingsPage.tsx`

**Requirements:**
- Toggle to enable/disable reminders (big ON/OFF switch)
- Dropdown to select reminder type: SMS, Email, Both
- Number input for reminder timing (minutes before pickup)
- Tabbed interface for SMS and Email configuration
- Test connection buttons for each provider
- Save button with validation

**SMS Tab:**
- Input: Twilio Account SID
- Input: Twilio Auth Token (password field)
- Input: Twilio Phone Number
- Textarea: SMS Template (with variable hints)
- Button: Test SMS Connection

**Email Tab:**
- Input: SendGrid API Key (password field)
- Input: From Email Address
- Input: From Name
- Textarea: Email Subject Template
- Rich text editor or textarea: Email Body Template (HTML)
- Button: Test Email Connection

**Template Editor:**
- Show available variables: {{customer_name}}, {{pickup_time}}, etc.
- Live preview with sample data
- Character count (SMS has 160 char limit)

**API Calls:**
- GET `/api/tenants/:tenantId/reminder-settings` - Load settings
- PUT `/api/tenants/:tenantId/reminder-settings` - Save settings
- POST `/api/tenants/:tenantId/reminder-settings/test-connection` - Test

---

**2. Customer Opt-In/Opt-Out Toggle**

**Location:** Modify `frontend/src/components/customers/CustomerFormModal.tsx`

**Requirements:**
- Add checkbox: "Send reminders for this customer"
- Default: Checked (opt-in by default)
- Add dropdown: Reminder preference (SMS, Email, Both, None)
- Save with customer data

**Database Field:** `reminder_opt_in`, `reminder_preference`

**API:** Update customer PATCH/PUT endpoints to accept these fields

---

**3. Send Reminder Button (Trip Modal)**

**Location:** Modify `frontend/src/components/schedules/TripFormModal.tsx`

**Requirements:**
- Show button only when editing existing trip (not creating new)
- Button: "📨 Send Reminder Now"
- Shows loading state while sending
- Displays success/error message
- Shows reminder history below button (expandable)

**API Calls:**
- POST `/api/tenants/:tenantId/reminders/send` with `{ tripId }`
- GET `/api/tenants/:tenantId/reminders/history/:tripId` - Show history

**Reminder History Display:**
- Table or list of sent reminders
- Columns: Type (SMS/Email), Recipient, Sent At, Status
- Color-coded status: Green (sent), Red (failed), Gray (pending)

---

**4. Settings Navigation**

**Location:** Add to admin navigation menu

**Requirements:**
- Add "Reminder Settings" link to admin sidebar/menu
- Icon: 📨 or bell icon
- Only visible to admin users
- Navigate to `/admin/reminder-settings`

---

## API Integration Examples

### Example 1: Load Reminder Settings

```typescript
// In ReminderSettingsPage.tsx
const loadSettings = async () => {
  const response = await fetch(
    `/api/tenants/${tenantId}/reminder-settings`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    setSettings(data.settings);
  }
};
```

### Example 2: Save Reminder Settings

```typescript
const saveSettings = async () => {
  const response = await fetch(
    `/api/tenants/${tenantId}/reminder-settings`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reminder_enabled: enabled,
        reminder_type: reminderType,
        reminder_timing: timing,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        twilio_phone_number: twilioPhone,
        sendgrid_api_key: sendgridKey,
        sendgrid_from_email: sendgridEmail,
        reminder_template_sms: smsTemplate
      })
    }
  );

  const data = await response.json();

  if (data.success) {
    alert('Settings saved successfully!');
  } else {
    alert('Error: ' + data.error);
  }
};
```

### Example 3: Test Connection

```typescript
const testTwilioConnection = async () => {
  setTesting(true);

  const response = await fetch(
    `/api/tenants/${tenantId}/reminder-settings/test-connection`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'twilio' })
    }
  );

  const data = await response.json();

  if (data.success) {
    alert(`✅ Connection successful!\nAccount: ${data.accountName}\nStatus: ${data.accountStatus}`);
  } else {
    alert(`❌ Connection failed: ${data.error}`);
  }

  setTesting(false);
};
```

### Example 4: Send Manual Reminder

```typescript
const sendReminder = async (tripId: number) => {
  setSending(true);

  const response = await fetch(
    `/api/tenants/${tenantId}/reminders/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tripId })
    }
  );

  const data = await response.json();

  if (data.success) {
    alert('✅ Reminder sent successfully!');
    // Refresh history
    loadReminderHistory();
  } else {
    alert(`❌ Failed to send: ${data.error}`);
  }

  setSending(false);
};
```

---

## Scheduled Reminders (Cron Job)

**Status:** ⏳ Not Implemented (Future Enhancement)

**Planned Implementation:**

**File:** `backend/src/services/reminderScheduler.ts`

```typescript
import cron from 'node-cron';
import { query } from '../config/database';
import { sendTripReminder, getUpcomingTripsForReminders } from './reminderService';
import { logger } from '../utils/logger';

// Run every 5 minutes
export function startReminderScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running scheduled reminder check');

    // Get all tenants with reminders enabled
    const tenants = await query(
      `SELECT DISTINCT tenant_id
       FROM tenant_settings
       WHERE setting_key = 'reminder_enabled'
         AND setting_value = 'true'`
    );

    for (const tenant of tenants) {
      try {
        // Get trips needing reminders
        const tripIds = await getUpcomingTripsForReminders(tenant.tenant_id);

        // Send reminder for each trip
        for (const tripId of tripIds) {
          await sendTripReminder(tenant.tenant_id, tripId);
        }

        if (tripIds.length > 0) {
          logger.info('Sent scheduled reminders', {
            tenantId: tenant.tenant_id,
            count: tripIds.length
          });
        }
      } catch (error) {
        logger.error('Error sending scheduled reminders', {
          tenantId: tenant.tenant_id,
          error
        });
      }
    }
  });

  logger.info('✅ Reminder scheduler started (runs every 5 minutes)');
}
```

**Register in server.ts:**
```typescript
import { startReminderScheduler } from './services/reminderScheduler';

// In startServer() function
startReminderScheduler();
```

**Required Package:**
```bash
npm install node-cron @types/node-cron
```

---

## Testing Guide

### Manual Testing Checklist

**Setup (Admin):**
- [ ] Navigate to Reminder Settings page
- [ ] Enter Twilio credentials (or SendGrid)
- [ ] Click "Test Connection" - verify success
- [ ] Customize message template
- [ ] Enable reminders
- [ ] Save settings

**Customer Opt-In:**
- [ ] Open customer profile
- [ ] Verify "Send reminders" checkbox visible
- [ ] Toggle checkbox on/off
- [ ] Save - verify saved correctly

**Manual Send (Operations Staff):**
- [ ] Open trip in Trip Form Modal (edit mode)
- [ ] Click "Send Reminder Now" button
- [ ] Verify success message appears
- [ ] Check customer phone/email for reminder
- [ ] View reminder history below button

**Automated Send (if scheduler enabled):**
- [ ] Create trip scheduled for X minutes from now
- [ ] Wait for scheduler to run
- [ ] Check reminder_history table for entry
- [ ] Verify customer received reminder

**Opt-Out Respect:**
- [ ] Set customer to opt-out
- [ ] Try manual send - verify blocked
- [ ] Verify automated sends skip this customer

---

## Configuration Reference

### Twilio Setup

1. Sign up at https://www.twilio.com
2. Get Account SID from dashboard
3. Get Auth Token from dashboard
4. Purchase a phone number (Messaging capable)
5. Enter credentials in Reminder Settings page

**Pricing:** ~$0.0075/SMS (varies by country)

### SendGrid Setup

1. Sign up at https://sendgrid.com
2. Create API Key with "Mail Send" permission
3. Verify sender email address
4. Enter credentials in Reminder Settings page

**Pricing:** Free tier: 100 emails/day, Paid: $15/month for 40k emails

---

## Security Considerations

### Credential Storage

**IMPORTANT:** API credentials are stored in plain text in `tenant_settings` table.

**Recommended Enhancements:**
1. Encrypt credentials before storing
2. Use environment variables for encryption key
3. Decrypt only when needed for API calls

**Example Encryption:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte key
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### Rate Limiting

**Twilio/SendGrid have rate limits:**
- Monitor API response headers
- Implement exponential backoff on failures
- Queue reminders if rate limit hit

---

## Troubleshooting

### Issue: "Reminders not configured"

**Cause:** Reminders disabled or credentials missing
**Fix:**
1. Check `tenant_settings` table for `reminder_enabled = 'true'`
2. Verify Twilio or SendGrid credentials present
3. Test connection via API endpoint

### Issue: "Customer has no phone number"

**Cause:** Customer record missing phone number
**Fix:**
1. Update customer record with phone number
2. Or switch to email reminders if email present

### Issue: Reminder sent but not received

**Possible Causes:**
1. **Invalid phone number format** - Use E.164 format (+1234567890)
2. **Unverified sender** - SendGrid requires verified sender email
3. **Blocked number** - Customer may have blocked sender
4. **Carrier filtering** - SMS marked as spam

**Debugging:**
1. Check `reminder_history` table for provider response
2. Check Twilio/SendGrid dashboard for delivery status
3. Look for error_message in reminder_history

### Issue: Duplicate reminders sent

**Cause:** Scheduler running multiple times or history check not working
**Fix:**
1. Verify only one scheduler instance running
2. Check history query in `getUpcomingTripsForReminders`
3. Add unique constraint on (trip_id, sent_at) to prevent duplicates

---

## Deployment Checklist

### Pre-Deployment

- [x] Database migration script created
- [x] Reminder service implemented
- [x] API routes created and registered
- [x] Backend builds successfully
- [ ] Frontend UI components created
- [ ] Settings page accessible to admins
- [ ] Customer opt-in/opt-out working
- [ ] Manual send working
- [ ] Credentials encrypted (recommended)
- [ ] Rate limiting implemented (recommended)

### Deployment Steps

1. **Run Migration:**
   ```bash
   psql -d your_database -f backend/src/migrations/add-reminder-system.sql
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   npm install
   npm run build
   pm2 restart travel-support-backend
   ```

3. **Deploy Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   # Deploy dist/ to production
   ```

4. **Configure Reminders (Admin):**
   - Navigate to Reminder Settings
   - Enter API credentials
   - Test connections
   - Customize templates
   - Enable reminders

5. **Enable Scheduler (Optional):**
   - Implement reminderScheduler.ts
   - Register in server.ts
   - Install node-cron
   - Monitor logs for execution

### Post-Deployment

- [ ] Test manual reminder send
- [ ] Verify credentials work
- [ ] Check reminder_history logs
- [ ] Monitor for delivery failures
- [ ] Collect user feedback
- [ ] Adjust templates as needed

---

## Summary

**✅ Backend Complete:**
- Database migration ready
- Reminder service with Twilio + SendGrid
- API routes for sending, history, settings
- Settings management endpoints
- Test connection functionality
- Template rendering with variables
- Audit logging via reminder_history

**⏳ Frontend Pending:**
- Reminder Settings page (admin UI)
- Customer opt-in/opt-out toggle
- Send reminder button in trip modal
- Reminder history display
- Navigation menu integration

**⏳ Future Enhancements:**
- Automated scheduler (cron job)
- Credential encryption
- Rate limiting
- Advanced template editor
- SMS/Email analytics dashboard
- Customer preference management
- Reply handling integration

**Status:** Backend production-ready. Frontend requires UI implementation.
**Estimated Frontend Work:** 4-6 hours for complete UI

---

**Documentation Complete:** Yes ✅
**Ready for Frontend Development:** Yes ✅
**Production Deployment:** Backend ready, frontend pending ✅
