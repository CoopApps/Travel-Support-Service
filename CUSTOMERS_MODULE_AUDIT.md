# Customers Module Audit

**Date:** November 11, 2025
**Status:** ⚠️ CRITICAL SYNC ISSUES FOUND

## Executive Summary

The Customers module has **critical database sync issues** where the frontend is using fields that don't exist in the database schema. Several features are implemented but need schema updates.

---

## 1. Backend API Endpoints ✅

### Core CRUD Operations
- ✅ `GET /api/tenants/:tenantId/customers/stats` - Dashboard statistics
- ✅ `GET /api/tenants/:tenantId/customers` - List with pagination, search, filtering
- ✅ `GET /api/tenants/:tenantId/customers/:customerId` - Get single customer
- ✅ `POST /api/tenants/:tenantId/customers` - Create customer
- ✅ `PUT /api/tenants/:tenantId/customers/:customerId` - Update customer
- ✅ `DELETE /api/tenants/:tenantId/customers/:customerId` - Soft delete

### Login Management
- ✅ `POST /api/tenants/:tenantId/customers/:customerId/enable-login` - Enable portal access
- ✅ `POST /api/tenants/:tenantId/customers/:customerId/disable-login` - Disable portal
- ✅ `POST /api/tenants/:tenantId/customers/:customerId/reset-password` - Reset password
- ✅ `GET /api/tenants/:tenantId/customers/:customerId/login-details` - Get login info
- ✅ `PUT /api/tenants/:tenantId/customers/:customerId/update-username` - Update username

### Additional Features
From the 1022-line routes file, likely includes:
- Schedule management endpoints
- Times management endpoints
- Assessment endpoints
- Payment split endpoints

**Status:** ✅ **WELL IMPLEMENTED** - Comprehensive API coverage

---

## 2. Frontend Components ✅

### Main Components
- ✅ `CustomerListPage.tsx` - Main list view with search, pagination
- ✅ `CustomerFormModal.tsx` - Create/Edit modal
- ✅ `CustomerStats.tsx` - Statistics cards
- ✅ `AssessmentModal.tsx` - Customer assessment features
- ✅ `LoginManagementModal.tsx` - Portal login management
- ✅ `ScheduleManagementModal.tsx` - Weekly schedule configuration
- ✅ `TimesManagementModal.tsx` - Pickup/dropoff times
- ✅ `LoginStatusDisplay.tsx` - Visual login status indicator
- ✅ `PaymentStructureDisplay.tsx` - Payment split visualization
- ✅ `WeeklyScheduleDisplay.tsx` - Weekly schedule grid

**Status:** ✅ **COMPREHENSIVE** - All major features have UI components

---

## 3. Database Schema vs Frontend ❌

### ❌ CRITICAL: Missing Database Fields

The **CustomerFormModal.tsx** uses these fields that **DON'T EXIST** in `tenant_customers` table:

```typescript
// Frontend (CustomerFormModal.tsx lines 42-43, 98-99, 611-649)
reminder_opt_in: true,           // ❌ NOT IN DATABASE
reminder_preference: 'sms',       // ❌ NOT IN DATABASE
```

### Existing Database Fields ✅

```sql
-- Core Information
customer_id INTEGER PRIMARY KEY
tenant_id INTEGER
name VARCHAR(200) NOT NULL
address TEXT
address_line_2 VARCHAR(255)
city VARCHAR(100)
county VARCHAR(100)
postcode VARCHAR(20)
phone VARCHAR(50)
email VARCHAR(255)
paying_org VARCHAR(100)

-- Payment
has_split_payment BOOLEAN DEFAULT false
payment_split JSONB
provider_split JSONB
default_price DECIMAL(10,2) DEFAULT 15.00

-- Schedule & Availability
schedule JSONB
availability_calendar JSONB
holidays JSONB

-- Medical & Accessibility
emergency_contact_name VARCHAR(200)
emergency_contact_phone VARCHAR(50)
medical_notes TEXT
medication_notes TEXT
mobility_requirements TEXT
special_requirements TEXT
medical_info JSONB
accessibility_needs JSONB
driver_notes TEXT

-- Social Features
social_preferences JSONB
outing_history JSONB
journey_history JSONB

-- Login & Portal
is_login_enabled BOOLEAN DEFAULT false
user_id INTEGER
communication_preferences JSONB

-- Invoicing
invoice_day INTEGER
invoice_email VARCHAR(255)
auto_send_invoice BOOLEAN DEFAULT false

-- Status & Audit
is_active BOOLEAN DEFAULT true
customer_status VARCHAR(50) DEFAULT 'active'
notes TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### ❌ Fields Used in Frontend but Missing in Database

```sql
-- MISSING FIELDS (used in reminder system)
reminder_opt_in BOOLEAN         -- Used in CustomerFormModal.tsx
reminder_preference VARCHAR(20)  -- Used in CustomerFormModal.tsx
```

**Status:** ❌ **OUT OF SYNC** - Critical fields missing

---

## 4. TypeScript Type Definitions ⚠️

### Backend Types (`customer.types.ts`)

**Missing Fields:**
```typescript
export interface Customer {
  // ... existing fields ...

