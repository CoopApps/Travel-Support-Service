import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { query, queryOne } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Co-operative Voting & Democracy Routes
 *
 * Provides endpoints for democratic decision-making in cooperatives:
 * - Proposals (create, vote on, view results)
 * - Member voting and eligibility
 * - Real-time vote tallying
 */

// ============================================================================
// PROPOSAL MANAGEMENT
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/proposals
 * @desc Get all proposals for a cooperative
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/proposals',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { status, proposal_type, limit = 50, offset = 0 } = req.query;

    logger.info('Fetching cooperative proposals', { tenantId, status, proposal_type });

    const conditions: string[] = ['p.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      conditions.push(`p.status = $${paramCount++}`);
      params.push(status);
    }

    if (proposal_type) {
      conditions.push(`p.proposal_type = $${paramCount++}`);
      params.push(proposal_type);
    }

    const whereClause = conditions.join(' AND ');

    const proposals = await query<any>(
      `SELECT
        p.*,
        u.email as created_by_email,
        u.name as created_by_name,
        CASE
          WHEN p.voting_opens > CURRENT_TIMESTAMP THEN 'pending'
          WHEN p.voting_closes < CURRENT_TIMESTAMP THEN 'expired'
          ELSE 'active'
        END as voting_status,
        EXTRACT(EPOCH FROM (p.voting_closes - CURRENT_TIMESTAMP)) / 3600 as hours_remaining
       FROM cooperative_proposals p
       LEFT JOIN users u ON p.created_by = u.user_id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({ proposals });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/proposals/active
 * @desc Get active proposals available for voting
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/proposals/active',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching active proposals', { tenantId });

    const proposals = await query<any>(
      `SELECT * FROM v_active_proposals
       WHERE tenant_id = $1
       ORDER BY voting_closes ASC`,
      [tenantId]
    );

    res.json({ proposals });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/proposals/:proposalId
 * @desc Get detailed proposal information including vote breakdown
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/proposals/:proposalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;

    logger.info('Fetching proposal details', { tenantId, proposalId });

    // Get proposal
    const proposal = await queryOne<any>(
      `SELECT
        p.*,
        u.email as created_by_email,
        u.name as created_by_name,
        CASE
          WHEN p.voting_opens > CURRENT_TIMESTAMP THEN 'pending'
          WHEN p.voting_closes < CURRENT_TIMESTAMP THEN 'expired'
          ELSE 'active'
        END as voting_status
       FROM cooperative_proposals p
       LEFT JOIN users u ON p.created_by = u.user_id
       WHERE p.proposal_id = $1 AND p.tenant_id = $2`,
      [proposalId, tenantId]
    );

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    // Get vote breakdown (anonymized)
    const voteBreakdown = await query<any>(
      `SELECT
        vote_choice,
        COUNT(*) as vote_count,
        SUM(vote_weight) as total_weight
       FROM cooperative_votes
       WHERE proposal_id = $1
       GROUP BY vote_choice`,
      [proposalId]
    );

    // Get current user's vote if any
    const userId = (req as any).user?.userId;
    let myVote = null;
    if (userId) {
      const membershipResult = await queryOne<any>(
        `SELECT membership_id FROM cooperative_membership
         WHERE tenant_id = $1 AND member_reference_id = $2 AND is_active = true`,
        [tenantId, userId]
      );

      if (membershipResult) {
        myVote = await queryOne<any>(
          `SELECT vote_choice, voted_at, voter_comment
           FROM cooperative_votes
           WHERE proposal_id = $1 AND member_id = $2`,
          [proposalId, membershipResult.membership_id]
        );
      }
    }

    res.json({
      proposal,
      vote_breakdown: voteBreakdown,
      my_vote: myVote,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/proposals
 * @desc Create a new proposal
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/proposals',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      proposal_type,
      title,
      description,
      proposal_data,
      voting_opens,
      voting_closes,
      quorum_required,
      approval_threshold,
      notes,
    } = req.body;

    logger.info('Creating proposal', { tenantId, proposal_type, title });

    // Validation
    if (!proposal_type || !title || !voting_opens || !voting_closes) {
      throw new ValidationError('Proposal type, title, voting opens, and voting closes are required');
    }

    if (new Date(voting_closes) <= new Date(voting_opens)) {
      throw new ValidationError('Voting close date must be after voting open date');
    }

    const result = await queryOne<any>(
      `INSERT INTO cooperative_proposals (
        tenant_id, proposal_type, title, description, proposal_data,
        voting_opens, voting_closes, quorum_required, approval_threshold,
        notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *`,
      [
        tenantId,
        proposal_type,
        title,
        description || null,
        JSON.stringify(proposal_data || {}),
        voting_opens,
        voting_closes,
        quorum_required || 50,
        approval_threshold || 50,
        notes || null,
        (req as any).user?.userId || null,
      ]
    );

    logger.info('Proposal created', { proposalId: result!.proposal_id });

    res.status(201).json(result);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/cooperative/proposals/:proposalId
 * @desc Update a proposal (only draft proposals can be edited)
 * @access Protected (Tenant Admin)
 */
router.put(
  '/tenants/:tenantId/cooperative/proposals/:proposalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const {
      proposal_type,
      title,
      description,
      proposal_data,
      voting_opens,
      voting_closes,
      quorum_required,
      approval_threshold,
      status,
      notes,
    } = req.body;

    logger.info('Updating proposal', { tenantId, proposalId });

    // Check if proposal exists and is in draft status
    const existing = await queryOne<any>(
      'SELECT * FROM cooperative_proposals WHERE proposal_id = $1 AND tenant_id = $2',
      [proposalId, tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Proposal not found');
    }

    if (existing.status !== 'draft' && status !== 'cancelled') {
      throw new ValidationError('Only draft proposals can be edited (except for cancellation)');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (proposal_type !== undefined) {
      updates.push(`proposal_type = $${paramCount++}`);
      params.push(proposal_type);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (proposal_data !== undefined) {
      updates.push(`proposal_data = $${paramCount++}`);
      params.push(JSON.stringify(proposal_data));
    }
    if (voting_opens !== undefined) {
      updates.push(`voting_opens = $${paramCount++}`);
      params.push(voting_opens);
    }
    if (voting_closes !== undefined) {
      updates.push(`voting_closes = $${paramCount++}`);
      params.push(voting_closes);
    }
    if (quorum_required !== undefined) {
      updates.push(`quorum_required = $${paramCount++}`);
      params.push(quorum_required);
    }
    if (approval_threshold !== undefined) {
      updates.push(`approval_threshold = $${paramCount++}`);
      params.push(approval_threshold);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    await query(
      `UPDATE cooperative_proposals SET ${updates.join(', ')}
       WHERE proposal_id = $${paramCount} AND tenant_id = $${paramCount + 1}`,
      [...params, proposalId, tenantId]
    );

    logger.info('Proposal updated', { proposalId });

    res.json({ message: 'Proposal updated successfully' });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/cooperative/proposals/:proposalId
 * @desc Delete a proposal (only draft proposals)
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/cooperative/proposals/:proposalId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;

    logger.info('Deleting proposal', { tenantId, proposalId });

    // Check if proposal is in draft status
    const existing = await queryOne<any>(
      'SELECT status FROM cooperative_proposals WHERE proposal_id = $1 AND tenant_id = $2',
      [proposalId, tenantId]
    );

    if (!existing) {
      throw new NotFoundError('Proposal not found');
    }

    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft proposals can be deleted');
    }

    await query(
      'DELETE FROM cooperative_proposals WHERE proposal_id = $1 AND tenant_id = $2',
      [proposalId, tenantId]
    );

    res.json({ message: 'Proposal deleted successfully' });
  })
);

// ============================================================================
// VOTING
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/cooperative/proposals/:proposalId/vote
 * @desc Cast or update a vote on a proposal
 * @access Protected (Tenant Members)
 */
router.post(
  '/tenants/:tenantId/cooperative/proposals/:proposalId/vote',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;
    const { vote_choice, voter_comment } = req.body;
    const userId = (req as any).user?.userId;

    logger.info('Casting vote', { tenantId, proposalId, vote_choice, userId });

    // Validation
    if (!vote_choice || !['yes', 'no', 'abstain'].includes(vote_choice)) {
      throw new ValidationError('Valid vote choice is required (yes, no, abstain)');
    }

    // Get member ID for user
    const membership = await queryOne<any>(
      `SELECT membership_id, voting_rights, is_active
       FROM cooperative_membership
       WHERE tenant_id = $1 AND member_reference_id = $2`,
      [tenantId, userId]
    );

    if (!membership) {
      throw new ValidationError('You are not a member of this cooperative');
    }

    if (!membership.is_active) {
      throw new ValidationError('Your membership is not active');
    }

    if (!membership.voting_rights) {
      throw new ValidationError('You do not have voting rights');
    }

    // Check proposal status and voting period
    const proposal = await queryOne<any>(
      `SELECT proposal_id, proposal_type, status, voting_opens, voting_closes
       FROM cooperative_proposals
       WHERE proposal_id = $1 AND tenant_id = $2`,
      [proposalId, tenantId]
    );

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    if (proposal.status !== 'open') {
      throw new ValidationError('This proposal is not open for voting');
    }

    const now = new Date();
    if (new Date(proposal.voting_opens) > now) {
      throw new ValidationError('Voting has not opened yet');
    }

    if (new Date(proposal.voting_closes) < now) {
      throw new ValidationError('Voting period has closed');
    }

    // Check eligibility
    const eligibilityResult = await query<any>(
      `SELECT is_member_eligible($1, $2) as eligible`,
      [membership.membership_id, proposal.proposal_type]
    );

    if (!eligibilityResult[0]?.eligible) {
      throw new ValidationError('You are not eligible to vote on this proposal');
    }

    // Calculate vote weight (based on ownership shares)
    const voteWeight = membership.ownership_shares || 1;

    // Insert or update vote
    const existingVote = await queryOne<any>(
      `SELECT vote_id FROM cooperative_votes
       WHERE proposal_id = $1 AND member_id = $2`,
      [proposalId, membership.membership_id]
    );

    let result;
    if (existingVote) {
      // Update existing vote
      result = await queryOne<any>(
        `UPDATE cooperative_votes
         SET vote_choice = $1, vote_weight = $2, voter_comment = $3, voted_at = CURRENT_TIMESTAMP
         WHERE proposal_id = $4 AND member_id = $5
         RETURNING *`,
        [vote_choice, voteWeight, voter_comment || null, proposalId, membership.membership_id]
      );
    } else {
      // Insert new vote
      result = await queryOne<any>(
        `INSERT INTO cooperative_votes (
          proposal_id, member_id, vote_choice, vote_weight, voter_comment
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [proposalId, membership.membership_id, vote_choice, voteWeight, voter_comment || null]
      );
    }

    logger.info('Vote cast successfully', { proposalId, memberId: membership.membership_id });

    res.json({
      message: 'Vote cast successfully',
      vote: result,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/voting/my-votes
 * @desc Get current user's voting history
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/voting/my-votes',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const userId = (req as any).user?.userId;

    logger.info('Fetching user voting history', { tenantId, userId });

    // Get member ID
    const membership = await queryOne<any>(
      `SELECT membership_id FROM cooperative_membership
       WHERE tenant_id = $1 AND member_reference_id = $2`,
      [tenantId, userId]
    );

    if (!membership) {
      return res.json({ votes: [] });
    }

    const votes = await query<any>(
      `SELECT * FROM v_member_voting_history
       WHERE member_id = $1
       ORDER BY voted_at DESC`,
      [membership.membership_id]
    );

    return res.json({ votes });
  })
);

