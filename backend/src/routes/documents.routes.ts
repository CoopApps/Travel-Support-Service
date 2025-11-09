import express, { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const { tenantId, module, entityId } = req.params;
      const uploadPath = path.join(process.cwd(), 'storage', 'tenants', tenantId, module, entityId);

      // Create directory if it doesn't exist
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    // Generate UUID-based filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter for security
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB default
  }
});

// Helper function to calculate file hash
async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * @route POST /api/tenants/:tenantId/:module/:entityId/documents
 * @desc Upload a document
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/:module/:entityId/documents',
  verifyTenantAccess,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, module, entityId } = req.params;
    const file = req.file;

    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const {
      documentCategory,
      title,
      description,
      issueDate,
      expiryDate,
      isConfidential,
      accessLevel,
      tags,
      notes
    } = req.body;

    logger.info('Uploading document', { tenantId, module, entityId, filename: file.originalname });

    try {
      // Calculate file hash
      const fileHash = await calculateFileHash(file.path);

      // Get entity type from module
      const entityType = module === 'drivers' ? 'driver' :
                        module === 'customers' ? 'customer' :
                        module === 'vehicles' ? 'vehicle' :
                        module === 'training' ? 'training_record' :
                        module === 'safeguarding' ? 'safeguarding_report' :
                        'other';

      // Insert document record
      const result = await query(`
        INSERT INTO tenant_documents (
          tenant_id, original_filename, stored_filename, file_path, file_size,
          mime_type, file_hash, module, entity_type, entity_id, document_category,
          title, description, issue_date, expiry_date, is_confidential,
          access_level, tags, notes, uploaded_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `, [
        tenantId,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        fileHash,
        module,
        entityType,
        entityId,
        documentCategory || 'other',
        title || file.originalname,
        description || null,
        issueDate || null,
        expiryDate || null,
        isConfidential === 'true' || isConfidential === true,
        accessLevel || 'standard',
        tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        notes || null,
        (req as any).user?.userId
      ]);

      // Log access
      await query(`
        INSERT INTO document_access_log (
          document_id, tenant_id, user_id, action, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        result[0].document_id,
        tenantId,
        (req as any).user?.userId,
        'upload',
        req.ip,
        req.get('user-agent')
      ]);

      logger.info('Document uploaded successfully', { documentId: result[0].document_id });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: result[0]
      });

    } catch (error) {
      // Clean up file on error
      if (file) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error('Error deleting file after upload failure', { error: unlinkError });
        }
      }
      throw error;
    }
  })
);

/**
 * @route GET /api/tenants/:tenantId/:module/:entityId/documents
 * @desc Get documents for a specific entity
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/:module/:entityId/documents',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, module, entityId } = req.params;
    const { category, active = 'true' } = req.query;

    logger.info('Fetching entity documents', { tenantId, module, entityId });

    let sql = `
      SELECT
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name,
        CASE
          WHEN d.expiry_date IS NULL THEN 'no_expiry'
          WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          ELSE 'valid'
        END as expiry_status,
        CASE
          WHEN d.expiry_date IS NOT NULL THEN d.expiry_date - CURRENT_DATE
          ELSE NULL
        END as days_until_expiry
      FROM tenant_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.tenant_id = $1
        AND d.module = $2
        AND d.entity_id = $3
        AND d.is_active = $4
    `;

    const params: any[] = [tenantId, module, entityId, active === 'true'];

    if (category) {
      sql += ` AND d.document_category = $5`;
      params.push(category);
    }

    sql += ` ORDER BY d.uploaded_at DESC`;

    const result = await query(sql, params);

    res.json({
      documents: result,
      total: result.length
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/documents
 * @desc Get all documents across the system (centralized view)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/documents',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = '1',
      limit = '50',
      module,
      category,
      search,
      expiryStatus,
      expiryDays,
      uploadedBy,
      fromDate,
      toDate,
      fileType,
      sortBy = 'uploaded_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    logger.info('Fetching all documents', { tenantId, page, limit });

    let sql = `
      SELECT
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name,
        CASE
          WHEN d.expiry_date IS NULL THEN 'no_expiry'
          WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          ELSE 'valid'
        END as expiry_status,
        CASE
          WHEN d.expiry_date IS NOT NULL THEN d.expiry_date - CURRENT_DATE
          ELSE NULL
        END as days_until_expiry
      FROM tenant_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.tenant_id = $1 AND d.is_active = true
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Module filter
    if (module) {
      sql += ` AND d.module = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }

    // Category filter
    if (category) {
      sql += ` AND d.document_category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Search filter
    if (search) {
      sql += ` AND (
        d.original_filename ILIKE $${paramIndex} OR
        d.title ILIKE $${paramIndex} OR
        d.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Expiry status filter
    if (expiryStatus) {
      if (expiryStatus === 'expired') {
        sql += ` AND d.expiry_date < CURRENT_DATE`;
      } else if (expiryStatus === 'expiring') {
        sql += ` AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`;
      } else if (expiryStatus === 'valid') {
        sql += ` AND (d.expiry_date IS NULL OR d.expiry_date > CURRENT_DATE + INTERVAL '30 days')`;
      }
    }

    // Expiry days filter
    if (expiryDays) {
      sql += ` AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${parseInt(expiryDays as string)} days'`;
    }

    // Uploaded by filter
    if (uploadedBy) {
      sql += ` AND d.uploaded_by = $${paramIndex}`;
      params.push(uploadedBy);
      paramIndex++;
    }

    // Date range filter
    if (fromDate) {
      sql += ` AND d.uploaded_at >= $${paramIndex}`;
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      sql += ` AND d.uploaded_at <= $${paramIndex}`;
      params.push(toDate);
      paramIndex++;
    }

    // File type filter
    if (fileType) {
      sql += ` AND d.mime_type LIKE $${paramIndex}`;
      params.push(`%${fileType}%`);
      paramIndex++;
    }

    // Count total
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = await query<{ count: string }>(countSql, params);
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Add sorting and pagination
    const validSortColumns = ['uploaded_at', 'original_filename', 'file_size', 'expiry_date'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'uploaded_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY d.${sortColumn} ${order}`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      documents: result,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/documents/stats
 * @desc Get document statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/documents/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching document stats', { tenantId });

    // Overall stats
    const overallStats = await query<any>(`
      SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired_count,
        COUNT(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon_count,
        SUM(file_size) as total_storage_bytes
      FROM tenant_documents
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    // Stats by module
    const moduleStats = await query<any>(`
      SELECT
        module,
        COUNT(*) as document_count,
        SUM(file_size) as storage_bytes
      FROM tenant_documents
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY module
      ORDER BY document_count DESC
    `, [tenantId]);

    // Stats by category
    const categoryStats = await query<any>(`
      SELECT
        document_category,
        COUNT(*) as document_count
      FROM tenant_documents
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY document_category
      ORDER BY document_count DESC
      LIMIT 10
    `, [tenantId]);

    // Storage config
    const storageConfig = await query<any>(`
      SELECT
        storage_quota_bytes,
        storage_used_bytes,
        max_file_size
      FROM document_storage_config
      WHERE tenant_id = $1
    `, [tenantId]);

    res.json({
      overall: {
        ...overallStats[0],
        total_storage: formatFileSize(parseInt(overallStats[0]?.total_storage_bytes || '0', 10))
      },
      byModule: moduleStats,
      byCategory: categoryStats,
      storage: storageConfig[0] || {}
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/documents/entity/:module/:entityId
 * @desc Get entity drill-down - all documents for a specific entity across all modules
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/documents/entity/:module/:entityId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, module, entityId } = req.params;

    logger.info('Fetching entity drill-down documents', { tenantId, module, entityId });

    // Get entity information
    let entityData: any = null;
    let entityName = '';

    if (module === 'drivers') {
      const driverResult = await query(`
        SELECT driver_id as id, first_name, last_name, email, phone
        FROM tenant_drivers
        WHERE tenant_id = $1 AND driver_id = $2
      `, [tenantId, entityId]);

      if (driverResult.length > 0) {
        const driver = driverResult[0];
        entityName = `${driver.first_name} ${driver.last_name}`;
        entityData = driverResult[0];
      }
    } else if (module === 'customers') {
      const customerResult = await query(`
        SELECT customer_id as id, first_name, last_name, email, phone
        FROM tenant_customers
        WHERE tenant_id = $1 AND customer_id = $2
      `, [tenantId, entityId]);

      if (customerResult.length > 0) {
        const customer = customerResult[0];
        entityName = `${customer.first_name} ${customer.last_name}`;
        entityData = customerResult[0];
      }
    } else if (module === 'vehicles') {
      const vehicleResult = await query(`
        SELECT vehicle_id as id, registration_number, make, model
        FROM tenant_vehicles
        WHERE tenant_id = $1 AND vehicle_id = $2
      `, [tenantId, entityId]);

      if (vehicleResult.length > 0) {
        const vehicle = vehicleResult[0];
        entityName = `${vehicle.make} ${vehicle.model} (${vehicle.registration_number})`;
        entityData = vehicleResult[0];
      }
    }

    if (!entityData) {
      throw new NotFoundError(`Entity not found in ${module}`);
    }

    // Get all documents for this entity
    const documentsResult = await query(`
      SELECT
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name,
        CASE
          WHEN d.expiry_date IS NULL THEN 'no_expiry'
          WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          ELSE 'valid'
        END as expiry_status,
        CASE
          WHEN d.expiry_date IS NOT NULL THEN d.expiry_date - CURRENT_DATE
          ELSE NULL
        END as days_until_expiry
      FROM tenant_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.tenant_id = $1
        AND d.entity_id = $2
        AND d.is_active = true
      ORDER BY d.module, d.uploaded_at DESC
    `, [tenantId, entityId]);

    // Group documents by module
    const documentsByModule: Record<string, any[]> = {};
    documentsResult.forEach((doc: any) => {
      if (!documentsByModule[doc.module]) {
        documentsByModule[doc.module] = [];
      }
      documentsByModule[doc.module].push(doc);
    });

    // Calculate stats
    const stats = {
      total: documentsResult.length,
      expiring: documentsResult.filter((d: any) => d.expiry_status === 'warning' || d.expiry_status === 'critical').length,
      expired: documentsResult.filter((d: any) => d.expiry_status === 'expired').length
    };

    res.json({
      entity: {
        ...entityData,
        type: module,
        name: entityName
      },
      documentsByModule,
      stats
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/documents/:documentId/download
 * @desc Download a document
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/documents/:documentId/download',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, documentId } = req.params;

    logger.info('Downloading document', { tenantId, documentId });

    // Get document metadata
    const result = await query(`
      SELECT * FROM tenant_documents
      WHERE tenant_id = $1 AND document_id = $2 AND is_active = true
    `, [tenantId, documentId]);

    if (result.length === 0) {
      throw new NotFoundError('Document not found');
    }

    const document = result[0];

    // Log access
    await query(`
      INSERT INTO document_access_log (
        document_id, tenant_id, user_id, action, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      documentId,
      tenantId,
      (req as any).user?.userId,
      'download',
      req.ip,
      req.get('user-agent')
    ]);

    // Send file
    res.download(document.file_path, document.original_filename);
  })
);

/**
 * @route PATCH /api/tenants/:tenantId/documents/:documentId
 * @desc Update document metadata
 * @access Protected
 */
router.patch(
  '/tenants/:tenantId/documents/:documentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, documentId } = req.params;
    const {
      title,
      description,
      documentCategory,
      issueDate,
      expiryDate,
      isConfidential,
      accessLevel,
      tags,
      notes
    } = req.body;

    logger.info('Updating document', { tenantId, documentId });

    const updateFields: string[] = [];
    const values: any[] = [tenantId, documentId];
    let paramIndex = 3;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (documentCategory !== undefined) {
      updateFields.push(`document_category = $${paramIndex}`);
      values.push(documentCategory);
      paramIndex++;
    }

    if (issueDate !== undefined) {
      updateFields.push(`issue_date = $${paramIndex}`);
      values.push(issueDate);
      paramIndex++;
    }

    if (expiryDate !== undefined) {
      updateFields.push(`expiry_date = $${paramIndex}`);
      values.push(expiryDate);
      paramIndex++;
    }

    if (isConfidential !== undefined) {
      updateFields.push(`is_confidential = $${paramIndex}`);
      values.push(isConfidential);
      paramIndex++;
    }

    if (accessLevel !== undefined) {
      updateFields.push(`access_level = $${paramIndex}`);
      values.push(accessLevel);
      paramIndex++;
    }

    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      values.push(Array.isArray(tags) ? tags : tags.split(','));
      paramIndex++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updateFields.push(`updated_by = $${paramIndex}`);
    values.push((req as any).user?.userId);
    paramIndex++;

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE tenant_documents
      SET ${updateFields.join(', ')}
      WHERE tenant_id = $1 AND document_id = $2
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.length === 0) {
      throw new NotFoundError('Document not found');
    }

    // Log access
    await query(`
      INSERT INTO document_access_log (
        document_id, tenant_id, user_id, action, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      documentId,
      tenantId,
      (req as any).user?.userId,
      'update',
      req.ip,
      req.get('user-agent')
    ]);

    res.json({
      message: 'Document updated successfully',
      document: result[0]
    });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/documents/:documentId
 * @desc Delete/Archive a document
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/documents/:documentId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, documentId } = req.params;
    const { permanent = 'false' } = req.query;

    logger.info('Deleting document', { tenantId, documentId, permanent });

    if (permanent === 'true') {
      // Get document path before deletion
      const docResult = await query(`
        SELECT file_path FROM tenant_documents
        WHERE tenant_id = $1 AND document_id = $2
      `, [tenantId, documentId]);

      if (docResult.length === 0) {
        throw new NotFoundError('Document not found');
      }

      // Delete file from storage
      try {
        await fs.unlink(docResult[0].file_path);
      } catch (error) {
        logger.error('Error deleting file from storage', { error });
      }

      // Permanently delete from database
      await query(`
        DELETE FROM tenant_documents
        WHERE tenant_id = $1 AND document_id = $2
      `, [tenantId, documentId]);

    } else {
      // Soft delete (archive)
      await query(`
        UPDATE tenant_documents
        SET
          is_active = false,
          deleted_by = $3,
          deleted_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND document_id = $2
      `, [tenantId, documentId, (req as any).user?.userId]);
    }

    // Log access
    await query(`
      INSERT INTO document_access_log (
        document_id, tenant_id, user_id, action, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      documentId,
      tenantId,
      (req as any).user?.userId,
      permanent === 'true' ? 'delete' : 'archive',
      req.ip,
      req.get('user-agent')
    ]);

    res.json({
      message: `Document ${permanent === 'true' ? 'deleted' : 'archived'} successfully`
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/documents/expiring
 * @desc Get expiring documents
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/documents/expiring',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { days = '30' } = req.query;

    logger.info('Fetching expiring documents', { tenantId, days });

    const result = await query(`
      SELECT * FROM v_expiring_documents
      WHERE tenant_id = $1
        AND expiry_date <= CURRENT_DATE + INTERVAL '${parseInt(days as string)} days'
      ORDER BY expiry_date ASC
    `, [tenantId]);

    res.json({
      documents: result,
      total: result.length
    });
  })
);

export default router;
