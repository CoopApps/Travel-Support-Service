# Organization Types & Co-operative Features - Implementation Summary

## Overview

This implementation adds support for different organization types with varying discount tiers and co-operative governance features to the Travel Support App platform.

## Organization Types

### 1. **Charity / CIC / Third Sector** (0% discount)
- Standard pricing
- No governance requirements
- Standard feature set

### 2. **Co-operative** (30% discount)
- Requires:
  - Reporting of organizational structure
  - Regular meetings (tracked and documented)
  - Submission of governance reports
- Three co-operative models available:
  - **Worker Co-operative**: Owned by drivers
  - **Passenger Co-operative**: Owned by customers who employ drivers
  - **Hybrid Co-operative**: Both customers and drivers have ownership stake

### 3. **Co-operative Commonwealth** (50% discount - Future)
- For co-operatives that share services with other co-ops in the commonwealth family
- All requirements of standard co-operatives plus:
  - Service sharing commitment
  - Commonwealth reporting

## Database Changes

### New Fields Added to `tenants` Table:
- `organization_type` - Type of organization (charity, cic, third_sector, cooperative, cooperative_commonwealth)
- `cooperative_model` - For cooperatives: worker, passenger, or hybrid
- `discount_percentage` - Percentage discount (automatically set based on org type)
- `governance_requirements` - JSONB field with governance obligations
- `enabled_modules` - JSONB field defining which modules are enabled

### New Tables Created:

**1. `cooperative_meetings`**
- Tracks governance meetings
- Fields: meeting_type, scheduled_date, held_date, attendees_count, quorum_met, minutes_url

**2. `cooperative_reports`**
- Tracks required reporting submissions
- Types: annual, quarterly, structure, membership
- Fields: period_start, period_end, submitted_date, status, report_data

**3. `cooperative_membership`**
- Tracks membership and ownership structure
- Fields: member_type, ownership_shares, voting_rights, joined_date

### Database Trigger:
- Automatically sets discount_percentage and enabled_modules based on organization_type and cooperative_model
- Updates governance_requirements when organization type changes

## Backend Implementation

### Files Modified:
1. **`backend/src/types/tenant.types.ts`**
   - Added OrganizationType and CooperativeModel types
   - Extended Tenant interface with organization fields
   - Added co-operative governance interfaces

2. **`backend/src/routes/platform-admin.routes.ts`**
   - Updated tenant creation to include organization_type and cooperative_model
   - Updated tenant listing to return organization fields
   - Updated tenant update to handle new fields

### Files Created:
1. **`backend/migrations/add-organization-types.sql`**
   - Complete migration with tables, triggers, and views

2. **`backend/src/routes/cooperative.routes.ts`**
   - Full CRUD for cooperative meetings
   - Full CRUD for cooperative reports
   - Full CRUD for cooperative membership
   - Compliance overview endpoint

## Enabled Modules by Co-operative Type

### Worker Co-operative (Driver-Owned)
**Admin Modules:**
- Governance management
- Membership tracking
- Voting system
- Worker management tools

**Driver Dashboard:**
- Ownership dashboard
- Profit sharing information
- Voting rights interface

**Customer Dashboard:**
- Standard features only

### Passenger Co-operative (Customer-Owned)
**Admin Modules:**
- Governance management
- Membership tracking
- Voting system
- Customer management tools

**Driver Dashboard:**
- Standard features only

**Customer Dashboard:**
- Membership portal
- Voting rights interface
- Employment decision participation

### Hybrid Co-operative (Both Customer & Driver Owned)
**Admin Modules:**
- Governance management
- Membership tracking
- Voting system
- Hybrid management tools (both customer and driver)

**Driver Dashboard:**
- Ownership dashboard
- Profit sharing information
- Voting rights interface

**Customer Dashboard:**
- Membership portal
- Voting rights interface
- Employment decision participation

## API Endpoints

### Tenant Management (Platform Admin)
- `GET /api/platform-admin/tenants` - List all tenants (now includes organization fields)
- `POST /api/platform-admin/tenants` - Create tenant (with organization_type and cooperative_model)
- `PUT /api/platform-admin/tenants/:tenantId` - Update tenant (can change organization type)

### Co-operative Governance (Tenant Admin)

**Meetings:**
- `GET /api/tenants/:tenantId/cooperative/meetings` - List all meetings
- `POST /api/tenants/:tenantId/cooperative/meetings` - Schedule a meeting
- `PUT /api/tenants/:tenantId/cooperative/meetings/:meetingId` - Update meeting (record attendance)
- `DELETE /api/tenants/:tenantId/cooperative/meetings/:meetingId` - Delete meeting

**Reports:**
- `GET /api/tenants/:tenantId/cooperative/reports` - List all reports
- `POST /api/tenants/:tenantId/cooperative/reports` - Submit report
- `PUT /api/tenants/:tenantId/cooperative/reports/:reportId` - Update report status

