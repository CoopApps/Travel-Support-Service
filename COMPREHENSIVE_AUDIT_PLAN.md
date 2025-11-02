# Comprehensive Application Audit Plan

A systematic checklist to verify every component and endpoint before deployment.

## 📋 Overview

Your app has **27 route modules** with hundreds of endpoints. We'll test each one systematically.

## 🎯 Audit Process

For each module, we'll verify:
1. ✅ Route file exists and loads
2. ✅ All endpoints are registered
3. ✅ Authentication works correctly
4. ✅ Database queries execute properly
5. ✅ Error handling works
6. ✅ Returns correct data structure
7. ✅ Multi-tenant isolation works

---

## 📊 Module Status Legend

- ⬜ **Not Started** - Haven't tested yet
- 🔄 **In Progress** - Currently testing
- ✅ **Complete** - All endpoints verified
- ⚠️ **Issues Found** - Needs fixes
- ❌ **Broken** - Critical issues

---

## 🗂️ Route Modules Inventory

### Core Authentication & Authorization
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Authentication | `auth.routes.ts` | ⬜ | 🔴 Critical | Login, Register, Token Refresh |
| Tenant Users | `tenant-users.routes.ts` | ⬜ | 🔴 Critical | User CRUD, Roles |
| Platform Admin | `platform-admin.routes.ts` | ⬜ | 🟡 High | Tenant management |
| Public Routes | `public.routes.ts` | ⬜ | 🟢 Low | Health checks |
| Tenant Settings | `tenant-settings.routes.ts` | ⬜ | 🟡 High | Settings CRUD |

### Core Business Operations
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Customers | `customer.routes.ts` | ⬜ | 🔴 Critical | Customer CRUD |
| Drivers | `driver.routes.ts` | ⬜ | 🔴 Critical | Driver CRUD |
| Trips | `trip.routes.ts` | ⬜ | 🔴 Critical | Trip scheduling, management |
| Vehicles | `vehicle.routes.ts` | ⬜ | 🔴 Critical | Vehicle CRUD |
| Maintenance | `maintenance.routes.ts` | ⬜ | 🟡 High | Vehicle maintenance |

### Dashboards & Reporting
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Dashboard | `dashboard.routes.ts` | ⬜ | 🟡 High | Main dashboard data |
| Customer Dashboard | `customer-dashboard.routes.ts` | ⬜ | 🟡 High | Customer view |
| Customer Dashboard Admin | `customer-dashboard-admin.routes.ts` | ⬜ | 🟡 High | Admin customer view |
| Driver Dashboard | `driver-dashboard.routes.ts` | ⬜ | 🟡 High | Driver view |
| Driver Dashboard Admin | `driver-dashboard-admin.routes.ts` | ⬜ | 🟡 High | Admin driver view |

### Financial Management
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Invoices | `invoice.routes.ts` | ⬜ | 🟡 High | Invoice generation, management |
| Payroll | `payroll.routes.ts` | ⬜ | 🟡 High | Payroll processing |
| Timesheets | `timesheet.routes.ts` | ⬜ | 🟡 High | Time tracking |
| Cost Centers | `cost-center.routes.ts` | ⬜ | 🟢 Medium | Cost allocation |

### HR & Compliance
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Training | `training-minimal.routes.ts` | ⬜ | 🟡 High | Training records |
| Safeguarding | `safeguarding.routes.ts` | ⬜ | 🟡 High | Compliance tracking |
| Permits | `permits.routes.ts` | ⬜ | 🟢 Medium | Permit management |
| Holidays | `holiday.routes.ts` | ⬜ | 🟢 Medium | Holiday requests |
| Office Staff | `office-staff.routes.ts` | ⬜ | 🟢 Medium | Staff management |

### Operations Support
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Social Outings | `social-outings.routes.ts` | ⬜ | 🟢 Medium | Group bookings |
| Providers | `providers.routes.ts` | ⬜ | 🟢 Medium | External providers |
| Fuel Cards | `fuelcard.routes.ts` | ⬜ | 🟢 Medium | Fuel management |
| Cooperative | `cooperative.routes.ts` | ⬜ | 🟢 Low | Cooperative features |

### Communication
| Module | File | Status | Priority | Endpoints |
|--------|------|--------|----------|-----------|
| Messages | `messages.routes.ts` | ⬜ | 🟢 Medium | Internal messaging |
| Driver Messages | `driver-messages.routes.ts` | ⬜ | 🟢 Medium | Driver comms |
| Driver Submissions | `driver-submissions.routes.ts` | ⬜ | 🟢 Medium | Driver forms |
| Feedback | `feedback.routes.ts` | ⬜ | 🟢 Low | User feedback |

---

## 🧪 Testing Methodology

### Phase 1: Critical Path (Week 1)
Test core functionality first:
1. Authentication (login, logout, token refresh)
2. Customer management (CRUD)
3. Driver management (CRUD)
4. Trip scheduling
5. Vehicle management
6. Basic dashboard

### Phase 2: Business Operations (Week 2)
7. Invoicing
8. Payroll
9. Timesheets
10. Maintenance tracking

### Phase 3: Supporting Features (Week 3)
11. Dashboards (all variants)
12. HR features (training, safeguarding)
13. Operations (social outings, providers)
14. Communication systems

### Phase 4: Admin & Settings (Week 4)
15. Platform admin
16. Tenant management
17. Settings
18. Reporting

---

## 📝 Testing Template for Each Module

Use this checklist for every route module:

