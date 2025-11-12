# Co-operative Dashboard Redesign Proposal

## Executive Summary

Redesign the Co-operative Structure tab to provide type-specific, democratic governance interfaces with integrated voting, profit distribution, and member engagement features tailored to each cooperative model.

---

## Current Design Analysis

### ✅ Strengths
- Clean tab-based interface
- Good compliance tracking (meetings, reports)
- Membership management foundation
- Clear pricing benefits display
- Proper tenant context integration

### ❌ Weaknesses
1. **Generic Interface**: Same tabs for all cooperative types (worker/passenger/hybrid)
2. **No Democracy Features**: No voting, proposals, or democratic decision-making
3. **No Financial Features**: Shares tracked but no profit distribution
4. **Missing Integrations**: Not connected to driver/customer dashboards
5. **Static Benefits Tab**: Informational only, no interactive features
6. **No Real-time Engagement**: No notifications, alerts, or member activity feeds

---

## New Dashboard Structure

### Modular Tab System by Cooperative Type

```typescript
interface CooperativeDashboardTabs {
  // Core tabs (all cooperatives)
  overview: boolean;
  governance: boolean;  // Meetings + voting combined
  membership: boolean;
  reports: boolean;

  // Type-specific tabs
  ownership?: boolean;      // Worker co-ops only
  profit_sharing?: boolean; // Worker co-ops only
  service_democracy?: boolean; // Passenger co-ops only
  employment?: boolean;     // Passenger co-ops only
  hybrid_governance?: boolean; // Hybrid co-ops only

  // Commonwealth tabs
  commonwealth?: boolean;   // Commonwealth members only
}
```

---

## Type-Specific Modules

### 1. Worker Co-operative Dashboard

**Tabs:**
1. **Overview** - Compliance + quick stats
2. **Ownership & Shares** - NEW
   - Individual ownership stakes
   - Share distribution visualization
   - Share transfer requests
   - Ownership history
3. **Profit Sharing** - NEW
   - Quarterly/annual profit calculations
   - Distribution by share percentage
   - Payment history
   - Projected dividends
4. **Democratic Governance** - ENHANCED
   - Active votes/proposals
   - Meeting management
   - Voting history
   - Proposal submission
5. **Membership**
   - Worker-members list
   - Employment status
   - Voting rights
6. **Reports**
   - Financial reports
   - Compliance documents

**Key Features:**
- Real-time profit share calculator
- Voting dashboard with live results
- Share value tracking
- Democratic proposal workflow

---

### 2. Passenger Co-operative Dashboard

**Tabs:**
1. **Overview** - Investment + dividend tracking
2. **My Investment** - NEW
   - Capital invested: £3,000
   - Total co-op investment pool: £100,000
   - **My ownership percentage: 3.0%**
   - Current valuation
   - Investment history
3. **Dividend Distributions** - NEW
   - **Dividend calculation: My % of total dividend**
   - Example: £10,000 dividend declared → I receive £300 (3%)
   - Quarterly/annual surplus distributions
   - Dividend payment history
   - Projected dividends based on my %
   - Dividend reinvestment options
4. **Service Democracy** - NEW
   - Vote on service changes
   - Route proposals
   - Pricing decisions
   - Expansion/investment votes
5. **Customer Membership**
   - Active investor-members (e.g., 100 members)
   - Total investment pool
   - Investment distribution chart
   - Voting participation
6. **Democratic Governance**
   - Meetings
   - Board elections
   - Policy votes
   - Financial reports
7. **Reports**

**Key Features:**
- Investment percentage tracking (like worker shares)
- Proportional dividend calculator (% of total dividend)
- Democratic voting on business decisions
- Service improvement proposals
- Financial transparency

**Example Calculation:**
```
Total Customers: 100
Total Investment Pool: £100,000
My Investment: £3,000
My Percentage: 3.0%

Quarterly Dividend Declared: £10,000
My Dividend: £10,000 × 3.0% = £300
```

---

### 3. Hybrid Co-operative Dashboard