**Membership:**
- `GET /api/tenants/:tenantId/cooperative/membership` - List all members with stats
- `POST /api/tenants/:tenantId/cooperative/membership` - Add member
- `PUT /api/tenants/:tenantId/cooperative/membership/:membershipId` - Update member
- `DELETE /api/tenants/:tenantId/cooperative/membership/:membershipId` - Remove member (soft delete)

**Overview:**
- `GET /api/tenants/:tenantId/cooperative/overview` - Get compliance status and statistics

## Migration Steps

1. **Run the migration:**
   ```bash
   psql -h localhost -U postgres -d travel_support_dev -f backend/migrations/add-organization-types.sql
   ```

2. **Verify tables created:**
   ```sql
   SELECT * FROM cooperative_overview;
   ```

3. **Test the trigger:**
   ```sql
   UPDATE tenants SET organization_type = 'cooperative', cooperative_model = 'worker' WHERE tenant_id = 1;
   SELECT organization_type, cooperative_model, discount_percentage, enabled_modules FROM tenants WHERE tenant_id = 1;
   ```

## Frontend Implementation (Next Steps)

### Platform Admin UI Components Needed:
1. **Tenant Creation Form Extension**
   - Add organization type dropdown
   - Conditional cooperative model dropdown
   - Display calculated discount
   - Show enabled modules preview

2. **Tenant Edit Form**
   - Same as creation form
   - Warning when changing organization type (affects pricing)

3. **Tenant List View**
   - Add organization type column
   - Add discount column
   - Filter by organization type

### Tenant Admin UI Components Needed:
1. **Co-operative Dashboard** (New page for co-ops only)
   - Compliance overview widget
   - Upcoming meetings
   - Pending reports
   - Membership statistics

2. **Meetings Management** (New page)
   - Calendar view of meetings
   - Schedule new meeting form
   - Record attendance and minutes

3. **Reports Management** (New page)
   - List of required reports
   - Submit report form
   - Report status tracking

4. **Membership Management** (New page)
   - Member list with ownership shares
   - Add/edit member form
   - Voting rights management

### Driver Dashboard Extensions (Worker/Hybrid Co-ops):
1. **Ownership Dashboard**
   - Ownership share information
   - Profit sharing calculations
   - Historical distributions

2. **Voting Interface**
   - Active votes/proposals
   - Vote submission
   - Vote history

### Customer Dashboard Extensions (Passenger/Hybrid Co-ops):
1. **Membership Portal**
   - Membership status
   - Ownership information
   - Benefits overview

2. **Voting Interface**
   - Active votes/proposals
   - Vote submission (including employment decisions)

## Governance Requirements & Compliance

### For Co-operatives (30% discount):
- **Meetings**: Minimum frequency based on bylaws (tracked in system)
- **Reports**:
  - Annual structure report
  - Quarterly membership report
  - Financial reports (if required)
- **Membership**: Active membership tracking required

### For Commonwealth Co-operatives (50% discount):
- All standard co-operative requirements plus:
- **Service Sharing**: Track services provided to other commonwealth co-ops
- **Commonwealth Reporting**: Additional reporting on commonwealth participation

## Discount Enforcement

The discount is automatically calculated and applied:
1. When creating a new tenant with organization_type
2. When updating existing tenant's organization_type
3. Via database trigger (cannot be manually overridden)

Platform admin can see the discount but cannot manually change it - it's determined by the organization type.

## Feature Flags Usage

The `enabled_modules` JSONB field can be used throughout the application to conditionally show/hide features:

```typescript
// Example: Check if cooperative governance is enabled
if (tenant.enabled_modules?.admin?.governance) {
  // Show governance menu item
}

// Example: Check if driver has ownership dashboard
if (tenant.enabled_modules?.driver?.ownership_dashboard) {
  // Show ownership widget
}
```

## Testing Checklist

- [ ] Run migration successfully
- [ ] Create charity organization (0% discount)
- [ ] Create worker co-operative (30% discount, worker modules enabled)
- [ ] Create passenger co-operative (30% discount, passenger modules enabled)
- [ ] Create hybrid co-operative (30% discount, both modules enabled)
- [ ] Schedule and record a meeting
- [ ] Submit a report
- [ ] Add members to cooperative
- [ ] View compliance overview
- [ ] Update organization type and verify discount changes
- [ ] Verify enabled_modules update correctly with trigger

## Future Enhancements

1. **Voting System**: Full implementation of voting proposals and ballots
2. **Profit Sharing Calculator**: Automated profit distribution calculations
3. **Commonwealth Network**: Service sharing tracking between co-ops
4. **Compliance Alerts**: Automated reminders for overdue meetings/reports
5. **Member Portal**: Self-service portal for co-op members
6. **Report Templates**: Pre-built templates for required reports
7. **Meeting Minutes Editor**: Built-in editor for recording meeting minutes

## Notes

- The trigger automatically manages discount_percentage - do not try to set it manually
- enabled_modules is also auto-managed by the trigger based on cooperative_model
- When changing organization_type, all related governance data remains intact (soft architecture)
- Consider sending email notifications when governance requirements are due
