# Community Route Proposal & Voting System

**Feature:** Customer-Driven Route Planning with Democratic Voting
**Date:** 2025-01-15
**Status:** Design Document

---

## 1. Feature Overview

### **Problem Statement**
Currently, new bus routes are created by admin/management based on assumptions about customer demand. This can lead to:
- Routes that don't match actual customer needs
- Underutilized services
- Missed opportunities for efficient group travel (e.g., 16 people in same area all going to same hospital)

### **Solution**
Enable customers to:
1. **Propose new regular routes** based on their actual travel needs
2. **Discover others with similar travel patterns** (privacy-controlled)
3. **Vote/pledge interest** in proposed routes
4. **Trigger route creation** when demand threshold is met (e.g., 16 pledges)
5. **Participate democratically** in service planning (cooperative model)

### **Key Benefits**
- **Customer-driven service design** - Routes match actual demand
- **Efficient resource allocation** - Only create routes with proven demand
- **Community building** - Customers discover shared travel needs
- **Cooperative values** - Democratic decision-making
- **Reduced admin workload** - Customers do demand research

---

## 2. Privacy & Data Sharing Model

### **Privacy Levels**

Customers control what they share:

| Privacy Level | What's Shared | What's Hidden | Use Case |
|--------------|---------------|---------------|----------|
| **Private** | Nothing | Everything | Customer doesn't want to share any travel patterns |
| **Area Only** | Postcode area (e.g., "S10"), destination name | Full address, exact pickup time, personal details | Default - show general travel patterns |
| **Full Sharing** | Postcode area, destination, time window (e.g., "8:00-9:00") | Full address, personal name, contact details | Customer wants to find exact matches |

### **Privacy Controls**

**Customer Settings:**
```typescript
interface CustomerTravelPrivacy {
  share_travel_patterns: boolean;              // Opt-in to route matching
  privacy_level: 'private' | 'area_only' | 'full_sharing';
  share_origin_postcode_area: boolean;         // Show "S10" instead of "S10 2AB"
  share_destination: boolean;                  // Show "Northern General Hospital"
  share_time_window: boolean;                  // Show "8:00-9:00" instead of exact time
  share_frequency: boolean;                    // Show "Mon-Fri" or "Weekly"
  allow_proposal_invitations: boolean;         // Can be invited to join proposals
  anonymous_voting: boolean;                   // Vote count hidden, name not shown
}
```

**What's NEVER Shared:**
- Full home address
- Personal name (unless customer opts in)
- Phone number
- Email address
- Medical/mobility details (unless relevant to route and customer opts in)
- Payment information

**GDPR Compliance:**
- Explicit opt-in required for any data sharing
- Right to be forgotten (delete all proposals/votes)
- Data portability (export all proposals/votes)
- Clear privacy notice shown before first proposal

---

## 3. Database Schema

### **3.1 Customer Travel Sharing Preferences**

```sql
CREATE TABLE tenant_customer_travel_privacy (
  privacy_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,

  -- Opt-in flags
  share_travel_patterns BOOLEAN DEFAULT false,
  privacy_level VARCHAR(50) DEFAULT 'area_only',
  -- 'private' | 'area_only' | 'full_sharing'

  -- Granular sharing controls
  share_origin_postcode_area BOOLEAN DEFAULT true,
  share_destination BOOLEAN DEFAULT true,
  share_time_window BOOLEAN DEFAULT true,
  share_frequency BOOLEAN DEFAULT true,
  allow_proposal_invitations BOOLEAN DEFAULT true,
  anonymous_voting BOOLEAN DEFAULT false,

  -- GDPR compliance
  privacy_consent_given BOOLEAN DEFAULT false,
  privacy_consent_date TIMESTAMP,
  privacy_notice_version VARCHAR(20), -- Track which privacy notice version accepted

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_customer_privacy UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_customer_privacy_sharing ON tenant_customer_travel_privacy(tenant_id, share_travel_patterns);

COMMENT ON TABLE tenant_customer_travel_privacy IS 'Customer privacy preferences for route proposal matching';
COMMENT ON COLUMN tenant_customer_travel_privacy.share_travel_patterns IS 'Opt-in to be included in route matching and proposals';
```

### **3.2 Customer Route Proposals**