### Module: [Name]
**File:** `[filename].routes.ts`
**Priority:** 🔴 Critical / 🟡 High / 🟢 Medium / ⚪ Low
**Date Tested:** [Date]
**Tested By:** [Name]

#### Endpoints Inventory
- [ ] Endpoint 1: `GET /api/tenants/:id/resource`
- [ ] Endpoint 2: `POST /api/tenants/:id/resource`
- [ ] Endpoint 3: `PUT /api/tenants/:id/resource/:id`
- [ ] Endpoint 4: `DELETE /api/tenants/:id/resource/:id`

#### Authentication Tests
- [ ] Requires valid JWT token
- [ ] Rejects invalid/expired tokens
- [ ] Rejects missing Authorization header
- [ ] Rejects tokens from different tenant

#### Functional Tests
- [ ] GET: Returns correct data
- [ ] POST: Creates new record
- [ ] PUT: Updates existing record
- [ ] DELETE: Soft deletes record (if applicable)
- [ ] Validates required fields
- [ ] Returns appropriate error messages

#### Database Tests
- [ ] Queries include `tenant_id` filter
- [ ] No cross-tenant data leakage
- [ ] Transactions rollback on error
- [ ] Connection pool doesn't leak

#### Error Handling
- [ ] Returns 400 for invalid input
- [ ] Returns 401 for auth failures
- [ ] Returns 404 for not found
- [ ] Returns 500 for server errors
- [ ] Error messages are helpful

#### Performance
- [ ] Response time < 500ms for simple queries
- [ ] No N+1 query problems
- [ ] Proper indexing on lookup fields

#### Issues Found
```
[Document any issues, bugs, or improvements needed]
```

#### Status
- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Issues (list above)
- ❌ Broken (critical fixes needed)

---

## 🔧 Testing Tools & Setup

### 1. Start the Server
```bash
cd "d:\projects\travel-support-app -test\conversion\backend"
npm run dev
```

### 2. Get Authentication Token
```bash
# Login to get token
curl -X POST http://localhost:3001/api/tenants/2/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@sheffieldtransport.co.uk\",\"password\":\"admin123\"}"

# Save the token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Test Endpoints
```bash
# Example: List customers
curl http://localhost:3001/api/tenants/2/customers \
  -H "Authorization: Bearer $TOKEN"

# Example: Create customer
curl -X POST http://localhost:3001/api/tenants/2/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"User\"}"
```

### 4. Use Postman/Insomnia (Recommended)
- Import collection
- Set environment variables
- Run tests systematically

---

## 🎯 Audit Schedule

### Week 1: Critical Components
**Days 1-2:** Authentication & User Management
- [ ] auth.routes.ts
- [ ] tenant-users.routes.ts
- [ ] platform-admin.routes.ts

**Days 3-4:** Core Operations
- [ ] customer.routes.ts
- [ ] driver.routes.ts
- [ ] vehicle.routes.ts

**Day 5:** Scheduling
- [ ] trip.routes.ts
- [ ] dashboard.routes.ts

### Week 2: Business Operations
**Days 1-2:** Financial
- [ ] invoice.routes.ts
- [ ] payroll.routes.ts
- [ ] timesheet.routes.ts

**Days 3-4:** Operations
- [ ] maintenance.routes.ts
- [ ] social-outings.routes.ts
- [ ] providers.routes.ts

**Day 5:** Dashboards
- [ ] All dashboard variants

### Week 3: Supporting Features
**Days 1-3:** HR & Compliance
- [ ] training-minimal.routes.ts
- [ ] safeguarding.routes.ts
- [ ] permits.routes.ts
- [ ] holidays.routes.ts

**Days 4-5:** Communication
- [ ] messages.routes.ts
- [ ] driver-messages.routes.ts
- [ ] feedback.routes.ts

### Week 4: Final Testing
**Days 1-2:** Integration testing
**Days 3-4:** Fix issues found
**Day 5:** Final verification

---

## 📊 Progress Tracking

Create a simple tracking sheet:

| Date | Module | Status | Issues | Time Spent |
|------|--------|--------|--------|------------|
| 2025-01-09 | auth.routes | 🔄 | None | 2h |
| 2025-01-09 | customer.routes | ✅ | Fixed validation | 1.5h |

---

## 🚨 Critical Issues Log

Track any blocking issues:

| Priority | Module | Issue | Impact | Status |
|----------|--------|-------|--------|--------|
| 🔴 | auth | Token expiry not working | Users logged out | Open |
| 🟡 | invoice | PDF generation slow | Performance | Fixed |

---

## ✅ Pre-Deployment Checklist

Before going live, verify:

### Functionality
- [ ] All 🔴 Critical modules tested and working
- [ ] All 🟡 High priority modules tested
- [ ] Authentication works end-to-end
- [ ] Multi-tenant isolation verified
- [ ] No cross-tenant data leakage

### Security
- [ ] All endpoints require authentication (except public)
- [ ] SQL injection prevention verified
- [ ] XSS prevention in place
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

### Performance
- [ ] No memory leaks detected
- [ ] Database queries optimized
- [ ] Response times acceptable
- [ ] Connection pooling working

### Data
- [ ] Database migrations run successfully
- [ ] Seed data loaded (if needed)
- [ ] Backup created

### Documentation
- [ ] All endpoints documented
- [ ] Known issues documented
- [ ] Deployment guide ready

---

## 🎬 Getting Started

1. **Start Today:** Begin with authentication module
2. **Use This Template:** Copy testing template for each module
3. **Track Progress:** Update status as you go
4. **Document Issues:** Log everything you find
5. **Fix Critical Issues:** Before moving to next module

Ready to start? Let's begin with the authentication module!
