/**
 * Customer Route Proposals Routes
 *
 * Democratic, community-driven route planning with cooperative fare transparency.
 * Customers propose routes, vote with pledges, and admin approves when viable.
 *
 * Features:
 * - Route proposal creation with privacy controls
 * - Smart passenger matching algorithm
 * - Voting/pledging with commitment levels
 * - Dynamic fare preview based on pledges
 * - Viability analysis for admin review
 * - Conversion to actual Section 22 bus routes
 */

import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import {
  generateFareQuote,
  analyzeRouteProposalViability,
  calculateFareWithAdditionalPassengers
} from '../services/cooperativeFareCalculation.service';

const router: Router = express.Router();

// ============================================================================
// TYPES
// ============================================================================

interface CustomerTravelPrivacy {
  privacy_id: number;
  customer_id: number;
  share_travel_patterns: boolean;
  privacy_level: 'private' | 'area_only' | 'full_sharing';
  privacy_consent_given: boolean;
}

interface RouteProposal {
  proposal_id: number;
  tenant_id: number;
  route_name: string;
  origin_area: string;
  destination_name: string;
  total_pledges: number;
  total_votes: number;
  status: string;
}

interface MatchScore {
  customer_id: number;
  score: number;
  match_reason: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate match score between proposal and customer
 * Score: 0-100 based on origin, destination, schedule, frequency
 */
function calculateMatchScore(
  proposal: any,
  customer: any
): { score: number; match_reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Origin proximity (40 points)
  if (customer.postcode) {
    const customerPostcodeArea = customer.postcode.split(' ')[0].toUpperCase();
    const proposalAreas = proposal.origin_postcodes || [];

    if (proposalAreas.includes(customerPostcodeArea)) {
      score += 40;
      reasons.push('same_postcode_area');
    } else if (isAdjacentPostcode(customerPostcodeArea, proposalAreas)) {
      score += 20;
      reasons.push('adjacent_postcode_area');
    }
  }

  // 2. Destination match (30 points)
  if (customer.schedule) {
    const schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule)
      : customer.schedule;

    // Check if customer's regular destinations match proposal
    const regularDestinations = extractDestinationsFromSchedule(schedule);
    if (regularDestinations.some(dest =>
      dest.toLowerCase().includes(proposal.destination_name.toLowerCase())
    )) {
      score += 30;
      reasons.push('same_destination');
    }

    // 3. Schedule overlap (20 points)
    const customerDays = extractTravelDaysFromSchedule(schedule);
    const proposalDays = extractProposalDays(proposal);
    const daysOverlap = customerDays.filter(day => proposalDays.includes(day)).length;

    if (daysOverlap >= 3) {
      score += 20;
      reasons.push('matching_schedule');
    } else if (daysOverlap >= 1) {
      score += 10;
      reasons.push('partial_schedule_match');
    }
  }

  // 4. Frequency match (10 points)
  if (customer.schedule) {
    const schedule = typeof customer.schedule === 'string'
      ? JSON.parse(customer.schedule)
      : customer.schedule;

    const customerFrequency = determineScheduleFrequency(schedule);
    if (customerFrequency === proposal.proposed_frequency) {
      score += 10;
      reasons.push('matching_frequency');
    }
  }

  const match_reason = reasons.length > 0 ? reasons.join(', ') : 'general_interest';

  return { score, match_reason };
}

/**
 * Check if postcode is adjacent to any in the list
 * (Simplified - real implementation would use postcode database)
 */
function isAdjacentPostcode(postcode: string, postcodeList: string[]): boolean {
  // Extract area (e.g., "S10" -> "S")
  const area = postcode.replace(/[0-9]/g, '');

  // Check if any postcode in list shares the same area
  return postcodeList.some(pc => pc.startsWith(area));
}

/**
 * Extract destinations from customer schedule
 */
function extractDestinationsFromSchedule(schedule: any): string[] {
  const destinations: string[] = [];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    if (schedule[day]?.destination) {
      destinations.push(schedule[day].destination);
    }
  }

  return [...new Set(destinations)]; // Unique destinations
}