```sql
CREATE TABLE tenant_customer_route_proposals (
  proposal_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Proposer (customer who created it)
  proposed_by_customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  proposer_name VARCHAR(200), -- Can be anonymous if they choose
  proposer_is_anonymous BOOLEAN DEFAULT false,

  -- Route details
  route_name VARCHAR(200) NOT NULL,
  -- e.g., "South Sheffield to Northern General Hospital"

  route_description TEXT,
  -- e.g., "Morning service for hospital staff and patients. Picks up from S10, S11, S17 areas."

  origin_area VARCHAR(100) NOT NULL,
  -- e.g., "South Sheffield (S10, S11, S17)"

  origin_postcodes TEXT[],
  -- e.g., ['S10', 'S11', 'S17'] - Area codes only, not full postcodes

  destination_name VARCHAR(200) NOT NULL,
  -- e.g., "Northern General Hospital"

  destination_address TEXT,
  -- Full address optional

  destination_postcode VARCHAR(20),

  -- Service pattern
  proposed_frequency VARCHAR(100),
  -- 'daily' | 'weekdays' | 'mon-wed-fri' | 'weekly' | 'custom'

  operates_monday BOOLEAN DEFAULT false,
  operates_tuesday BOOLEAN DEFAULT false,
  operates_wednesday BOOLEAN DEFAULT false,
  operates_thursday BOOLEAN DEFAULT false,
  operates_friday BOOLEAN DEFAULT false,
  operates_saturday BOOLEAN DEFAULT false,
  operates_sunday BOOLEAN DEFAULT false,

  -- Timing
  departure_time_window_start TIME,
  -- e.g., 08:00

  departure_time_window_end TIME,
  -- e.g., 09:00

  estimated_journey_duration_minutes INTEGER,

  -- Demand threshold
  minimum_passengers_required INTEGER DEFAULT 8,
  -- Minimum viable for bus service

  target_passengers INTEGER DEFAULT 16,
  -- Ideal capacity for standard minibus

  -- Current status
  status VARCHAR(50) DEFAULT 'open',
  -- 'open' | 'threshold_met' | 'under_review' | 'approved' | 'rejected' | 'implemented' | 'closed'

  total_votes INTEGER DEFAULT 0,
  total_pledges INTEGER DEFAULT 0,
  -- Pledges = "I will use this service regularly"

  total_comments INTEGER DEFAULT 0,

  -- Admin review
  reviewed_by INTEGER, -- References tenant_users.user_id
  review_date TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Conversion to actual route
  converted_to_route_id INTEGER,
  -- References section22_bus_routes.route_id when implemented
  conversion_date TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,

  CONSTRAINT valid_time_window CHECK (
    departure_time_window_end IS NULL OR
    departure_time_window_start IS NULL OR
    departure_time_window_end > departure_time_window_start
  )
);

CREATE INDEX idx_route_proposals_tenant ON tenant_customer_route_proposals(tenant_id, status);
CREATE INDEX idx_route_proposals_status ON tenant_customer_route_proposals(status);
CREATE INDEX idx_route_proposals_destination ON tenant_customer_route_proposals(destination_name);
CREATE INDEX idx_route_proposals_votes ON tenant_customer_route_proposals(total_pledges DESC);

COMMENT ON TABLE tenant_customer_route_proposals IS 'Customer-proposed bus routes for democratic service planning';
COMMENT ON COLUMN tenant_customer_route_proposals.total_pledges IS 'Number of customers pledging to use this service regularly';
COMMENT ON COLUMN tenant_customer_route_proposals.minimum_passengers_required IS 'Minimum viable passenger count for route to be considered';
```

### **3.3 Route Proposal Votes/Pledges**

```sql
CREATE TABLE tenant_route_proposal_votes (
  vote_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES tenant_customer_route_proposals(proposal_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,

  -- Vote type
  vote_type VARCHAR(50) NOT NULL,
  -- 'interested' | 'pledge' | 'maybe'
  -- 'interested' = I like this idea
  -- 'pledge' = I WILL use this service regularly (binding commitment)
  -- 'maybe' = Might use occasionally

  -- Commitment details (for pledges)
  expected_frequency VARCHAR(50),
  -- 'daily' | 'weekly' | '2-3_times_week' | 'monthly'

  days_of_week TEXT[],
  -- e.g., ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  willing_to_pay_amount DECIMAL(6,2),
  -- Maximum fare customer is willing to pay per trip

  -- Privacy
  is_anonymous BOOLEAN DEFAULT false,
  voter_name VARCHAR(200),
  -- NULL if anonymous

  -- Additional info
  notes TEXT,
  -- e.g., "I work at the hospital 8am-4pm Mon-Fri"

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_customer_proposal_vote UNIQUE(proposal_id, customer_id)
);

CREATE INDEX idx_proposal_votes_proposal ON tenant_route_proposal_votes(proposal_id, vote_type);
CREATE INDEX idx_proposal_votes_customer ON tenant_route_proposal_votes(customer_id);

COMMENT ON TABLE tenant_route_proposal_votes IS 'Customer votes and pledges for route proposals';
COMMENT ON COLUMN tenant_route_proposal_votes.vote_type IS 'Level of interest: interested (casual), pledge (binding commitment), maybe';
COMMENT ON COLUMN tenant_route_proposal_votes.willing_to_pay_amount IS 'Maximum fare customer will pay (helps with viability calculation)';
```

### **3.4 Route Proposal Comments/Discussion**

```sql
CREATE TABLE tenant_route_proposal_comments (
  comment_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES tenant_customer_route_proposals(proposal_id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES tenant_customers(customer_id) ON DELETE SET NULL,

  -- User info (can be staff/admin too)
  user_id INTEGER, -- References tenant_users.user_id if posted by staff
  commenter_name VARCHAR(200),
  is_anonymous BOOLEAN DEFAULT false,
  is_staff BOOLEAN DEFAULT false,

  -- Comment content
  comment_text TEXT NOT NULL,

  -- Threading
  parent_comment_id INTEGER REFERENCES tenant_route_proposal_comments(comment_id) ON DELETE CASCADE,
  -- For nested replies

  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  moderated_by INTEGER,
  moderation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposal_comments_proposal ON tenant_route_proposal_comments(proposal_id, created_at);
CREATE INDEX idx_proposal_comments_parent ON tenant_route_proposal_comments(parent_comment_id);

COMMENT ON TABLE tenant_route_proposal_comments IS 'Discussion threads on route proposals';
COMMENT ON COLUMN tenant_route_proposal_comments.parent_comment_id IS 'For threaded replies';
```

### **3.5 Route Proposal Invitations**