  // ❌ MISSING:
  reminder_opt_in?: boolean;
  reminder_preference?: 'sms' | 'email' | 'both' | 'none';
}

export interface CreateCustomerDto {
  // ... existing fields ...

  // ❌ MISSING:
  reminder_opt_in?: boolean;
  reminder_preference?: 'sms' | 'email' | 'both' | 'none';
}
```

**Existing Types:**
- ✅ Core customer fields
- ✅ Provider/Payment splits
- ✅ CustomerSchedule interface
- ✅ DaySchedule with enhanced fields
- ✅ No-show tracking fields
- ✅ Query/Response interfaces

**Status:** ⚠️ **INCOMPLETE** - Missing reminder fields

---

## 5. Features Inventory

### ✅ Fully Implemented Features

1. **Customer CRUD**
   - Create, Read, Update, Delete (soft delete)
   - Search and filtering
   - Pagination

2. **Weekly Schedule Management**
   - Day-by-day destination configuration
   - Pickup/dropoff times
   - Per-day pricing
   - Enhanced schedule (outbound/return)

3. **Payment Management**
   - Split payment configuration
   - Provider splits
   - Multiple payment types

4. **Portal Login Management**
   - Enable/disable customer portal access
   - Username management
   - Password reset
   - Login history tracking

5. **Medical & Accessibility**
   - Medical notes
   - Medication notes
   - Mobility requirements
   - Emergency contacts
   - Accessibility needs (JSON)

6. **Assessment System**
   - Customer assessments
   - Risk evaluation
   - Capability tracking

7. **Social Outings**
   - Social preferences
   - Outing history
   - Booking tracking

8. **Invoicing**
   - Invoice schedule
   - Auto-send configuration
   - Invoice email

9. **No-Show Tracking**
   - No-show count
   - Reliability percentage
   - Last no-show date
   - Completed trips tracking

### ⚠️ Partially Implemented Features

10. **Reminder System** ⚠️
    - **Frontend:** ✅ UI implemented (opt-in checkbox, preference dropdown)
    - **Backend:** ✅ API exists (`reminderService.ts`, `reminder.routes.ts`)
    - **Database:** ❌ Fields missing from `tenant_customers` table
    - **Types:** ❌ Not in TypeScript interfaces
    - **Status:** BLOCKED - Needs database migration

---

## 6. Critical Issues 🚨

### Issue #1: Reminder Fields Not in Database ❌
**Severity:** HIGH
**Impact:** Frontend trying to save fields that don't exist

**Location:**
- Frontend: `CustomerFormModal.tsx` lines 42-43, 98-99, 611-649
- Database: `tenant_customers` table MISSING these columns

**Fields Needed:**
```sql
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(20) DEFAULT 'sms'
  CHECK (reminder_preference IN ('sms', 'email', 'both', 'none'));
```

**Fix Required:**
1. Create database migration to add fields
2. Update `customer.types.ts` to include fields
3. Update backend validation schemas
4. Test frontend save/load functionality

### Issue #2: Type Definition Mismatch ⚠️
**Severity:** MEDIUM
**Impact:** TypeScript compilation may allow invalid data

**Missing from Types:**
- `reminder_opt_in`
- `reminder_preference`

**Fix Required:**
Update `backend/src/types/customer.types.ts`

### Issue #3: Schedule Times Stat Not Implemented ⚠️
**Severity:** LOW
**Impact:** Dashboard stats incomplete

**Location:**
- `customer.routes.ts` line 72: `const withTimes = 0; // TODO: Implement schedule time analysis`

**Fix Required:**
Implement schedule JSON parsing to count customers with pickup/dropoff times set

---

## 7. Data Flow Analysis

### Create Customer Flow
```
Frontend (CustomerFormModal)
  ↓ POST /api/tenants/:tenantId/customers
  ↓ Validation (createCustomerSchema)
  ↓ Sanitization
  ↓ INSERT INTO tenant_customers
  ↓ Response with customer_id
  ↓ Frontend refresh
```

**Issues:**
- ❌ Frontend sends `reminder_opt_in` and `reminder_preference`
- ❌ Backend may ignore these fields (not in validation schema)
- ❌ Database columns don't exist - data lost

### Update Customer Flow
```
Frontend (CustomerFormModal)
  ↓ PUT /api/tenants/:tenantId/customers/:customerId
  ↓ Validation (updateCustomerSchema)
  ↓ Sanitization
  ↓ UPDATE tenant_customers SET ...
  ↓ Response
  ↓ Frontend refresh
```

**Issues:** Same as create flow

---

## 8. Recommendations

### 🔴 Priority 1: IMMEDIATE (Blocking Production)

1. **Add Reminder Fields to Database**
   ```sql
   -- Create migration file: add-reminder-fields-to-customers.sql
   ALTER TABLE tenant_customers
   ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true,
   ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(20) DEFAULT 'sms'
     CHECK (reminder_preference IN ('sms', 'email', 'both', 'none'));

   CREATE INDEX idx_tenant_customers_reminder ON tenant_customers(tenant_id, reminder_opt_in)
     WHERE reminder_opt_in = true;
   ```

