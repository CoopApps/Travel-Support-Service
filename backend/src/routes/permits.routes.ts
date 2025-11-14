import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, getDbClient } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Permits Routes
 *
 * Complete permits management system for drivers and organizations
 * Database Tables:
 * - tenant_driver_permits
 * - tenant_driver_roles
 * - tenant_organizational_permits
 */

/**
 * @route GET /api/tenants/:tenantId/permits
 * @desc Get permits overview
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/permits',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching permits overview', { tenantId });

    // Get organizational permits count
    const orgPermitsResult = await query<{
      permit_type: string;
      count: string;
      expired: string;
      expiring: string;
    }>(
      `SELECT
        permit_type,
        COUNT(*) as count,
        COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date >= CURRENT_DATE THEN 1 END) as expiring
      FROM tenant_organizational_permits
      WHERE tenant_id = $1 AND status = 'active'
      GROUP BY permit_type`,
      [tenantId]
    );

    // Get driver permits statistics
    const driverPermitsResult = await query<{
      drivers_with_permits: string;
      total_driver_permits: string;
      expired_driver_permits: string;
      expiring_driver_permits: string;
    }>(
      `SELECT
        COUNT(DISTINCT dp.driver_id) as drivers_with_permits,
        COUNT(*) as total_driver_permits,
        COUNT(CASE WHEN dp.has_permit = true AND dp.expiry_date < CURRENT_DATE THEN 1 END) as expired_driver_permits,
        COUNT(CASE WHEN dp.has_permit = true AND dp.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND dp.expiry_date >= CURRENT_DATE THEN 1 END) as expiring_driver_permits
      FROM tenant_driver_permits dp
      LEFT JOIN tenant_drivers d ON dp.driver_id = d.driver_id AND dp.tenant_id = d.tenant_id
      WHERE dp.tenant_id = $1 AND d.is_active = true`,
      [tenantId]
    );

    // Get total active drivers
    const totalDriversResult = await query<{ total_drivers: string }>(
      `SELECT COUNT(*) as total_drivers
      FROM tenant_drivers
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    // Process organizational permits data
    const orgPermits = {
      section19: { total: 0, expired: 0, expiring: 0 },
      section22: { total: 0, expired: 0, expiring: 0 },
    };

    orgPermitsResult.forEach((row) => {
      if (row.permit_type === 'section19' || row.permit_type === 'section22') {
        orgPermits[row.permit_type] = {
          total: parseInt(row.count),
          expired: parseInt(row.expired),
          expiring: parseInt(row.expiring),
        };
      }
    });

    const driverStats = driverPermitsResult[0] || {};
    const totalDrivers = parseInt(totalDriversResult[0]?.total_drivers || '0');

    const overview = {
      organizational: {
        totalPermits: orgPermits.section19.total + orgPermits.section22.total,
        section19Count: orgPermits.section19.total,
        section22Count: orgPermits.section22.total,
        expiredCount: orgPermits.section19.expired + orgPermits.section22.expired,
        expiringCount: orgPermits.section19.expiring + orgPermits.section22.expiring,
      },
      drivers: {
        totalDrivers: totalDrivers,
        driversWithPermits: parseInt(driverStats.drivers_with_permits || '0'),
        totalDriverPermits: parseInt(driverStats.total_driver_permits || '0'),
        expiredDriverPermits: parseInt(driverStats.expired_driver_permits || '0'),
        expiringDriverPermits: parseInt(driverStats.expiring_driver_permits || '0'),
      },
      summary: {
        totalPermits:
          orgPermits.section19.total +
          orgPermits.section22.total +
          parseInt(driverStats.total_driver_permits || '0'),
        alertsCount:
          orgPermits.section19.expired +
          orgPermits.section22.expired +
          parseInt(driverStats.expired_driver_permits || '0') +
          orgPermits.section19.expiring +
          orgPermits.section22.expiring +
          parseInt(driverStats.expiring_driver_permits || '0'),
      },
    };

    logger.info('Permits overview loaded', { tenantId });
    res.json({
      ...overview,
      message: 'Permits overview loaded successfully',
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/permits/drivers
 * @desc Get all driver permits and roles
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/permits/drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching driver permits', { tenantId });

    // Get driver permits
    const permitsResult = await query<{
      driver_id: number;
      permit_type: string;
      has_permit: boolean;
      expiry_date: Date;
      issue_date: Date;
      notes: string;
      driver_name: string;
    }>(
      `SELECT
        dp.driver_id,
        dp.permit_type,
        dp.has_permit,
        dp.expiry_date,
        dp.issue_date,
        dp.notes,
        d.name as driver_name
      FROM tenant_driver_permits dp
      LEFT JOIN tenant_drivers d ON dp.driver_id = d.driver_id AND dp.tenant_id = d.tenant_id
      WHERE dp.tenant_id = $1 AND d.is_active = true
      ORDER BY d.name, dp.permit_type`,
      [tenantId]
    );

    // Get driver roles
    const rolesResult = await query<{
      driver_id: number;
      vulnerable_passengers: boolean;
      section19_driver: boolean;
      section22_driver: boolean;
      vehicle_owner: boolean;
    }>(
      `SELECT
        dr.driver_id,
        dr.vulnerable_passengers,
        dr.section19_driver,
        dr.section22_driver,
        dr.vehicle_owner
      FROM tenant_driver_roles dr
      LEFT JOIN tenant_drivers d ON dr.driver_id = d.driver_id AND dr.tenant_id = d.tenant_id
      WHERE dr.tenant_id = $1 AND d.is_active = true`,
      [tenantId]
    );

    // Transform permits data into expected frontend format
    const driverPermits: any = {};
    const driverRoles: any = {};

    // Group permits by driver
    permitsResult.forEach((row) => {
      if (!driverPermits[row.driver_id]) {
        driverPermits[row.driver_id] = {
          dbs: { hasPermit: false, expiryDate: '' },
          section19: { hasPermit: false, expiryDate: '' },
          section22: { hasPermit: false, expiryDate: '' },
          mot: { hasPermit: false, expiryDate: '' },
        };
      }

      if (driverPermits[row.driver_id][row.permit_type]) {
        driverPermits[row.driver_id][row.permit_type] = {
          hasPermit: row.has_permit,
          expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : '',
          issueDate: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : '',
          notes: row.notes || '',
        };
      }
    });

    // Transform roles data
    rolesResult.forEach((row) => {
      driverRoles[row.driver_id] = {
        vulnerablePassengers: row.vulnerable_passengers || false,
        section19Driver: row.section19_driver || false,
        section22Driver: row.section22_driver || false,
        vehicleOwner: row.vehicle_owner || false,
      };
    });

    logger.info('Driver permits loaded', {
      tenantId,
      driversCount: Object.keys(driverPermits).length,
    });

    res.json({ driverPermits, driverRoles });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/permits/drivers/:driverId
 * @desc Update driver permits
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/permits/drivers/:driverId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const permits = req.body;

    logger.info('Updating driver permits', { tenantId, driverId });

    if (!permits || typeof permits !== 'object') {
      throw new ValidationError('Invalid permits data');
    }

    const client = await getDbClient();

    try {
      await client.query('BEGIN');

      // Delete existing permits for this driver
      await client.query(
        `DELETE FROM tenant_driver_permits
        WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driverId]
      );

      // Insert new permits
      const permitTypes = ['dbs', 'section19', 'section22', 'mot'];
      for (const permitType of permitTypes) {
        const permit = permits[permitType];
        if (permit && permit.hasPermit) {
          await client.query(
            `INSERT INTO tenant_driver_permits
            (tenant_id, driver_id, permit_type, has_permit, expiry_date, issue_date, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              tenantId,
              driverId,
              permitType,
              permit.hasPermit,
              permit.expiryDate || null,
              permit.issueDate || null,
              permit.notes || null,
            ]
          );
        } else {
          // Insert record showing no permit
          await client.query(
            `INSERT INTO tenant_driver_permits
            (tenant_id, driver_id, permit_type, has_permit, created_at, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [tenantId, driverId, permitType, false]
          );
        }
      }

      await client.query('COMMIT');

      logger.info('Driver permits updated', { tenantId, driverId });
      res.json({ success: true, message: 'Driver permits updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * @route PUT /api/tenants/:tenantId/permits/drivers/:driverId/roles
 * @desc Update driver roles
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/permits/drivers/:driverId/roles',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { roles } = req.body;

    logger.info('Updating driver roles', { tenantId, driverId });

    if (!roles || typeof roles !== 'object') {
      throw new ValidationError('Invalid roles data');
    }

    const client = await getDbClient();

    try {
      await client.query('BEGIN');

      // Check if roles exist for this driver
      const existingResult = await client.query(
        `SELECT driver_id FROM tenant_driver_roles
        WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driverId]
      );

      if (existingResult.rows.length > 0) {
        // Update existing roles
        await client.query(
          `UPDATE tenant_driver_roles
          SET vulnerable_passengers = $3,
              section19_driver = $4,
              section22_driver = $5,
              vehicle_owner = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = $1 AND driver_id = $2`,
          [
            tenantId,
            driverId,
            roles.vulnerablePassengers || false,
            roles.section19Driver || false,
            roles.section22Driver || false,
            roles.vehicleOwner || false,
          ]
        );
      } else {
        // Insert new roles
        await client.query(
          `INSERT INTO tenant_driver_roles
          (tenant_id, driver_id, vulnerable_passengers, section19_driver, section22_driver, vehicle_owner, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            tenantId,
            driverId,
            roles.vulnerablePassengers || false,
            roles.section19Driver || false,
            roles.section22Driver || false,
            roles.vehicleOwner || false,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Driver roles updated', { tenantId, driverId });
      res.json({ success: true, message: 'Driver roles updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * @route GET /api/tenants/:tenantId/permits/organizational
 * @desc Get organizational permits (Section 19 and Section 22)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/permits/organizational',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching organizational permits', { tenantId });

    const result = await query<{
      id: number;
      permit_type: string;
      organisation_name: string;
      permit_number: string;
      issue_date: Date;
      expiry_date: Date;
      notes: string;
      status: string;
      created_at: Date;
      updated_at: Date;
      permit_size_type: string;
      permitted_passenger_classes: string[];
      class_e_geographic_definition: string;
      class_e_radius_miles: number;
      class_e_center_point: string;
      class_f_description: string;
      issued_by_type: string;
      issuing_body_name: string;
      designated_body_id: string;
      disc_number: string;
      permit_conditions: string;
      renewal_reminder_sent: boolean;
      renewal_reminder_date: Date;
    }>(
      `SELECT
        permit_id as id,
        permit_type,
        organisation_name,
        permit_number,
        issue_date,
        expiry_date,
        notes,
        status,
        created_at,
        updated_at,
        permit_size_type,
        permitted_passenger_classes,
        class_e_geographic_definition,
        class_e_radius_miles,
        class_e_center_point,
        class_f_description,
        issued_by_type,
        issuing_body_name,
        designated_body_id,
        disc_number,
        permit_conditions,
        renewal_reminder_sent,
        renewal_reminder_date
      FROM tenant_organizational_permits
      WHERE tenant_id = $1 AND status = 'active'
      ORDER BY permit_type, organisation_name`,
      [tenantId]
    );

    // Group by permit type
    const section19 = result
      .filter((row) => row.permit_type === 'section19')
      .map((row) => ({
        ...row,
        issue_date: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : null,
        expiry_date: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : null,
      }));

    const section22 = result
      .filter((row) => row.permit_type === 'section22')
      .map((row) => ({
        ...row,
        issue_date: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : null,
        expiry_date: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : null,
      }));

    logger.info('Organizational permits loaded', {
      tenantId,
      section19Count: section19.length,
      section22Count: section22.length,
    });

    res.json({ section19, section22 });
  })
);

/**
 * @route POST /api/tenants/:tenantId/permits/organizational
 * @desc Create organizational permit
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/permits/organizational',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const permitData = req.body;

    logger.info('Creating organizational permit', { tenantId });

    // Validate required fields
    const requiredFields = ['permit_type', 'organisation_name', 'permit_number', 'expiry_date'];
    for (const field of requiredFields) {
      if (!permitData[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }

    if (!['section19', 'section22'].includes(permitData.permit_type)) {
      throw new ValidationError('permit_type must be section19 or section22');
    }

    // Check for duplicate permit numbers
    const duplicateCheck = await query<{ permit_id: number }>(
      `SELECT permit_id FROM tenant_organizational_permits
      WHERE tenant_id = $1 AND permit_number = $2 AND permit_type = $3 AND status = 'active'`,
      [tenantId, permitData.permit_number, permitData.permit_type]
    );

    if (duplicateCheck.length > 0) {
      throw new ValidationError('Permit number already exists for this permit type');
    }

    const result = await query<{
      id: number;
      permit_type: string;
      organisation_name: string;
      permit_number: string;
      issue_date: Date;
      expiry_date: Date;
      notes: string;
      status: string;
    }>(
      `INSERT INTO tenant_organizational_permits
      (tenant_id, permit_type, organisation_name, permit_number, issue_date, expiry_date, notes,
       permit_size_type, permitted_passenger_classes, class_e_geographic_definition,
       class_e_radius_miles, class_e_center_point, class_f_description,
       issued_by_type, issuing_body_name, designated_body_id, disc_number, permit_conditions,
       status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING permit_id as id, permit_type, organisation_name, permit_number, issue_date, expiry_date, notes, status,
                permit_size_type, permitted_passenger_classes, disc_number`,
      [
        tenantId,
        permitData.permit_type,
        permitData.organisation_name,
        permitData.permit_number,
        permitData.issue_date || null,
        permitData.expiry_date,
        permitData.notes || null,
        permitData.permit_size_type || 'standard',
        permitData.permitted_passenger_classes || null,
        permitData.class_e_geographic_definition || null,
        permitData.class_e_radius_miles || null,
        permitData.class_e_center_point || null,
        permitData.class_f_description || null,
        permitData.issued_by_type || 'traffic_commissioner',
        permitData.issuing_body_name || null,
        permitData.designated_body_id || null,
        permitData.disc_number || null,
        permitData.permit_conditions || null,
      ]
    );

    const newPermit = result[0];
    // Format dates for frontend
    if (newPermit.issue_date) {
      (newPermit as any).issue_date = new Date(newPermit.issue_date).toISOString().split('T')[0];
    }
    if (newPermit.expiry_date) {
      (newPermit as any).expiry_date = new Date(newPermit.expiry_date).toISOString().split('T')[0];
    }

    logger.info('Organizational permit created', { tenantId, permitId: newPermit.id });
    res.status(201).json(newPermit);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/permits/organizational/:permitId
 * @desc Update organizational permit
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/permits/organizational/:permitId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, permitId } = req.params;
    const permitData = req.body;

    logger.info('Updating organizational permit', { tenantId, permitId });

    // Check if permit exists and belongs to tenant
    const existingResult = await query<{ permit_id: number }>(
      `SELECT permit_id FROM tenant_organizational_permits
      WHERE tenant_id = $1 AND permit_id = $2 AND status = 'active'`,
      [tenantId, permitId]
    );

    if (existingResult.length === 0) {
      throw new NotFoundError('Permit not found');
    }

    // Check for duplicate permit numbers (excluding current permit)
    if (permitData.permit_number) {
      const duplicateCheck = await query<{ permit_id: number }>(
        `SELECT permit_id FROM tenant_organizational_permits
        WHERE tenant_id = $1 AND permit_number = $2 AND permit_id != $3 AND status = 'active'`,
        [tenantId, permitData.permit_number, permitId]
      );

      if (duplicateCheck.length > 0) {
        throw new ValidationError('Permit number already exists');
      }
    }

    const result = await query<{
      id: number;
      permit_type: string;
      organisation_name: string;
      permit_number: string;
      issue_date: Date;
      expiry_date: Date;
      notes: string;
      status: string;
    }>(
      `UPDATE tenant_organizational_permits
      SET organisation_name = COALESCE($3, organisation_name),
          permit_number = COALESCE($4, permit_number),
          issue_date = COALESCE($5, issue_date),
          expiry_date = COALESCE($6, expiry_date),
          notes = COALESCE($7, notes),
          permit_size_type = COALESCE($8, permit_size_type),
          permitted_passenger_classes = COALESCE($9, permitted_passenger_classes),
          class_e_geographic_definition = COALESCE($10, class_e_geographic_definition),
          class_e_radius_miles = COALESCE($11, class_e_radius_miles),
          class_e_center_point = COALESCE($12, class_e_center_point),
          class_f_description = COALESCE($13, class_f_description),
          issued_by_type = COALESCE($14, issued_by_type),
          issuing_body_name = COALESCE($15, issuing_body_name),
          designated_body_id = COALESCE($16, designated_body_id),
          disc_number = COALESCE($17, disc_number),
          permit_conditions = COALESCE($18, permit_conditions),
          renewal_reminder_sent = COALESCE($19, renewal_reminder_sent),
          renewal_reminder_date = COALESCE($20, renewal_reminder_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND permit_id = $2
      RETURNING permit_id as id, permit_type, organisation_name, permit_number, issue_date, expiry_date, notes, status,
                permit_size_type, permitted_passenger_classes, disc_number`,
      [
        tenantId,
        permitId,
        permitData.organisation_name,
        permitData.permit_number,
        permitData.issue_date,
        permitData.expiry_date,
        permitData.notes,
        permitData.permit_size_type,
        permitData.permitted_passenger_classes,
        permitData.class_e_geographic_definition,
        permitData.class_e_radius_miles,
        permitData.class_e_center_point,
        permitData.class_f_description,
        permitData.issued_by_type,
        permitData.issuing_body_name,
        permitData.designated_body_id,
        permitData.disc_number,
        permitData.permit_conditions,
        permitData.renewal_reminder_sent,
        permitData.renewal_reminder_date,
      ]
    );

    const updatedPermit = result[0];
    // Format dates for frontend
    if (updatedPermit.issue_date) {
      (updatedPermit as any).issue_date = new Date(updatedPermit.issue_date).toISOString().split('T')[0];
    }
    if (updatedPermit.expiry_date) {
      (updatedPermit as any).expiry_date = new Date(updatedPermit.expiry_date).toISOString().split('T')[0];
    }

    logger.info('Organizational permit updated', { tenantId, permitId });
    res.json(updatedPermit);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/permits/organizational/:permitId
 * @desc Delete organizational permit (soft delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/permits/organizational/:permitId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, permitId } = req.params;

    logger.info('Deleting organizational permit', { tenantId, permitId });

    // Soft delete by updating status
    const result = await query<{ permit_id: number }>(
      `UPDATE tenant_organizational_permits
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND permit_id = $2 AND status = 'active'
      RETURNING permit_id`,
      [tenantId, permitId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Permit not found');
    }

    logger.info('Organizational permit deleted', { tenantId, permitId });
    res.json({ success: true, message: 'Permit deleted successfully' });
  })
);

/**
 * @route GET /api/tenants/:tenantId/permits/stats
 * @desc Get permits statistics
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/permits/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching permits statistics', { tenantId });

    // Get driver compliance statistics
    const driversResult = await query<{ total_drivers: string }>(
      `SELECT COUNT(*) as total_drivers
      FROM tenant_drivers
      WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const permitsResult = await query<{
      driver_id: number;
      valid_permits: string;
      expiring_permits: string;
      expired_permits: string;
    }>(
      `SELECT
        dp.driver_id,
        COUNT(CASE WHEN dp.has_permit = true THEN 1 END) as valid_permits,
        COUNT(CASE WHEN dp.has_permit = true AND dp.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_permits,
        COUNT(CASE WHEN dp.has_permit = true AND dp.expiry_date < CURRENT_DATE THEN 1 END) as expired_permits
      FROM tenant_driver_permits dp
      LEFT JOIN tenant_drivers d ON dp.driver_id = d.driver_id AND dp.tenant_id = d.tenant_id
      WHERE dp.tenant_id = $1 AND d.is_active = true
      GROUP BY dp.driver_id`,
      [tenantId]
    );

    const orgPermitsResult = await query<{
      permit_type: string;
      total: string;
      expiring: string;
      expired: string;
    }>(
      `SELECT
        permit_type,
        COUNT(*) as total,
        COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring,
        COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END) as expired
      FROM tenant_organizational_permits
      WHERE tenant_id = $1 AND status = 'active'
      GROUP BY permit_type`,
      [tenantId]
    );

    const stats = {
      drivers: {
        total: parseInt(driversResult[0]?.total_drivers || '0'),
        compliant: 0,
        expiring: 0,
        expired: 0,
        missing: 0,
      },
      organizational: {
        section19: { total: 0, expiring: 0, expired: 0 },
        section22: { total: 0, expiring: 0, expired: 0 },
      },
    };

    // Process driver permit statistics
    permitsResult.forEach((row) => {
      if (parseInt(row.expired_permits) > 0) {
        stats.drivers.expired++;
      } else if (parseInt(row.expiring_permits) > 0) {
        stats.drivers.expiring++;
      } else if (parseInt(row.valid_permits) > 0) {
        stats.drivers.compliant++;
      } else {
        stats.drivers.missing++;
      }
    });

    // Process organizational permit statistics
    orgPermitsResult.forEach((row) => {
      if (row.permit_type === 'section19') {
        stats.organizational.section19 = {
          total: parseInt(row.total),
          expiring: parseInt(row.expiring),
          expired: parseInt(row.expired),
        };
      } else if (row.permit_type === 'section22') {
        stats.organizational.section22 = {
          total: parseInt(row.total),
          expiring: parseInt(row.expiring),
          expired: parseInt(row.expired),
        };
      }
    });

    logger.info('Permits statistics calculated', { tenantId });
    res.json(stats);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/permits/drivers/:driverId/cleanup
 * @desc Clean up permits for deleted drivers
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/permits/drivers/:driverId/cleanup',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Cleaning up permits for driver', { tenantId, driverId });

    const client = await getDbClient();

    try {
      await client.query('BEGIN');

      // Delete driver permits
      await client.query(
        `DELETE FROM tenant_driver_permits
        WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driverId]
      );

      // Delete driver roles
      await client.query(
        `DELETE FROM tenant_driver_roles
        WHERE tenant_id = $1 AND driver_id = $2`,
        [tenantId, driverId]
      );

      await client.query('COMMIT');

      logger.info('Permits cleaned up for driver', { tenantId, driverId });
      res.json({ success: true, message: 'Driver permits cleaned up successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

export default router;
