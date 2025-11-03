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
                COUNT(CASE WHEN expiry_date <= CURRENT_DATE THEN 1 END) as expired_records
            FROM tenant_training_records
            WHERE tenant_id = $1
        `, [tenantId]);

        // Get driver count
        const driversResult = await client.query(`
            SELECT COUNT(*) as total_drivers
            FROM tenant_drivers
            WHERE tenant_id = $1 AND is_active = true
        `, [tenantId]);

        const types = typesResult.rows[0] || {};
        const records = recordsResult.rows[0] || {};
        const drivers = driversResult.rows[0] || {};

        const totalDrivers = parseInt(drivers.total_drivers || '0');
        const expiredCount = parseInt(records.expired_records || '0');

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
                fullyCompliant: 0, // Will be calculated with proper compliance logic
                complianceRate: 0
            },
            alerts: {
                total: expiredCount,
                expired: expiredCount,
                expiringSoon: 0 // Will need additional query for expiring soon
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

    const client = await getDbClient();

    try {
        const result = await client.query(`
            SELECT
                tr.training_record_id as id,
                tr.driver_id as "driverId",
                tr.training_type_id as "trainingTypeId",
                tr.completed_date as "completedDate",
                tr.expiry_date as "expiryDate",
                tr.provider,
                tr.certificate_number as "certificateNumber",
                d.name as "driverName",
                tt.name as "trainingTypeName",
                tt.category as "trainingCategory",
                CASE
                    WHEN tr.expiry_date <= CURRENT_DATE THEN 'expired'
                    WHEN tr.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM tenant_training_records tr
            LEFT JOIN tenant_drivers d ON tr.driver_id = d.driver_id AND tr.tenant_id = d.tenant_id
            LEFT JOIN tenant_training_types tt ON tr.training_type_id = tt.training_type_id AND tr.tenant_id = tt.tenant_id
            WHERE tr.tenant_id = $1
            ORDER BY tr.completed_date DESC
            LIMIT $2 OFFSET $3
        `, [tenantId, limit, offset]);

        const countResult = await client.query(`
            SELECT COUNT(*) as total
            FROM tenant_training_records
            WHERE tenant_id = $1
        `, [tenantId]);

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

export default router;
