-- =====================================================
-- Co-operative Voting & Democracy System
-- =====================================================
-- This migration adds democratic voting functionality
-- for cooperative organizations.
--
-- Features:
-- - Proposals (motions, decisions, elections)
-- - Member voting with weighted votes support
-- - Voting eligibility tracking
-- - Real-time vote tallying
-- - Quorum and approval threshold enforcement
--
-- Usage:
--   psql -U postgres -d travel_support_dev -f add-cooperative-voting-system.sql
-- =====================================================

-- =====================================================
-- 1. PROPOSALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cooperative_proposals (
  proposal_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Proposal details
  proposal_type VARCHAR(50) NOT NULL, -- 'policy', 'financial', 'board_election', 'service_change', 'hiring', 'investment'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  proposal_data JSONB, -- Type-specific data (budget amounts, candidate info, etc.)

  -- Voting period
  voting_opens TIMESTAMP NOT NULL,
  voting_closes TIMESTAMP NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'open', 'closed', 'passed', 'failed', 'cancelled'

  -- Voting rules
  quorum_required INT DEFAULT 50, -- Percentage of eligible voters needed
  approval_threshold INT DEFAULT 50, -- Percentage needed to pass (of votes cast)

  -- Results (populated when voting closes)
  result JSONB, -- { yes: 10, no: 5, abstain: 2, total_votes: 17, eligible_voters: 25 }

  -- Metadata
  created_by INT REFERENCES tenant_users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  notes TEXT,

  -- Constraints
  CONSTRAINT chk_voting_period CHECK (voting_closes > voting_opens),
  CONSTRAINT chk_quorum CHECK (quorum_required >= 0 AND quorum_required <= 100),
  CONSTRAINT chk_threshold CHECK (approval_threshold >= 0 AND approval_threshold <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON cooperative_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON cooperative_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_type ON cooperative_proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_proposals_voting_period ON cooperative_proposals(voting_opens, voting_closes);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_status ON cooperative_proposals(tenant_id, status);

-- =====================================================
-- 2. VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cooperative_votes (
  vote_id SERIAL PRIMARY KEY,
  proposal_id INT NOT NULL REFERENCES cooperative_proposals(proposal_id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id) ON DELETE CASCADE,

  -- Vote details
  vote_choice VARCHAR(50) NOT NULL, -- 'yes', 'no', 'abstain'
  vote_weight DECIMAL(10,2) DEFAULT 1.0, -- Weighted voting support (shares-based, etc.)

  -- Metadata
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  anonymized BOOLEAN DEFAULT FALSE, -- For anonymous voting
  voter_comment TEXT, -- Optional comment on vote

  -- Audit trail
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,

  -- Ensure one vote per member per proposal
  UNIQUE(proposal_id, member_id),

  -- Constraints
  CONSTRAINT chk_vote_choice CHECK (vote_choice IN ('yes', 'no', 'abstain')),
  CONSTRAINT chk_vote_weight CHECK (vote_weight >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON cooperative_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_member ON cooperative_votes(member_id);
CREATE INDEX IF NOT EXISTS idx_votes_proposal_choice ON cooperative_votes(proposal_id, vote_choice);

-- =====================================================
-- 3. VOTING ELIGIBILITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cooperative_voting_eligibility (
  eligibility_id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES cooperative_membership(membership_id) ON DELETE CASCADE,

  -- Eligibility rules
  proposal_type VARCHAR(50), -- NULL = eligible for all types
  eligible BOOLEAN DEFAULT TRUE,
  reason TEXT, -- Why ineligible (suspended, probation, etc.)

  -- Effective period
  effective_date DATE DEFAULT CURRENT_DATE,
  expires_date DATE, -- NULL = no expiration

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES tenant_users(user_id),
  notes TEXT,

  -- Constraints
  CONSTRAINT chk_eligibility_dates CHECK (expires_date IS NULL OR expires_date > effective_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eligibility_tenant ON cooperative_voting_eligibility(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_member ON cooperative_voting_eligibility(member_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_type ON cooperative_voting_eligibility(proposal_type);
CREATE INDEX IF NOT EXISTS idx_eligibility_active ON cooperative_voting_eligibility(eligible, effective_date, expires_date);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate proposal results
CREATE OR REPLACE FUNCTION calculate_proposal_results(p_proposal_id INT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_yes_count INT;
  v_no_count INT;
  v_abstain_count INT;
  v_yes_weight DECIMAL(10,2);
  v_no_weight DECIMAL(10,2);
  v_abstain_weight DECIMAL(10,2);
  v_total_votes INT;
  v_total_weight DECIMAL(10,2);
  v_eligible_voters INT;
  v_quorum_required INT;
  v_approval_threshold INT;
  v_quorum_met BOOLEAN;
  v_approved BOOLEAN;
  v_tenant_id INT;
BEGIN
  -- Get proposal details
  SELECT tenant_id, quorum_required, approval_threshold
  INTO v_tenant_id, v_quorum_required, v_approval_threshold
  FROM cooperative_proposals
  WHERE proposal_id = p_proposal_id;

  -- Count votes by choice (unweighted)
  SELECT
    COUNT(*) FILTER (WHERE vote_choice = 'yes'),
    COUNT(*) FILTER (WHERE vote_choice = 'no'),
    COUNT(*) FILTER (WHERE vote_choice = 'abstain'),
    COUNT(*)
  INTO v_yes_count, v_no_count, v_abstain_count, v_total_votes
  FROM cooperative_votes
  WHERE proposal_id = p_proposal_id;

  -- Count votes by weight (for weighted voting)
  SELECT
    COALESCE(SUM(vote_weight) FILTER (WHERE vote_choice = 'yes'), 0),
    COALESCE(SUM(vote_weight) FILTER (WHERE vote_choice = 'no'), 0),
    COALESCE(SUM(vote_weight) FILTER (WHERE vote_choice = 'abstain'), 0),
    COALESCE(SUM(vote_weight), 0)
  INTO v_yes_weight, v_no_weight, v_abstain_weight, v_total_weight
  FROM cooperative_votes
  WHERE proposal_id = p_proposal_id;

  -- Count eligible voters
  SELECT COUNT(DISTINCT cm.membership_id)
  INTO v_eligible_voters
  FROM cooperative_membership cm
  WHERE cm.tenant_id = v_tenant_id
    AND cm.is_active = TRUE
    AND cm.voting_rights = TRUE;

  -- Calculate quorum (percentage of eligible voters who voted)
  v_quorum_met := (v_eligible_voters > 0 AND ((v_total_votes::DECIMAL / v_eligible_voters) * 100) >= v_quorum_required);

  -- Calculate approval (percentage of votes that are 'yes')
  v_approved := (v_total_votes > 0 AND ((v_yes_count::DECIMAL / v_total_votes) * 100) >= v_approval_threshold);

  -- Build result JSON
  v_result := jsonb_build_object(
    'yes_count', v_yes_count,
    'no_count', v_no_count,
    'abstain_count', v_abstain_count,
    'yes_weight', v_yes_weight,
    'no_weight', v_no_weight,
    'abstain_weight', v_abstain_weight,
    'total_votes', v_total_votes,
    'total_weight', v_total_weight,
    'eligible_voters', v_eligible_voters,
    'quorum_required', v_quorum_required,
    'approval_threshold', v_approval_threshold,
    'quorum_met', v_quorum_met,
    'approved', v_approved,
    'turnout_percentage', CASE WHEN v_eligible_voters > 0 THEN ROUND((v_total_votes::DECIMAL / v_eligible_voters) * 100, 2) ELSE 0 END,
    'approval_percentage', CASE WHEN v_total_votes > 0 THEN ROUND((v_yes_count::DECIMAL / v_total_votes) * 100, 2) ELSE 0 END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically close expired proposals
CREATE OR REPLACE FUNCTION close_expired_proposals()
RETURNS void AS $$
BEGIN
  -- Close proposals where voting period has ended
  UPDATE cooperative_proposals
  SET
    status = CASE
      WHEN (result->>'quorum_met')::BOOLEAN = TRUE AND (result->>'approved')::BOOLEAN = TRUE THEN 'passed'
      WHEN (result->>'quorum_met')::BOOLEAN = TRUE AND (result->>'approved')::BOOLEAN = FALSE THEN 'failed'
      ELSE 'failed' -- Quorum not met = failed
    END,
    closed_at = CURRENT_TIMESTAMP,
    result = calculate_proposal_results(proposal_id)
  WHERE status = 'open'
    AND voting_closes <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if member is eligible to vote on a proposal
CREATE OR REPLACE FUNCTION is_member_eligible(p_member_id INT, p_proposal_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_eligible BOOLEAN;
  v_member_active BOOLEAN;
  v_voting_rights BOOLEAN;
BEGIN
  -- Check if member is active and has voting rights
  SELECT is_active, voting_rights
  INTO v_member_active, v_voting_rights
  FROM cooperative_membership
  WHERE membership_id = p_member_id;

  -- Must be active member with voting rights
  IF NOT v_member_active OR NOT v_voting_rights THEN
    RETURN FALSE;
  END IF;

  -- Check for specific eligibility restrictions
  SELECT NOT EXISTS (
    SELECT 1
    FROM cooperative_voting_eligibility
    WHERE member_id = p_member_id
      AND (proposal_type IS NULL OR proposal_type = p_proposal_type)
      AND eligible = FALSE
      AND effective_date <= CURRENT_DATE
      AND (expires_date IS NULL OR expires_date >= CURRENT_DATE)
  ) INTO v_eligible;

  RETURN v_eligible;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger to update result when vote is cast
CREATE OR REPLACE FUNCTION update_proposal_result_on_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the result JSON in proposals table
  UPDATE cooperative_proposals
  SET result = calculate_proposal_results(NEW.proposal_id),
      updated_at = CURRENT_TIMESTAMP
  WHERE proposal_id = NEW.proposal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_result_on_vote
AFTER INSERT OR UPDATE OR DELETE ON cooperative_votes
FOR EACH ROW
EXECUTE FUNCTION update_proposal_result_on_vote();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proposals_updated_at
BEFORE UPDATE ON cooperative_proposals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. VIEWS
-- =====================================================

-- View for active proposals with vote counts
CREATE OR REPLACE VIEW v_active_proposals AS
SELECT
  p.proposal_id,
  p.tenant_id,
  p.proposal_type,
  p.title,
  p.description,
  p.voting_opens,
  p.voting_closes,
  p.status,
  p.quorum_required,
  p.approval_threshold,
  p.result,
  p.created_at,
  u.email AS created_by_email,
  u.full_name AS created_by_name,
  CASE
    WHEN p.voting_opens > CURRENT_TIMESTAMP THEN 'pending'
    WHEN p.voting_closes < CURRENT_TIMESTAMP THEN 'expired'
    ELSE 'active'
  END AS voting_status,
  EXTRACT(EPOCH FROM (p.voting_closes - CURRENT_TIMESTAMP)) / 3600 AS hours_remaining
FROM cooperative_proposals p
LEFT JOIN tenant_users u ON p.created_by = u.user_id
WHERE p.status IN ('open', 'draft')
ORDER BY p.voting_closes ASC;

-- View for member voting history
CREATE OR REPLACE VIEW v_member_voting_history AS
SELECT
  v.vote_id,
  v.proposal_id,
  v.member_id,
  v.vote_choice,
  v.vote_weight,
  v.voted_at,
  p.title AS proposal_title,
  p.proposal_type,
  p.status AS proposal_status,
  m.member_type,
  CASE
    WHEN m.member_reference_id IS NOT NULL AND m.member_type = 'driver' THEN d.name
    WHEN m.member_reference_id IS NOT NULL AND m.member_type = 'customer' THEN c.name
    ELSE 'Unknown'
  END AS member_name
FROM cooperative_votes v
JOIN cooperative_proposals p ON v.proposal_id = p.proposal_id
JOIN cooperative_membership m ON v.member_id = m.membership_id
LEFT JOIN tenant_drivers d ON m.member_type = 'driver' AND m.member_reference_id = d.driver_id
LEFT JOIN tenant_customers c ON m.member_type = 'customer' AND m.member_reference_id = c.customer_id
ORDER BY v.voted_at DESC;

-- =====================================================
-- 7. SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample proposals (commented out - uncomment for testing)
/*
INSERT INTO cooperative_proposals (tenant_id, proposal_type, title, description, voting_opens, voting_closes, quorum_required, approval_threshold, created_by)
VALUES
  (1, 'policy', 'Adopt Flexible Working Hours Policy', 'Allow workers to choose start times between 7am-10am', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 50, 66, 1),
  (1, 'financial', 'Increase Reserve Fund to 30%', 'Increase profit reserve from 20% to 30% for stability', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', 60, 75, 1),
  (1, 'service_change', 'Add Weekend Night Service', 'Expand service to Saturday nights 8pm-11pm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '10 days', 50, 50, 1);
*/

-- =====================================================
-- 8. GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cooperative_proposals TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cooperative_votes TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cooperative_voting_eligibility TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE cooperative_proposals_proposal_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE cooperative_votes_vote_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE cooperative_voting_eligibility_eligibility_id_seq TO your_app_user;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON TABLE cooperative_proposals IS 'Democratic proposals and motions for cooperative governance';
COMMENT ON TABLE cooperative_votes IS 'Individual member votes on proposals';
COMMENT ON TABLE cooperative_voting_eligibility IS 'Tracks voting eligibility restrictions for members';
COMMENT ON FUNCTION calculate_proposal_results IS 'Calculates vote tallies and determines if proposal passed';
COMMENT ON FUNCTION close_expired_proposals IS 'Closes proposals where voting period has ended';
COMMENT ON FUNCTION is_member_eligible IS 'Checks if a member can vote on a specific proposal type';
