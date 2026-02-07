import { Router, Request, Response } from 'express';
import { query, queryWithTenant } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdParamSchema,
  listDocumentsQuerySchema,
  shareDocumentSchema,
  approveDocumentSchema,
  bulkDocumentOperationSchema,
} from '../../schemas/document.schemas';
import { AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { logger, careEventLog } from '../../utils/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errorTypes';

const router = Router();

/**
 * Document Routes for Home Care Co-operative System
 *
 * Handles care documentation, policies, client records, and compliance documents.
 */

/**
 * Check document access permissions
 */
async function checkDocumentAccess(
  tenantId: number,
  documentId: number,
  userId: number,
  userRole: string,
  requiredAccess: 'view' | 'edit' | 'delete' = 'view'
): Promise<{ hasAccess: boolean; document: any }> {
  const docs = await queryWithTenant<any>(
    tenantId,
    `SELECT d.*,
            c.first_name as client_first_name,
            c.last_name as client_last_name
     FROM tenant_documents d
     LEFT JOIN tenant_clients c ON d.client_id = c.id AND c.tenant_id = d.tenant_id
     WHERE d.id = $2 AND d.deleted_at IS NULL`,
    [documentId]
  );

  if (docs.length === 0) {
    return { hasAccess: false, document: null };
  }

  const doc = docs[0];

  // Admins have full access
  if (userRole === 'admin') {
    return { hasAccess: true, document: doc };
  }

  // Check access level
  switch (doc.access_level) {
    case 'public':
    case 'staff':
      return { hasAccess: true, document: doc };

    case 'management':
      const hasManagementAccess = ['admin', 'manager', 'coordinator'].includes(userRole);
      return { hasAccess: hasManagementAccess, document: doc };

    case 'admin':
      return { hasAccess: userRole === 'admin', document: doc };

    case 'confidential':
      // Check if user is in access list
      const accessList = doc.access_user_ids || [];
      return { hasAccess: accessList.includes(userId), document: doc };

    case 'client_specific':
      // Check if user is assigned to the client
      if (!doc.client_id) {
        return { hasAccess: false, document: doc };
      }
      const assignments = await queryWithTenant<any>(
        tenantId,
        `SELECT 1 FROM tenant_carer_client_assignments
         WHERE carer_id = (SELECT id FROM tenant_carers WHERE user_id = $2)
         AND client_id = $3 AND is_active = true`,
        [userId, doc.client_id]
      );
      return { hasAccess: assignments.length > 0, document: doc };

    default:
      return { hasAccess: false, document: doc };
  }
}

/**
 * Log document access for audit trail
 */
async function logDocumentAccess(
  tenantId: number,
  documentId: number,
  userId: number,
  action: string,
  details?: Record<string, any>,
  req?: Request
): Promise<void> {
  await query(
    `INSERT INTO tenant_document_audit_log
     (tenant_id, document_id, user_id, action, details, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      tenantId,
      documentId,
      userId,
      action,
      JSON.stringify(details || {}),
      req?.ip,
      req?.get('user-agent'),
    ]
  );
}

/**
 * GET /tenants/:tenantId/documents
 * List documents with filtering and pagination
 */
router.get(
  '/tenants/:tenantId/documents',
  validateQuery(listDocumentsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      category,
      status,
      clientId,
      carerId,
      search,
      expiringSoon,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    let whereClause = 'd.tenant_id = $1 AND d.deleted_at IS NULL';
    params.push(tenantId);
    paramIndex++;

    if (category) {
      whereClause += ` AND d.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND d.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    if (carerId) {
      whereClause += ` AND d.carer_id = $${paramIndex}`;
      params.push(carerId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (expiringSoon === 'true') {
      whereClause += ` AND d.expiry_date IS NOT NULL AND d.expiry_date <= NOW() + INTERVAL '30 days'`;
    }

    // Apply access control for non-admins
    if (req.user?.role !== 'admin') {
      whereClause += ` AND (
        d.access_level IN ('public', 'staff')
        OR (d.access_level = 'management' AND $${paramIndex} IN ('manager', 'coordinator'))
        OR (d.access_level = 'confidential' AND $${paramIndex + 1} = ANY(d.access_user_ids))
      )`;
      params.push(req.user?.role, req.user?.userId);
      paramIndex += 2;
    }

    // Sort mapping
    const sortColumns: Record<string, string> = {
      title: 'd.title',
      created_at: 'd.created_at',
      expiry_date: 'd.expiry_date',
      category: 'd.category',
    };
    const sortColumn = sortColumns[sortBy as string] || 'd.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM tenant_documents d WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get documents
    const documents = await query(
      `SELECT d.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              cr.first_name as carer_first_name,
              cr.last_name as carer_last_name,
              u.first_name as uploaded_by_first_name,
              u.last_name as uploaded_by_last_name
       FROM tenant_documents d
       LEFT JOIN tenant_clients c ON d.client_id = c.id AND c.tenant_id = d.tenant_id
       LEFT JOIN tenant_carers cr ON d.carer_id = cr.id AND cr.tenant_id = d.tenant_id
       LEFT JOIN tenant_users u ON d.uploaded_by = u.id AND u.tenant_id = d.tenant_id
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      documents: documents.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /tenants/:tenantId/documents/:documentId
 * Get single document details
 */
router.get(
  '/tenants/:tenantId/documents/:documentId',
  validateParams(documentIdParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document } = await checkDocumentAccess(
      Number(tenantId),
      Number(documentId),
      userId,
      userRole,
      'view'
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this document');
    }

    // Log view access
    await logDocumentAccess(Number(tenantId), Number(documentId), userId, 'viewed', {}, req);

    // Get version history
    const versions = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT id, version, created_at, uploaded_by
       FROM tenant_documents
       WHERE (id = $2 OR previous_version_id = $2)
       ORDER BY version DESC`,
      [documentId]
    );

    // Get audit log
    const auditLog = await queryWithTenant<any>(
      Number(tenantId),
      `SELECT dal.*, u.first_name, u.last_name
       FROM tenant_document_audit_log dal
       LEFT JOIN tenant_users u ON dal.user_id = u.id
       WHERE dal.document_id = $2
       ORDER BY dal.created_at DESC
       LIMIT 20`,
      [documentId]
    );

    res.json({
      document,
      versions,
      auditLog,
    });
  })
);

/**
 * POST /tenants/:tenantId/documents
 * Upload/create a new document (metadata only - file upload handled separately)
 */
router.post(
  '/tenants/:tenantId/documents',
  validateBody(createDocumentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.userId;
    const {
      title,
      description,
      category,
      clientId,
      carerId,
      visitId,
      carePlanId,
      accessLevel = 'staff',
      accessUserIds,
      expiryDate,
      reminderDate,
      tags,
      metadata,
    } = req.body;

    // Validate associations exist
    if (clientId) {
      const client = await queryWithTenant<any>(
        Number(tenantId),
        'SELECT id FROM tenant_clients WHERE id = $2',
        [clientId]
      );
      if (client.length === 0) {
        throw new ValidationError('Client not found');
      }
    }

    if (carerId) {
      const carer = await queryWithTenant<any>(
        Number(tenantId),
        'SELECT id FROM tenant_carers WHERE id = $2',
        [carerId]
      );
      if (carer.length === 0) {
        throw new ValidationError('Carer not found');
      }
    }

    // Create document record
    const result = await query(
      `INSERT INTO tenant_documents (
        tenant_id, title, description, category,
        client_id, carer_id, visit_id, care_plan_id,
        access_level, access_user_ids,
        expiry_date, reminder_date,
        tags, metadata,
        status, version, uploaded_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft', 1, $15, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        title,
        description,
        category,
        clientId || null,
        carerId || null,
        visitId || null,
        carePlanId || null,
        accessLevel,
        accessUserIds ? JSON.stringify(accessUserIds) : null,
        expiryDate || null,
        reminderDate || null,
        tags ? JSON.stringify(tags) : null,
        metadata ? JSON.stringify(metadata) : null,
        userId,
      ]
    );

    const document = result.rows[0];

    // Log creation
    await logDocumentAccess(Number(tenantId), document.id, userId, 'created', { title, category }, req);

    // Log care event if client-related
    if (clientId) {
      careEventLog({
        eventType: 'document_added',
        tenantId: Number(tenantId),
        clientId,
        carerId: userId,
        message: `Document "${title}" added`,
        metadata: { documentId: document.id, category },
      });
    }

    logger.info('Document created', {
      tenantId,
      documentId: document.id,
      category,
      userId,
    });

    res.status(201).json({
      message: 'Document created successfully',
      document,
    });
  })
);

/**
 * PUT /tenants/:tenantId/documents/:documentId
 * Update document metadata
 */
router.put(
  '/tenants/:tenantId/documents/:documentId',
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document: existingDoc } = await checkDocumentAccess(
      Number(tenantId),
      Number(documentId),
      userId,
      userRole,
      'edit'
    );

    if (!existingDoc) {
      throw new NotFoundError('Document not found');
    }

    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to edit this document');
    }

    const updates = req.body;
    const updateFields: string[] = [];
    const updateValues: any[] = [tenantId, documentId];
    let paramIndex = 3;

    const fieldMapping: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      accessLevel: 'access_level',
      accessUserIds: 'access_user_ids',
      expiryDate: 'expiry_date',
      reminderDate: 'reminder_date',
      tags: 'tags',
      metadata: 'metadata',
      status: 'status',
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (updates[key] !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        let value = updates[key];
        if (['accessUserIds', 'tags', 'metadata'].includes(key) && value) {
          value = JSON.stringify(value);
        }
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');

    const result = await query(
      `UPDATE tenant_documents
       SET ${updateFields.join(', ')}
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    // Log update
    await logDocumentAccess(Number(tenantId), Number(documentId), userId, 'updated', updates, req);

    logger.info('Document updated', {
      tenantId,
      documentId,
      userId,
      updates: Object.keys(updates),
    });

    res.json({
      message: 'Document updated successfully',
      document: result.rows[0],
    });
  })
);

/**
 * POST /tenants/:tenantId/documents/:documentId/approve
 * Approve or reject a document
 */
router.post(
  '/tenants/:tenantId/documents/:documentId/approve',
  validateParams(documentIdParamSchema),
  validateBody(approveDocumentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { approved, notes } = req.body;

    // Only managers and admins can approve documents
    if (!['admin', 'manager', 'coordinator'].includes(userRole)) {
      throw new ForbiddenError('You do not have permission to approve documents');
    }

    const docs = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT * FROM tenant_documents WHERE id = $2 AND deleted_at IS NULL',
      [documentId]
    );

    if (docs.length === 0) {
      throw new NotFoundError('Document not found');
    }

    const newStatus = approved ? 'approved' : 'pending_review';
    const action = approved ? 'approved' : 'rejected';

    await query(
      `UPDATE tenant_documents
       SET status = $3,
           ${approved ? 'approved_by = $4, approved_at = NOW()' : 'reviewed_by = $4, reviewed_at = NOW()'},
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, documentId, newStatus, userId]
    );

    await logDocumentAccess(Number(tenantId), Number(documentId), userId, action, { notes }, req);

    logger.info(`Document ${action}`, {
      tenantId,
      documentId,
      userId,
      approved,
    });

    res.json({
      message: `Document ${action} successfully`,
    });
  })
);

/**
 * POST /tenants/:tenantId/documents/:documentId/share
 * Share document with another user
 */
router.post(
  '/tenants/:tenantId/documents/:documentId/share',
  validateParams(documentIdParamSchema),
  validateBody(shareDocumentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { sharedWith, accessType, expiresAt } = req.body;

    const { hasAccess, document } = await checkDocumentAccess(
      Number(tenantId),
      Number(documentId),
      userId,
      userRole,
      'view'
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to share this document');
    }

    // Verify target user exists
    const targetUser = await queryWithTenant<any>(
      Number(tenantId),
      'SELECT id FROM tenant_users WHERE id = $2 AND is_active = true',
      [sharedWith]
    );

    if (targetUser.length === 0) {
      throw new ValidationError('Target user not found');
    }

    // Create share record
    await query(
      `INSERT INTO tenant_document_shares
       (tenant_id, document_id, shared_by, shared_with, access_type, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (document_id, shared_with)
       DO UPDATE SET access_type = $5, expires_at = $6, created_at = NOW()`,
      [tenantId, documentId, userId, sharedWith, accessType, expiresAt || null]
    );

    await logDocumentAccess(
      Number(tenantId),
      Number(documentId),
      userId,
      'shared',
      { sharedWith, accessType },
      req
    );

    res.json({
      message: 'Document shared successfully',
    });
  })
);

/**
 * DELETE /tenants/:tenantId/documents/:documentId
 * Soft delete a document
 */
router.delete(
  '/tenants/:tenantId/documents/:documentId',
  validateParams(documentIdParamSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document } = await checkDocumentAccess(
      Number(tenantId),
      Number(documentId),
      userId,
      userRole,
      'delete'
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Only admins and document owner can delete
    if (userRole !== 'admin' && document.uploaded_by !== userId) {
      throw new ForbiddenError('You do not have permission to delete this document');
    }

    await query(
      `UPDATE tenant_documents
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, documentId]
    );

    await logDocumentAccess(Number(tenantId), Number(documentId), userId, 'deleted', {}, req);

    logger.info('Document deleted', {
      tenantId,
      documentId,
      userId,
    });

    res.json({
      message: 'Document deleted successfully',
    });
  })
);