/**
 * Extract travel days from customer schedule
 */
function extractTravelDaysFromSchedule(schedule: any): string[] {
  const days: string[] = [];

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of dayNames) {
    if (schedule[day]?.destination) {
      days.push(day);
    }
  }

  return days;
}

/**
 * Extract operating days from proposal
 */
function extractProposalDays(proposal: any): string[] {
  const days: string[] = [];
  const dayMapping = [
    { key: 'operates_monday', value: 'monday' },
    { key: 'operates_tuesday', value: 'tuesday' },
    { key: 'operates_wednesday', value: 'wednesday' },
    { key: 'operates_thursday', value: 'thursday' },
    { key: 'operates_friday', value: 'friday' },
    { key: 'operates_saturday', value: 'saturday' },
    { key: 'operates_sunday', value: 'sunday' },
  ];

  for (const { key, value } of dayMapping) {
    if (proposal[key]) {
      days.push(value);
    }
  }

  return days;
}

/**
 * Determine schedule frequency
 */
function determineScheduleFrequency(schedule: any): string {
  const travelDays = extractTravelDaysFromSchedule(schedule);

  if (travelDays.length === 7) return 'daily';
  if (travelDays.length === 5 &&
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].every(d => travelDays.includes(d))) {
    return 'weekdays';
  }
  if (travelDays.length === 2 && travelDays.includes('saturday') && travelDays.includes('sunday')) {
    return 'weekends';
  }

  return 'custom';
}

/**
 * Find and invite matching customers for a proposal
 */
