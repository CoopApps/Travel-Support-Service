import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest, requireMember } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger, auditLog } from '../../utils/logger';
import { sanitizeInput } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Voting Routes for Home Care Co-operative System
 *
 * Democratic governance features for the worker co-operative.
 * One member = one vote (not based on share capital).
 */

/**
 * @route GET /api/tenants/:tenantId/votes
 * @desc Get all votes/motions
 */
router.get(
  '/tenants/:tenantId/votes',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;

    const conditions: string[] = ['v.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      conditions.push(`v.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (type) {
      conditions.push(`v.vote_type = $${paramCount}`);
      params.push(type);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (Number(page) - 1) * Number(limit);

    const votes = await query(
      `SELECT
        v.vote_id as id, v.title, v.description,
        v.vote_type, v.status,
        v.start_date, v.end_date,
        v.quorum_required, v.majority_required,
        v.votes_for, v.votes_against, v.votes_abstain,
        v.total_eligible_voters,
        m.first_name as proposer_first_name, m.last_name as proposer_last_name,
        v.created_at
      FROM tenant_votes v
      LEFT JOIN tenant_members mem ON v.proposed_by = mem.member_id AND v.tenant_id = mem.tenant_id
      LEFT JOIN tenant_carers m ON mem.carer_id = m.carer_id AND mem.tenant_id = m.tenant_id
      WHERE ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({ votes });
  })
);

/**
 * @route GET /api/tenants/:tenantId/votes/active
 * @desc Get active votes that the member can participate in
 */
router.get(
  '/tenants/:tenantId/votes/active',
  verifyTenantAccess,
  requireMember(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;

    const votes = await query(
      `SELECT
        v.vote_id as id, v.title, v.description,
        v.vote_type, v.status,
        v.start_date, v.end_date,
        v.quorum_required, v.majority_required,
        v.votes_for, v.votes_against, v.votes_abstain,
        v.total_eligible_voters,
        CASE WHEN vr.vote_record_id IS NOT NULL THEN true ELSE false END as has_voted
      FROM tenant_votes v
      LEFT JOIN tenant_vote_records vr ON v.vote_id = vr.vote_id AND vr.member_id = $2
      WHERE v.tenant_id = $1
        AND v.status = 'active'
        AND v.start_date <= CURRENT_DATE
        AND v.end_date >= CURRENT_DATE
      ORDER BY v.end_date ASC`,
      [tenantId, user.memberId]
    );

    res.json({ votes });
  })
);

/**
 * @route GET /api/tenants/:tenantId/votes/:voteId
 * @desc Get details of a specific vote
 */
router.get(
  '/tenants/:tenantId/votes/:voteId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, voteId } = req.params;

    const vote = await queryOne(
      `SELECT
        v.*,
        m.first_name as proposer_first_name, m.last_name as proposer_last_name
      FROM tenant_votes v
      LEFT JOIN tenant_members mem ON v.proposed_by = mem.member_id AND v.tenant_id = mem.tenant_id
      LEFT JOIN tenant_carers m ON mem.carer_id = m.carer_id AND mem.tenant_id = m.tenant_id
      WHERE v.tenant_id = $1 AND v.vote_id = $2`,
      [tenantId, voteId]
    );

    if (!vote) {
      throw new NotFoundError('Vote not found');
    }

    res.json(vote);
  })
);

/**
 * @route POST /api/tenants/:tenantId/votes
 * @desc Create a new vote/motion
 */
router.post(
  '/tenants/:tenantId/votes',
  verifyTenantAccess,
  requireMember(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const user = req.user!;
    const voteData = req.body;

    if (!voteData.title || !voteData.description) {
      throw new ValidationError('Title and description are required');
    }

    // Count eligible voters (active members with voting rights)
    const eligibleCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_members
       WHERE tenant_id = $1 AND member_status = 'active' AND voting_rights = true`,
      [tenantId]
    );
    const totalEligible = parseInt(eligibleCount?.count || '0', 10);

    const validTypes = ['general', 'board_election', 'policy', 'budget', 'membership', 'special'];
    const voteType = validTypes.includes(voteData.voteType) ? voteData.voteType : 'general';

    // Default quorum and majority based on vote type
    let quorumRequired = voteData.quorumRequired || 0.5; // 50% by default
    let majorityRequired = voteData.majorityRequired || 0.5; // Simple majority

    if (voteType === 'special' || voteType === 'policy') {
      quorumRequired = voteData.quorumRequired || 0.66;
      majorityRequired = voteData.majorityRequired || 0.66;
    }

    const result = await queryOne<{ id: number }>(
      `INSERT INTO tenant_votes (
        tenant_id, title, description, vote_type,
        start_date, end_date,
        quorum_required, majority_required,
        total_eligible_voters,
        status, proposed_by,
        created_at, created_by
      ) VALUES (
        $1, $2, $3, $4,
        COALESCE($5, CURRENT_DATE), $6,
        $7, $8, $9,
        'active', $10,
        NOW(), $11
      ) RETURNING vote_id as id`,
      [
        tenantId,
        sanitizeInput(voteData.title, { maxLength: 200 }),
        sanitizeInput(voteData.description, { maxLength: 5000 }),
        voteType,
        voteData.startDate,
        voteData.endDate,
        quorumRequired,
        majorityRequired,
        totalEligible,
        user.memberId,
        user.userId,
      ]
    );

    auditLog('VOTE_CREATED', {
      tenantId,
      voteId: result?.id,
      title: voteData.title,
      voteType,
      proposedBy: user.memberId,
    });

    res.status(201).json({
      id: result?.id,
      message: 'Vote created successfully',
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/votes/:voteId/cast
 * @desc Cast a vote on a motion
 */
router.post(
  '/tenants/:tenantId/votes/:voteId/cast',
  verifyTenantAccess,
  requireMember(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, voteId } = req.params;
    const user = req.user!;
    const { choice } = req.body;

    const validChoices = ['for', 'against', 'abstain'];
    if (!validChoices.includes(choice)) {
      throw new ValidationError(`Invalid choice. Must be one of: ${validChoices.join(', ')}`);
    }

    // Check if vote exists and is active
    const vote = await queryOne<{ status: string; start_date: Date; end_date: Date }>(
      `SELECT status, start_date, end_date FROM tenant_votes
       WHERE tenant_id = $1 AND vote_id = $2`,
      [tenantId, voteId]
    );

    if (!vote) {
      throw new NotFoundError('Vote not found');
    }

    if (vote.status !== 'active') {
      throw new ValidationError('This vote is not currently active');
    }

    const now = new Date();
    if (now < new Date(vote.start_date) || now > new Date(vote.end_date)) {
      throw new ValidationError('Voting period has ended or not yet started');
    }

    // Check if member has voting rights
    const member = await queryOne<{ voting_rights: boolean }>(
      'SELECT voting_rights FROM tenant_members WHERE tenant_id = $1 AND member_id = $2',
      [tenantId, user.memberId]
    );

    if (!member?.voting_rights) {
      throw new ValidationError('You do not have voting rights');
    }

    // Check if already voted
    const existingVote = await queryOne(
      'SELECT vote_record_id FROM tenant_vote_records WHERE tenant_id = $1 AND vote_id = $2 AND member_id = $3',
      [tenantId, voteId, user.memberId]
    );

    if (existingVote) {
      throw new ValidationError('You have already voted on this motion');
    }

    // Record the vote
    await query(
      `INSERT INTO tenant_vote_records (
        tenant_id, vote_id, member_id, choice, voted_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [tenantId, voteId, user.memberId, choice]
    );

    // Update vote counts
    const voteColumn = `votes_${choice}`;
    await query(
      `UPDATE tenant_votes SET ${voteColumn} = ${voteColumn} + 1 WHERE tenant_id = $1 AND vote_id = $2`,
      [tenantId, voteId]
    );

    auditLog('VOTE_CAST', {
      tenantId,
      voteId,
      memberId: user.memberId,
      choice,
    });

    res.json({ message: 'Vote cast successfully' });
  })
);

/**
 * @route POST /api/tenants/:tenantId/votes/:voteId/close
 * @desc Close a vote and determine outcome
 */
router.post(
  '/tenants/:tenantId/votes/:voteId/close',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, voteId } = req.params;
    const user = req.user!;

    // Must be admin or board member to close votes
    if (!['admin', 'manager'].includes(user.role)) {
      throw new ValidationError('Only administrators can close votes');
    }

    const vote = await queryOne<{
      status: string;
      votes_for: number;
      votes_against: number;
      votes_abstain: number;
      total_eligible_voters: number;
      quorum_required: number;
      majority_required: number;
    }>(
      `SELECT status, votes_for, votes_against, votes_abstain,
              total_eligible_voters, quorum_required, majority_required
       FROM tenant_votes WHERE tenant_id = $1 AND vote_id = $2`,
      [tenantId, voteId]
    );

    if (!vote) {
      throw new NotFoundError('Vote not found');
    }

    if (vote.status !== 'active') {
      throw new ValidationError('This vote is not active');
    }

    const totalVotes = vote.votes_for + vote.votes_against + vote.votes_abstain;
    const participation = totalVotes / vote.total_eligible_voters;
    const quorumMet = participation >= vote.quorum_required;

    let outcome: string;
    let passed = false;

    if (!quorumMet) {
      outcome = 'quorum_not_met';
    } else {
      // Calculate majority (abstentions don't count for/against)
      const validVotes = vote.votes_for + vote.votes_against;
      const forPercentage = validVotes > 0 ? vote.votes_for / validVotes : 0;

      if (forPercentage >= vote.majority_required) {
        outcome = 'passed';
        passed = true;
      } else {
        outcome = 'failed';
      }
    }

    await query(
      `UPDATE tenant_votes SET
        status = 'closed',
        outcome = $3,
        passed = $4,
        closed_at = NOW(),
        closed_by = $5
      WHERE tenant_id = $1 AND vote_id = $2`,
      [tenantId, voteId, outcome, passed, user.userId]
    );

    auditLog('VOTE_CLOSED', {
      tenantId,
      voteId,
      outcome,
      passed,
      participation,
      quorumMet,
      closedBy: user.userId,
    });

    res.json({
      message: 'Vote closed successfully',
      outcome,
      passed,
      results: {
        votesFor: vote.votes_for,
        votesAgainst: vote.votes_against,
        votesAbstain: vote.votes_abstain,
        totalVotes,
        participation: Math.round(participation * 100) + '%',
        quorumMet,
      },
    });
  })
);

export default router;