/**
 * GET /tenants/:tenantId/documents/stats
 * Get document statistics
 */
router.get(
  '/tenants/:tenantId/documents/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Total documents
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM tenant_documents WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );

    // By category
    const categoryResult = await query(
      `SELECT category, COUNT(*) as count
       FROM tenant_documents
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY category`,
      [tenantId]
    );

    // By status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM tenant_documents
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY status`,
      [tenantId]
    );

    // Expiring soon (within 30 days)
    const expiringSoonResult = await query(
      `SELECT COUNT(*) as count
       FROM tenant_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND expiry_date IS NOT NULL
         AND expiry_date <= NOW() + INTERVAL '30 days'
         AND expiry_date > NOW()`,
      [tenantId]
    );

    // Already expired
    const expiredResult = await query(
      `SELECT COUNT(*) as count
       FROM tenant_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND expiry_date IS NOT NULL
         AND expiry_date < NOW()`,
      [tenantId]
    );

    // Pending review
    const pendingResult = await query(
      `SELECT COUNT(*) as count
       FROM tenant_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND status = 'pending_review'`,
      [tenantId]
    );

    // Storage used
    const storageResult = await query(
      `SELECT COALESCE(SUM(file_size), 0) as total_bytes
       FROM tenant_documents
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    const byCategory: Record<string, number> = {};
    categoryResult.rows.forEach((row: any) => {
      byCategory[row.category] = parseInt(row.count, 10);
    });

    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach((row: any) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    res.json({
      stats: {
        totalDocuments: parseInt(totalResult.rows[0].total, 10),
        byCategory,
        byStatus,
        expiringSoon: parseInt(expiringSoonResult.rows[0].count, 10),
        expired: parseInt(expiredResult.rows[0].count, 10),
        pendingReview: parseInt(pendingResult.rows[0].count, 10),
        storageUsed: parseInt(storageResult.rows[0].total_bytes, 10),
      },
    });
  })
);

/**
 * GET /tenants/:tenantId/documents/expiring
 * Get documents expiring soon
 */
router.get(
  '/tenants/:tenantId/documents/expiring',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;

    const documents = await query(
      `SELECT d.*,
              c.first_name as client_first_name,
              c.last_name as client_last_name,
              cr.first_name as carer_first_name,
              cr.last_name as carer_last_name
       FROM tenant_documents d
       LEFT JOIN tenant_clients c ON d.client_id = c.id AND c.tenant_id = d.tenant_id
       LEFT JOIN tenant_carers cr ON d.carer_id = cr.id AND cr.tenant_id = d.tenant_id
       WHERE d.tenant_id = $1
         AND d.deleted_at IS NULL
         AND d.expiry_date IS NOT NULL
         AND d.expiry_date <= NOW() + INTERVAL '${Number(days)} days'
       ORDER BY d.expiry_date ASC`,
      [tenantId]
    );

    res.json({
      documents: documents.rows,
    });
  })
);

export default router;
