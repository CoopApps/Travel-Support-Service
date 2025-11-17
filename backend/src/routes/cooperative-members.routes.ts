/**
 * Cooperative Members Routes
 *
 * API endpoints for managing cooperative members:
 * - Member registration and management
 * - Voting rights and dividend eligibility
 * - Share capital tracking
 * - Membership types (founding, standard, associate)
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { verifyTenantAccess, AuthenticatedRequest } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * GET /tenants/:tenantId/cooperative/members
 * Get all cooperative members with customer details
 */
router.get(
  '/tenants/:tenantId/cooperative/members',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    try {
      const members = await query(
        `SELECT
          m.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
         FROM section22_cooperative_members m
         LEFT JOIN tenant_customers c ON m.customer_id = c.customer_id
         WHERE m.tenant_id = $1
         ORDER BY m.created_at DESC`,
        [tenantId]
      );

      return res.json(members);
    } catch (error: any) {
      logger.error('Error fetching members', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to fetch members', details: error.message });
    }
  }
);

/**
 * GET /tenants/:tenantId/cooperative/members/:memberId
 * Get single member details
 */
router.get(
  '/tenants/:tenantId/cooperative/members/:memberId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;

    try {
      const member = await queryOne(
        `SELECT
          m.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
         FROM section22_cooperative_members m
         LEFT JOIN tenant_customers c ON m.customer_id = c.customer_id
         WHERE m.tenant_id = $1 AND m.member_id = $2`,
        [tenantId, memberId]
      );

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.json(member);
    } catch (error: any) {
      logger.error('Error fetching member', { error: error.message, tenantId, memberId });
      return res.status(500).json({ error: 'Failed to fetch member', details: error.message });
    }
  }
);

/**
 * POST /tenants/:tenantId/cooperative/members
 * Add new cooperative member
 */
router.post(
  '/tenants/:tenantId/cooperative/members',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      customer_id,
      membership_type = 'standard',
      membership_start_date,
      voting_rights = true,
      share_capital_invested = 0,
      dividend_eligible = true
    } = req.body;

    // Validation
    if (!customer_id || !membership_start_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['customer_id', 'membership_start_date']
      });
    }

    if (!['founding', 'standard', 'associate'].includes(membership_type)) {
      return res.status(400).json({
        error: 'Invalid membership_type',
        valid: ['founding', 'standard', 'associate']
      });
    }

    try {
      // Check if customer already has membership
      const existing = await queryOne(
        `SELECT member_id FROM section22_cooperative_members
         WHERE tenant_id = $1 AND customer_id = $2`,
        [tenantId, customer_id]
      );

      if (existing) {
        return res.status(409).json({
          error: 'Customer already has a cooperative membership',
          existing_member_id: existing.member_id
        });
      }

      // Generate membership number
      const memberCount = await queryOne(
        `SELECT COUNT(*) as count FROM section22_cooperative_members WHERE tenant_id = $1`,
        [tenantId]
      );
      const membershipNumber = `COOP-${tenantId}-${String(parseInt(memberCount.count) + 1).padStart(5, '0')}`;

      // Create member
      const newMember = await queryOne(
        `INSERT INTO section22_cooperative_members (
          tenant_id,
          customer_id,
          membership_number,
          membership_type,
          membership_start_date,
          voting_rights,
          share_capital_invested,
          dividend_eligible,
          is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING *`,
        [
          tenantId,
          customer_id,
          membershipNumber,
          membership_type,
          membership_start_date,
          voting_rights,
          share_capital_invested,
          dividend_eligible
        ]
      );

      logger.info('Cooperative member added', {
        tenantId,
        memberId: newMember.member_id,
        customerId: customer_id,
        membershipType: membership_type
      });

      // Fetch with customer details
      const memberWithDetails = await queryOne(
        `SELECT
          m.*,
          c.name as customer_name,
          c.email as customer_email
         FROM section22_cooperative_members m
         LEFT JOIN tenant_customers c ON m.customer_id = c.customer_id
         WHERE m.member_id = $1`,
        [newMember.member_id]
      );

      return res.status(201).json(memberWithDetails);
    } catch (error: any) {
      logger.error('Error adding member', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to add member', details: error.message });
    }
  }
);

/**
 * PUT /tenants/:tenantId/cooperative/members/:memberId
 * Update member details
 */