**Tabs:**
1. **Overview** - Dual-stakeholder stats
2. **Hybrid Governance** - NEW
   - Dual voting systems (workers + customers)
   - Weighted voting by stakeholder type
   - Cross-stakeholder proposals
   - Voting power distribution
3. **Dual Ownership** - NEW
   - Worker ownership shares
   - Customer membership stakes
   - Profit distribution (workers get dividends, customers get rebates)
4. **Membership** - Split by type
   - Worker-members
   - Customer-members
   - Voting rights by type
5. **Democratic Governance**
   - Joint meetings
   - Stakeholder representation
   - Board composition
6. **Reports**

**Key Features:**
- Dual voting mechanisms
- Stakeholder-specific profit distribution
- Balanced representation
- Cross-stakeholder communication

---

## New Feature Specifications

### A. Voting & Democracy System

#### Database Schema Additions

```sql
-- Proposals (motions, decisions, elections)
CREATE TABLE cooperative_proposals (
  proposal_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
  proposal_type VARCHAR(50) NOT NULL, -- 'policy', 'financial', 'board_election', 'service_change'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  voting_opens TIMESTAMP NOT NULL,
  voting_closes TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'open', 'closed', 'passed', 'failed'
  quorum_required INT DEFAULT 50, -- percentage
  approval_threshold INT DEFAULT 50, -- percentage to pass
  proposal_data JSONB, -- Type-specific data
  result JSONB, -- Final vote tallies
  notes TEXT
);

-- Individual votes
CREATE TABLE cooperative_votes (
  vote_id SERIAL PRIMARY KEY,
  proposal_id INT NOT NULL REFERENCES cooperative_proposals(proposal_id),
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id),
  vote_choice VARCHAR(50) NOT NULL, -- 'yes', 'no', 'abstain'
  vote_weight DECIMAL(10,2) DEFAULT 1.0, -- Weighted voting support
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  anonymized BOOLEAN DEFAULT FALSE,
  UNIQUE(proposal_id, member_id)
);

-- Voting eligibility tracking
CREATE TABLE cooperative_voting_eligibility (
  eligibility_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id),
  proposal_type VARCHAR(50), -- NULL = eligible for all
  eligible BOOLEAN DEFAULT TRUE,
  reason TEXT,
  effective_date DATE,
  expires_date DATE
);
```

#### API Endpoints

```
POST   /api/tenants/:tenantId/cooperative/proposals          - Create proposal
GET    /api/tenants/:tenantId/cooperative/proposals          - List proposals
GET    /api/tenants/:tenantId/cooperative/proposals/:id      - Get proposal details
PUT    /api/tenants/:tenantId/cooperative/proposals/:id      - Update proposal
DELETE /api/tenants/:tenantId/cooperative/proposals/:id      - Delete draft proposal

POST   /api/tenants/:tenantId/cooperative/proposals/:id/vote - Cast vote
GET    /api/tenants/:tenantId/cooperative/proposals/:id/results - Get results
GET    /api/tenants/:tenantId/cooperative/proposals/:id/eligible - Check eligibility

GET    /api/tenants/:tenantId/cooperative/voting/my-votes    - User's voting history
GET    /api/tenants/:tenantId/cooperative/voting/active      - Active proposals to vote on
```

#### UI Components

**VotingDashboard.tsx**
- Active proposals requiring vote
- Vote progress bars
- Quick vote buttons
- Results visualization

**ProposalForm.tsx**
- Create new proposals
- Set voting period
- Define quorum and threshold
- Add supporting documents

**VoteModal.tsx**
- Cast vote interface
- Proposal details
- Discussion thread
- Confirmation dialog

---

### B. Profit Distribution System

**Note:** This system handles BOTH worker profit shares and customer dividends using the same mechanism:
- **Workers:** Ownership shares → % of profit pool → Profit distribution
- **Customers:** Investment amount → % of investment pool → Dividend distribution
- **Calculation:** `Individual Amount = Total Distributed × Member Percentage`

Both use identical database tables and calculations, just different terminology.

#### Database Schema Additions

