# Schedule Module Improvements - Implementation Plan

## Priority 1: Quick Wins (Implement First) 🚀

### 1. **Automatic Return Journey Creation** ⭐⭐⭐
**Status:** Customer schema ready, needs UI integration
**Complexity:** LOW
**Time Estimate:** 2-3 hours
**Implementation:**
- Add checkbox to TripFormModal: "Create return journey"
- Check customer's regular schedule for `return_time`
- Auto-populate return time field
- On submit, create both outbound + return trips in one call

**Files to modify:**
- `frontend/src/components/schedules/TripFormModal.tsx`
- `backend/src/routes/trip.routes.ts` (bulk create already exists)

---

### 2. **Weekly Schedule Copy** ⭐⭐⭐
**Status:** Partially exists (generate-from-schedules), needs UI
**Complexity:** LOW
**Time Estimate:** 3-4 hours
**Implementation:**
- Add "Copy Week" button to Schedules page
- Modal: Select source week → target week
- Options: Include regular trips only / Include ad-hoc
- Call existing `/generate-from-schedules` or create new `/copy-week` endpoint

**Files to modify:**
- `frontend/src/components/schedules/SchedulePage.tsx` - Add button
- Create `frontend/src/components/schedules/CopyWeekModal.tsx`
- `backend/src/routes/trip.routes.ts` - New endpoint or enhance existing

---

### 3. **Customer No-Show Tracking** ⭐⭐
**Status:** Needs full implementation
**Complexity:** MEDIUM
**Time Estimate:** 4-5 hours
**Implementation:**
- Add `no_show_count` and `total_trips_completed` to customer record
- Track when trips marked as "no_show" status
- Calculate reliability percentage
- Display in customer details and trip form

**Database changes:**
```sql
ALTER TABLE tenant_customers
ADD COLUMN no_show_count INTEGER DEFAULT 0,
ADD COLUMN total_completed_trips INTEGER DEFAULT 0,
ADD COLUMN reliability_percentage DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN last_no_show_date DATE;
```

**Files to create/modify:**
- Database migration file
- `backend/src/routes/customer.routes.ts` - Add reliability endpoint
- `frontend/src/components/schedules/TripFormModal.tsx` - Show warning if low reliability
- `frontend/src/components/customers/CustomerDetailsModal.tsx` - Show stats

---

## Priority 2: Revenue & Operations 💰

### 4. **Unused Vehicle Capacity Alerts** ⭐⭐
**Status:** Needs design + implementation
**Complexity:** MEDIUM
**Time Estimate:** 5-6 hours
**Implementation:**

**UI Integration Options:**
- **Option A:** Alert banner in Schedules grid showing underutilized trips
- **Option B:** "Revenue Opportunities" panel in Analytics tab
- **Option C:** Smart notification when creating/viewing trips

**Recommended: Option A + C**

Create alert component:
```tsx
<UnusedCapacityAlert trip={trip}>
  🚨 This 7-seater has 5 empty seats!
  Potential revenue: +£45
  [View Matches (3)]
</UnusedCapacityAlert>
```

**Files to create:**
- `frontend/src/components/schedules/UnusedCapacityAlert.tsx`
- `backend/src/routes/trip.routes.ts` - Add `/analyze-capacity` endpoint
- Integrate into ScheduledTripsGrid.tsx

---

### 5. **Schedule Efficiency Report** ⭐⭐
**Status:** Needs implementation
**Complexity:** MEDIUM
**Time Estimate:** 4-5 hours
**Implementation:**
- New tab in Analytics Dashboard: "Efficiency"
- Calculate metrics:
  - Average vehicle occupancy
  - Empty miles driven
  - Missed carpooling opportunities
  - Cost savings potential

**Files to create:**
- `frontend/src/components/schedules/EfficiencyReport.tsx`
- `backend/src/routes/analytics.routes.ts` - Add `/schedule-efficiency` endpoint

---

## Priority 3: Enhanced Features 🎯

### 6. **Enhanced Conflict Detection** ⭐⭐
**Status:** Basic exists, needs enhancements
**Complexity:** MEDIUM-HIGH
**Time Estimate:** 6-8 hours
**Implementation:**

