# Route Proposals Feature - Testing Guide

## ✅ Integration Verification Complete

All code has been integrated and deployed:

### Backend ✅
- **Routes Registered**: `server.ts:298` - customerRouteProposalsRoutes
- **Migration Run**: Successfully created 5 tables on Railway database
- **Endpoints**: 11 REST API endpoints ready

### Frontend ✅
- **App Routes**: `App.tsx:158, 200` - Customer and admin routes configured
- **Customer Navigation**: `CustomerDashboard.tsx:346-351` - "Route Proposals" button added
- **Admin Navigation**: `Layout.tsx:109` - "Route Proposals" sidebar link added
- **Components**: All 6 React components created and imported

---

## 🧪 Manual Testing Steps

### Prerequisites

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   # Server should start on http://localhost:3000
   ```

2. **Start Frontend Server**
   ```bash
   cd frontend
   npm run dev
   # Frontend should start on http://localhost:5173
   ```

---

## Test 1: Customer Flow

### A. Navigation Test
1. Open browser to `http://localhost:5173`
2. Login as a customer
3. You should see the Customer Dashboard
4. **Verify**: Look for "Route Proposals" button in quick actions section
5. **Click**: "Route Proposals" button
6. **Expected**: Navigate to `/customer/route-proposals`
7. **Expected**: Page loads showing route proposals interface

### B. Create Proposal Test
1. On Route Proposals page, click **"Propose a New Route"**
2. **First Time Only**: Privacy consent modal should appear
   - Select privacy level (recommend "Area Only")
   - Check "I agree to share my travel patterns"
   - Click "Save & Continue"
3. **Proposal Form**: Fill in details
   - Route Name: "South Sheffield → Hospital"
   - Origin Postcodes: Type "S10" and click Add, type "S11" and click Add
   - Destination: "Northern General Hospital"
   - Destination Postcode: "S5 7AU"
   - Schedule: Check "Monday" through "Friday"
   - Time Window: Start "07:00", End "09:00"
   - Frequency: Select "Daily"
   - Target Passengers: 16
   - Minimum Passengers: 8
4. Click **"Create Proposal"**
5. **Expected**: Success message
6. **Expected**: New proposal appears in the list

### C. Vote/Pledge Test
1. Find a proposal in the list
2. Click **"Support This Route"**
3. Vote Modal opens
4. Select **"I Pledge to Use This"** (binding commitment)
5. Fill in pledge details:
   - Frequency: "Daily"
   - Willing to Pay: "£5.00"
6. Click **"Submit Vote"**
7. **Expected**: Success message
8. **Expected**: Proposal's pledge count increments
9. **Expected**: Progress bar updates

### D. Invitations Test
1. Click **"My Invitations"** tab
2. **Expected**: See proposals that match your travel patterns (if any exist)
3. Click on an invitation to view details

---

## Test 2: Admin Flow

### A. Navigation Test
1. Login as an admin user
2. You should see the Admin Dashboard with sidebar
3. **Verify**: Sidebar shows "Company Admin" section
4. **Verify**: "Route Proposals" link appears with vote icon
5. **Click**: "Route Proposals"
6. **Expected**: Navigate to `/admin/route-proposals`
7. **Expected**: Admin route proposals dashboard loads

### B. Filter Test
1. On Admin Route Proposals page
2. **Verify**: Filter tabs visible: All | Ready for Review | Open | Approved | Rejected
3. Click each filter tab
4. **Expected**: Proposals filter correctly by status

### C. View Proposal Details Test
1. Find a proposal with status "threshold_met" (has enough pledges)
2. **Verify**: Viability Analysis section shows:
   - Total pledged passengers
   - Average willing to pay
   - Revenue calculation
   - Cost breakdown (driver wages, vehicle, fuel)
   - Surplus/deficit
3. Click **"View Details"**
4. **Expected**: Pledged customers list appears

### D. Approve Proposal Test
1. Find a proposal with status "threshold_met"
2. Click **"✅ Approve"**
3. Confirm approval
4. **Expected**: Status changes to "approved"
5. **Expected**: Success message

### E. Reject Proposal Test
1. Find an "open" proposal
2. Click **"❌ Reject"**
3. Enter rejection reason: "Insufficient demand in this area"
4. Click "Reject"
5. **Expected**: Status changes to "rejected"
6. **Expected**: Success message

---

## Test 3: API Endpoint Tests

Use this test script to verify all endpoints:

