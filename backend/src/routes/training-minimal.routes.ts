/**
 * Training Management Routes - Minimal Working Version
 * Essential endpoints for React frontend
 */

import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { getDbClient } from '../config/database';

const router: Router = express.Router();

// GET /api/tenants/:tenantId/training - Training overview
router.get('/tenants/:tenantId/training', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    try {
        // Get training types count
        const typesResult = await client.query(`
            SELECT
                COUNT(*) as total_types,
                COUNT(CASE WHEN is_mandatory = true THEN 1 END) as mandatory_types
            FROM tenant_training_types
            WHERE tenant_id = $1 AND is_active = true
        `, [tenantId]);

        // Get training records statistics
        const recordsResult = await client.query(`
            SELECT
                COUNT(*) as total_records,
                COUNT(CASE WHEN expiry_date > CURRENT_DATE THEN 1 END) as valid_records,
                COUNT(CASE WHEN expiry_date <= CURRENT_DATE THEN 1 END) as expired_records,
                COUNT(CASE WHEN expiry_date > CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon
            FROM tenant_training_records
            WHERE tenant_id = $1 AND archived = false
        `, [tenantId]);

        // Get driver count
        const driversResult = await client.query(`
            SELECT COUNT(*) as total_drivers
            FROM tenant_drivers
            WHERE tenant_id = $1 AND is_active = true AND archived = false
        `, [tenantId]);

        // Get driver compliance
        const complianceResult = await client.query(`
            SELECT
                COUNT(DISTINCT d.driver_id) as compliant_drivers
            FROM tenant_drivers d
            WHERE d.tenant_id = $1 AND d.is_active = true AND d.archived = false
            AND NOT EXISTS (
                SELECT 1 FROM tenant_training_types tt
                WHERE tt.tenant_id = $1 AND tt.is_mandatory = true AND tt.is_active = true
                AND NOT EXISTS (
                    SELECT 1 FROM tenant_training_records tr
                    WHERE tr.driver_id = d.driver_id
                    AND tr.training_type_id = tt.training_type_id
                    AND tr.tenant_id = $1
                    AND tr.expiry_date > CURRENT_DATE
                    AND tr.archived = false
                )
            )
        `, [tenantId]);

        const types = typesResult.rows[0] || {};
        const records = recordsResult.rows[0] || {};
        const drivers = driversResult.rows[0] || {};
        const compliance = complianceResult.rows[0] || {};

        const totalDrivers = parseInt(drivers.total_drivers || '0');
        const expiredCount = parseInt(records.expired_records || '0');
        const expiringSoonCount = parseInt(records.expiring_soon || '0');
        const compliantDrivers = parseInt(compliance.compliant_drivers || '0');

        const overview = {
            trainingTypes: {
                total: parseInt(types.total_types || '0'),
                mandatory: parseInt(types.mandatory_types || '0'),
                optional: parseInt(types.total_types || '0') - parseInt(types.mandatory_types || '0')
            },
            trainingRecords: {
                total: parseInt(records.total_records || '0'),
                valid: parseInt(records.valid_records || '0'),
                expired: expiredCount
            },
            driverCompliance: {
                totalDrivers: totalDrivers,
                fullyCompliant: compliantDrivers,
                complianceRate: totalDrivers > 0 ? Math.round((compliantDrivers / totalDrivers) * 100) : 0
            },
            alerts: {
                total: expiredCount + expiringSoonCount,
                expired: expiredCount,
                expiringSoon: expiringSoonCount
            }
        };

        res.json(overview);
    } finally {
        client.release();
    }
}));

// GET /api/tenants/:tenantId/training-types - Get all training types
router.get('/tenants/:tenantId/training-types', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    try {
        const result = await client.query(`
            SELECT
                training_type_id as id,
                name,
                description,
                category,
                validity_period_months as "validityPeriod",
                is_mandatory as mandatory,
                created_at,
                updated_at
            FROM tenant_training_types
            WHERE tenant_id = $1 AND is_active = true
            ORDER BY category, name
        `, [tenantId]);

        res.json({ trainingTypes: result.rows });
    } finally {
        client.release();
    }
}));