```sql
CREATE TABLE tenant_route_proposal_invitations (
  invitation_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES tenant_customer_route_proposals(proposal_id) ON DELETE CASCADE,

  -- Invited customer
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,

  -- Why they were invited (system-generated match)
  match_reason VARCHAR(100),
  -- 'similar_origin' | 'same_destination' | 'matching_schedule' | 'postcode_proximity'

  match_score INTEGER,
  -- 0-100 score of how well they match the proposal

  -- Invitation status
  status VARCHAR(50) DEFAULT 'pending',
  -- 'pending' | 'viewed' | 'accepted' | 'declined' | 'ignored'

  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposal_invitations_customer ON tenant_route_proposal_invitations(customer_id, status);
CREATE INDEX idx_proposal_invitations_proposal ON tenant_route_proposal_invitations(proposal_id);

COMMENT ON TABLE tenant_route_proposal_invitations IS 'Smart invitations to customers who match proposal criteria';
COMMENT ON COLUMN tenant_route_proposal_invitations.match_score IS 'Algorithm score 0-100 for how well customer matches proposal';
```

---

## 4. Smart Matching Algorithm

### **4.1 Match Scoring Logic**

When a route proposal is created, automatically find and invite matching customers:

```typescript
interface MatchCriteria {
  originPostcodeMatch: number;      // 0-40 points (same postcode area)
  destinationMatch: number;          // 0-30 points (same destination)
  scheduleMatch: number;             // 0-20 points (overlapping days/times)
  frequencyMatch: number;            // 0-10 points (similar usage frequency)
}

function calculateMatchScore(
  proposal: RouteProposal,
  customer: Customer,
  customerSchedule: any
): number {
  let score = 0;

  // 1. Origin proximity (40 points max)
  const customerPostcodeArea = customer.postcode.split(' ')[0]; // "S10 2AB" -> "S10"
  if (proposal.origin_postcodes.includes(customerPostcodeArea)) {
    score += 40; // Exact postcode area match
  } else if (isAdjacentPostcode(customerPostcodeArea, proposal.origin_postcodes)) {
    score += 20; // Adjacent area
  }

  // 2. Destination match (30 points max)
  if (customerSchedule.regularDestinations.includes(proposal.destination_name)) {
    score += 30; // Goes to same destination
  } else if (isNearbyDestination(customerSchedule.destinations, proposal.destination_name)) {
    score += 15; // Goes nearby
  }

  // 3. Schedule overlap (20 points max)
  const daysOverlap = calculateDaysOverlap(
    proposal.operatingDays,
    customerSchedule.travelDays
  );
  score += (daysOverlap / 5) * 20; // 5 days overlap = full 20 points

  const timeOverlap = calculateTimeOverlap(
    proposal.departure_time_window_start,
    proposal.departure_time_window_end,
    customerSchedule.usual_pickup_time
  );
  if (timeOverlap) score += 10;

  // 4. Frequency match (10 points max)
  if (proposal.proposed_frequency === customerSchedule.frequency) {
    score += 10;
  }

  return Math.min(score, 100);
}
```

### **4.2 Auto-Invitation Triggers**

```typescript
// When proposal created
async function onProposalCreated(proposal: RouteProposal) {
  // Find all customers who:
  // 1. Have opted in to route matching (share_travel_patterns = true)
  // 2. Match the proposal criteria
  const matchingCustomers = await query(`
    SELECT
      c.customer_id,
      c.name,
      c.postcode,
      c.schedule,
      p.privacy_level
    FROM tenant_customers c
    JOIN tenant_customer_travel_privacy p ON c.customer_id = p.customer_id
    WHERE c.tenant_id = $1
      AND p.share_travel_patterns = true
      AND c.customer_id != $2 -- Don't invite the proposer
  `, [proposal.tenant_id, proposal.proposed_by_customer_id]);

  for (const customer of matchingCustomers) {
    const matchScore = calculateMatchScore(proposal, customer);

    if (matchScore >= 50) { // Only invite if 50%+ match
      await createInvitation({
        proposal_id: proposal.proposal_id,
        customer_id: customer.customer_id,
        match_score: matchScore,
        match_reason: determineMatchReason(matchScore)
      });
    }
  }
}
```

---

## 5. API Endpoints

### **5.1 Customer Route Proposals**

