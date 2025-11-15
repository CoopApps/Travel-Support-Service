# Organizational Types & Surplus Allocation Matrix

## Overview

The Travel Support platform supports multiple organizational structures, each with different surplus allocation rules, voting rights, and module access. This document explains how surplus from bus and transport services is allocated based on organization type and cooperative model.

---

## Organizational Types

### 1. **Charity** 🏛️
- **Legal Structure**: Registered Charity
- **Subscription Discount**: 0%
- **Surplus Allocation**:
  - ✅ 100% Business Reserves
  - ❌ 0% Dividends (no members)
  - ❌ 0% Cooperative Commonwealth
- **Voting Rights**: None (governed by trustees)
- **Module Access**: Basic transport/bus management only

**Use Case**: Traditional charity providing subsidized transport to vulnerable populations, funded by grants/donations.

---

### 2. **Community Interest Company (CIC)** 🏢
- **Legal Structure**: CIC (UK)
- **Subscription Discount**: 0%
- **Surplus Allocation**:
  - ✅ 100% Business Reserves (asset lock applies)
  - ❌ 0% Dividends
  - ❌ 0% Cooperative Commonwealth
- **Voting Rights**: None (governed by directors)
- **Module Access**: Basic transport/bus management only

**Use Case**: Social enterprise delivering community transport with asset lock, preventing profit extraction.

---

### 3. **Third Sector Organization** 🤝
- **Legal Structure**: Community organization, mutual aid, unincorporated association
- **Subscription Discount**: 0%
- **Surplus Allocation**:
  - ✅ 100% Business Reserves
  - ❌ 0% Dividends
  - ❌ 0% Cooperative Commonwealth
- **Voting Rights**: None (governance varies)
- **Module Access**: Basic transport/bus management only

**Use Case**: Grassroots community group running volunteer transport services.

---

### 4. **Cooperative** 🟢
- **Legal Structure**: Registered Cooperative Society
- **Subscription Discount**: 30%
- **Surplus Allocation**:
  - ✅ 40% Business Reserves
  - ✅ 40% Dividends (to members based on cooperative model)
  - ✅ 20% Cooperative Commonwealth
- **Voting Rights**: Democratic (one member, one vote)
- **Module Access**: Full cooperative governance features

**Cooperative Models**:
- **Worker Cooperative**: Driver/staff owned
- **Passenger Cooperative**: Customer/passenger owned
- **Hybrid Cooperative**: Multi-stakeholder (workers + passengers)

**Use Case**: Democratic, member-owned transport service operating on cooperative principles.

---

### 5. **Cooperative Commonwealth** 🟣
- **Legal Structure**: Cooperative committed to solidarity economy
- **Subscription Discount**: 50%
- **Surplus Allocation**:
  - ✅ 30% Business Reserves
  - ✅ 40% Dividends (to members)
  - ✅ 30% Cooperative Commonwealth (higher solidarity contribution)
- **Voting Rights**: Democratic (one member, one vote)
- **Module Access**: Full cooperative + commonwealth tracking

**Use Case**: Cooperative actively building a solidarity economy by contributing more surplus to support other cooperatives and mutual aid networks.

---

## Surplus Allocation Matrix

| Organization Type | Business Reserves | Dividends | Commonwealth | Voting Rights |
|-------------------|-------------------|-----------|--------------|---------------|
| **Charity** | 100% | 0% | 0% | None |
| **CIC** | 100% | 0% | 0% | None |
| **Third Sector** | 100% | 0% | 0% | None |
| **Cooperative** | 40% | 40% | 20% | Democratic |
| **Cooperative Commonwealth** | 30% | 40% | 30% | Democratic |

---

## Cooperative Model Details

### **Worker Cooperative** 👷
- **Ownership**: Drivers, dispatchers, mechanics, administrative staff
- **Dividend Distribution**: Based on hours worked (patronage)
- **Voting**: One worker, one vote
- **Decision-Making**: Workers elect board, set wages, approve budgets
- **Example**: Drivers collectively own the fleet and hire management

**Dividend Calculation Example**:
```
Total Dividend Pool: £10,000
Total Hours Worked (all workers): 5,000 hours
Driver A worked 200 hours
Driver A's Share: (200 / 5,000) × £10,000 = £400
```

---

### **Passenger Cooperative** 🚌
- **Ownership**: Regular customers/passengers who are members
- **Dividend Distribution**: Patronage refunds based on usage (trips taken, fares paid)
- **Voting**: One member, one vote
- **Decision-Making**: Members elect board, set service priorities, approve routes
- **Example**: Regular passengers pool resources to run their own bus service

**Dividend Calculation Example**:
```
Total Dividend Pool: £10,000
Total Fares Paid (all members): £50,000
Passenger B paid £500 in fares
Passenger B's Share: (£500 / £50,000) × £10,000 = £100
```

---

### **Hybrid Cooperative** 🤝
- **Ownership**: Both workers AND passengers are members
- **Dividend Distribution**: Split between workers (patronage) and passengers (usage)
  - Default: 50% to workers, 50% to passengers (configurable)
- **Voting**: Both workers and passengers vote (may have different weights)
- **Decision-Making**: Multi-stakeholder board representing both groups
- **Example**: Democratic transport service owned by drivers and regular users together

**Dividend Calculation Example**:
```
Total Dividend Pool: £10,000
Worker Pool: £5,000 (50%)
Passenger Pool: £5,000 (50%)

Driver A worked 200 / 5,000 hours = £200
Passenger B paid £500 / £50,000 fares = £50
```

---

## Service-Specific Surplus

Organizations can offer:
1. **Section 19 Only** (Car/small vehicle transport)
2. **Section 22 Only** (Bus services)
3. **Both Services**

