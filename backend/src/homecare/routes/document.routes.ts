import express, { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { verifyTenantAccess, AuthenticatedRequest } from '../../middleware/verifyTenantAccess';
import { query, queryOne } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errorTypes';
import { logger } from '../../utils/logger';
import { sanitizeInput } from '../../utils/sanitize';

const router: Router = express.Router();

/**
 * Home Care Document Routes
 * Full document management system for care documentation
 * (Completely separate from travel support documents)
 */

/**
 * Check document access permissions based on role and access level
 */
async function checkDocumentAccess(
  tenantId: string,
  documentId: string,
  userId: number,
  userRole: string
): Promise<{ hasAccess: boolean; document: any }> {
  const document = await queryOne(
    `SELECT d.*, c.first_name as client_first_name, c.last_name as client_last_name
     FROM tenant_homecare_documents d
     LEFT JOIN tenant_care_clients c ON d.client_id = c.client_id AND d.tenant_id = c.tenant_id
     WHERE d.tenant_id = $1 AND d.document_id = $2 AND d.deleted_at IS NULL`,
    [tenantId, documentId]
  );

  if (!document) {
    return { hasAccess: false, document: null };
  }

  // Admin has full access
  if (userRole === 'admin') {
    return { hasAccess: true, document };
  }

  // Check access level
  const accessLevel = document.access_level || 'staff';

  switch (accessLevel) {
    case 'public':
    case 'staff':
      return { hasAccess: true, document };

    case 'management':
      const hasManagementAccess = ['admin', 'manager', 'coordinator'].includes(userRole);
      return { hasAccess: hasManagementAccess, document };

    case 'confidential':
      // Only admin can access confidential documents
      return { hasAccess: userRole === 'admin', document };

    default:
      return { hasAccess: true, document };
  }
}

/**
 * Log document access for audit trail
 */
async function logDocumentAccess(
  tenantId: string,
  documentId: string,
  userId: number,
  action: string,
  details?: any
): Promise<void> {
  await query(
    `INSERT INTO tenant_homecare_document_audit (
      tenant_id, document_id, user_id, action, details, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())`,
    [tenantId, documentId, userId, action, details ? JSON.stringify(details) : null]
  );
}

/**
 * GET /api/homecare/tenants/:tenantId/documents
 * List documents with filtering and pagination
 */
router.get(
  '/tenants/:tenantId/documents',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = 1,
      limit = 20,
      category,
      status,
      client_id,
      carer_id,
      search,
      expiring_soon,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [tenantId];
    let paramIndex = 2;

    let whereClause = 'd.tenant_id = $1 AND d.deleted_at IS NULL';

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

    if (client_id) {
      whereClause += ` AND d.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (carer_id) {
      whereClause += ` AND d.carer_id = $${paramIndex}`;
      params.push(carer_id);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (expiring_soon === 'true') {
      whereClause += ` AND d.expiry_date IS NOT NULL AND d.expiry_date <= NOW() + INTERVAL '30 days'`;
    }

    // Apply access control for non-admins
    if (req.user?.role !== 'admin') {
      whereClause += ` AND (d.access_level IN ('public', 'staff')`;
      if (['manager', 'coordinator'].includes(req.user?.role || '')) {
        whereClause += ` OR d.access_level = 'management'`;
      }
      whereClause += ')';
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM tenant_homecare_documents d WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.total || '0', 10);

    // Sort mapping
    const sortColumns: Record<string, string> = {
      title: 'd.title',
      created_at: 'd.created_at',
      expiry_date: 'd.expiry_date',
      category: 'd.category',
      status: 'd.status'
    };
    const sortColumn = sortColumns[sort_by as string] || 'd.created_at';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get documents
    const documents = await query(
      `SELECT
        d.document_id,
        d.title,
        d.description,
        d.category,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.client_id,
        d.carer_id,
        d.expiry_date,
        d.status,
        d.access_level,
        d.version,
        d.uploaded_by,
        d.created_at,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name,
        u.first_name as uploaded_by_first_name,
        u.last_name as uploaded_by_last_name
      FROM tenant_homecare_documents d
      LEFT JOIN tenant_care_clients c ON d.client_id = c.client_id AND d.tenant_id = c.tenant_id
      LEFT JOIN tenant_carers cr ON d.carer_id = cr.carer_id AND d.tenant_id = cr.tenant_id
      LEFT JOIN tenant_users u ON d.uploaded_by = u.user_id AND d.tenant_id = u.tenant_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/documents/expiring
 * Get documents expiring soon (DBS certificates, policies, etc.)
 */
router.get(
  '/tenants/:tenantId/documents/expiring',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;

    const documents = await query(
      `SELECT
        d.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        cr.first_name as carer_first_name,
        cr.last_name as carer_last_name,
        EXTRACT(DAY FROM (d.expiry_date - CURRENT_DATE)) as days_until_expiry
      FROM tenant_homecare_documents d
      LEFT JOIN tenant_care_clients c ON d.client_id = c.client_id AND d.tenant_id = c.tenant_id
      LEFT JOIN tenant_carers cr ON d.carer_id = cr.carer_id AND d.tenant_id = cr.tenant_id
      WHERE d.tenant_id = $1
        AND d.deleted_at IS NULL
        AND d.expiry_date IS NOT NULL
        AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${parseInt(days as string)} days'
      ORDER BY d.expiry_date ASC`,
      [tenantId]
    );

    res.json(documents);
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/documents/:documentId
 * Get a specific document with audit log
 */
router.get(
  '/tenants/:tenantId/documents/:documentId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document } = await checkDocumentAccess(tenantId, documentId, userId, userRole);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (!hasAccess) {
      throw new ValidationError('You do not have access to this document');
    }

    // Log view access
    await logDocumentAccess(tenantId, documentId, userId, 'viewed');

    // Get audit log (last 20 entries)
    const auditLog = await query(
      `SELECT a.*, u.first_name, u.last_name
       FROM tenant_homecare_document_audit a
       LEFT JOIN tenant_users u ON a.user_id = u.user_id AND a.tenant_id = u.tenant_id
       WHERE a.tenant_id = $1 AND a.document_id = $2
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [tenantId, documentId]
    );

    res.json({
      document,
      auditLog
    });
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/documents
 * Create a new document record
 */
router.post(
  '/tenants/:tenantId/documents',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user!.userId;
    const {
      title,
      description,
      category,
      client_id,
      carer_id,
      file_path,
      file_size,
      mime_type,
      expiry_date,
      reminder_date,
      access_level = 'staff',
      tags,
      metadata
    } = req.body;

    // Validate required fields
    if (!title || !category) {
      throw new ValidationError('Title and category are required');
    }

    // Validate client exists if provided
    if (client_id) {
      const client = await queryOne(
        'SELECT client_id FROM tenant_care_clients WHERE tenant_id = $1 AND client_id = $2',
        [tenantId, client_id]
      );
      if (!client) {
        throw new ValidationError('Client not found');
      }
    }

    // Validate carer exists if provided
    if (carer_id) {
      const carer = await queryOne(
        'SELECT carer_id FROM tenant_carers WHERE tenant_id = $1 AND carer_id = $2',
        [tenantId, carer_id]
      );
      if (!carer) {
        throw new ValidationError('Carer not found');
      }
    }

    const result = await queryOne(
      `INSERT INTO tenant_homecare_documents (
        tenant_id, title, description, category,
        client_id, carer_id,
        file_path, file_size, mime_type,
        expiry_date, reminder_date,
        access_level, tags, metadata,
        status, version, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', 1, $15, NOW())
      RETURNING *`,
      [
        tenantId,
        sanitizeInput(title),
        description ? sanitizeInput(description) : null,
        category,
        client_id || null,
        carer_id || null,
        file_path || null,
        file_size || null,
        mime_type || null,
        expiry_date || null,
        reminder_date || null,
        access_level,
        tags ? JSON.stringify(tags) : null,
        metadata ? JSON.stringify(metadata) : null,
        userId
      ]
    );

    // Log creation
    await logDocumentAccess(tenantId, result.document_id, userId, 'created', {
      title,
      category,
      client_id,
      carer_id
    });

    logger.info(`Created homecare document ${result.document_id} for tenant ${tenantId}`);
    res.status(201).json(result);
  })
);

/**
 * PUT /api/homecare/tenants/:tenantId/documents/:documentId
 * Update document metadata
 */
router.put(
  '/tenants/:tenantId/documents/:documentId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document: existingDoc } = await checkDocumentAccess(
      tenantId,
      documentId,
      userId,
      userRole
    );

    if (!existingDoc) {
      throw new NotFoundError('Document not found');
    }

    if (!hasAccess && userRole !== 'admin') {
      throw new ValidationError('You do not have permission to edit this document');
    }

    const updates = req.body;
    const updateFields: string[] = [];
    const updateValues: any[] = [tenantId, documentId];
    let paramIndex = 3;

    const fieldMapping: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      access_level: 'access_level',
      expiry_date: 'expiry_date',
      reminder_date: 'reminder_date',
      tags: 'tags',
      metadata: 'metadata',
      status: 'status'
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (updates[key] !== undefined) {
        if (key === 'title' || key === 'description') {
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(sanitizeInput(updates[key]));
        } else if (['tags', 'metadata'].includes(key)) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(updates[key] ? JSON.stringify(updates[key]) : null);
        } else {
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push(updates[key]);
        }
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await queryOne(
      `UPDATE tenant_homecare_documents
       SET ${updateFields.join(', ')}
       WHERE tenant_id = $1 AND document_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    // Log update
    await logDocumentAccess(tenantId, documentId, userId, 'updated', updates);

    logger.info(`Updated homecare document ${documentId} for tenant ${tenantId}`);
    res.json(result);
  })
);

/**
 * POST /api/homecare/tenants/:tenantId/documents/:documentId/approve
 * Approve or reject a document
 */
router.post(
  '/tenants/:tenantId/documents/:documentId/approve',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { approved, notes } = req.body;

    // Only managers and admins can approve
    if (!['admin', 'manager', 'coordinator'].includes(userRole)) {
      throw new ValidationError('Only managers and admins can approve documents');
    }

    const document = await queryOne(
      'SELECT document_id FROM tenant_homecare_documents WHERE tenant_id = $1 AND document_id = $2 AND deleted_at IS NULL',
      [tenantId, documentId]
    );

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const newStatus = approved ? 'approved' : 'pending_review';
    const action = approved ? 'approved' : 'rejected';

    await query(
      `UPDATE tenant_homecare_documents
       SET status = $3,
           approved_by = $4,
           approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND document_id = $2`,
      [tenantId, documentId, newStatus, userId]
    );

    await logDocumentAccess(tenantId, documentId, userId, action, { notes });

    logger.info(`Document ${documentId} ${action} by user ${userId}`);
    res.json({ message: `Document ${action} successfully` });
  })
);

/**
 * DELETE /api/homecare/tenants/:tenantId/documents/:documentId
 * Soft delete a document
 */
router.delete(
  '/tenants/:tenantId/documents/:documentId',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, documentId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { hasAccess, document } = await checkDocumentAccess(tenantId, documentId, userId, userRole);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Only admin or document owner can delete
    if (userRole !== 'admin' && document.uploaded_by !== userId) {
      throw new ValidationError('You do not have permission to delete this document');
    }

    await query(
      `UPDATE tenant_homecare_documents
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1 AND document_id = $2`,
      [tenantId, documentId]
    );

    await logDocumentAccess(tenantId, documentId, userId, 'deleted');

    logger.info(`Deleted homecare document ${documentId} for tenant ${tenantId}`);
    res.json({ message: 'Document deleted successfully' });
  })
);