```typescript
// ============================================================================
// CUSTOMER ENDPOINTS (Frontend: Customer Dashboard)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals
 * @desc Get all active route proposals (browseable by all customers)
 * @query { status: 'open' | 'all', sortBy: 'recent' | 'popular' | 'closing_soon' }
 */
router.get('/tenants/:tenantId/customer-route-proposals', verifyTenantAccess, async (req, res) => {
  const { status = 'open', sortBy = 'popular' } = req.query;

  let orderBy = 'created_at DESC';
  if (sortBy === 'popular') orderBy = 'total_pledges DESC, total_votes DESC';
  if (sortBy === 'closing_soon') orderBy = 'created_at ASC'; // Oldest first

  const proposals = await query(`
    SELECT
      p.*,
      CASE
        WHEN p.proposer_is_anonymous THEN 'Anonymous Customer'
        ELSE p.proposer_name
      END as display_name,
      (p.total_pledges >= p.minimum_passengers_required) as is_viable,
      (p.total_pledges >= p.target_passengers) as target_reached
    FROM tenant_customer_route_proposals p
    WHERE p.tenant_id = $1
      ${status !== 'all' ? "AND p.status = $2" : ''}
    ORDER BY ${orderBy}
  `, status !== 'all' ? [tenantId, status] : [tenantId]);

  res.json(proposals);
});

/**
 * @route POST /api/tenants/:tenantId/customer-route-proposals
 * @desc Create new route proposal
 * @body { route_name, origin_area, destination_name, proposed_frequency, ... }
 */
router.post('/tenants/:tenantId/customer-route-proposals', verifyTenantAccess, async (req, res) => {
  const customerId = req.user.customerId; // From JWT
  const proposalData = req.body;

  // Validate customer has opted in to sharing
  const privacy = await queryOne(`
    SELECT share_travel_patterns, privacy_consent_given
    FROM tenant_customer_travel_privacy
    WHERE customer_id = $1
  `, [customerId]);

  if (!privacy?.privacy_consent_given) {
    return res.status(403).json({
      error: 'You must accept the privacy policy before creating proposals',
      requiresConsent: true
    });
  }

  // Create proposal
  const proposal = await query(`
    INSERT INTO tenant_customer_route_proposals (
      tenant_id,
      proposed_by_customer_id,
      proposer_name,
      proposer_is_anonymous,
      route_name,
      route_description,
      origin_area,
      origin_postcodes,
      destination_name,
      destination_postcode,
      proposed_frequency,
      operates_monday, operates_tuesday, ... ,
      departure_time_window_start,
      departure_time_window_end,
      minimum_passengers_required,
      target_passengers
    ) VALUES (...)
    RETURNING *
  `, [...]);

  // Trigger smart matching
  await findAndInviteMatchingCustomers(proposal[0]);

  res.status(201).json(proposal[0]);
});

/**
 * @route POST /api/tenants/:tenantId/customer-route-proposals/:proposalId/vote
 * @desc Vote or pledge interest in a proposal
 * @body { vote_type: 'interested' | 'pledge' | 'maybe', expected_frequency, willing_to_pay_amount, is_anonymous }
 */
router.post('/tenants/:tenantId/customer-route-proposals/:proposalId/vote', verifyTenantAccess, async (req, res) => {
  const { proposalId } = req.params;
  const customerId = req.user.customerId;
  const { vote_type, expected_frequency, willing_to_pay_amount, is_anonymous, notes } = req.body;

  // Check if already voted
  const existing = await queryOne(`
    SELECT vote_id FROM tenant_route_proposal_votes
    WHERE proposal_id = $1 AND customer_id = $2
  `, [proposalId, customerId]);

  if (existing) {
    // Update existing vote
    await query(`
      UPDATE tenant_route_proposal_votes
      SET vote_type = $3, expected_frequency = $4, willing_to_pay_amount = $5,
          is_anonymous = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE vote_id = $1
    `, [existing.vote_id, proposalId, vote_type, expected_frequency, willing_to_pay_amount, is_anonymous, notes]);
  } else {
    // Create new vote
    await query(`
      INSERT INTO tenant_route_proposal_votes (
        tenant_id, proposal_id, customer_id, vote_type,
        expected_frequency, willing_to_pay_amount, is_anonymous, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [tenantId, proposalId, customerId, vote_type, expected_frequency, willing_to_pay_amount, is_anonymous, notes]);
  }

  // Update proposal vote counts
  await recalculateProposalVotes(proposalId);

  res.json({ message: 'Vote recorded successfully' });
});

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals/:proposalId/votes
 * @desc Get all votes for a proposal (respects anonymity)
 */
router.get('/tenants/:tenantId/customer-route-proposals/:proposalId/votes', verifyTenantAccess, async (req, res) => {
  const { proposalId } = req.params;

  const votes = await query(`
    SELECT
      v.vote_type,
      v.expected_frequency,
      v.willing_to_pay_amount,
      CASE
        WHEN v.is_anonymous THEN 'Anonymous'
        ELSE c.name
      END as voter_name,
      v.notes,
      v.created_at
    FROM tenant_route_proposal_votes v
    LEFT JOIN tenant_customers c ON v.customer_id = c.customer_id
    WHERE v.proposal_id = $1
    ORDER BY
      CASE v.vote_type
        WHEN 'pledge' THEN 1
        WHEN 'interested' THEN 2
        WHEN 'maybe' THEN 3
      END,
      v.created_at DESC
  `, [proposalId]);

  res.json(votes);
});

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals/my-invitations
 * @desc Get route proposals I've been invited to join
 */
router.get('/tenants/:tenantId/customer-route-proposals/my-invitations', verifyTenantAccess, async (req, res) => {
  const customerId = req.user.customerId;

  const invitations = await query(`
    SELECT
      i.*,
      p.route_name,
      p.origin_area,
      p.destination_name,
      p.proposed_frequency,
      p.total_pledges,
      p.target_passengers,
      p.status as proposal_status
    FROM tenant_route_proposal_invitations i
    JOIN tenant_customer_route_proposals p ON i.proposal_id = p.proposal_id
    WHERE i.customer_id = $1
      AND i.status IN ('pending', 'viewed')
      AND p.status = 'open'
    ORDER BY i.match_score DESC, i.created_at DESC
  `, [customerId]);

  res.json(invitations);
});

// ============================================================================
// ADMIN ENDPOINTS (Frontend: Admin Dashboard)
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/admin/route-proposals
 * @desc Get all proposals for admin review
 * @query { status: 'threshold_met' | 'under_review' | 'all' }
 */