**Surplus is tracked separately** by service type:
- Section 19 surplus → Allocated per organizational rules
- Section 22 surplus → Allocated per organizational rules

**Example**: A worker cooperative running both services:
```
Section 19 Monthly Surplus: £5,000
Section 22 Monthly Surplus: £3,000
Total Surplus: £8,000

Allocation (40/40/20):
- Business Reserves: £3,200 (40%)
- Worker Dividends: £3,200 (40%)
- Commonwealth: £1,600 (20%)
```

---

## Subscription Pricing

| Organization Type | Base Price | Discount | Final Price |
|-------------------|-----------|----------|-------------|
| **Charity** | £100/month | 0% | £100/month |
| **CIC** | £100/month | 0% | £100/month |
| **Third Sector** | £100/month | 0% | £100/month |
| **Cooperative** | £100/month | 30% | £70/month |
| **Cooperative Commonwealth** | £100/month | 50% | £50/month |

**Why Discounts?**
- Cooperatives operate democratically and build community wealth
- Cooperative Commonwealth members support the broader movement
- Discounts encourage cooperative formation and solidarity economy growth

---

## Fare Transparency & Break-Even Model

All organization types use **transparent, cost-based pricing**:

1. **Show Real Costs**: Customers see driver wages, fuel, vehicle costs
2. **Solidarity Pricing**: More passengers = cheaper for everyone
3. **Break-Even Target**: Default 60% occupancy to cover costs
4. **Surplus Allocation**: Based on organizational rules above

**Example Trip (15 miles, 1 hour)**:
```
Real Costs:
- Driver Wages: £15.00
- Fuel: £2.70
- Vehicle: £1.80
- Insurance/Maintenance/Admin: £4.75
Total: £24.25

With 12 passengers (break-even):
£24.25 ÷ 12 = £2.02 per person

With 16 passengers (surplus):
£24.25 ÷ 16 = £1.52 per person
Revenue: £2.02 × 16 = £32.32
Surplus: £8.07

For a Cooperative (40/40/20):
- Business Reserves: £3.23
- Worker Dividends: £3.23
- Commonwealth: £1.61

For a Charity (100/0/0):
- Business Reserves: £8.07
- Dividends: £0.00
- Commonwealth: £0.00
```

---

## Changing Organization Type

Organizations can transition between types:

**Charity → Cooperative**:
1. Register as cooperative society
2. Recruit founding members (workers and/or passengers)
3. Update platform settings to "cooperative"
4. Automatic changes:
   - Subscription discount: 0% → 30%
   - Surplus allocation: 100/0/0 → 40/40/20
   - Modules unlocked: Governance, voting, profit-sharing

**Cooperative → Cooperative Commonwealth**:
1. Commit to higher solidarity contribution (30% commonwealth)
2. Join cooperative network/federation
3. Update platform settings to "cooperative_commonwealth"
4. Automatic changes:
   - Subscription discount: 30% → 50%
   - Surplus allocation: 40/40/20 → 30/40/30

**Non-Reversible**: Moving from cooperative to non-cooperative requires legal dissolution and reformation.

---

## Validation Rules

The system enforces these rules:

### Non-Cooperatives (Charity, CIC, Third Sector)
- ✅ MUST allocate 100% to business reserves
- ❌ CANNOT allocate to dividends
- ❌ CANNOT contribute to commonwealth
- ❌ CANNOT access cooperative modules

### Cooperatives
- ✅ MUST total 100% across all three allocations
- ✅ MUST contribute minimum 5% to commonwealth
- ✅ CAN customize allocation within rules
- ✅ CAN access cooperative governance modules

### Automatic Initialization
- New tenant creation → Auto-populate surplus rules based on org type
- Changing org type → Auto-update surplus allocation
- Fare settings → Sync with organizational configuration

---

## Module Access by Organization Type

| Module | Charity | CIC | Third Sector | Cooperative | Coop Commonwealth |
|--------|---------|-----|--------------|-------------|-------------------|
| **Transport Management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bus Management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Governance Dashboard** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Membership Management** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Voting System** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Profit Sharing** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Commonwealth Tracker** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Cooperative Meetings** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Democratic Voting** | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## API Integration

**Get Organizational Config**:
```typescript
GET /api/tenants/:tenantId/organizational-config

Response:
{
  "config": {
    "organizationType": "cooperative",
    "cooperativeModel": "worker",
    "discountPercentage": 30,
    "surplusAllocation": {
      "businessReservePercent": 40,
      "dividendPercent": 40,
      "cooperativeCommonwealthPercent": 20,
      "dividendRecipients": "workers",
      "votingRights": "workers"
    },
    "serviceTransportEnabled": true,
    "serviceBusEnabled": true
  },
  "description": "Worker-Owned Cooperative - Surplus allocated: 40% Reserves, 40% Dividends (to workers), 20% Commonwealth"
}
```

**Validate Fare Settings**:
```typescript
POST /api/tenants/:tenantId/validate-fare-settings

Request:
{
  "businessReservePercent": 50,
  "dividendPercent": 50,
  "commonwealthPercent": 0
}

Response (for cooperative):
{
  "valid": false,
  "errors": [
    "Cooperatives must contribute to the cooperative commonwealth (minimum 5%)"
  ]
}
```

---

## Summary

This multi-organizational architecture allows:

✅ **Flexibility**: Support charities, CICs, third sector, and cooperatives
✅ **Fairness**: Discounts for cooperatives building democratic economy
✅ **Transparency**: All users see real costs regardless of org type
✅ **Solidarity**: Cooperatives contribute to broader movement
✅ **Democratic Wealth**: Member-owned organizations distribute surplus
✅ **Compliance**: Enforced rules prevent misallocation

The system adapts to organizational structure while maintaining transparency and cooperative values where applicable.
