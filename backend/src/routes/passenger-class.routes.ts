import express, { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errorTypes';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Passenger Class Routes (Section 19 Compliance)
 *
 * Section 19 permits restrict who can be carried:
 * - Class A: Disabled persons
 * - Class B: Elderly persons (65+)
 * - Class C: Persons affected by poverty or social disadvantage
 * - Class D: Members of the organization
 * - Class E: Persons in a particular locality
 * - Class F: Other prescribed classes
 *
 * Database Tables:
 * - section19_passenger_class_definitions
 */

/**
 * @route GET /api/tenants/:tenantId/passenger-classes
 * @desc Get all passenger class definitions for tenant
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/passenger-classes',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { permitId, isActive } = req.query;

    logger.info('Fetching passenger class definitions', { tenantId, permitId });

    let queryStr = `
      SELECT
        c.*,
        p.permit_number,
        p.organisation_name,
        p.permit_type
      FROM section19_passenger_class_definitions c
      LEFT JOIN tenant_organizational_permits p
        ON c.permit_id = p.permit_id
      WHERE c.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramCount = 2;

    if (permitId) {
      queryStr += ` AND c.permit_id = $${paramCount}`;
      params.push(permitId);
      paramCount++;
    }

    if (isActive !== undefined) {
      queryStr += ` AND c.is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    queryStr += ' ORDER BY c.class_code';

    const result = await query(queryStr, params);

    logger.info('Passenger class definitions loaded', {
      tenantId,
      count: result.length,
    });

    res.json(result);
  })
);

/**
 * @route GET /api/tenants/:tenantId/passenger-classes/:classId
 * @desc Get specific passenger class definition
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/passenger-classes/:classId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classId } = req.params;

    logger.info('Fetching passenger class definition', { tenantId, classId });

    const result = await query(
      `SELECT
        c.*,
        p.permit_number,
        p.organisation_name,
        p.permit_type
      FROM section19_passenger_class_definitions c
      LEFT JOIN tenant_organizational_permits p
        ON c.permit_id = p.permit_id
      WHERE c.tenant_id = $1 AND c.class_id = $2`,
      [tenantId, classId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Passenger class definition not found');
    }

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/passenger-classes/by-code/:classCode
 * @desc Get passenger class by code (A-F)
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/passenger-classes/by-code/:classCode',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classCode } = req.params;

    logger.info('Fetching passenger class by code', { tenantId, classCode });

    const result = await query(
      `SELECT
        c.*,
        p.permit_number,
        p.organisation_name
      FROM section19_passenger_class_definitions c
      LEFT JOIN tenant_organizational_permits p
        ON c.permit_id = p.permit_id
      WHERE c.tenant_id = $1 AND c.class_code = $2`,
      [tenantId, classCode.toUpperCase()]
    );

    if (result.length === 0) {
      throw new NotFoundError('Passenger class not found');
    }

    res.json(result);
  })
);

/**
 * @route POST /api/tenants/:tenantId/passenger-classes
 * @desc Create new passenger class definition
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/passenger-classes',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const classData = req.body;

    logger.info('Creating passenger class definition', { tenantId });

    // Validate required fields
    const requiredFields = ['class_code', 'class_name', 'class_description'];

    for (const field of requiredFields) {
      if (!classData[field]) {
        throw new ValidationError(`${field} is required`);
      }
    }

    // Validate class code
    const validClassCodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    if (!validClassCodes.includes(classData.class_code.toUpperCase())) {
      throw new ValidationError('Invalid passenger class code. Must be A, B, C, D, E, or F');
    }

    // Class E requires geographic definition
    if (classData.class_code.toUpperCase() === 'E') {
      if (!classData.geographic_area && !classData.center_point) {
        throw new ValidationError(
          'Class E requires either geographic_area or center_point definition'
        );
      }
    }

    // Class F requires custom definition
    if (classData.class_code.toUpperCase() === 'F') {
      if (!classData.custom_class_definition) {
        throw new ValidationError('Class F requires custom_class_definition');
      }
    }

    // Check for duplicate class code
    const duplicateCheck = await query(
      `SELECT class_id FROM section19_passenger_class_definitions
       WHERE tenant_id = $1 AND class_code = $2 AND is_active = true`,
      [tenantId, classData.class_code.toUpperCase()]
    );

    if (duplicateCheck.length > 0) {
      throw new ValidationError('Active passenger class with this code already exists');
    }

    const result = await query(
      `INSERT INTO section19_passenger_class_definitions (
        tenant_id,
        permit_id,
        class_code,
        class_name,
        class_description,
        eligibility_criteria,
        geographic_area,
        radius_miles,
        center_point,
        custom_class_definition,
        verification_required,
        verification_method,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      ) RETURNING *`,
      [
        tenantId,
        classData.permit_id || null,
        classData.class_code.toUpperCase(),
        classData.class_name,
        classData.class_description,
        classData.eligibility_criteria || null,
        classData.geographic_area || null,
        classData.radius_miles || null,
        classData.center_point || null,
        classData.custom_class_definition || null,
        classData.verification_required !== undefined ? classData.verification_required : true,
        classData.verification_method || null,
        classData.is_active !== undefined ? classData.is_active : true,
      ]
    );

    logger.info('Passenger class definition created', {
      tenantId,
      classId: result[0].class_id,
      classCode: result[0].class_code,
    });

    res.status(201).json(result[0]);
  })
);

/**
 * @route PUT /api/tenants/:tenantId/passenger-classes/:classId
 * @desc Update passenger class definition
 * @access Protected
 */
router.put(
  '/tenants/:tenantId/passenger-classes/:classId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classId } = req.params;
    const updateData = req.body;

    logger.info('Updating passenger class definition', { tenantId, classId });

    // Check if record exists
    const existingResult = await query(
      `SELECT class_id, class_code FROM section19_passenger_class_definitions
       WHERE tenant_id = $1 AND class_id = $2`,
      [tenantId, classId]
    );

    if (existingResult.length === 0) {
      throw new NotFoundError('Passenger class definition not found');
    }

    const existing = existingResult[0];

    // If updating Class E, ensure geographic definition is provided
    if (existing.class_code === 'E' && updateData.geographic_area === null && updateData.center_point === null) {
      throw new ValidationError('Class E requires geographic definition');
    }

    // If updating Class F, ensure custom definition is provided
    if (existing.class_code === 'F' && updateData.custom_class_definition === null) {
      throw new ValidationError('Class F requires custom_class_definition');
    }

    const result = await query(
      `UPDATE section19_passenger_class_definitions
       SET class_name = COALESCE($3, class_name),
           class_description = COALESCE($4, class_description),
           eligibility_criteria = COALESCE($5, eligibility_criteria),
           geographic_area = COALESCE($6, geographic_area),
           radius_miles = COALESCE($7, radius_miles),
           center_point = COALESCE($8, center_point),
           custom_class_definition = COALESCE($9, custom_class_definition),
           verification_required = COALESCE($10, verification_required),
           verification_method = COALESCE($11, verification_method),
           is_active = COALESCE($12, is_active),
           updated_at = NOW()
       WHERE tenant_id = $1 AND class_id = $2
       RETURNING *`,
      [
        tenantId,
        classId,
        updateData.class_name,
        updateData.class_description,
        updateData.eligibility_criteria,
        updateData.geographic_area,
        updateData.radius_miles,
        updateData.center_point,
        updateData.custom_class_definition,
        updateData.verification_required,
        updateData.verification_method,
        updateData.is_active,
      ]
    );

    logger.info('Passenger class definition updated', { tenantId, classId });

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/passenger-classes/:classId/deactivate
 * @desc Deactivate passenger class (soft delete)
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/passenger-classes/:classId/deactivate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classId } = req.params;

    logger.info('Deactivating passenger class definition', { tenantId, classId });

    const result = await query(
      `UPDATE section19_passenger_class_definitions
       SET is_active = false,
           updated_at = NOW()
       WHERE tenant_id = $1 AND class_id = $2
       RETURNING *`,
      [tenantId, classId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Passenger class definition not found');
    }

    logger.info('Passenger class definition deactivated', { tenantId, classId });

    res.json(result[0]);
  })
);