router.get('/tenants/:tenantId/admin/route-proposals', verifyTenantAccess, requireRole('admin'), async (req, res) => {
  const { status = 'threshold_met' } = req.query;

  const proposals = await query(`
    SELECT
      p.*,
      c.name as proposer_full_name,
      c.phone as proposer_phone,
      c.email as proposer_email,
      u.full_name as reviewed_by_name,
      (p.total_pledges >= p.minimum_passengers_required) as is_viable,
      (p.total_pledges >= p.target_passengers) as target_reached,

      -- Calculate estimated revenue
      (SELECT AVG(willing_to_pay_amount)
       FROM tenant_route_proposal_votes
       WHERE proposal_id = p.proposal_id AND vote_type = 'pledge') as avg_fare,

      -- Get all pledge details
      (SELECT json_agg(json_build_object(
        'customer_id', v.customer_id,
        'customer_name', cust.name,
        'expected_frequency', v.expected_frequency,
        'willing_to_pay', v.willing_to_pay_amount,
        'notes', v.notes
      ))
      FROM tenant_route_proposal_votes v
      JOIN tenant_customers cust ON v.customer_id = cust.customer_id
      WHERE v.proposal_id = p.proposal_id AND v.vote_type = 'pledge') as pledged_customers

    FROM tenant_customer_route_proposals p
    LEFT JOIN tenant_customers c ON p.proposed_by_customer_id = c.customer_id
    LEFT JOIN tenant_users u ON p.reviewed_by = u.user_id
    WHERE p.tenant_id = $1
      ${status !== 'all' ? "AND p.status = $2" : ''}
    ORDER BY p.total_pledges DESC, p.created_at DESC
  `, status !== 'all' ? [tenantId, status] : [tenantId]);

  res.json(proposals);
});

/**
 * @route POST /api/tenants/:tenantId/admin/route-proposals/:proposalId/approve
 * @desc Approve proposal and convert to actual bus route
 */
router.post('/tenants/:tenantId/admin/route-proposals/:proposalId/approve', verifyTenantAccess, requireRole('admin'), async (req, res) => {
  const { proposalId } = req.params;
  const userId = req.user.userId;

  // Get proposal details
  const proposal = await queryOne(`
    SELECT * FROM tenant_customer_route_proposals WHERE proposal_id = $1
  `, [proposalId]);

  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  // Create actual Section 22 bus route
  const route = await query(`
    INSERT INTO section22_bus_routes (
      tenant_id,
      route_number,
      route_name,
      description,
      origin_point,
      destination_point,
      service_pattern,
      operates_monday, operates_tuesday, ... ,
      status
    ) VALUES (
      $1,
      'PROP-' || $2, -- Auto-generate route number
      $3,
      'Customer-proposed route: ' || $4,
      $5,
      $6,
      $7,
      ... ,
      'planning'
    )
    RETURNING *
  `, [tenantId, proposalId, proposal.route_name, proposal.route_description, ...]);

  // Update proposal status
  await query(`
    UPDATE tenant_customer_route_proposals
    SET status = 'approved',
        converted_to_route_id = $2,
        conversion_date = CURRENT_TIMESTAMP,
        reviewed_by = $3,
        review_date = CURRENT_TIMESTAMP
    WHERE proposal_id = $1
  `, [proposalId, route[0].route_id, userId]);

  // Notify all pledged customers
  await notifyPledgedCustomers(proposalId, route[0]);

  res.json({
    message: 'Proposal approved and converted to bus route',
    route: route[0]
  });
});

/**
 * @route POST /api/tenants/:tenantId/admin/route-proposals/:proposalId/reject
 * @desc Reject proposal with reason
 */
router.post('/tenants/:tenantId/admin/route-proposals/:proposalId/reject', verifyTenantAccess, requireRole('admin'), async (req, res) => {
  const { proposalId } = req.params;
  const { rejection_reason } = req.body;
  const userId = req.user.userId;

  await query(`
    UPDATE tenant_customer_route_proposals
    SET status = 'rejected',
        rejection_reason = $2,
        reviewed_by = $3,
        review_date = CURRENT_TIMESTAMP
    WHERE proposal_id = $1
  `, [proposalId, rejection_reason, userId]);

  // Notify proposer
  await notifyProposer(proposalId, 'rejected', rejection_reason);

  res.json({ message: 'Proposal rejected' });
});
```

---

## 6. Frontend Components

### **6.1 Customer Dashboard - Route Proposals Tab**

```typescript
// frontend/src/components/customer/RouteProposalsTab.tsx

interface RouteProposal {
  proposal_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  proposed_frequency: string;
  departure_time_window_start: string;
  departure_time_window_end: string;
  total_pledges: number;
  total_votes: number;
  minimum_passengers_required: number;
  target_passengers: number;
  status: string;
  is_viable: boolean;
  target_reached: boolean;
  created_at: string;
}