**Database changes:**
```sql
-- Add customer preferences
ALTER TABLE tenant_customers
ADD COLUMN preferred_driver_gender VARCHAR(10),
ADD COLUMN preferred_driver_ids INTEGER[],
ADD COLUMN accessibility_requirements TEXT[];

-- Add driver hours tracking
ALTER TABLE tenant_drivers
ADD COLUMN max_daily_hours DECIMAL(4,2) DEFAULT 8.0,
ADD COLUMN max_weekly_hours DECIMAL(4,2) DEFAULT 40.0;
```

**New conflict checks:**
- ✅ Vehicle MOT expiry
- ✅ Driver hours limits (daily/weekly)
- ✅ Customer gender preferences
- ✅ Driver regular customer matching
- ✅ Accessibility requirements vs vehicle capabilities

**Files to modify:**
- `backend/src/routes/trip.routes.ts` - Enhance `/check-conflicts`
- `frontend/src/components/schedules/TripFormModal.tsx` - Display new conflicts
- Database migrations

---

### 7. **Smart Driver Assignment** ⭐⭐
**Status:** Needs full implementation
**Complexity:** HIGH
**Time Estimate:** 8-10 hours
**Implementation:**

**Algorithm factors:**
- Driver proximity to pickup location
- Driver's existing schedule density
- Vehicle type match (wheelchair, capacity)
- Driver-customer relationship history
- Driver performance scores

**UI:**
```
🤖 SMART ASSIGNMENT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Sarah Johnson ⭐⭐⭐⭐⭐ (Best Match)
   ✓ 2.3 miles away
   ✓ Wheelchair-accessible vehicle
   ✓ Has 45-min gap in schedule
   ✓ Regular customer familiarity

2. John Smith ⭐⭐⭐ (Good Match)
   ✓ 4.1 miles away
   ✓ Suitable vehicle
   ⚠ Tight schedule (might be late)

3. Mike Brown ⭐⭐ (Fair Match)
   ⚠ 8.7 miles away
   ⚠ Already at capacity
```

**Files to create:**
- `backend/src/services/driverAssignment.service.ts` - Scoring algorithm
- `backend/src/routes/trip.routes.ts` - Add `/suggest-drivers` endpoint
- `frontend/src/components/schedules/DriverSuggestions.tsx`
- Integrate into TripFormModal

---

### 8. **Unassigned Customers Panel** ⭐⭐
**Status:** Needs implementation
**Complexity:** MEDIUM
**Time Estimate:** 4-5 hours
**Implementation:**

Add panel to bottom of Schedules page:
```
📋 UNASSIGNED TRIPS TODAY (Monday 11 Nov)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
09:00 | Mary Smith → Hospital | ♿ Wheelchair
       [Assign Driver ▼] [Create Trip]

10:30 | Tom Jones → Shopping Centre
       [Assign Driver ▼] [Create Trip]

🤖 3 more customers from regular schedules
    [Auto-Generate All]
```

**Files to create:**
- `frontend/src/components/schedules/UnassignedTripsPanel.tsx`
- `backend/src/routes/trip.routes.ts` - Add `/unassigned-customers` endpoint

---

## Priority 4: Advanced Features 🚀

### 9. **SMS/Email Reminder System** ⭐⭐⭐
**Status:** Needs full implementation
**Complexity:** HIGH (requires external service integration)
**Time Estimate:** 10-12 hours
**Implementation:**

**Service Options:**
- **Twilio** (SMS): $0.01/message, very reliable
- **SendGrid** (Email): Free tier 100/day
- **AWS SNS**: Pay-as-you-go

**Architecture:**
```
┌─────────────────┐
│ Cron Job        │──> Runs daily at 6pm
│ (node-cron)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Find trips      │──> WHERE trip_date = tomorrow
│ for tomorrow    │    AND customer has phone/email
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send reminders  │──> Twilio/SendGrid API
│ via queue       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log sent        │──> Store in reminders table
│ reminders       │
└─────────────────┘
```