```bash
# Set your token (get from browser dev tools after login)
TOKEN="your_jwt_token_here"
TENANT_ID=2

# Test 1: Get all proposals
curl -X GET "http://localhost:3000/api/tenants/$TENANT_ID/customer-route-proposals" \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Create proposal
curl -X POST "http://localhost:3000/api/tenants/$TENANT_ID/customer-route-proposals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "route_name": "API Test Route",
    "origin_postcodes": ["S10", "S11"],
    "destination_name": "Test Hospital",
    "destination_postcode": "S5 7AU",
    "operates_monday": true,
    "operates_tuesday": true,
    "operates_wednesday": true,
    "operates_thursday": true,
    "operates_friday": true,
    "operates_saturday": false,
    "operates_sunday": false,
    "earliest_departure_time": "07:00",
    "latest_departure_time": "09:00",
    "frequency": "daily",
    "target_passengers": 16,
    "minimum_passengers_required": 8
  }'

# Test 3: Get proposal details
curl -X GET "http://localhost:3000/api/tenants/$TENANT_ID/customer-route-proposals/1" \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Vote on proposal
curl -X POST "http://localhost:3000/api/tenants/$TENANT_ID/customer-route-proposals/1/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vote_type": "pledge",
    "frequency": "daily",
    "willing_to_pay_per_trip": "5.00"
  }'

# Test 5: Get admin view
curl -X GET "http://localhost:3000/api/tenants/$TENANT_ID/admin/route-proposals" \
  -H "Authorization: Bearer $TOKEN"

# Test 6: Get pledges for proposal
curl -X GET "http://localhost:3000/api/tenants/$TENANT_ID/admin/route-proposals/1/pledges" \
  -H "Authorization: Bearer $TOKEN"

# Test 7: Approve proposal
curl -X POST "http://localhost:3000/api/tenants/$TENANT_ID/admin/route-proposals/1/approve" \
  -H "Authorization: Bearer $TOKEN"

# Test 8: Reject proposal
curl -X POST "http://localhost:3000/api/tenants/$TENANT_ID/admin/route-proposals/1/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rejection_reason": "Insufficient demand"
  }'
```

---

## Test 4: Database Verification

Connect to your Railway database and verify tables:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'tenant_%route%'
ORDER BY table_name;

-- Expected output:
-- tenant_customer_route_proposals
-- tenant_customer_travel_privacy
-- tenant_route_proposal_comments
-- tenant_route_proposal_invitations
-- tenant_route_proposal_votes

-- Check proposals
SELECT * FROM tenant_customer_route_proposals WHERE tenant_id = 2;

-- Check votes
SELECT * FROM tenant_route_proposal_votes WHERE tenant_id = 2;

-- Check privacy settings
SELECT * FROM tenant_customer_travel_privacy WHERE tenant_id = 2;
```

---

## Expected Results Summary

### Customer Experience
- ✅ Can access route proposals from dashboard
- ✅ Can create new proposals with privacy consent
- ✅ Can vote/pledge on proposals
- ✅ Can see invitations matched to travel patterns
- ✅ Can see dynamic fare preview based on pledges

### Admin Experience
- ✅ Can access route proposals from sidebar
- ✅ Can filter proposals by status
- ✅ Can view viability analysis
- ✅ Can see financial breakdown
- ✅ Can approve proposals
- ✅ Can reject proposals with reason
- ✅ Can view pledged customers

### Data Flow
- ✅ Proposals created by customers appear in admin view
- ✅ Votes increment pledge counts
- ✅ Threshold met triggers status change
- ✅ Admin actions update proposal status
- ✅ Smart matching sends invitations asynchronously

---

## Common Issues & Solutions

### Issue: "Route Proposals" button not visible
**Solution**: Hard refresh browser (Ctrl+Shift+R)

### Issue: Navigation doesn't work
**Solution**:
1. Check browser console for errors
2. Verify token is valid
3. Check CORS settings in server.ts

### Issue: API returns 404
**Solution**:
1. Verify backend server is running on port 3000
2. Check server.ts line 298 has customerRouteProposalsRoutes registered
3. Check logs for any startup errors

### Issue: Database errors
**Solution**:
1. Verify migration ran successfully
2. Check Railway database connection
3. Run: `node run-route-proposals-migration.js` to re-run migration

### Issue: Fare preview shows NaN
**Solution**:
1. Check cooperativeFareCalculation.service.ts is imported
2. Verify UK minimum wage constants are correct
3. Check pledges have valid willing_to_pay_per_trip values

---

## Performance Benchmarks

Expected performance:
- **Load Proposals**: < 500ms for 100 proposals
- **Create Proposal**: < 1s including smart matching
- **Vote/Pledge**: < 300ms
- **Admin View**: < 800ms including viability calculations

---

## Browser Console Checks

Open browser DevTools (F12) and verify:

1. **No Console Errors**: Should see no red errors
2. **Network Tab**: API calls should return 200 OK
3. **Application Tab**: JWT token should be stored
4. **React DevTools**: Components should render without warnings

---

## Deployment Checklist

Before marking as production-ready:

- [ ] All customer tests pass
- [ ] All admin tests pass
- [ ] All API endpoints return correct data
- [ ] Database tables verified
- [ ] No console errors
- [ ] Mobile responsive (test on phone)
- [ ] Privacy consent works correctly
- [ ] Smart matching sends invitations
- [ ] Fare calculations accurate
- [ ] UK minimum wage correct

---

## Next Steps After Testing

1. **If All Tests Pass**: Feature is production-ready! 🎉
2. **If Issues Found**: Document in GitHub Issues
3. **User Training**: Create user guide for customers and admins
4. **Monitoring**: Set up logging for proposal creation and voting
5. **Analytics**: Track proposal success rates and engagement

---

**Testing Status**: Ready for manual testing
**Last Updated**: 2025-11-15
**Tester**: [Your Name]
**Test Date**: [Today's Date]