/**
 * @route GET /api/tenants/:tenantId/cooperative/proposals/:proposalId/results
 * @desc Get real-time results for a proposal
 * @access Protected (Tenant Members)
 */
router.get(
  '/tenants/:tenantId/cooperative/proposals/:proposalId/results',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, proposalId } = req.params;

    logger.info('Fetching proposal results', { tenantId, proposalId });

    // Verify proposal exists
    const proposal = await queryOne<any>(
      'SELECT * FROM cooperative_proposals WHERE proposal_id = $1 AND tenant_id = $2',
      [proposalId, tenantId]
    );

    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    // Calculate current results
    const results = await query<any>(
      'SELECT calculate_proposal_results($1) as results',
      [proposalId]
    );

    res.json({
      proposal_id: proposalId,
      status: proposal.status,
      results: results[0]?.results || {},
    });
  })
);

// ============================================================================
// VOTING ELIGIBILITY
// ============================================================================

/**
 * @route GET /api/tenants/:tenantId/cooperative/voting/eligibility
 * @desc Get voting eligibility rules
 * @access Protected (Tenant Admin)
 */
router.get(
  '/tenants/:tenantId/cooperative/voting/eligibility',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { member_id, proposal_type } = req.query;

    logger.info('Fetching voting eligibility rules', { tenantId, member_id, proposal_type });

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (member_id) {
      conditions.push(`member_id = $${paramCount++}`);
      params.push(member_id);
    }

    if (proposal_type) {
      conditions.push(`(proposal_type = $${paramCount++} OR proposal_type IS NULL)`);
      params.push(proposal_type);
    }

    const whereClause = conditions.join(' AND ');

    const rules = await query<any>(
      `SELECT * FROM cooperative_voting_eligibility
       WHERE ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.json({ rules });
  })
);

/**
 * @route POST /api/tenants/:tenantId/cooperative/voting/eligibility
 * @desc Create a voting eligibility rule (e.g., suspend voting rights)
 * @access Protected (Tenant Admin)
 */
router.post(
  '/tenants/:tenantId/cooperative/voting/eligibility',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      member_id,
      proposal_type,
      eligible,
      reason,
      effective_date,
      expires_date,
      notes,
    } = req.body;

    logger.info('Creating eligibility rule', { tenantId, member_id, eligible });

    if (!member_id) {
      throw new ValidationError('Member ID is required');
    }

    const result = await queryOne<any>(
      `INSERT INTO cooperative_voting_eligibility (
        tenant_id, member_id, proposal_type, eligible, reason,
        effective_date, expires_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        tenantId,
        member_id,
        proposal_type || null,
        eligible !== undefined ? eligible : true,
        reason || null,
        effective_date || new Date().toISOString().split('T')[0],
        expires_date || null,
        notes || null,
        (req as any).user?.userId || null,
      ]
    );

    logger.info('Eligibility rule created', { eligibilityId: result!.eligibility_id });

    res.status(201).json(result);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/cooperative/voting/eligibility/:eligibilityId
 * @desc Delete an eligibility rule
 * @access Protected (Tenant Admin)
 */
router.delete(
  '/tenants/:tenantId/cooperative/voting/eligibility/:eligibilityId',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, eligibilityId } = req.params;

    logger.info('Deleting eligibility rule', { tenantId, eligibilityId });

    const result = await query(
      'DELETE FROM cooperative_voting_eligibility WHERE eligibility_id = $1 AND tenant_id = $2',
      [eligibilityId, tenantId]
    );

    if ((result as any).rowCount === 0) {
      throw new NotFoundError('Eligibility rule not found');
    }

    res.json({ message: 'Eligibility rule deleted successfully' });
  })
);

// ============================================================================
// ADMINISTRATIVE
// ============================================================================

/**
 * @route POST /api/tenants/:tenantId/cooperative/voting/close-expired
 * @desc Manually trigger closing of expired proposals
 * @access Protected (Tenant Admin / Cron Job)
 */
router.post(
  '/tenants/:tenantId/cooperative/voting/close-expired',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Closing expired proposals', { tenantId });

    await query('SELECT close_expired_proposals()', []);

    res.json({ message: 'Expired proposals closed successfully' });
  })
);

export default router;