**Database schema:**
```sql
CREATE TABLE tenant_trip_reminders (
  reminder_id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(tenant_id),
  trip_id INTEGER REFERENCES tenant_trips(trip_id),
  customer_id INTEGER,
  sent_at TIMESTAMP NOT NULL,
  method VARCHAR(10) NOT NULL, -- 'sms' or 'email'
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'delivered'
  message_id VARCHAR(255),
  error_message TEXT
);
```

**Files to create:**
- `backend/src/services/reminderScheduler.ts` - Already exists! Just needs Twilio integration
- `backend/src/services/smsService.ts` - Twilio wrapper
- `backend/src/services/emailService.ts` - SendGrid wrapper
- `backend/src/routes/settings.routes.ts` - Configure API keys
- `frontend/src/components/settings/ReminderSettings.tsx` - UI to enable/disable

**Customer Message Integration:**
- Replies to SMS go to Twilio webhook → store in `tenant_customer_messages`
- Display in existing customer messages module

---

### 10. **Customer Self-Service Portal** ⭐⭐⭐
**Status:** Needs full implementation
**Complexity:** VERY HIGH
**Time Estimate:** 15-20 hours
**Implementation:**

**New customer-facing pages:**
```
/customer-portal (login page)
/customer-portal/dashboard (upcoming trips)
/customer-portal/request-trip (new trip request)
/customer-portal/history (past trips)
/customer-portal/profile (update details)
```

**Database changes:**
```sql
-- Already have customer login fields in customers table ✓
-- Need trip request table
CREATE TABLE tenant_trip_requests (
  request_id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  customer_id INTEGER,
  requested_date DATE,
  requested_time TIME,
  destination TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Files to create:**
- `frontend/src/pages/CustomerPortal.tsx`
- `frontend/src/pages/CustomerDashboard.tsx`
- `frontend/src/pages/CustomerTripRequest.tsx`
- `backend/src/routes/customer-portal.routes.ts`
- Admin page to review/approve requests

---

### 11. **Schedule Versioning/Undo** ⭐
**Status:** Needs full implementation
**Complexity:** HIGH
**Time Estimate:** 8-10 hours
**Implementation:**

**Database schema:**
```sql
CREATE TABLE tenant_trip_audit_log (
  audit_id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  trip_id INTEGER,
  action VARCHAR(20), -- 'created', 'updated', 'deleted'
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT NOW(),
  before_data JSONB,
  after_data JSONB
);
```

**UI:**
```
⏪ UNDO Available
Last action: Deleted 5 trips (2 minutes ago)
[Undo] [Dismiss]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 CHANGE HISTORY (Last 7 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Today 14:35 | John deleted 5 trips
Today 10:23 | Sarah updated trip #245
Yesterday | Mary created 12 trips
```

**Files to create:**
- `backend/src/middleware/auditLog.ts` - Automatic logging
- `backend/src/routes/trip-audit.routes.ts` - History + undo endpoints
- `frontend/src/components/schedules/UndoBar.tsx`
- `frontend/src/components/schedules/ChangeHistoryModal.tsx`

---

## Implementation Timeline

### Week 1: Quick Wins
- Day 1-2: Automatic return journey creation
- Day 3-4: Weekly schedule copy
- Day 5: Customer no-show tracking

### Week 2: Revenue Boosters
- Day 1-2: Unused capacity alerts
- Day 3-4: Schedule efficiency report
- Day 5: Testing & polish

### Week 3: Enhanced Features
- Day 1-3: Enhanced conflict detection
- Day 4-5: Smart driver assignment + unassigned panel

### Week 4: Advanced Features
- Day 1-3: SMS/Email reminders
- Day 4-5: Schedule versioning/undo

### Week 5-6: Customer Portal (if needed)
- Full implementation of self-service portal

---

## Quick Start: Implement First 3

Let's start with these three for maximum immediate impact:

1. **Automatic Return Journey** (2-3 hours) ✅
2. **Weekly Schedule Copy** (3-4 hours) ✅
3. **Customer No-Show Tracking** (4-5 hours) ✅

**Total: ~10 hours for huge operational improvement**

Would you like me to start implementing these three now?