```sql
-- Profit/dividend distribution periods (used for both workers and customers)
CREATE TABLE cooperative_profit_periods (
  period_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
  period_type VARCHAR(50) NOT NULL, -- 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_profit DECIMAL(12,2),
  distributable_amount DECIMAL(12,2), -- After reserves
  reserve_percentage DECIMAL(5,2) DEFAULT 20.00,
  distribution_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'distributed'
  notes TEXT,
  calculation_method VARCHAR(50) DEFAULT 'shares', -- 'shares', 'hours_worked', 'patronage'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual member distributions
CREATE TABLE cooperative_profit_distributions (
  distribution_id SERIAL PRIMARY KEY,
  period_id INT NOT NULL REFERENCES cooperative_profit_periods(period_id),
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id),
  ownership_shares DECIMAL(10,2) NOT NULL,
  total_shares DECIMAL(10,2) NOT NULL, -- Total shares in period
  share_percentage DECIMAL(5,2) NOT NULL,
  distribution_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'payroll', -- 'payroll', 'direct_transfer', 'reinvest'
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_date DATE,
  payment_reference VARCHAR(100),
  notes TEXT
);

-- Profit calculation factors (for hybrid models)
CREATE TABLE cooperative_profit_factors (
  factor_id SERIAL PRIMARY KEY,
  period_id INT NOT NULL REFERENCES cooperative_profit_periods(period_id),
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id),
  factor_type VARCHAR(50) NOT NULL, -- 'hours_worked', 'seniority', 'patronage'
  factor_value DECIMAL(10,2) NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0,
  notes TEXT
);
```

#### API Endpoints

```
POST   /api/tenants/:tenantId/cooperative/profit-periods         - Create period
GET    /api/tenants/:tenantId/cooperative/profit-periods         - List periods
GET    /api/tenants/:tenantId/cooperative/profit-periods/:id     - Get period details
PUT    /api/tenants/:tenantId/cooperative/profit-periods/:id     - Update period
POST   /api/tenants/:tenantId/cooperative/profit-periods/:id/calculate - Calculate distributions
POST   /api/tenants/:tenantId/cooperative/profit-periods/:id/approve   - Approve for payment
POST   /api/tenants/:tenantId/cooperative/profit-periods/:id/distribute - Mark as distributed

GET    /api/tenants/:tenantId/cooperative/profit-distributions/my-history - User's distribution history
GET    /api/tenants/:tenantId/cooperative/profit-distributions/upcoming   - Next distribution estimate
```

#### UI Components

**ProfitSharingDashboard.tsx**
- Current period status
- Projected distribution
- Historical distributions
- Payment status tracking

**ProfitCalculator.tsx**
- Input total profit
- Set reserve percentage
- Preview distribution by member
- Adjust calculation method

**DistributionHistory.tsx**
- Timeline of distributions
- Charts and graphs
- Export to CSV/PDF

---

### C. Driver Dashboard Integration

#### New Driver Dashboard Sections

**"My Co-operative" Tab**

1. **Ownership Section**
   - My ownership shares: XX shares (X.XX%)
   - Current share value: £XXX
   - Total invested: £XXX
   - Share purchase/transfer options

2. **Profit Sharing**
   - Last distribution: £XXX (Date)
   - Next distribution: Estimated £XXX (Date)
   - YTD distributions: £XXX
   - Distribution history

3. **Democratic Participation**
   - Active votes: X proposals
   - Quick vote buttons
   - Voting history (X% participation rate)
   - Upcoming meetings

4. **Governance**
   - My voting rights: Active/Suspended
   - Board representation
   - Committee memberships
   - Proposal submission link

#### API Integration

```
GET /api/tenants/:tenantId/drivers/:driverId/cooperative-summary
Response: {
  membership: { shares, percentage, value, voting_rights },
  profit_sharing: { last, next_estimated, ytd },
  voting: { active_proposals, participation_rate },
  meetings: { next_meeting, attendance_rate }
}
```

---

### D. Customer Dashboard Integration

#### New Customer Dashboard Sections

**"My Investment" Tab** (Passenger & Hybrid Co-ops)