/**
 * @route POST /api/tenants/:tenantId/passenger-classes/:classId/activate
 * @desc Reactivate passenger class
 * @access Protected
 */
router.post(
  '/tenants/:tenantId/passenger-classes/:classId/activate',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classId } = req.params;

    logger.info('Activating passenger class definition', { tenantId, classId });

    const result = await query(
      `UPDATE section19_passenger_class_definitions
       SET is_active = true,
           updated_at = NOW()
       WHERE tenant_id = $1 AND class_id = $2
       RETURNING *`,
      [tenantId, classId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Passenger class definition not found');
    }

    logger.info('Passenger class definition activated', { tenantId, classId });

    res.json(result[0]);
  })
);

/**
 * @route GET /api/tenants/:tenantId/passenger-classes/standard-definitions
 * @desc Get standard definitions for classes A-F
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/passenger-classes/standard-definitions',
  verifyTenantAccess,
  asyncHandler(async (_req: Request, res: Response) => {
    const standardDefinitions = [
      {
        class_code: 'A',
        class_name: 'Disabled Persons',
        class_description:
          'Persons with physical, sensory, cognitive, or mental health disabilities',
        eligibility_criteria:
          'Must have a qualifying disability or condition that affects daily activities',
        verification_method: 'disability_certificate',
      },
      {
        class_code: 'B',
        class_name: 'Elderly Persons',
        class_description: 'Persons aged 65 years or over',
        eligibility_criteria: 'Must be 65 years of age or older',
        verification_method: 'age_verification',
      },
      {
        class_code: 'C',
        class_name: 'Persons Affected by Poverty or Social Disadvantage',
        class_description:
          'Persons experiencing economic hardship or social exclusion',
        eligibility_criteria:
          'Must demonstrate economic hardship or social disadvantage (e.g., benefits recipient, low income)',
        verification_method: 'signed_application',
      },
      {
        class_code: 'D',
        class_name: 'Members of the Organization',
        class_description: 'Persons who are members of the permit-holding body',
        eligibility_criteria: 'Must hold valid membership of the organization',
        verification_method: 'membership_card',
      },
      {
        class_code: 'E',
        class_name: 'Persons in a Particular Locality',
        class_description: 'Persons living or working within a defined geographic area',
        eligibility_criteria: 'Must reside or work within the specified geographic boundary',
        verification_method: 'address_verification',
      },
      {
        class_code: 'F',
        class_name: 'Other Prescribed Classes',
        class_description: 'Other classes of persons as defined by the permit holder',
        eligibility_criteria: 'Custom criteria defined by the organization',
        verification_method: 'custom',
      },
    ];

    res.json(standardDefinitions);
  })
);

/**
 * @route DELETE /api/tenants/:tenantId/passenger-classes/:classId
 * @desc Delete passenger class definition (permanent delete)
 * @access Protected
 */
router.delete(
  '/tenants/:tenantId/passenger-classes/:classId',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, classId } = req.params;

    logger.info('Deleting passenger class definition', { tenantId, classId });

    const result = await query(
      `DELETE FROM section19_passenger_class_definitions
       WHERE tenant_id = $1 AND class_id = $2
       RETURNING class_id`,
      [tenantId, classId]
    );

    if (result.length === 0) {
      throw new NotFoundError('Passenger class definition not found');
    }

    logger.info('Passenger class definition deleted', { tenantId, classId });

    res.json({ success: true, message: 'Passenger class definition deleted successfully' });
  })
);

export default router;
