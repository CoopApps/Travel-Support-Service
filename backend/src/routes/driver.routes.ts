import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query, queryOne } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errorTypes';
import { logger } from '../utils/logger';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

const router: Router = express.Router();

/**
 * Driver Routes
 *
 * Complete driver management system
 * Database Table: tenant_drivers (42 columns)
 */

/**
 * @route GET /api/tenants/:tenantId/drivers/stats
 * @desc Get driver statistics for dashboard
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching driver stats', { tenantId });

    // Get total drivers
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // Get drivers by employment type
    const employmentResult = await query<{ employment_type: string; count: string }>(
      `SELECT employment_type, COUNT(*) as count
       FROM tenant_drivers
       WHERE tenant_id = $1 AND is_active = true
       GROUP BY employment_type`,
      [tenantId]
    );

    const employmentCounts = employmentResult.reduce((acc, row) => {
      acc[row.employment_type || 'unknown'] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    // Get drivers with login enabled
    const loginEnabledResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_drivers WHERE tenant_id = $1 AND is_active = true AND is_login_enabled = true',
      [tenantId]
    );
    const loginEnabled = parseInt(loginEnabledResult[0]?.count || '0', 10);

    res.json({
      total,
      contracted: employmentCounts.contracted || 0,
      freelance: employmentCounts.freelance || 0,
      employed: employmentCounts.employed || 0,
      loginEnabled,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/enhanced-stats
 * @desc Get enhanced driver statistics with financial breakdown
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/enhanced-stats',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;

    logger.info('Fetching enhanced driver stats', { tenantId });

    // Get all active drivers with full details
    const drivers = await query(
      `SELECT
        d.*,
        u.username,
        u.last_login,
        u.created_at as user_created
      FROM tenant_drivers d
      LEFT JOIN tenant_users u ON d.user_id = u.user_id
      WHERE d.tenant_id = $1 AND d.is_active = true`,
      [tenantId]
    );

    // Calculate financial stats
    let contractedWeeklyTotal = 0;
    let freelanceEstTotal = 0;
    let fuelCostsTotal = 0;

    // Calculate fleet operations stats
    const fleetStats = {
      employment: { contracted: 0, freelance: 0, employed: 0 },
      vehicles: { company: 0, lease: 0, personal: 0, none: 0 },
      fuel: { allowance: 0, card: 0, both: 0, receipts: 0 },
      dashboard: { enabled: 0, noAccess: 0 },
      assignments: { active: 0, total: 0 }
    };

    drivers.forEach((driver: any) => {
      // Employment stats
      if (driver.employment_type === 'contracted') fleetStats.employment.contracted++;
      else if (driver.employment_type === 'freelance') fleetStats.employment.freelance++;
      else if (driver.employment_type === 'employed') fleetStats.employment.employed++;

      // Financial calculations
      const weeklyWage = parseFloat(driver.weekly_wage || '0');
      const fuelAllowance = parseFloat(driver.weekly_lease || '0'); // Using weekly_lease for fuel

      if (driver.employment_type === 'contracted' || driver.employment_type === 'employed') {
        contractedWeeklyTotal += weeklyWage;
        fuelCostsTotal += fuelAllowance;
      } else if (driver.employment_type === 'freelance') {
        freelanceEstTotal += weeklyWage;
      }

      // Vehicle stats
      if (!driver.vehicle_id) fleetStats.vehicles.none++;
      else if (driver.vehicle_type === 'company') fleetStats.vehicles.company++;
      else if (driver.vehicle_type === 'lease') fleetStats.vehicles.lease++;
      else fleetStats.vehicles.personal++;

      // Fuel stats - check salary_structure JSONB
      const salaryStructure = typeof driver.salary_structure === 'string'
        ? JSON.parse(driver.salary_structure)
        : driver.salary_structure || {};

      if (salaryStructure.hasFuelCard && salaryStructure.fuelAllowance > 0) fleetStats.fuel.both++;
      else if (salaryStructure.hasFuelCard) fleetStats.fuel.card++;
      else if (salaryStructure.fuelAllowance > 0 || salaryStructure.fuelReimbursement) fleetStats.fuel.allowance++;
      else fleetStats.fuel.receipts++;

      // Dashboard access
      if (driver.is_login_enabled) fleetStats.dashboard.enabled++;
      else fleetStats.dashboard.noAccess++;

      // Customer assignments would come from a join - for now count as 0
      // This would require joining with schedule/assignment tables
    });

    res.json({
      financial: {
        contractedWeekly: contractedWeeklyTotal,
        freelanceEst: freelanceEstTotal,
        fuelCosts: fuelCostsTotal
      },
      fleet: fleetStats,
      summary: {
        total: drivers.length,
        contracted: fleetStats.employment.contracted,
        freelance: fleetStats.employment.freelance,
        employed: fleetStats.employment.employed,
        loginEnabled: fleetStats.dashboard.enabled
      }
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers
 * @desc Get all drivers with pagination and filtering
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      page = '1',
      limit = '20',
      search = '',
      employmentType = '',
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    logger.info('Fetching drivers', { tenantId, page, limit, search, employmentType });

    // Build WHERE clause
    let whereConditions = 'WHERE d.tenant_id = $1 AND d.is_active = true';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (search) {
      whereConditions += ` AND (d.name ILIKE $${paramCount} OR d.email ILIKE $${paramCount} OR d.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (employmentType) {
      whereConditions += ` AND d.employment_type = $${paramCount}`;
      params.push(employmentType);
      paramCount++;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant_drivers d ${whereConditions}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get drivers with user info
    const validSortColumns = ['name', 'email', 'employment_type', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    params.push(limit, offset);

    const drivers = await query(
      `SELECT
        d.driver_id,
        d.name,
        d.phone,
        d.email,
        d.license_number,
        d.license_expiry,
        d.license_class,
        d.vehicle_type,
        d.weekly_wage,
        d.weekly_lease,
        d.vehicle_id,
        d.assigned_vehicle,
        d.dbs_check_date,
        d.dbs_expiry_date,
        d.section19_permit,
        d.section19_expiry,
        d.section19_driver_auth,
        d.section19_driver_expiry,
        d.section22_driver_auth,
        d.section22_driver_expiry,
        d.mot_date,
        d.mot_expiry_date,
        d.employment_type,
        d.employment_status,
        d.salary_structure,
        d.vehicle_assignment,
        d.start_date,
        d.contract_end_date,
        d.driver_roles,
        d.holidays,
        d.availability_restrictions,
        d.qualifications,
        d.emergency_contact,
        d.emergency_phone,
        d.preferred_hours,
        d.notes,
        d.is_login_enabled,
        d.user_id,
        d.is_active,
        d.created_at,
        d.updated_at,
        u.username,
        u.last_login,
        u.is_active as user_active
      FROM tenant_drivers d
      LEFT JOIN tenant_users u ON d.user_id = u.user_id AND d.tenant_id = u.tenant_id
      ${whereConditions}
      ORDER BY d.${sortColumn} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      drivers,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/:driverId
 * @desc Get single driver by ID
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Fetching driver', { tenantId, driverId });

    const driver = await queryOne(
      `SELECT
        d.*,
        u.username,
        u.email as user_email,
        u.last_login,
        u.is_active as user_active
      FROM tenant_drivers d
      LEFT JOIN tenant_users u ON d.user_id = u.user_id AND d.tenant_id = u.tenant_id
      WHERE d.tenant_id = $1 AND d.driver_id = $2 AND d.is_active = true`,
      [tenantId, driverId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    res.json(driver);
  })
);

/**
 * @route POST /api/tenants/:tenantId/drivers
 * @desc Create new driver
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const driverData = req.body;

    // Sanitize all string inputs
    const name = sanitizeInput(driverData.name, { maxLength: 200 });
    const email = sanitizeEmail(driverData.email || '');
    const phone = sanitizePhone(driverData.phone || '');
    const licenseNumber = sanitizeInput(driverData.licenseNumber, { maxLength: 50 });
    const licenseClass = sanitizeInput(driverData.licenseClass, { maxLength: 10 });
    const emergencyContact = sanitizeInput(driverData.emergencyContact, { maxLength: 200 });
    const emergencyPhone = sanitizePhone(driverData.emergencyPhone || '');
    const notes = sanitizeInput(driverData.notes, { maxLength: 2000 });

    logger.info('Creating driver', { tenantId, name });

    // Validate required fields
    if (!name) {
      throw new ValidationError('Driver name is required');
    }

    // Default salary structure based on employment type
    const defaultSalaryStructure = (employmentType: string) => {
      if (employmentType === 'freelance') {
        return {
          type: 'hourly_rate',
          hourlyRate: 12.00,
          overtimeMultiplier: 1.5,
          fuelReimbursement: true,
          hasFuelCard: false,
          fuelCardId: null,
          holidayPay: false,
          sickPay: false,
        };
      }
      return {
        type: 'fixed_weekly',
        weeklyWage: 150.00,
        fuelAllowance: 50.00,
        hasFuelCard: false,
        fuelCardId: null,
        holidayPay: true,
        sickPay: true,
      };
    };

    const result = await query(
      `INSERT INTO tenant_drivers (
        tenant_id, name, phone, email, license_number, license_expiry, license_class,
        vehicle_type, weekly_wage, weekly_lease, vehicle_id, assigned_vehicle,
        dbs_check_date, dbs_expiry_date,
        section19_permit, section19_expiry,
        section19_driver_auth, section19_driver_expiry,
        section22_driver_auth, section22_driver_expiry,
        mot_date, mot_expiry_date,
        employment_type, employment_status, salary_structure,
        start_date, contract_end_date,
        driver_roles, holidays, availability_restrictions, qualifications,
        emergency_contact, emergency_phone, preferred_hours, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35
      )
      RETURNING driver_id, name, email, employment_type, created_at`,
      [
        tenantId,
        name,  // sanitized
        phone,  // sanitized
        email,  // sanitized
        licenseNumber,  // sanitized
        driverData.licenseExpiry || null,
        licenseClass,  // sanitized
        driverData.vehicleType || 'own',
        driverData.weeklyWage || 0,
        driverData.weeklyLease || 0,
        driverData.vehicleId || null,
        driverData.assignedVehicle || null,
        driverData.dbsCheckDate || null,
        driverData.dbsExpiryDate || null,
        driverData.section19Permit || false,
        driverData.section19Expiry || null,
        driverData.section19DriverAuth || false,
        driverData.section19DriverExpiry || null,
        driverData.section22DriverAuth || false,
        driverData.section22DriverExpiry || null,
        driverData.motDate || null,
        driverData.motExpiryDate || null,
        driverData.employmentType || 'contracted',
        driverData.employmentStatus || 'active',
        JSON.stringify(driverData.salaryStructure || defaultSalaryStructure(driverData.employmentType || 'contracted')),
        driverData.startDate || null,
        driverData.contractEndDate || null,
        driverData.driverRoles ? JSON.stringify(driverData.driverRoles) : null,
        driverData.holidays ? JSON.stringify(driverData.holidays) : null,
        driverData.availabilityRestrictions ? JSON.stringify(driverData.availabilityRestrictions) : null,
        driverData.qualifications ? JSON.stringify(driverData.qualifications) : null,
        emergencyContact || null,  // sanitized
        emergencyPhone || null,  // sanitized
        driverData.preferredHours || null,
        notes || null,  // sanitized
      ]
    );

    logger.info('Driver created', { driverId: result[0].driver_id });

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/drivers/:driverId
 * @desc Update driver
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/drivers/:driverId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const driverData = req.body;

    // Sanitize all string inputs (conditionally)
    const name = driverData.name ? sanitizeInput(driverData.name, { maxLength: 200 }) : undefined;
    const email = driverData.email ? sanitizeEmail(driverData.email) : undefined;
    const phone = driverData.phone ? sanitizePhone(driverData.phone) : undefined;
    const licenseNumber = driverData.licenseNumber ? sanitizeInput(driverData.licenseNumber, { maxLength: 50 }) : undefined;
    const licenseClass = driverData.licenseClass ? sanitizeInput(driverData.licenseClass, { maxLength: 10 }) : undefined;
    const emergencyContact = driverData.emergencyContact ? sanitizeInput(driverData.emergencyContact, { maxLength: 200 }) : undefined;
    const emergencyPhone = driverData.emergencyPhone ? sanitizePhone(driverData.emergencyPhone) : undefined;
    const notes = driverData.notes ? sanitizeInput(driverData.notes, { maxLength: 2000 }) : undefined;

    logger.info('Updating driver', { tenantId, driverId });

    const result = await query(
      `UPDATE tenant_drivers
      SET
        name = COALESCE($3, name),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        license_number = COALESCE($6, license_number),
        license_expiry = COALESCE($7, license_expiry),
        license_class = COALESCE($8, license_class),
        vehicle_type = COALESCE($9, vehicle_type),
        weekly_wage = COALESCE($10, weekly_wage),
        weekly_lease = COALESCE($11, weekly_lease),
        vehicle_id = COALESCE($12, vehicle_id),
        assigned_vehicle = COALESCE($13, assigned_vehicle),
        employment_type = COALESCE($14, employment_type),
        employment_status = COALESCE($15, employment_status),
        salary_structure = COALESCE($16, salary_structure),
        emergency_contact = COALESCE($17, emergency_contact),
        emergency_phone = COALESCE($18, emergency_phone),
        preferred_hours = COALESCE($19, preferred_hours),
        notes = COALESCE($20, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND driver_id = $2
      RETURNING driver_id, name, updated_at`,
      [
        tenantId,
        driverId,
        name,  // sanitized
        phone,  // sanitized
        email,  // sanitized
        licenseNumber,  // sanitized
        driverData.licenseExpiry,
        licenseClass,  // sanitized
        driverData.vehicleType,
        driverData.weeklyWage,
        driverData.weeklyLease,
        driverData.vehicleId,
        driverData.assignedVehicle,
        driverData.employmentType,
        driverData.employmentStatus,
        driverData.salaryStructure ? JSON.stringify(driverData.salaryStructure) : null,
        emergencyContact,  // sanitized
        emergencyPhone,  // sanitized
        driverData.preferredHours,
        notes,  // sanitized
      ]
    );

    if (result.length === 0) {
      throw new NotFoundError('Driver not found');
    }

    logger.info('Driver updated', { driverId });

    res.json(result[0]);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/drivers/:driverId
 * @desc Soft delete driver
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/drivers/:driverId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Deleting driver', { tenantId, driverId });

    const result = await query(
      `UPDATE tenant_drivers
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND driver_id = $2
      RETURNING driver_id, name`,
      [tenantId, driverId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Driver not found');
    }

    logger.info('Driver deleted', { driverId });

    res.json({
      message: 'Driver deleted successfully',
      driverId: result[0].driver_id,
      driverName: result[0].name,
    });
  })
);

/**
 * ========================================
 * DRIVER LOGIN MANAGEMENT ENDPOINTS
 * ========================================
 */

