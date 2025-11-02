# Co-operative Commonwealth UI Redesign - Status

## ✅ COMPLETED

### 1. Tenant Form Modal (`TenantFormModal.tsx`) - **FULLY UPDATED**

**Old Features (REMOVED):**
- ❌ Subscription tier dropdown (free/basic/professional/enterprise)
- ❌ Max users input
- ❌ Max customers input
- ❌ Tier-based limit calculator

**New Features (ADDED):**
- ✅ Organization Type selector:
  - Charity (0% discount)
  - Community Interest Company (0% discount)
  - Third Sector (0% discount)
  - Co-operative (30% discount)
  - Commonwealth Co-operative (50% discount)

- ✅ Co-operative Model selector (conditional - shows only for co-ops):
  - Worker Co-op (Driver-owned)
  - Passenger Co-op (Customer-owned)
  - Hybrid Co-op (Both customer & driver owned)
  - Includes helpful descriptions for each model

- ✅ **Real-time Pricing Calculator**:
  - Base Price input with currency selector (£/$/€)
  - Automatic discount display based on organization type
  - **Actual Price calculation** (base price - discount)
  - **Savings display** (shows how much co-ops save per month)
  - Billing cycle selector (monthly/quarterly/annual)

- ✅ Governance Requirements Warnings:
  - Shows warning for co-operatives (30%) about meetings and reporting
  - Shows warning for commonwealth co-ops (50%) about service sharing

- ✅ Unlimited Users Notice:
  - Info box explaining no user/customer limits for any organization

**UI Enhancements:**
- Visual pricing breakdown panel with 3-column grid
- Color-coded discount display (green for savings, gray for 0%)
- Large, clear actual price display
- Helpful tooltips and descriptions
- Responsive layout

---

## 🔄 STILL NEED UPDATING

### 2. Tenant List Page (`TenantListPage.tsx`)

**Current State:** Still shows subscription tier column and filters

**Needs Changes:**
```typescript
// Line 33: Change tierFilter to orgTypeFilter
const [orgTypeFilter, setOrgTypeFilter] = useState('');

// Line 58-59: Update filter parameter
query.organization_type = orgTypeFilter; // instead of subscription_tier

// Line 256-269: Replace tier filter dropdown with organization type filter
<select value={orgTypeFilter} onChange={(e) => setOrgTypeFilter(e.target.value)}>
  <option value="">All Types</option>
  <option value="charity">Charity</option>
  <option value="cic">CIC</option>
  <option value="third_sector">Third Sector</option>
  <option value="cooperative">Co-operative</option>
  <option value="cooperative_commonwealth">Commonwealth Co-op</option>
</select>

// Line 342-343: Update table header
<th>Organization Type</th> // instead of "Subscription"

// Line 375-387: Replace subscription tier badge with organization type + discount
<td>
  <div>
    <span style={{ /* org type badge styles */ }}>
      {formatOrgType(tenant.organization_type)}
    </span>
    {tenant.discount_percentage > 0 && (
      <span style={{ color: '#10b981', fontSize: '12px', marginLeft: '4px' }}>
        -{tenant.discount_percentage}%
      </span>
    )}
    {tenant.cooperative_model && (
      <div style={{ fontSize: '11px', color: '#6b7280' }}>
        {tenant.cooperative_model} model
      </div>
    )}
  </div>
</td>

// Line 404-409: Replace "Limits" column with "Pricing" column
<th>Pricing</th>

// In table body:
<td>
  <div style={{ fontSize: '12px' }}>
    <div style={{ fontWeight: 600 }}>
      {tenant.currency === 'GBP' && '£'}
      {tenant.currency === 'USD' && '$'}
      {tenant.currency === 'EUR' && '€'}
      {(tenant.base_price * (1 - tenant.discount_percentage / 100)).toFixed(2)}
    </div>
    {tenant.discount_percentage > 0 && (
      <div style={{ color: '#6b7280', textDecoration: 'line-through' }}>
        {tenant.currency === 'GBP' && '£'}{tenant.base_price}
      </div>
    )}
    <div style={{ fontSize: '10px', color: '#6b7280' }}>
      per {tenant.billing_cycle}
    </div>
  </div>
</td>
```

**Helper Functions to Add:**
```typescript
const formatOrgType = (orgType: string): string => {
  const labels: Record<string, string> = {
    charity: 'Charity',
    cic: 'CIC',
    third_sector: 'Third Sector',
    cooperative: 'Co-operative',
    cooperative_commonwealth: 'Commonwealth',
  };
  return labels[orgType] || orgType;
};

const getOrgTypeColor = (orgType: string): string => {
  const colors: Record<string, string> = {
    charity: '#6b7280',
    cic: '#3b82f6',
    third_sector: '#8b5cf6',
    cooperative: '#10b981',
    cooperative_commonwealth: '#f59e0b',
  };
  return colors[orgType] || '#6b7280';
};
```

---

### 3. Tenant Stats Component (`TenantStats.tsx`)

**Current State:** Shows "By Subscription Tier" breakdown