1. **Investment Overview**
   - Capital invested: £XXX
   - Current valuation: £XXX (ROI: X.X%)
   - Shares owned: XXX (X.X%)
   - Member since: Date

2. **Dividend Tracking**
   - Last dividend: £XXX (Date)
   - Next dividend: Estimated £XXX (Date)
   - YTD dividends: £XXX
   - Total lifetime dividends: £XXX
   - Dividend history chart

3. **Democratic Participation**
   - Active votes: X proposals
   - Voting power: X shares = X votes
   - Vote on business decisions
   - Board elections
   - Service proposals

4. **Investment Options**
   - Purchase additional shares
   - Dividend reinvestment
   - Transfer shares
   - Investment projections

5. **My Voice**
   - Submit service proposals
   - Vote on expansion plans
   - Vote on pricing changes
   - Contact board members

---

## Conditional Menu Rendering

### Implementation Pattern

```typescript
// useTenant hook enhanced
interface TenantContextValue {
  tenant: Tenant;
  cooperativeModules: CooperativeModules;
  hasModule: (module: string) => boolean;
}

// Example usage
function AdminDashboard() {
  const { hasModule } = useTenant();

  return (
    <Tabs>
      <Tab label="Overview" />
      {hasModule('governance.voting') && <Tab label="Voting" />}
      {hasModule('governance.profit_sharing') && <Tab label="Profit Sharing" />}
      {hasModule('governance.commonwealth') && <Tab label="Commonwealth" />}
    </Tabs>
  );
}

// Driver Dashboard
function DriverDashboard() {
  const { hasModule } = useTenant();

  return (
    <Layout>
      <Tabs>
        <Tab label="Schedule" />
        <Tab label="Trips" />
        {hasModule('driver.ownership_dashboard') && <Tab label="My Co-op" />}
        {hasModule('driver.profit_sharing') && <Tab label="Profit Sharing" />}
      </Tabs>
    </Layout>
  );
}
```

### Module Matrix by Type

| Module | Worker | Passenger | Hybrid | Commonwealth |
|--------|--------|-----------|--------|--------------|
| Ownership & Shares (Workers) | ✓ | - | ✓ | ✓ |
| Profit Distribution (Workers) | ✓ | - | ✓ | ✓ |
| Investment Tracking (Customers) | - | ✓ | ✓ | ✓ |
| Dividend Distributions (Customers) | - | ✓ | ✓ | ✓ |
| Worker Voting | ✓ | - | ✓ | ✓ |
| Customer/Investor Voting | - | ✓ | ✓ | - |
| Service Democracy | - | ✓ | ✓ | - |
| Dual Voting (Workers + Customers) | - | - | ✓ | - |
| Commonwealth Network | - | - | - | ✓ |
| Service Sharing | - | - | - | ✓ |

---

## Implementation Phases

### Phase 1: Voting & Democracy (Week 1-2)
- [ ] Database schema for proposals and votes
- [ ] Backend API for voting system
- [ ] VotingDashboard component
- [ ] ProposalForm component
- [ ] Vote casting interface
- [ ] Results visualization

### Phase 2: Profit Distribution (Week 2-3)
- [ ] Profit periods database schema
- [ ] Distribution calculation logic
- [ ] ProfitSharingDashboard component
- [ ] ProfitCalculator component
- [ ] Distribution approval workflow
- [ ] Payment integration

### Phase 3: Driver Integration (Week 3)
- [ ] Driver cooperative summary API
- [ ] "My Co-operative" tab in driver dashboard
- [ ] Ownership display
- [ ] Voting access from driver UI
- [ ] Profit sharing visibility

### Phase 4: Customer Integration (Week 4)
- [ ] Customer membership API
- [ ] "My Membership" tab in customer dashboard
- [ ] Customer voting interface
- [ ] Service democracy features
- [ ] Patronage rebate tracking

### Phase 5: Conditional Menus (Week 4)
- [ ] Enhanced useTenant hook with module checking
- [ ] Conditional tab rendering
- [ ] Type-specific dashboard layouts
- [ ] Commonwealth-specific features

