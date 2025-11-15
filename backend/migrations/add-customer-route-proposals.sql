-- Migration: Customer Route Proposals System
-- Date: 2025-01-15
-- Purpose: Democratic, community-driven route planning with cooperative fare transparency

-- =======================================================================================
-- 1. CUSTOMER TRAVEL PRIVACY PREFERENCES
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_customer_travel_privacy (
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
CREATE INDEX idx_customer_privacy_customer ON tenant_customer_travel_privacy(customer_id);

COMMENT ON TABLE tenant_customer_travel_privacy IS 'Customer privacy preferences for route proposal matching';
COMMENT ON COLUMN tenant_customer_travel_privacy.share_travel_patterns IS 'Opt-in to be included in route matching and proposals';
COMMENT ON COLUMN tenant_customer_travel_privacy.privacy_level IS 'Level of data sharing: private, area_only, full_sharing';

-- =======================================================================================
-- 2. CUSTOMER ROUTE PROPOSALS
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_customer_route_proposals (
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
  -- e.g., ARRAY['S10', 'S11', 'S17'] - Area codes only, not full postcodes

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
CREATE INDEX idx_route_proposals_proposer ON tenant_customer_route_proposals(proposed_by_customer_id);

COMMENT ON TABLE tenant_customer_route_proposals IS 'Customer-proposed bus routes for democratic service planning';
COMMENT ON COLUMN tenant_customer_route_proposals.total_pledges IS 'Number of customers pledging to use this service regularly';
COMMENT ON COLUMN tenant_customer_route_proposals.minimum_passengers_required IS 'Minimum viable passenger count for route to be considered';
COMMENT ON COLUMN tenant_customer_route_proposals.status IS 'Proposal lifecycle: open, threshold_met, under_review, approved, rejected, implemented, closed';

-- =======================================================================================
-- 3. ROUTE PROPOSAL VOTES/PLEDGES
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_route_proposal_votes (
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
  -- e.g., ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

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

  CONSTRAINT unique_customer_proposal_vote UNIQUE(proposal_id, customer_id),
  CONSTRAINT valid_vote_type CHECK (vote_type IN ('interested', 'pledge', 'maybe'))
);

CREATE INDEX idx_proposal_votes_proposal ON tenant_route_proposal_votes(proposal_id, vote_type);
CREATE INDEX idx_proposal_votes_customer ON tenant_route_proposal_votes(customer_id);
CREATE INDEX idx_proposal_votes_pledge ON tenant_route_proposal_votes(proposal_id) WHERE vote_type = 'pledge';

COMMENT ON TABLE tenant_route_proposal_votes IS 'Customer votes and pledges for route proposals';
COMMENT ON COLUMN tenant_route_proposal_votes.vote_type IS 'Level of interest: interested (casual), pledge (binding commitment), maybe (occasional)';
COMMENT ON COLUMN tenant_route_proposal_votes.willing_to_pay_amount IS 'Maximum fare customer will pay (helps with viability calculation)';

-- =======================================================================================
-- 4. ROUTE PROPOSAL COMMENTS/DISCUSSION
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_route_proposal_comments (
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
CREATE INDEX idx_proposal_comments_customer ON tenant_route_proposal_comments(customer_id);

COMMENT ON TABLE tenant_route_proposal_comments IS 'Discussion threads on route proposals';
COMMENT ON COLUMN tenant_route_proposal_comments.parent_comment_id IS 'For threaded replies';
COMMENT ON COLUMN tenant_route_proposal_comments.is_flagged IS 'Flagged for moderation review';

-- =======================================================================================
-- 5. ROUTE PROPOSAL INVITATIONS
-- =======================================================================================

CREATE TABLE IF NOT EXISTS tenant_route_proposal_invitations (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_proposal_invitation UNIQUE(proposal_id, customer_id)
);

CREATE INDEX idx_proposal_invitations_customer ON tenant_route_proposal_invitations(customer_id, status);
CREATE INDEX idx_proposal_invitations_proposal ON tenant_route_proposal_invitations(proposal_id);
CREATE INDEX idx_proposal_invitations_score ON tenant_route_proposal_invitations(match_score DESC);

COMMENT ON TABLE tenant_route_proposal_invitations IS 'Smart invitations to customers who match proposal criteria';
COMMENT ON COLUMN tenant_route_proposal_invitations.match_score IS 'Algorithm score 0-100 for how well customer matches proposal';
COMMENT ON COLUMN tenant_route_proposal_invitations.match_reason IS 'Why customer was invited (similar_origin, same_destination, matching_schedule, postcode_proximity)';

-- =======================================================================================
-- 6. TRIGGERS FOR COMMENT COUNT
-- =======================================================================================

-- Function to update comment count when comments are added/removed
CREATE OR REPLACE FUNCTION update_proposal_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tenant_customer_route_proposals
    SET total_comments = total_comments + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE proposal_id = NEW.proposal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenant_customer_route_proposals
    SET total_comments = GREATEST(total_comments - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE proposal_id = OLD.proposal_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_proposal_comment_count ON tenant_route_proposal_comments;
CREATE TRIGGER trg_update_proposal_comment_count
AFTER INSERT OR DELETE ON tenant_route_proposal_comments
FOR EACH ROW
EXECUTE FUNCTION update_proposal_comment_count();

COMMENT ON FUNCTION update_proposal_comment_count() IS 'Automatically updates comment count on proposals when comments added/removed';

-- =======================================================================================
-- 7. HELPER VIEWS
-- =======================================================================================

-- View for active proposals with enriched data
CREATE OR REPLACE VIEW v_active_route_proposals AS
SELECT
  p.*,
  CASE
    WHEN p.proposer_is_anonymous THEN 'Anonymous Customer'
    ELSE p.proposer_name
  END as display_name,
  (p.total_pledges >= p.minimum_passengers_required) as is_viable,
  (p.total_pledges >= p.target_passengers) as target_reached,
  ROUND((p.total_pledges::DECIMAL / p.target_passengers) * 100, 0) as progress_percentage,

  -- Count votes by type
  (SELECT COUNT(*) FROM tenant_route_proposal_votes WHERE proposal_id = p.proposal_id AND vote_type = 'pledge') as pledge_count,
  (SELECT COUNT(*) FROM tenant_route_proposal_votes WHERE proposal_id = p.proposal_id AND vote_type = 'interested') as interested_count,
  (SELECT COUNT(*) FROM tenant_route_proposal_votes WHERE proposal_id = p.proposal_id AND vote_type = 'maybe') as maybe_count,

  -- Average willing to pay (for pledges only)
  (SELECT AVG(willing_to_pay_amount)
   FROM tenant_route_proposal_votes
   WHERE proposal_id = p.proposal_id AND vote_type = 'pledge') as avg_willing_to_pay

FROM tenant_customer_route_proposals p
WHERE p.status IN ('open', 'threshold_met', 'under_review');

COMMENT ON VIEW v_active_route_proposals IS 'Active proposals with enriched data for customer browsing';

-- =======================================================================================
-- MIGRATION COMPLETE
-- =======================================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Customer Route Proposals migration completed successfully';
  RAISE NOTICE 'Tables created: tenant_customer_travel_privacy, tenant_customer_route_proposals, tenant_route_proposal_votes, tenant_route_proposal_comments, tenant_route_proposal_invitations';
  RAISE NOTICE 'View created: v_active_route_proposals';
  RAISE NOTICE 'Trigger created: update_proposal_comment_count';
END $$;