router.put(
  '/tenants/:tenantId/cooperative/members/:memberId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;
    const {
      membership_type,
      membership_start_date,
      membership_end_date,
      voting_rights,
      share_capital_invested,
      dividend_eligible,
      is_active
    } = req.body;

    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (membership_type !== undefined) {
        updates.push(`membership_type = $${paramIndex++}`);
        values.push(membership_type);
      }
      if (membership_start_date !== undefined) {
        updates.push(`membership_start_date = $${paramIndex++}`);
        values.push(membership_start_date);
      }
      if (membership_end_date !== undefined) {
        updates.push(`membership_end_date = $${paramIndex++}`);
        values.push(membership_end_date);
      }
      if (voting_rights !== undefined) {
        updates.push(`voting_rights = $${paramIndex++}`);
        values.push(voting_rights);
      }
      if (share_capital_invested !== undefined) {
        updates.push(`share_capital_invested = $${paramIndex++}`);
        values.push(share_capital_invested);
      }
      if (dividend_eligible !== undefined) {
        updates.push(`dividend_eligible = $${paramIndex++}`);
        values.push(dividend_eligible);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(tenantId, memberId);

      const updatedMember = await queryOne(
        `UPDATE section22_cooperative_members
         SET ${updates.join(', ')}
         WHERE tenant_id = $${paramIndex++} AND member_id = $${paramIndex++}
         RETURNING *`,
        values
      );

      if (!updatedMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      logger.info('Member updated', { tenantId, memberId });

      // Fetch with customer details
      const memberWithDetails = await queryOne(
        `SELECT
          m.*,
          c.name as customer_name,
          c.email as customer_email
         FROM section22_cooperative_members m
         LEFT JOIN tenant_customers c ON m.customer_id = c.customer_id
         WHERE m.member_id = $1`,
        [memberId]
      );

      return res.json(memberWithDetails);
    } catch (error: any) {
      logger.error('Error updating member', { error: error.message, tenantId, memberId });
      return res.status(500).json({ error: 'Failed to update member', details: error.message });
    }
  }
);

/**
 * DELETE /tenants/:tenantId/cooperative/members/:memberId
 * Delete member (soft delete - set inactive)
 */
router.delete(
  '/tenants/:tenantId/cooperative/members/:memberId',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, memberId } = req.params;

    try {
      const result = await queryOne(
        `UPDATE section22_cooperative_members
         SET is_active = false, membership_end_date = CURRENT_DATE
         WHERE tenant_id = $1 AND member_id = $2
         RETURNING member_id`,
        [tenantId, memberId]
      );

      if (!result) {
        return res.status(404).json({ error: 'Member not found' });
      }

      logger.info('Member deactivated', { tenantId, memberId });

      return res.json({ success: true, message: 'Member deactivated successfully' });
    } catch (error: any) {
      logger.error('Error deactivating member', { error: error.message, tenantId, memberId });
      return res.status(500).json({ error: 'Failed to deactivate member', details: error.message });
    }
  }
);

// ============================================================================
// MEMBER STATISTICS
// ============================================================================

/**
 * GET /tenants/:tenantId/cooperative/members/stats
 * Get member statistics
 */
router.get(
  '/tenants/:tenantId/cooperative/stats',
  verifyTenantAccess,
  async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    try {
      const stats = await queryOne(
        `SELECT
          COUNT(*) as total_members,
          COUNT(*) FILTER (WHERE is_active = true) as active_members,
          COUNT(*) FILTER (WHERE membership_type = 'founding') as founding_members,
          COUNT(*) FILTER (WHERE membership_type = 'standard') as standard_members,
          COUNT(*) FILTER (WHERE membership_type = 'associate') as associate_members,
          COUNT(*) FILTER (WHERE voting_rights = true AND is_active = true) as voting_members,
          COUNT(*) FILTER (WHERE dividend_eligible = true AND is_active = true) as dividend_eligible_members,
          COALESCE(SUM(share_capital_invested), 0) as total_share_capital
         FROM section22_cooperative_members
         WHERE tenant_id = $1`,
        [tenantId]
      );

      return res.json(stats);
    } catch (error: any) {
      logger.error('Error fetching member stats', { error: error.message, tenantId });
      return res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
  }
);

export default router;