/**
 * GET /api/homecare/tenants/:tenantId/documents/stats
 * Get document statistics
 */
router.get(
  '/tenants/:tenantId/documents/stats',
  verifyTenantAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.params;

    // Total documents
    const totalResult = await queryOne(
      'SELECT COUNT(*) as total FROM tenant_homecare_documents WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );

    // By category
    const categoryResult = await query(
      `SELECT category, COUNT(*) as count
       FROM tenant_homecare_documents
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY category
       ORDER BY count DESC`,
      [tenantId]
    );

    // By status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM tenant_homecare_documents
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY status`,
      [tenantId]
    );

    // Expiring soon (within 30 days)
    const expiringSoonResult = await queryOne(
      `SELECT COUNT(*) as count
       FROM tenant_homecare_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND expiry_date IS NOT NULL
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
      [tenantId]
    );

    // Already expired
    const expiredResult = await queryOne(
      `SELECT COUNT(*) as count
       FROM tenant_homecare_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND expiry_date IS NOT NULL
         AND expiry_date < CURRENT_DATE`,
      [tenantId]
    );

    // Pending review
    const pendingResult = await queryOne(
      `SELECT COUNT(*) as count
       FROM tenant_homecare_documents
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND status = 'pending_review'`,
      [tenantId]
    );

    const byCategory: Record<string, number> = {};
    categoryResult.forEach((row: any) => {
      byCategory[row.category] = parseInt(row.count, 10);
    });

    const byStatus: Record<string, number> = {};
    statusResult.forEach((row: any) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    res.json({
      stats: {
        totalDocuments: parseInt(totalResult.total || '0', 10),
        byCategory,
        byStatus,
        expiringSoon: parseInt(expiringSoonResult.count || '0', 10),
        expired: parseInt(expiredResult.count || '0', 10),
        pendingReview: parseInt(pendingResult.count || '0', 10)
      }
    });
  })
);

export default router;