export const RouteProposalsTab: React.FC = () => {
  const [proposals, setProposals] = useState<RouteProposal[]>([]);
  const [myInvitations, setMyInvitations] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my_votes' | 'invitations'>('all');

  const loadProposals = async () => {
    const response = await fetch(`/api/tenants/${tenant.tenant_id}/customer-route-proposals`);
    const data = await response.json();
    setProposals(data);
  };

  const loadInvitations = async () => {
    const response = await fetch(`/api/tenants/${tenant.tenant_id}/customer-route-proposals/my-invitations`);
    const data = await response.json();
    setMyInvitations(data);
  };

  return (
    <div className="route-proposals-container">
      {/* Header */}
      <div className="proposals-header">
        <h2>🗳️ Community Route Proposals</h2>
        <p>Propose new routes or support existing proposals from your community</p>

        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Propose a New Route
        </button>
      </div>

      {/* Invitations Alert */}
      {myInvitations.length > 0 && (
        <div className="invitations-alert">
          <div className="alert-icon">📧</div>
          <div className="alert-content">
            <strong>You have {myInvitations.length} route invitations!</strong>
            <p>We found routes that match your travel patterns</p>
          </div>
          <button onClick={() => setFilter('invitations')}>
            View Invitations
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Proposals ({proposals.length})
        </button>
        <button
          className={filter === 'invitations' ? 'active' : ''}
          onClick={() => setFilter('invitations')}
        >
          My Invitations ({myInvitations.length})
        </button>
        <button
          className={filter === 'my_votes' ? 'active' : ''}
          onClick={() => setFilter('my_votes')}
        >
          My Votes
        </button>
      </div>

      {/* Proposals Grid */}
      <div className="proposals-grid">
        {proposals.map(proposal => (
          <RouteProposalCard
            key={proposal.proposal_id}
            proposal={proposal}
            onVote={() => loadProposals()}
          />
        ))}
      </div>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <CreateProposalModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadProposals();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};
```

### **6.2 Route Proposal Card**

```typescript
// frontend/src/components/customer/RouteProposalCard.tsx

interface RouteProposalCardProps {
  proposal: RouteProposal;
  onVote: () => void;
}

export const RouteProposalCard: React.FC<RouteProposalCardProps> = ({ proposal, onVote }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);

  const progressPercentage = (proposal.total_pledges / proposal.target_passengers) * 100;
  const isViable = proposal.total_pledges >= proposal.minimum_passengers_required;
  const targetReached = proposal.total_pledges >= proposal.target_passengers;

  return (
    <div className={`proposal-card ${targetReached ? 'target-reached' : ''}`}>
      {/* Status Badge */}
      <div className="status-badges">
        {targetReached && (
          <span className="badge success">✅ Target Reached!</span>
        )}
        {isViable && !targetReached && (
          <span className="badge info">✓ Viable ({proposal.total_pledges}/{proposal.minimum_passengers_required})</span>
        )}
        {!isViable && (
          <span className="badge warning">
            Needs {proposal.minimum_passengers_required - proposal.total_pledges} more
          </span>
        )}
      </div>

      {/* Route Info */}
      <div className="proposal-header">
        <h3>{proposal.route_name}</h3>
        <div className="route-summary">
          <div className="route-from">📍 {proposal.origin_area}</div>
          <div className="route-arrow">→</div>
          <div className="route-to">🏁 {proposal.destination_name}</div>
        </div>
      </div>

      {/* Schedule */}
      <div className="proposal-schedule">
        <span className="schedule-frequency">
          📅 {proposal.proposed_frequency}
        </span>
        <span className="schedule-time">
          🕐 {proposal.departure_time_window_start} - {proposal.departure_time_window_end}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-label">
          <span><strong>{proposal.total_pledges}</strong> pledges</span>
          <span>Target: {proposal.target_passengers}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`,
              background: targetReached ? '#10b981' : isViable ? '#3b82f6' : '#f59e0b'
            }}
          />
        </div>
        <div className="progress-stats">
          <span>{proposal.total_votes} interested</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="proposal-actions">
        <button
          className="btn-primary"
          onClick={() => setShowVoteModal(true)}
        >
          🗳️ Support This Route
        </button>
        <button
          className="btn-secondary"
          onClick={() => setShowDetails(true)}
        >
          View Details
        </button>
      </div>

      {/* Vote Modal */}
      {showVoteModal && (
        <VoteModal
          proposal={proposal}
          onClose={() => setShowVoteModal(false)}
          onVoted={() => {
            onVote();
            setShowVoteModal(false);
          }}
        />
      )}

      {/* Details Modal */}
      {showDetails && (
        <ProposalDetailsModal
          proposal={proposal}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};
```

### **6.3 Vote Modal**

```typescript
// frontend/src/components/customer/VoteModal.tsx

export const VoteModal: React.FC<{ proposal: RouteProposal; onClose: () => void; onVoted: () => void }> = ({
  proposal,
  onClose,
  onVoted
}) => {
  const [voteType, setVoteType] = useState<'interested' | 'pledge' | 'maybe'>('interested');
  const [expectedFrequency, setExpectedFrequency] = useState<string>('');
  const [willingToPay, setWillingToPay] = useState<number>(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const response = await fetch(
      `/api/tenants/${tenant.tenant_id}/customer-route-proposals/${proposal.proposal_id}/vote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: voteType,
          expected_frequency: expectedFrequency,
          willing_to_pay_amount: willingToPay,
          is_anonymous: isAnonymous,
          notes
        })
      }
    );

    if (response.ok) {
      onVoted();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Support: {proposal.route_name}</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Vote Type Selection */}
          <div className="vote-type-selector">
            <label className={`vote-option ${voteType === 'pledge' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="pledge"
                checked={voteType === 'pledge'}
                onChange={() => setVoteType('pledge')}
              />
              <div className="option-content">
                <strong>🤝 I Pledge to Use This</strong>
                <p>I will regularly use this service (binding commitment)</p>
              </div>
            </label>

            <label className={`vote-option ${voteType === 'interested' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="interested"
                checked={voteType === 'interested'}
                onChange={() => setVoteType('interested')}
              />
              <div className="option-content">
                <strong>👍 I'm Interested</strong>
                <p>I like this idea and might use it</p>
              </div>
            </label>

            <label className={`vote-option ${voteType === 'maybe' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="maybe"
                checked={voteType === 'maybe'}
                onChange={() => setVoteType('maybe')}
              />
              <div className="option-content">
                <strong>🤔 Maybe Occasionally</strong>
                <p>I might use this occasionally</p>
              </div>
            </label>
          </div>

          {/* Commitment Details (shown for pledges) */}
          {voteType === 'pledge' && (
            <div className="commitment-details">
              <div className="form-group">
                <label>How often would you use this?</label>
                <select
                  value={expectedFrequency}
                  onChange={e => setExpectedFrequency(e.target.value)}
                >
                  <option value="">Select frequency...</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Once a week</option>
                  <option value="2-3_times_week">2-3 times per week</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Maximum fare you're willing to pay per trip?</label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={willingToPay}
                  onChange={e => setWillingToPay(parseFloat(e.target.value))}
                  placeholder="£5.00"
                />
                <small>Helps us calculate route viability</small>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="form-group">
            <label>Additional comments (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., I work at the hospital 8am-4pm Mon-Fri"
              rows={3}
            />
          </div>

          {/* Privacy Options */}
          <div className="privacy-options">
            <label>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
              />
              Vote anonymously (your name won't be shown)
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={voteType === 'pledge' && (!expectedFrequency || !willingToPay)}
          >
            {voteType === 'pledge' ? '🤝 Submit Pledge' : '👍 Submit Vote'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### **6.4 Admin Route Proposals Review Dashboard**

```typescript
// frontend/src/components/admin/RouteProposalsReviewPage.tsx

export const RouteProposalsReviewPage: React.FC = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'threshold_met' | 'under_review' | 'all'>('threshold_met');

  const loadProposals = async () => {
    const response = await fetch(
      `/api/tenants/${tenant.tenant_id}/admin/route-proposals?status=${filter}`
    );
    const data = await response.json();
    setProposals(data);
  };

  const handleApprove = async (proposalId: number) => {
    if (!confirm('Convert this proposal to an actual bus route?')) return;

    const response = await fetch(
      `/api/tenants/${tenant.tenant_id}/admin/route-proposals/${proposalId}/approve`,
      { method: 'POST' }
    );

    if (response.ok) {
      const result = await response.json();
      alert(`Route created successfully! Route ID: ${result.route.route_id}`);
      loadProposals();
    }
  };

  return (
    <div className="admin-proposals-page">
      <div className="page-header">
        <h1>🗳️ Route Proposal Reviews</h1>
        <p>Community-driven route requests awaiting approval</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'threshold_met' ? 'active' : ''}
          onClick={() => setFilter('threshold_met')}
        >
          Ready for Review ({proposals.filter(p => p.is_viable).length})
        </button>
        <button
          className={filter === 'under_review' ? 'active' : ''}
          onClick={() => setFilter('under_review')}
        >
          Under Review
        </button>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Proposals
        </button>
      </div>

      {/* Proposals Table */}
      <table className="proposals-table">
        <thead>
          <tr>
            <th>Route Name</th>
            <th>From → To</th>
            <th>Schedule</th>
            <th>Pledges</th>
            <th>Avg Fare</th>
            <th>Est. Revenue</th>
            <th>Viability</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map(proposal => (
            <tr key={proposal.proposal_id}>
              <td>
                <strong>{proposal.route_name}</strong>
                <br />
                <small>Proposed by: {proposal.proposer_full_name}</small>
              </td>
              <td>
                {proposal.origin_area} → {proposal.destination_name}
              </td>
              <td>
                {proposal.proposed_frequency}<br />
                {proposal.departure_time_window_start} - {proposal.departure_time_window_end}
              </td>
              <td>
                <strong>{proposal.total_pledges}</strong> pledges<br />
                {proposal.total_votes} interested
              </td>
              <td>
                £{proposal.avg_fare?.toFixed(2) || 'N/A'}
              </td>
              <td>
                £{((proposal.avg_fare || 0) * proposal.total_pledges * 4).toFixed(2)}/month
              </td>
              <td>
                {proposal.target_reached ? (
                  <span className="badge success">✅ Target Reached</span>
                ) : proposal.is_viable ? (
                  <span className="badge info">✓ Viable</span>
                ) : (
                  <span className="badge warning">Insufficient</span>
                )}
              </td>
              <td>
                <button
                  className="btn-primary"
                  onClick={() => handleApprove(proposal.proposal_id)}
                  disabled={!proposal.is_viable}
                >
                  ✅ Approve & Create Route
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => viewProposalDetails(proposal)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 7. Workflow Example

### **Scenario: Hospital Workers Route**

1. **Sarah (Customer) Creates Proposal:**
   - Lives in S10 area (South Sheffield)
   - Works at Northern General Hospital
   - Needs transport Mon-Fri, 8:00-9:00 arrival
   - Creates proposal: "South Sheffield to Northern General Hospital"
   - Sets target: 16 passengers minimum

2. **System Finds Matches:**
   - Searches all customers with `share_travel_patterns = true`
   - Finds 25 customers in S10, S11, S17 areas who travel to Northern General
   - Sends invitations to top 20 matches (score > 70)

3. **Other Customers Respond:**
   - 18 customers pledge to use the service regularly
   - 5 vote "interested"
   - Average willing to pay: £4.50 per trip

4. **Threshold Reached:**
   - Proposal status → `threshold_met`
   - Admin gets notification
   - Email sent to transport manager

5. **Admin Reviews:**
   - Sees 18 pledges (exceeds minimum 8, target 16)
   - Estimated monthly revenue: £4.50 × 18 passengers × 20 working days = £1,620
   - Estimated costs: Driver (£600) + Fuel (£300) + Depreciation (£200) = £1,100
   - **Profitable!** Approves proposal

6. **Route Creation:**
   - Admin clicks "Approve & Create Route"
   - System creates `section22_bus_routes` entry
   - Route number: PROP-001
   - Status: Planning
   - Admin then:
     - Plans exact stops using postcode data
     - Assigns vehicle (16-seater)
     - Assigns driver
     - Creates timetable
     - Publishes route

7. **Customer Notification:**
   - All 18 pledged customers get email/SMS:
     - "Your proposed route is now live!"
     - "Book your seat for Monday 13th January"
   - Link to BusBookingsPage with route pre-selected

8. **Ongoing Tracking:**
   - System tracks actual usage vs pledges
   - If usage drops below 50% of pledges, admin gets alert
   - Customers who pledged but don't book get reminder

---

## 8. Privacy & GDPR Compliance

### **Privacy Notice Example**

```
Route Proposal Privacy Notice

When you create or vote on route proposals, we may share limited information with
other customers to help match travel needs:

What we share:
✓ Your postcode AREA (e.g., "S10") - NOT your full address
✓ Your destination (e.g., "Northern General Hospital")
✓ Your preferred travel times (e.g., "8:00-9:00")
✓ How often you travel (e.g., "Monday-Friday")

What we NEVER share:
✗ Your full home address
✗ Your name (unless you choose to make it public)
✗ Your phone number or email
✗ Your medical or mobility requirements
✗ Your payment information

You can:
- Control what you share with privacy settings
- Vote anonymously
- Withdraw consent at any time
- Request deletion of all your proposals/votes

By clicking "I Accept", you consent to this limited data sharing for route matching.
```

### **GDPR Features**

1. **Explicit Consent:** Checkbox before first proposal
2. **Right to Access:** Export all my proposals/votes (JSON/CSV)
3. **Right to Erasure:** Delete all my proposals/votes
4. **Right to Rectification:** Edit my proposals
5. **Data Portability:** Download all data
6. **Consent Withdrawal:** Turn off `share_travel_patterns` anytime

---

## 9. Success Metrics

### **Customer Engagement**
- % of customers who opt-in to route matching
- Number of proposals created per month
- Voting participation rate
- Proposal → route conversion rate

### **Service Efficiency**
- Routes created from proposals vs admin-created
- Customer-proposed routes utilization rate
- Average time to reach threshold
- Cost per passenger acquisition (proposal system vs traditional marketing)

### **Community Building**
- Number of customers discovering shared travel needs
- Comments/discussion engagement
- Repeat proposal creators
- Customer satisfaction with new routes

---

## 10. Future Enhancements

### **Phase 2 Features**
1. **Map View:** Visual map showing proposal origin areas and destinations
2. **Route Variants:** "I like this but need earlier departure" → create variant
3. **Seasonal Routes:** Summer-only routes, school term routes
4. **Social Features:** Follow proposals, share on social media
5. **Reputation System:** Active proposers get badges/points
6. **Integration with Cooperative Voting:** Use governance token for weighted voting

### **Phase 3 Features**
1. **AI-Powered Suggestions:** "Based on your travel pattern, you might like..."
2. **Dynamic Pricing:** Show how fare changes based on pledges (more passengers = lower fare)
3. **Group Discount Pledges:** "If we get 20 pledges, fare drops to £4"
4. **Route Optimization:** Suggest optimal stop placement based on pledge addresses
5. **Mobile App:** Push notifications for matching proposals

---

## 11. Implementation Checklist

### **Database (Week 1)**
- [ ] Create migration file: `add-customer-route-proposals.sql`
- [ ] Create tables: `tenant_customer_travel_privacy`, `tenant_customer_route_proposals`, `tenant_route_proposal_votes`, `tenant_route_proposal_comments`, `tenant_route_proposal_invitations`
- [ ] Run migration on development database
- [ ] Seed test data (5 sample proposals)

### **Backend (Week 2-3)**
- [ ] Create `customer-route-proposals.routes.ts`
- [ ] Implement all API endpoints (15 total)
- [ ] Implement smart matching algorithm
- [ ] Implement vote counting logic
- [ ] Add privacy consent checks
- [ ] Write unit tests for matching algorithm

### **Frontend (Week 4-5)**
- [ ] Create `RouteProposalsTab` component
- [ ] Create `RouteProposalCard` component
- [ ] Create `CreateProposalModal` component
- [ ] Create `VoteModal` component
- [ ] Create `ProposalDetailsModal` component
- [ ] Create admin `RouteProposalsReviewPage`
- [ ] Add privacy consent dialog
- [ ] Add to CustomerDashboard navigation

### **Testing (Week 6)**
- [ ] Unit tests for matching algorithm
- [ ] Integration tests for API endpoints
- [ ] E2E test: Create proposal → Vote → Approve → Convert to route
- [ ] Privacy compliance testing
- [ ] Load testing (100 proposals, 1000 votes)

### **Documentation (Week 6)**
- [ ] User guide: "How to Propose a Route"
- [ ] Admin guide: "Reviewing and Approving Proposals"
- [ ] Privacy notice final version
- [ ] Update main documentation

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Status:** Design Complete - Ready for Implementation