### Phase 6: Redesign Polish (Week 5)
- [ ] Redesigned CooperativeStructurePage
- [ ] Type-specific overview dashboards
- [ ] Enhanced compliance tracking
- [ ] Real-time notifications
- [ ] Mobile responsiveness

---

## Redesigned Dashboard Mockup

### Worker Co-operative View

```
┌─────────────────────────────────────────────────────────────┐
│ Co-operative Governance - Worker Co-operative (30% discount)│
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Ownership & Shares] [Profit Sharing]            │
│ [Democratic Governance] [Membership] [Reports]              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ MY OWNERSHIP │ │ ACTIVE VOTES │ │ NEXT PAYMENT │       │
│  │  125 shares  │ │   3 pending  │ │  £1,250.00   │       │
│  │   (12.5%)    │ │  Vote Now →  │ │  Est. Mar 31 │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 🗳️  ACTIVE PROPOSALS (3)                          │       │
│  ├──────────────────────────────────────────────────┤       │
│  │ □ Hire additional driver for night shift        │       │
│  │   Voting closes in 2 days | 45% voted           │       │
│  │   [ Yes: 12 | No: 3 | Abstain: 2 ]             │       │
│  │   [ Vote Now ]                                   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 💰 PROFIT SHARING HISTORY                        │       │
│  │ Q4 2024: £1,250.00 (12.5% of £10,000) - Paid   │       │
│  │ Q3 2024: £875.00 (12.5% of £7,000) - Paid      │       │
│  │ Q2 2024: £1,500.00 (12.5% of £12,000) - Paid   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Passenger Co-operative View

```
┌─────────────────────────────────────────────────────────────┐
│ Co-operative Governance - Passenger Co-operative (30% disc) │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [My Investment] [Dividend Distributions]         │
│ [Service Democracy] [Membership] [Democratic Governance]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ MY INVESTMENT│ │ MY OWNERSHIP │ │ ACTIVE VOTES │       │
│  │  £3,000.00   │ │    3.0%      │ │   2 pending  │       │
│  │ of £100,000  │ │ of total pool│ │  Vote Now →  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 💰 DIVIDEND DISTRIBUTIONS                        │       │
│  ├──────────────────────────────────────────────────┤       │
│  │ Q4 2024:                                         │       │
│  │   Total Dividend: £10,000                        │       │
│  │   My 3.0%: £300.00 - Paid ✓                    │       │
│  │                                                  │       │
│  │ Q3 2024:                                         │       │
│  │   Total Dividend: £8,500                         │       │
│  │   My 3.0%: £255.00 - Paid ✓                    │       │
│  │                                                  │       │
│  │ YTD Total: £555.00 | Annual ROI: 18.5%         │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 🗳️  SERVICE PROPOSALS (2)                        │       │
│  ├──────────────────────────────────────────────────┤       │
│  │ □ Add Saturday evening service (8pm-11pm)       │       │
│  │   Investment required: £15,000                   │       │
│  │   Estimated additional revenue: £2,500/month    │       │
│  │   Voting closes in 5 days | 52% voted           │       │
│  │   [ Support: 62 | Oppose: 8 ]  [ Vote Now ]    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

### Engagement KPIs
- Voting participation rate > 60%
- Proposal submission rate > 5/month
- Member satisfaction score > 4/5
- Dashboard daily active users > 40%

### Financial KPIs
- Profit distribution accuracy: 100%
- Payment processing time < 7 days
- Ownership tracking accuracy: 100%
- Financial transparency score > 90%

### Technical KPIs
- Dashboard load time < 2 seconds
- API response time < 500ms
- Zero data inconsistencies
- 99.9% uptime

---

## Conclusion

This redesign transforms the Co-operative Structure tab from a basic compliance tracker into a comprehensive democratic governance platform tailored to each cooperative type, with real voting, profit distribution, and full integration with driver and customer experiences.

**Next Steps:**
1. Review and approve design
2. Begin Phase 1 implementation
3. User testing with real cooperatives
4. Iterate based on feedback
5. Roll out incrementally