2. **Update TypeScript Types**
   - Add fields to `Customer` interface
   - Add fields to `CreateCustomerDto`
   - Add fields to `UpdateCustomerDto`

3. **Update Validation Schemas**
   - Add to `createCustomerSchema`
   - Add to `updateCustomerSchema`

### 🟡 Priority 2: IMPORTANT (Feature Completion)

4. **Implement Schedule Times Stat**
   - Parse schedule JSON in stats endpoint
   - Count customers with pickup_time or drop_off_time set

5. **Add Reminder Fields to Customer List Response**
   - Ensure GET /customers includes reminder fields
   - Verify serialization works correctly

### 🟢 Priority 3: ENHANCEMENT (Nice to Have)

6. **Add Database Indexes**
   - Index reminder fields for faster queries
   - Optimize schedule JSON queries with GIN indexes (already exist)

7. **Add Migration Tests**
   - Test reminder fields default values
   - Test data integrity with existing customers

8. **Documentation**
   - Update API docs with reminder fields
   - Add examples for reminder preferences
   - Document opt-in/opt-out flow

---

## 9. Testing Checklist

### Backend Testing
- [ ] Create customer with reminder fields
- [ ] Update customer reminder preferences
- [ ] Get customer includes reminder fields
- [ ] List customers filters by reminder_opt_in
- [ ] Validation rejects invalid reminder_preference values
- [ ] Migration runs successfully on existing data
- [ ] Indexes created correctly

### Frontend Testing
- [ ] Checkbox for reminder opt-in displays correctly
- [ ] Dropdown for reminder preference shows correct options
- [ ] Default values (opt-in=true, preference='sms') work
- [ ] Save customer persists reminder preferences
- [ ] Edit customer loads reminder preferences correctly
- [ ] Opt-out (reminder_opt_in=false) hides preference dropdown

### Integration Testing
- [ ] Create customer → Send reminder → Verify opt-in status checked
- [ ] Update preference → Send reminder → Verify correct method used
- [ ] Opt-out customer → Send reminder → Verify reminder skipped
- [ ] Dashboard stats reflect opt-in/opt-out correctly

---

## 10. Database Migration Script

**File:** `backend/migrations/add-reminder-fields-to-customers.sql`

```sql
-- Add reminder fields to tenant_customers table
-- Required for SMS/Email reminder system

BEGIN;

-- Add columns
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(20) DEFAULT 'sms';

-- Add constraint
ALTER TABLE tenant_customers
ADD CONSTRAINT check_reminder_preference
  CHECK (reminder_preference IN ('sms', 'email', 'both', 'none'));

-- Add index for reminder queries
CREATE INDEX IF NOT EXISTS idx_tenant_customers_reminder
  ON tenant_customers(tenant_id, reminder_opt_in)
  WHERE reminder_opt_in = true;

-- Set default values for existing customers
UPDATE tenant_customers
SET
  reminder_opt_in = true,
  reminder_preference = 'sms'
WHERE reminder_opt_in IS NULL;

COMMIT;

-- Verify migration
SELECT
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE reminder_opt_in = true) as opted_in,
  COUNT(*) FILTER (WHERE reminder_opt_in = false) as opted_out,
  COUNT(*) FILTER (WHERE reminder_preference = 'sms') as prefer_sms,
  COUNT(*) FILTER (WHERE reminder_preference = 'email') as prefer_email
FROM tenant_customers
WHERE is_active = true;
```

---

## 11. Summary

### Overall Status: ⚠️ NEEDS ATTENTION

**Strengths:**
- ✅ Comprehensive API coverage (1022 lines of routes)
- ✅ Well-structured frontend components
- ✅ Rich feature set (login, schedule, payments, assessments)
- ✅ Good separation of concerns
- ✅ Proper validation and sanitization

**Critical Issues:**
- ❌ Database schema missing reminder fields
- ❌ Type definitions incomplete
- ⚠️ Frontend/backend sync broken for reminders

**Action Required:**
1. Run database migration (Priority 1)
2. Update TypeScript types (Priority 1)
3. Test reminder functionality end-to-end (Priority 1)
4. Implement schedule times stat (Priority 2)

**Estimated Fix Time:** 30-45 minutes

**Risk Level:** MEDIUM
- App will function without reminders
- Reminder data currently being lost/ignored
- No crashes expected
- User expectations may not be met

---

## Appendix: Quick Fix Commands

```bash
# 1. Create migration file
cd backend/migrations
touch add-reminder-fields-to-customers.sql
# (paste SQL from section 10)

# 2. Run migration
psql $DATABASE_URL -f add-reminder-fields-to-customers.sql

# 3. Update types
# Edit backend/src/types/customer.types.ts
# Add reminder_opt_in and reminder_preference to interfaces

# 4. Rebuild and deploy
npm run build
git add .
git commit -m "Add reminder fields to customers table"
git push
```