async function findAndInviteMatchingCustomers(tenantId: number, proposalId: number): Promise<number> {
  logger.info('Finding matching customers for proposal', { tenantId, proposalId });

  // Get proposal details
  const proposal = await queryOne(`
    SELECT * FROM tenant_customer_route_proposals
    WHERE proposal_id = $1 AND tenant_id = $2
  `, [proposalId, tenantId]);

  if (!proposal) {
    throw new NotFoundError('Proposal not found');
  }

  // Get all customers who have opted in to sharing
  const customers = await query(`
    SELECT
      c.customer_id,
      c.name,
      c.postcode,
      c.schedule
    FROM tenant_customers c
    JOIN tenant_customer_travel_privacy p ON c.customer_id = p.customer_id AND c.tenant_id = p.tenant_id
    WHERE c.tenant_id = $1
      AND p.share_travel_patterns = true
      AND p.privacy_consent_given = true
      AND c.customer_id != $2
      AND c.is_active = true
  `, [tenantId, proposal.proposed_by_customer_id]);

  let invitationCount = 0;

  for (const customer of customers) {
    // Calculate match score
    const { score, match_reason } = calculateMatchScore(proposal, customer);

    // Only invite if match score >= 50
    if (score >= 50) {
      // Check if invitation already exists
      const existing = await queryOne(`
        SELECT invitation_id FROM tenant_route_proposal_invitations
        WHERE proposal_id = $1 AND customer_id = $2
      `, [proposalId, customer.customer_id]);

      if (!existing) {
        await query(`
          INSERT INTO tenant_route_proposal_invitations (
            tenant_id, proposal_id, customer_id, match_reason, match_score, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [tenantId, proposalId, customer.customer_id, match_reason, score]);

        invitationCount++;
      }
    }
  }

  logger.info('Sent invitations', { proposalId, invitationCount });

  return invitationCount;
}

/**
 * Recalculate vote counts for a proposal
 */
async function recalculateProposalVotes(proposalId: number): Promise<void> {
  const counts = await queryOne<{ total_votes: string; total_pledges: string }>(`
    SELECT
      COUNT(*) as total_votes,
      COUNT(*) FILTER (WHERE vote_type = 'pledge') as total_pledges
    FROM tenant_route_proposal_votes
    WHERE proposal_id = $1
  `, [proposalId]);

  const totalVotes = parseInt(counts?.total_votes || '0');
  const totalPledges = parseInt(counts?.total_pledges || '0');

  // Get proposal to check minimum threshold
  const proposal = await queryOne(`
    SELECT minimum_passengers_required, status
    FROM tenant_customer_route_proposals
    WHERE proposal_id = $1
  `, [proposalId]);

  // Update status if threshold met
  let newStatus = proposal?.status;
  if (totalPledges >= (proposal?.minimum_passengers_required || 8) && proposal?.status === 'open') {
    newStatus = 'threshold_met';
  }

  await query(`
    UPDATE tenant_customer_route_proposals
    SET total_votes = $2,
        total_pledges = $3,
        status = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE proposal_id = $1
  `, [proposalId, totalVotes, totalPledges, newStatus]);
}

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals
 * @desc Get all active route proposals (browseable by all customers)
 */
router.get(
  '/tenants/:tenantId/customer-route-proposals',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status = 'open', sortBy = 'popular', limit = '50' } = req.query;

    logger.info('Fetching route proposals', { tenantId, status, sortBy });

    let orderByClause = 'p.created_at DESC';
    if (sortBy === 'popular') {
      orderByClause = 'p.total_pledges DESC, p.total_votes DESC';
    } else if (sortBy === 'closing_soon') {
      orderByClause = 'p.created_at ASC';
    }

    const proposals = await query(`
      SELECT
        p.*,
        CASE
          WHEN p.proposer_is_anonymous THEN 'Anonymous Customer'
          ELSE p.proposer_name
        END as display_name,
        (p.total_pledges >= p.minimum_passengers_required) as is_viable,
        (p.total_pledges >= p.target_passengers) as target_reached,
        COUNT(c.comment_id) as comment_count
      FROM tenant_customer_route_proposals p
      LEFT JOIN tenant_route_proposal_comments c ON p.proposal_id = c.proposal_id
      WHERE p.tenant_id = $1
        ${status !== 'all' ? 'AND p.status = $2' : ''}
      GROUP BY p.proposal_id
      ORDER BY ${orderByClause}
      LIMIT $${status !== 'all' ? '3' : '2'}
    `, status !== 'all' ? [tenantId, status, limit] : [tenantId, limit]);

    // Add fare preview for each proposal
    const proposalsWithFares = proposals.map(proposal => {
      // Estimate distance (simplified - could use Google Maps API)
      const estimatedDistance = 8; // miles
      const estimatedDuration = 35; // minutes

      const fareQuote = generateFareQuote(
        proposal.route_name,
        proposal.origin_area,
        proposal.destination_name,
        estimatedDistance,
        estimatedDuration,
        proposal.target_passengers,
        proposal.total_pledges || 1
      );

      return {
        ...proposal,
        fare_preview: {
          current_fare: fareQuote.fare_at_current_capacity,
          fare_at_target: fareQuote.fare_tiers.find(t => t.passenger_count === proposal.target_passengers)?.fare_per_passenger,
          is_viable: fareQuote.is_viable
        }
      };
    });

    res.json(proposalsWithFares);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customer-route-proposals
 * @desc Create new route proposal
 */
router.post(
  '/tenants/:tenantId/customer-route-proposals',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const customerId = (req as any).user?.customerId;

    if (!customerId) {
      throw new ForbiddenError('Only customers can create route proposals');
    }

    const {
      route_name,
      route_description,
      origin_area,
      origin_postcodes,
      destination_name,
      destination_address,
      destination_postcode,
      proposed_frequency,
      operates_monday,
      operates_tuesday,
      operates_wednesday,
      operates_thursday,
      operates_friday,
      operates_saturday,
      operates_sunday,
      departure_time_window_start,
      departure_time_window_end,
      estimated_journey_duration_minutes,
      minimum_passengers_required = 8,
      target_passengers = 16,
      proposer_is_anonymous = false
    } = req.body;

    logger.info('Creating route proposal', { tenantId, customerId, route_name });

    // Check privacy consent
    const privacy = await queryOne<CustomerTravelPrivacy>(`
      SELECT * FROM tenant_customer_travel_privacy
      WHERE tenant_id = $1 AND customer_id = $2
    `, [tenantId, customerId]);

    if (!privacy?.privacy_consent_given) {
      throw new ForbiddenError('You must accept the privacy policy before creating proposals');
    }

    // Get customer name
    const customer = await queryOne(`
      SELECT name FROM tenant_customers WHERE customer_id = $1
    `, [customerId]);

    // Create proposal
    const result = await query(`
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
        destination_address,
        destination_postcode,
        proposed_frequency,
        operates_monday,
        operates_tuesday,
        operates_wednesday,
        operates_thursday,
        operates_friday,
        operates_saturday,
        operates_sunday,
        departure_time_window_start,
        departure_time_window_end,
        estimated_journey_duration_minutes,
        minimum_passengers_required,
        target_passengers,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'open'
      )
      RETURNING *
    `, [
      tenantId,
      customerId,
      customer?.name,
      proposer_is_anonymous,
      route_name,
      route_description,
      origin_area,
      origin_postcodes,
      destination_name,
      destination_address,
      destination_postcode,
      proposed_frequency,
      operates_monday,
      operates_tuesday,
      operates_wednesday,
      operates_thursday,
      operates_friday,
      operates_saturday,
      operates_sunday,
      departure_time_window_start,
      departure_time_window_end,
      estimated_journey_duration_minutes,
      minimum_passengers_required,
      target_passengers
    ]);

    const proposal = result[0];

    // Trigger smart matching asynchronously
    findAndInviteMatchingCustomers(parseInt(tenantId), proposal.proposal_id)
      .catch(err => logger.error('Failed to send invitations', { error: err.message }));

    logger.info('Route proposal created', { proposalId: proposal.proposal_id });

    res.status(201).json(proposal);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customer-route-proposals/:proposalId/vote
 * @desc Vote or pledge interest in a proposal
 */
router.post(
  '/tenants/:tenantId/customer-route-proposals/:proposalId/vote',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const customerId = (req as any).user?.customerId;

    if (!customerId) {
      throw new ForbiddenError('Only customers can vote on proposals');
    }

    const {
      vote_type,
      expected_frequency,
      willing_to_pay_amount,
      is_anonymous = false,
      notes
    } = req.body;

    // Validate vote_type
    if (!['interested', 'pledge', 'maybe'].includes(vote_type)) {
      throw new ValidationError('Invalid vote_type. Must be: interested, pledge, or maybe');
    }

    // For pledges, require commitment details
    if (vote_type === 'pledge' && (!expected_frequency || !willing_to_pay_amount)) {
      throw new ValidationError('Pledges require expected_frequency and willing_to_pay_amount');
    }

    logger.info('Recording vote', { tenantId, proposalId, customerId, vote_type });

    // Get customer name
    const customer = await queryOne(`
      SELECT name FROM tenant_customers WHERE customer_id = $1
    `, [customerId]);

    // Check if already voted
    const existing = await queryOne(`
      SELECT vote_id FROM tenant_route_proposal_votes
      WHERE proposal_id = $1 AND customer_id = $2
    `, [proposalId, customerId]);

    if (existing) {
      // Update existing vote
      await query(`
        UPDATE tenant_route_proposal_votes
        SET vote_type = $3,
            expected_frequency = $4,
            willing_to_pay_amount = $5,
            is_anonymous = $6,
            voter_name = $7,
            notes = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE vote_id = $1
      `, [
        existing.vote_id,
        proposalId,
        vote_type,
        expected_frequency,
        willing_to_pay_amount,
        is_anonymous,
        is_anonymous ? null : customer?.name,
        notes
      ]);
    } else {
      // Create new vote
      await query(`
        INSERT INTO tenant_route_proposal_votes (
          tenant_id,
          proposal_id,
          customer_id,
          vote_type,
          expected_frequency,
          willing_to_pay_amount,
          is_anonymous,
          voter_name,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        tenantId,
        proposalId,
        customerId,
        vote_type,
        expected_frequency,
        willing_to_pay_amount,
        is_anonymous,
        is_anonymous ? null : customer?.name,
        notes
      ]);
    }

    // Recalculate vote counts
    await recalculateProposalVotes(parseInt(proposalId));

    logger.info('Vote recorded', { proposalId, vote_type });

    res.json({ message: 'Vote recorded successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals/:proposalId
 * @desc Get proposal details with fare preview
 */
router.get(
  '/tenants/:tenantId/customer-route-proposals/:proposalId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;

    const proposal = await queryOne(`
      SELECT
        p.*,
        CASE
          WHEN p.proposer_is_anonymous THEN 'Anonymous Customer'
          ELSE p.proposer_name
        END as display_name,
        (p.total_pledges >= p.minimum_passengers_required) as is_viable,
        (p.total_pledges >= p.target_passengers) as target_reached
      FROM tenant_customer_route_proposals p
      WHERE p.tenant_id = $1 AND p.proposal_id = $2
    `, [tenantId, proposalId]);

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    // Generate comprehensive fare quote
    const estimatedDistance = 8; // miles (could use Google Maps API)
    const estimatedDuration = proposal.estimated_journey_duration_minutes || 35;

    const fareQuote = generateFareQuote(
      proposal.route_name,
      proposal.origin_area,
      proposal.destination_name,
      estimatedDistance,
      estimatedDuration,
      proposal.target_passengers,
      proposal.total_pledges || 1
    );

    // Calculate fare preview for additional passengers
    const farePreview = [];
    for (let additional = 1; additional <= 5; additional++) {
      if (proposal.total_pledges + additional <= proposal.target_passengers) {
        const preview = calculateFareWithAdditionalPassengers(
          fareQuote.cost_breakdown.total_fixed_cost,
          proposal.total_pledges || 1,
          additional
        );
        farePreview.push({
          additional_passengers: additional,
          ...preview
        });
      }
    }

    res.json({
      ...proposal,
      fare_quote: fareQuote,
      fare_preview: farePreview
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals/my-invitations
 * @desc Get route proposals customer has been invited to
 */
router.get(
  '/tenants/:tenantId/customer-route-proposals/my-invitations',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const customerId = (req as any).user?.customerId;

    if (!customerId) {
      return res.json([]);
    }

    const invitations = await query(`
      SELECT
        i.*,
        p.route_name,
        p.origin_area,
        p.destination_name,
        p.proposed_frequency,
        p.departure_time_window_start,
        p.departure_time_window_end,
        p.total_pledges,
        p.target_passengers,
        p.status as proposal_status,
        (p.total_pledges >= p.minimum_passengers_required) as is_viable,
        (p.total_pledges >= p.target_passengers) as target_reached
      FROM tenant_route_proposal_invitations i
      JOIN tenant_customer_route_proposals p ON i.proposal_id = p.proposal_id
      WHERE i.tenant_id = $1
        AND i.customer_id = $2
        AND i.status IN ('pending', 'viewed')
        AND p.status = 'open'
      ORDER BY i.match_score DESC, i.created_at DESC
    `, [tenantId, customerId]);

    res.json(invitations);
  })
);

/**
 * @route GET /api/tenants/:tenantId/customer-route-proposals/my-privacy
 * @desc Get customer's privacy settings
 */
router.get(
  '/tenants/:tenantId/customer-route-proposals/my-privacy',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const customerId = (req as any).user?.customerId;

    if (!customerId) {
      throw new ForbiddenError('Only customers can access privacy settings');
    }

    const privacy = await queryOne(`
      SELECT * FROM tenant_customer_travel_privacy
      WHERE tenant_id = $1 AND customer_id = $2
    `, [tenantId, customerId]);

    if (!privacy) {
      // Return default settings if none exist
      return res.json({
        privacy_consent_given: false,
        share_travel_patterns: false,
        privacy_level: 'private'
      });
    }

    res.json(privacy);
  })
);

/**
 * @route POST /api/tenants/:tenantId/customer-route-proposals/privacy
 * @desc Update customer's privacy settings
 */
router.post(
  '/tenants/:tenantId/customer-route-proposals/privacy',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const customerId = (req as any).user?.customerId;

    if (!customerId) {
      throw new ForbiddenError('Only customers can update privacy settings');
    }

    const {
      privacy_consent_given,
      share_travel_patterns,
      privacy_level
    } = req.body;

    // Validate privacy_level
    if (!['private', 'area_only', 'full_sharing'].includes(privacy_level)) {
      throw new ValidationError('Invalid privacy_level. Must be: private, area_only, or full_sharing');
    }

    logger.info('Updating privacy settings', { tenantId, customerId, privacy_level });

    // Check if settings exist
    const existing = await queryOne(`
      SELECT privacy_id FROM tenant_customer_travel_privacy
      WHERE tenant_id = $1 AND customer_id = $2
    `, [tenantId, customerId]);

    if (existing) {
      // Update existing
      await query(`
        UPDATE tenant_customer_travel_privacy
        SET privacy_consent_given = $3,
            share_travel_patterns = $4,
            privacy_level = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE privacy_id = $1
      `, [
        existing.privacy_id,
        tenantId,
        privacy_consent_given,
        share_travel_patterns,
        privacy_level
      ]);
    } else {
      // Create new
      await query(`
        INSERT INTO tenant_customer_travel_privacy (
          tenant_id,
          customer_id,
          privacy_consent_given,
          share_travel_patterns,
          privacy_level
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        tenantId,
        customerId,
        privacy_consent_given,
        share_travel_patterns,
        privacy_level
      ]);
    }

    logger.info('Privacy settings updated', { customerId });

    res.json({ message: 'Privacy settings updated successfully' });
  })
);

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/admin/route-proposals
 * @desc Get all route proposals with viability analysis (Admin only)
 */
router.get(
  '/tenants/:tenantId/admin/route-proposals',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can access this endpoint');
    }

    logger.info('Admin fetching all route proposals', { tenantId });

    const proposals = await query(`
      SELECT
        p.*,
        CASE
          WHEN p.proposer_is_anonymous THEN 'Anonymous Customer'
          ELSE p.proposer_name
        END as display_name,
        (p.total_pledges >= p.minimum_passengers_required) as is_viable,
        (p.total_pledges >= p.target_passengers) as target_reached,
        COUNT(c.comment_id) as comment_count
      FROM tenant_customer_route_proposals p
      LEFT JOIN tenant_route_proposal_comments c ON p.proposal_id = c.proposal_id
      WHERE p.tenant_id = $1
      GROUP BY p.proposal_id
      ORDER BY
        CASE p.status
          WHEN 'threshold_met' THEN 1
          WHEN 'open' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          WHEN 'converted_to_route' THEN 5
        END,
        p.created_at DESC
    `, [tenantId]);

    // Add viability analysis for each proposal
    const proposalsWithAnalysis = await Promise.all(proposals.map(async (proposal) => {
      // Get pledged customers for this proposal
      const pledges = await query(`
        SELECT
          expected_frequency,
          willing_to_pay_amount
        FROM tenant_route_proposal_votes
        WHERE proposal_id = $1 AND vote_type = 'pledge'
      `, [proposal.proposal_id]);

      let viabilityAnalysis = null;

      if (pledges.length > 0) {
        // Calculate average willing to pay
        const totalWillingToPay = pledges.reduce((sum: number, p: any) => sum + parseFloat(p.willing_to_pay_amount || 0), 0);
        const averageWillingToPay = totalWillingToPay / pledges.length;

        // Estimate services per month based on frequency
        let servicesPerMonth = 0;
        for (const pledge of pledges) {
          if (pledge.expected_frequency === 'daily') servicesPerMonth += 20;
          else if (pledge.expected_frequency === '2-3_times_week') servicesPerMonth += 10;
          else if (pledge.expected_frequency === 'weekly') servicesPerMonth += 4;
        }
        servicesPerMonth = Math.round(servicesPerMonth / pledges.length);

        // Get viability analysis
        viabilityAnalysis = analyzeRouteProposalViability(
          proposal.proposal_id,
          pledges.length,
          averageWillingToPay,
          servicesPerMonth
        );
      }

      return {
        ...proposal,
        viability_analysis: viabilityAnalysis
      };
    }));

    res.json(proposalsWithAnalysis);
  })
);

/**
 * @route GET /api/tenants/:tenantId/admin/route-proposals/:proposalId/pledges
 * @desc Get list of customers who pledged for a proposal (Admin only)
 */
router.get(
  '/tenants/:tenantId/admin/route-proposals/:proposalId/pledges',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const userRole = (req as any).user?.role;

    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can access this endpoint');
    }

    const pledges = await query(`
      SELECT
        v.customer_id,
        CASE
          WHEN v.is_anonymous THEN 'Anonymous Customer'
          ELSE v.voter_name
        END as customer_name,
        v.expected_frequency,
        v.willing_to_pay_amount,
        v.created_at
      FROM tenant_route_proposal_votes v
      WHERE v.proposal_id = $1
        AND v.vote_type = 'pledge'
      ORDER BY v.created_at ASC
    `, [proposalId]);

    res.json(pledges);
  })
);

/**
 * @route POST /api/tenants/:tenantId/admin/route-proposals/:proposalId/approve
 * @desc Approve a route proposal (Admin only)
 */
router.post(
  '/tenants/:tenantId/admin/route-proposals/:proposalId/approve',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can approve proposals');
    }

    logger.info('Admin approving route proposal', { tenantId, proposalId, userId });

    // Get proposal
    const proposal = await queryOne(`
      SELECT * FROM tenant_customer_route_proposals
      WHERE tenant_id = $1 AND proposal_id = $2
    `, [tenantId, proposalId]);

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    if (proposal.status !== 'threshold_met' && proposal.status !== 'open') {
      throw new ValidationError('Only open or threshold_met proposals can be approved');
    }

    // Update status to approved
    await query(`
      UPDATE tenant_customer_route_proposals
      SET status = 'approved',
          approved_by_user_id = $2,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE proposal_id = $1
    `, [proposalId, userId]);

    logger.info('Route proposal approved', { proposalId });

    // TODO: Send notifications to all pledged customers
    // TODO: Provide conversion workflow to create actual bus route

    res.json({ message: 'Proposal approved successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/admin/route-proposals/:proposalId/reject
 * @desc Reject a route proposal (Admin only)
 */
router.post(
  '/tenants/:tenantId/admin/route-proposals/:proposalId/reject',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const { rejection_reason } = req.body;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can reject proposals');
    }

    if (!rejection_reason) {
      throw new ValidationError('Rejection reason is required');
    }

    logger.info('Admin rejecting route proposal', { tenantId, proposalId, userId });

    // Get proposal
    const proposal = await queryOne(`
      SELECT * FROM tenant_customer_route_proposals
      WHERE tenant_id = $1 AND proposal_id = $2
    `, [tenantId, proposalId]);

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    if (proposal.status === 'approved' || proposal.status === 'rejected') {
      throw new ValidationError('Proposal has already been reviewed');
    }

    // Update status to rejected
    await query(`
      UPDATE tenant_customer_route_proposals
      SET status = 'rejected',
          rejection_reason = $2,
          reviewed_by_user_id = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE proposal_id = $1
    `, [proposalId, rejection_reason, userId]);

    logger.info('Route proposal rejected', { proposalId, reason: rejection_reason });

    // TODO: Send notifications to proposer and pledged customers

    res.json({ message: 'Proposal rejected' });
  })
);

// Export router
export default router;