/**
 * @route POST /api/tenants/:tenantId/drivers/:driverId/login
 * @desc Create driver login credentials
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { password, emailCredentials } = req.body;

    // Sanitize username (but NOT password) ✓
    const username = sanitizeInput(req.body.username, { maxLength: 100 });

    if (!username || !password) {
      throw new ValidationError('Username and password required');
    }

    logger.info('Creating driver login', { tenantId, driverId, username });

    // Check if username already exists
    const usernameCheck = await query(
      'SELECT user_id, username FROM tenant_users WHERE username = $1 AND tenant_id = $2',
      [username, tenantId]
    );

    if (usernameCheck.length > 0) {
      throw new ValidationError(`Username already exists. Suggestion: ${username}${Math.floor(Math.random() * 100)}`);
    }

    // Get driver's full name for the user account
    const driverInfo = await queryOne<{ name: string }>(
      'SELECT name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    if (!driverInfo) {
      throw new NotFoundError('Driver not found');
    }

    const driverName = driverInfo.name;

    // Hash the password (password is NOT sanitized - important!)
    const hashedPassword = await bcrypt.hash(password, 10);
    logger.info('Password hashed successfully for driver login creation');

    // Create user account
    const userResult = await query<{ user_id: number }>(
      `INSERT INTO tenant_users (tenant_id, username, password_hash, role, full_name, is_active)
      VALUES ($1, $2, $3, 'driver', $4, true)
      RETURNING user_id`,
      [tenantId, username, hashedPassword, driverName]  // username sanitized, password hashed
    );

    const userId = userResult[0].user_id;

    // Update driver record
    await query(
      `UPDATE tenant_drivers
      SET is_login_enabled = true, user_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE driver_id = $2 AND tenant_id = $3`,
      [userId, driverId, tenantId]
    );

    logger.info('Driver login enabled', { driverId, username });

    res.json({
      success: true,
      message: 'Login credentials created successfully',
      username: username,
      userCreated: new Date().toISOString(),
      passwordSent: emailCredentials || false,
    });
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/drivers/:driverId/login
 * @desc Disable driver login
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/drivers/:driverId/login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Disabling driver login', { tenantId, driverId });

    // Get user_id before disabling
    const driverInfo = await queryOne<{ user_id: number | null; name: string }>(
      'SELECT user_id, name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    if (!driverInfo) {
      throw new NotFoundError('Driver not found');
    }

    const userId = driverInfo.user_id;

    // Delete user account completely if exists
    if (userId) {
      await query('DELETE FROM tenant_users WHERE user_id = $1', [userId]);
      logger.info('Deleted user account for driver', { driverName: driverInfo.name });
    }

    // Update driver record
    await query(
      'UPDATE tenant_drivers SET is_login_enabled = false, user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    logger.info('Driver login disabled successfully', { driverName: driverInfo.name });

    res.json({
      success: true,
      message: 'Login access disabled successfully',
      sessionsTerminated: true,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/drivers/:driverId/password-reset
 * @desc Reset driver password
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/password-reset',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { newPassword, sendCredentials } = req.body;

    if (!newPassword) {
      throw new ValidationError('New password required');
    }

    logger.info('Resetting driver password', { tenantId, driverId });

    // Get driver's user_id
    const driverInfo = await queryOne<{ user_id: number | null; name: string }>(
      'SELECT user_id, name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2 AND is_login_enabled = true',
      [driverId, tenantId]
    );

    if (!driverInfo) {
      throw new NotFoundError('Driver not found or login not enabled');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    logger.info('Password hashed successfully for password reset');

    // Update password
    await query(
      'UPDATE tenant_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, driverInfo.user_id]
    );

    logger.info('Password reset successfully', { driverName: driverInfo.name });

    res.json({
      success: true,
      message: 'Password reset successfully',
      passwordSent: sendCredentials || false,
      temporaryPassword: newPassword,
    });
  })
);

/**
 * @route PUT /api/tenants/:tenantId/drivers/:driverId/username
 * @desc Update driver username
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/drivers/:driverId/username',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { notifyDriver } = req.body;

    // Sanitize newUsername
    const newUsername = sanitizeInput(req.body.newUsername, { maxLength: 100 });

    if (!newUsername) {
      throw new ValidationError('New username is required');
    }

    logger.info('Updating driver username', { tenantId, driverId, newUsername });

    // Get driver's current user_id
    const driverInfo = await queryOne<{ user_id: number | null; name: string; is_login_enabled: boolean }>(
      'SELECT user_id, name, is_login_enabled FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    if (!driverInfo) {
      throw new NotFoundError('Driver not found');
    }

    if (!driverInfo.is_login_enabled || !driverInfo.user_id) {
      throw new ValidationError('Driver login is not enabled');
    }

    // Check if new username already exists
    const usernameCheck = await query(
      'SELECT user_id FROM tenant_users WHERE username = $1 AND tenant_id = $2 AND user_id != $3',
      [newUsername, tenantId, driverInfo.user_id]
    );

    if (usernameCheck.length > 0) {
      throw new ValidationError('Username already exists');
    }

    // Update username
    await query(
      'UPDATE tenant_users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newUsername, driverInfo.user_id]  // sanitized username
    );

    logger.info('Username updated successfully', { driverName: driverInfo.name });

    res.json({
      success: true,
      message: 'Username updated successfully',
      newUsername: newUsername,
      notificationSent: notifyDriver || false,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/check-username/:username
 * @desc Check username availability
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/check-username/:username',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, username } = req.params;
    const { exclude } = req.query; // Driver ID to exclude

    let result;
    if (exclude) {
      result = await query(
        `SELECT u.user_id FROM tenant_users u
        WHERE u.username = $1 AND u.tenant_id = $2
        AND u.user_id NOT IN (SELECT user_id FROM tenant_drivers WHERE driver_id = $3 AND tenant_id = $2 AND user_id IS NOT NULL)`,
        [username, tenantId, exclude]
      );
    } else {
      result = await query(
        'SELECT user_id FROM tenant_users WHERE username = $1 AND tenant_id = $2',
        [username, tenantId]
      );
    }

    res.json({
      available: result.length === 0,
      username: username,
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/:driverId/login-status
 * @desc Get driver login status with detailed info
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/:driverId/login-status',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Getting driver login status', { tenantId, driverId });

    const loginStatus = await queryOne(
      `SELECT
        d.is_login_enabled,
        d.user_id,
        u.username,
        u.is_active as user_active,
        u.last_login,
        u.created_at as user_created,
        u.role
      FROM tenant_drivers d
      LEFT JOIN tenant_users u ON d.user_id = u.user_id
      WHERE d.driver_id = $1 AND d.tenant_id = $2`,
      [driverId, tenantId]
    );

    if (!loginStatus) {
      throw new NotFoundError('Driver not found');
    }

    res.json({
      loginStatus,
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/drivers/:driverId/enable-login
 * @desc Enable driver login - creates user account with hashed password
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/enable-login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { temporaryPassword } = req.body;

    // Sanitize username (but NOT temporaryPassword) ✓
    const username = sanitizeInput(req.body.username, { maxLength: 100 });

    if (!username || !temporaryPassword) {
      throw new ValidationError('Username and temporary password required');
    }

    logger.info('Enabling driver login', { tenantId, driverId, username });

    // Check if username already exists
    const existingUser = await queryOne(
      'SELECT user_id, username FROM tenant_users WHERE username = $1 AND tenant_id = $2',
      [username, tenantId]
    );

    if (existingUser) {
      throw new ValidationError(`Username already exists. Try: ${username}${Math.floor(Math.random() * 100)}`);
    }

    // Get driver's name
    const driver = await queryOne(
      'SELECT name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Hash password with bcrypt (temporaryPassword is NOT sanitized - important!)
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    logger.info('Password hashed successfully');

    // Create user account with role='driver'
    const user = await queryOne<{ user_id: number }>(
      `INSERT INTO tenant_users (tenant_id, username, password_hash, role, full_name, is_active)
       VALUES ($1, $2, $3, 'driver', $4, true)
       RETURNING user_id`,
      [tenantId, username, hashedPassword, driver.name]  // username sanitized, password hashed
    );

    if (!user) {
      throw new Error('Failed to create user account');
    }

    // Update driver record
    await query(
      `UPDATE tenant_drivers
       SET is_login_enabled = true, user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE driver_id = $2 AND tenant_id = $3`,
      [user.user_id, driverId, tenantId]
    );

    logger.info('Driver login enabled successfully', { driverId, userId: user.user_id });

    res.json({
      message: 'Driver login enabled successfully',
      data: {
        success: true,
        userId: user.user_id,
        username: username
      }
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/drivers/:driverId/disable-login
 * @desc Disable driver login and delete user account
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/disable-login',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;

    logger.info('Disabling driver login', { tenantId, driverId });

    // Get driver and user info
    const driver = await queryOne<{ user_id: number; name: string }>(
      'SELECT user_id, name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Delete user account if exists
    if (driver.user_id) {
      await query('DELETE FROM tenant_users WHERE user_id = $1', [driver.user_id]);
      logger.info('Deleted user account', { userId: driver.user_id, driverName: driver.name });
    }

    // Update driver record
    await query(
      'UPDATE tenant_drivers SET is_login_enabled = false, user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE driver_id = $1 AND tenant_id = $2',
      [driverId, tenantId]
    );

    logger.info('Driver login disabled successfully', { driverId, driverName: driver.name });

    res.json({
      message: 'Driver login disabled successfully'
    });
  })
);

/**
 * @route POST /api/tenants/:tenantId/drivers/:driverId/reset-password
 * @desc Reset driver password
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/drivers/:driverId/reset-password',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, driverId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      throw new ValidationError('New password required');
    }

    logger.info('Resetting driver password', { tenantId, driverId });

    // Get driver's user_id
    const driver = await queryOne<{ user_id: number; name: string }>(
      'SELECT user_id, name FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2 AND is_login_enabled = true',
      [driverId, tenantId]
    );

    if (!driver || !driver.user_id) {
      throw new NotFoundError('Driver not found or login not enabled');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE tenant_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, driver.user_id]
    );

    logger.info('Driver password reset successfully', { driverId, driverName: driver.name });

    res.json({
      message: 'Password reset successfully'
    });
  })
);

/**
 * @route GET /api/tenants/:tenantId/drivers/by-user/:userId
 * @desc Get driver by user ID (for dashboard authentication)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/drivers/by-user/:userId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, userId } = req.params;

    logger.info('Getting driver by user ID', { tenantId, userId });

    const driver = await queryOne(
      `SELECT
        d.*,
        u.username,
        u.role,
        u.last_login
      FROM tenant_drivers d
      JOIN tenant_users u ON d.user_id = u.user_id
      WHERE u.user_id = $1 AND d.tenant_id = $2 AND d.is_login_enabled = true AND d.is_active = true`,
      [userId, tenantId]
    );

    if (!driver) {
      throw new NotFoundError('Driver not found or login not enabled');
    }

    logger.info('Found driver for user', { driverName: driver.name });

    res.json({
      driver
    });
  })
);

export default router;