**Needs Changes:**
```typescript
// Line 117-118: Update label
<div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '1rem' }}>
  By Organization Type
</div>

// Add new revenue metrics card (replace 4th card)
<div className="card" style={{
  padding: '1.5rem',
  borderLeft: '4px solid #f59e0b',
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: 'white',
}}>
  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
    Monthly Revenue
  </div>
  <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '0.5rem' }}>
    £{stats.totalRevenue?.toLocaleString() || '0'}
  </div>
  <div style={{ fontSize: '13px', opacity: 0.8 }}>
    After co-op discounts
  </div>
</div>
```

**Add Statistics Breakdown:**
```typescript
// Add after revenue card:
<div className="card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-800)' }}>
    Organization Type Breakdown
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
    {Object.entries(stats.byOrgType || {}).map(([orgType, data]: [string, any]) => (
      <div key={orgType} style={{
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        borderLeft: `4px solid ${getOrgTypeColor(orgType)}`,
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          {formatOrgType(orgType)}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
          {data.count}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          £{data.revenue?.toFixed(0)}/mo revenue
        </div>
        {data.avgDiscount > 0 && (
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
            Avg discount: {data.avgDiscount}%
          </div>
        )}
      </div>
    ))}
  </div>
</div>
```

---

### 4. Page Header Rebranding

**In `TenantListPage.tsx` (lines 193-198):**

**OLD:**
```typescript
<h1 style={{ margin: 0, fontSize: '24px', color: 'var(--gray-900)' }}>
  Platform Administration
</h1>
<p style={{ margin: '5px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
  Third Sector Transport Management
</p>
```

**NEW:**
```typescript
<h1 style={{ margin: 0, fontSize: '24px', color: 'var(--gray-900)' }}>
  Co-operative Commonwealth
</h1>
<p style={{ margin: '5px 0 0 0', color: 'var(--gray-600)', fontSize: '14px' }}>
  Multi-App Platform Administration
</p>
```

---

### 5. Login Page (`PlatformAdminLogin.tsx`)

**Needs:**
- Update title from "Platform Administration" to "Co-operative Commonwealth"
- Update subtitle from "Third Sector Transport Management" to "Multi-App Platform"
- Maybe add co-op branding/color scheme

---

## 📊 Backend API Updates Needed

The frontend types are updated, but the backend `platform-admin.routes.ts` also needs updating to:

1. **Remove from tenant creation:**
   ```typescript
   // DELETE these lines:
   subscription_tier: tenantData.subscription_tier || 'free',
   max_users: tenantData.max_users || 5,
   max_customers: tenantData.max_customers || 100,
   ```

2. **Add to tenant creation:**
   ```typescript
   organization_type: tenantData.organization_type || 'charity',
   cooperative_model: tenantData.cooperative_model || null,
   base_price: tenantData.base_price || 100.00,
   currency: tenantData.currency || 'GBP',
   billing_cycle: tenantData.billing_cycle || 'monthly',
   ```

3. **Update tenant list query:**
   ```typescript
   // Replace subscription_tier filter with organization_type:
   if (organization_type) {
     conditions.push(`organization_type = $${paramCount}`);
     params.push(organization_type);
     paramCount++;
   }
   ```

4. **Update stats endpoint** to return:
   ```typescript
   {
     total: number,
     active: number,
     inactive: number,
     byOrgType: {
       [orgType]: {
         count: number,
         revenue: number,
         avgDiscount: number
       }
     },
     totalRevenue: number
   }
   ```

---

## 🎨 Visual Design Summary

### Color Scheme
- **Charity/CIC/Third Sector:** Gray (#6b7280) - No discount
- **Co-operative:** Green (#10b981) - 30% discount
- **Commonwealth:** Amber (#f59e0b) - 50% discount

### Key UI Patterns
- Discount percentages shown in **green** when > 0%
- Savings amount highlighted with 💰 emoji
- Co-op model shown as secondary info under org type
- Governance warnings shown with ⚠️ emoji
- Pricing shown with strikethrough original price

---

## 📝 Next Steps

1. ✅ **TenantFormModal.tsx** - DONE
2. ⏳ **Update TenantListPage.tsx** - Apply changes above
3. ⏳ **Update TenantStats.tsx** - Apply changes above
4. ⏳ **Update PlatformAdminLogin.tsx** - Rebrand header
5. ⏳ **Update backend routes** - Remove subscription tier logic
6. ⏳ **Run database migrations** - Apply schema changes
7. ⏳ **Test end-to-end** - Create tenants with different org types

---

## 🚀 Testing Checklist

Once all updates are complete, test:

- [ ] Create charity tenant → Shows 0% discount, £100 actual price
- [ ] Create worker co-op → Shows 30% discount, £70 actual price, worker modules
- [ ] Create passenger co-op → Shows 30% discount, passenger modules
- [ ] Create hybrid co-op → Shows 30% discount, both module sets
- [ ] Create commonwealth co-op → Shows 50% discount, £50 actual price
- [ ] Change base price → Discount calculation updates correctly
- [ ] Filter by organization type → Shows only matching tenants
- [ ] View stats → Shows breakdown by org type with revenue
- [ ] Edit existing tenant → Can change organization type, discount updates
- [ ] Co-op model required validation → Cannot save co-op without model

---

**Status:** Form modal complete ✅ | List page in progress ⏳ | Stats page pending ⏳