// GET /api/tenants/:tenantId/training-records - Get all training records
router.get('/tenants/:tenantId/training-records', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '50');
    const offset = (page - 1) * limit;
    const { archived, search } = req.query;

    const client = await getDbClient();

    try {
        // Build WHERE clause
        const conditions: string[] = ['tr.tenant_id = $1'];
        const params: any[] = [tenantId];
        let paramCount = 2;

        // Archived filter (default: show only non-archived)
        if (archived === 'true') {
            conditions.push('tr.archived = true');
        } else if (archived === 'false' || archived === undefined) {
            conditions.push('tr.archived = false');
        }

        // Search filter
        if (search && typeof search === 'string' && search.trim()) {
            conditions.push(`(d.name ILIKE $${paramCount} OR tt.name ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.join(' AND ');

        // Add pagination params
        params.push(limit, offset);

        const result = await client.query(`
            SELECT
                tr.training_record_id as id,
                tr.driver_id as "driverId",
                tr.training_type_id as "trainingTypeId",
                tr.completed_date as "completedDate",
                tr.expiry_date as "expiryDate",
                tr.provider,
                tr.certificate_number as "certificateNumber",
                tr.archived,
                d.name as "driverName",
                tt.name as "trainingTypeName",
                tt.category as "trainingCategory",
                CASE
                    WHEN tr.expiry_date <= CURRENT_DATE THEN 'expired'
                    WHEN tr.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM tenant_training_records tr
            LEFT JOIN tenant_drivers d ON tr.driver_id = d.driver_id AND tr.tenant_id = d.tenant_id
            LEFT JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
            WHERE ${whereClause}
            ORDER BY tr.completed_date DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `, params);

        const countResult = await client.query(`
            SELECT COUNT(*) as total
            FROM tenant_training_records tr
            LEFT JOIN tenant_drivers d ON tr.driver_id = d.driver_id AND tr.tenant_id = d.tenant_id
            LEFT JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
            WHERE ${whereClause}
        `, params.slice(0, -2));

        const total = parseInt(countResult.rows[0].total);

        res.json({
            trainingRecords: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } finally {
        client.release();
    }
}));

// GET /api/tenants/:tenantId/training-compliance - Get compliance status
router.get('/tenants/:tenantId/training-compliance', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const client = await getDbClient();

    try {
        // Get basic compliance data
        const result = await client.query(`
            SELECT
                d.driver_id as "driverId",
                d.name as "driverName",
                COUNT(DISTINCT tt.training_type_id) as "totalRequired",
                COUNT(DISTINCT CASE WHEN tr.expiry_date > CURRENT_DATE THEN tt.training_type_id END) as "totalValid"
            FROM tenant_drivers d
            CROSS JOIN tenant_training_types tt
            LEFT JOIN tenant_training_records tr ON (
                tr.driver_id = d.driver_id
                AND tr.training_type_id = tt.training_type_id
                AND tr.tenant_id = tt.tenant_id
            )
            WHERE d.tenant_id = $1 AND tt.tenant_id = $1
              AND d.is_active = true AND tt.is_active = true
            GROUP BY d.driver_id, d.name
            ORDER BY d.name
        `, [tenantId]);

        res.json({
            driverCompliance: result.rows,
            overallStats: {
                totalDrivers: result.rows.length
            }
        });
    } finally {
        client.release();
    }
}));

// POST /api/tenants/:tenantId/training-types - Create a new training type
router.post('/tenants/:tenantId/training-types', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { name, description, category, validityPeriod, mandatory } = req.body;

    // Validation
    if (!name || !category || !validityPeriod) {
        res.status(400).json({ error: 'Name, category, and validity period are required' });
        return;
    }

    const client = await getDbClient();

    try {
        const result = await client.query(`
            INSERT INTO tenant_training_types (
                tenant_id,
                name,
                description,
                category,
                validity_period_months,
                is_mandatory,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING
                training_type_id as id,
                name,
                description,
                category,
                validity_period_months as "validityPeriod",
                is_mandatory as mandatory,
                created_at,
                updated_at
        `, [tenantId, name, description || '', category, validityPeriod, mandatory || false]);

        res.status(201).json(result.rows[0]);
    } finally {
        client.release();
    }
}));

// PUT /api/tenants/:tenantId/training-types/:typeId - Update a training type
router.put('/tenants/:tenantId/training-types/:typeId', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, typeId } = req.params;
    const { name, description, category, validityPeriod, mandatory, isActive } = req.body;

    const client = await getDbClient();

    try {
        const result = await client.query(`
            UPDATE tenant_training_types
            SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                validity_period_months = COALESCE($4, validity_period_months),
                is_mandatory = COALESCE($5, is_mandatory),
                is_active = COALESCE($6, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE training_type_id = $7 AND tenant_id = $8
            RETURNING
                training_type_id as id,
                name,
                description,
                category,
                validity_period_months as "validityPeriod",
                is_mandatory as mandatory,
                is_active as "isActive",
                created_at,
                updated_at
        `, [name, description, category, validityPeriod, mandatory, isActive, typeId, tenantId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Training type not found' });
            return;
        }

        res.json(result.rows[0]);
    } finally {
        client.release();
    }
}));

// DELETE /api/tenants/:tenantId/training-types/:typeId - Delete a training type (soft delete)
router.delete('/tenants/:tenantId/training-types/:typeId', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, typeId } = req.params;

    const client = await getDbClient();

    try {
        const result = await client.query(`
            UPDATE tenant_training_types
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE training_type_id = $1 AND tenant_id = $2
            RETURNING training_type_id as id
        `, [typeId, tenantId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Training type not found' });
            return;
        }

        res.json({ message: 'Training type deleted successfully', id: result.rows[0].id });
    } finally {
        client.release();
    }
}));

// POST /api/tenants/:tenantId/training-records - Create a new training record
router.post('/tenants/:tenantId/training-records', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
        driverId,
        trainingTypeId,
        completedDate,
        expiryDate,
        provider,
        certificateNumber,
        notes
    } = req.body;

    // Validation
    if (!driverId || !trainingTypeId || !completedDate) {
        res.status(400).json({ error: 'Driver ID, training type ID, and completed date are required' });
        return;
    }

    const client = await getDbClient();

    try {
        // Calculate expiry date if not provided
        let calculatedExpiryDate = expiryDate;
        if (!calculatedExpiryDate) {
            // Get validity period from training type
            const typeResult = await client.query(`
                SELECT validity_period_months
                FROM tenant_training_types
                WHERE training_type_id = $1 AND tenant_id = $2
            `, [trainingTypeId, tenantId]);

            if (typeResult.rows.length > 0) {
                const validityMonths = typeResult.rows[0].validity_period_months;
                const completed = new Date(completedDate);
                const expiry = new Date(completed);
                expiry.setMonth(expiry.getMonth() + validityMonths);
                calculatedExpiryDate = expiry.toISOString().split('T')[0];
            } else {
                res.status(400).json({ error: 'Training type not found' });
                return;
            }
        }

        const result = await client.query(`
            INSERT INTO tenant_training_records (
                tenant_id,
                driver_id,
                training_type_id,
                completed_date,
                expiry_date,
                provider,
                certificate_number,
                notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                training_record_id as id,
                driver_id as "driverId",
                training_type_id as "trainingTypeId",
                completed_date as "completedDate",
                expiry_date as "expiryDate",
                provider,
                certificate_number as "certificateNumber",
                notes,
                created_at,
                updated_at
        `, [
            tenantId,
            driverId,
            trainingTypeId,
            completedDate,
            calculatedExpiryDate,
            provider || null,
            certificateNumber || null,
            notes || null
        ]);

        res.status(201).json(result.rows[0]);
    } finally {
        client.release();
    }
}));

// PUT /api/tenants/:tenantId/training-records/:recordId - Update a training record
router.put('/tenants/:tenantId/training-records/:recordId', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, recordId } = req.params;
    const {
        completedDate,
        expiryDate,
        provider,
        certificateNumber,
        notes,
        archived
    } = req.body;

    const client = await getDbClient();

    try {
        const result = await client.query(`
            UPDATE tenant_training_records
            SET
                completed_date = COALESCE($1, completed_date),
                expiry_date = COALESCE($2, expiry_date),
                provider = COALESCE($3, provider),
                certificate_number = COALESCE($4, certificate_number),
                notes = COALESCE($5, notes),
                archived = COALESCE($6, archived),
                updated_at = CURRENT_TIMESTAMP
            WHERE training_record_id = $7 AND tenant_id = $8
            RETURNING
                training_record_id as id,
                driver_id as "driverId",
                training_type_id as "trainingTypeId",
                completed_date as "completedDate",
                expiry_date as "expiryDate",
                provider,
                certificate_number as "certificateNumber",
                notes,
                archived,
                created_at,
                updated_at
        `, [completedDate, expiryDate, provider, certificateNumber, notes, archived, recordId, tenantId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Training record not found' });
            return;
        }

        res.json(result.rows[0]);
    } finally {
        client.release();
    }
}));

// DELETE /api/tenants/:tenantId/training-records/:recordId - Delete a training record (soft delete via archived)
router.delete('/tenants/:tenantId/training-records/:recordId', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, recordId } = req.params;

    const client = await getDbClient();

    try {
        const result = await client.query(`
            UPDATE tenant_training_records
            SET archived = true, updated_at = CURRENT_TIMESTAMP
            WHERE training_record_id = $1 AND tenant_id = $2
            RETURNING training_record_id as id
        `, [recordId, tenantId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Training record not found' });
            return;
        }

        res.json({ message: 'Training record deleted successfully', id: result.rows[0].id });
    } finally {
        client.release();
    }
}));

// GET /api/tenants/:tenantId/training-records/export - Export training records to CSV
router.get('/tenants/:tenantId/training-records/export', verifyTenantAccess, asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { search, driverId, archived } = req.query;

    const client = await getDbClient();

    try {
        // Build WHERE clause
        const conditions: string[] = ['tr.tenant_id = $1'];
        const params: any[] = [tenantId];
        let paramCount = 2;

        if (search && typeof search === 'string' && search.trim()) {
            conditions.push(`(d.name ILIKE $${paramCount} OR tt.name ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        if (driverId) {
            conditions.push(`tr.driver_id = $${paramCount}`);
            params.push(driverId);
            paramCount++;
        }

        // Archived filter
        if (archived === 'true') {
            conditions.push('tr.archived = true');
        } else if (archived === 'false' || archived === undefined) {
            conditions.push('tr.archived = false');
        }

        const whereClause = conditions.join(' AND ');

        // Get all training records (no pagination for export)
        const result = await client.query(`
            SELECT
                tr.training_record_id as id,
                d.name as driver_name,
                tt.name as training_type,
                tt.category,
                tr.completed_date,
                tr.expiry_date,
                tr.provider,
                tr.certificate_number,
                tr.notes,
                tr.archived,
                CASE
                    WHEN tr.expiry_date <= CURRENT_DATE THEN 'Expired'
                    WHEN tr.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
                    ELSE 'Valid'
                END as status,
                tr.created_at,
                tr.updated_at
            FROM tenant_training_records tr
            LEFT JOIN tenant_drivers d ON tr.driver_id = d.driver_id AND tr.tenant_id = d.tenant_id
            LEFT JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
            WHERE ${whereClause}
            ORDER BY tr.completed_date DESC
        `, params);

        // Generate CSV
        const csvHeaders = [
            'ID',
            'Driver Name',
            'Training Type',
            'Category',
            'Completed Date',
            'Expiry Date',
            'Provider',
            'Certificate Number',
            'Notes',
            'Status',
            'Archived',
            'Created At',
            'Updated At',
        ];

        // Escape CSV values
        const escapeCsvValue = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvRows = result.rows.map((record) => [
            escapeCsvValue(record.id),
            escapeCsvValue(record.driver_name),
            escapeCsvValue(record.training_type),
            escapeCsvValue(record.category),
            escapeCsvValue(record.completed_date?.toISOString().split('T')[0]),
            escapeCsvValue(record.expiry_date?.toISOString().split('T')[0]),
            escapeCsvValue(record.provider),
            escapeCsvValue(record.certificate_number),
            escapeCsvValue(record.notes),
            escapeCsvValue(record.status),
            escapeCsvValue(record.archived ? 'Yes' : 'No'),
            escapeCsvValue(record.created_at?.toISOString()),
            escapeCsvValue(record.updated_at?.toISOString()),
        ]);

        const csv = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

        // Set headers for file download
        const filename = `training-records-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } finally {
        client.release();
    }
}));

export default router;
