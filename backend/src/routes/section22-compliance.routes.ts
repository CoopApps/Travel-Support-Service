/**
 * Section 22 Compliance API Routes
 *
 * Aggregates compliance data for Section 22 Community Bus Services:
 * - Organizational permits
 * - EU Regulation 1071/2009 exemptions
 * - Driver qualifications
 * - Vehicle compliance (9+ seats, MOT, insurance)
 * - Service registration
 * - Financial compliance (not-for-profit verification)
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { logger } from '../utils/logger';

const router = express.Router();

interface ComplianceStatus {
  organizationalPermit: {
    status: 'active' | 'expiring_soon' | 'expired' | 'not_registered';
    permitNumber?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    daysUntilExpiry?: number;
  };
  euExemptions: {
    notForProfitConfirmed: boolean;
    tenMileExemptionApplicable: boolean;
    localServiceOnly: boolean;
    exemptFromOperatorLicense: boolean;
  };
  driverCompliance: {
    totalDrivers: number;
    section22Qualified: number;
    expiringPermits: number;
    qualificationRate: number;
  };
  vehicleCompliance: {
    totalVehicles: number;
    section22Suitable: number;
    motCurrent: number;
    insuranceValid: number;
    complianceRate: number;
  };
  serviceRegistration: {
    registeredServices: number;
    pendingRegistration: number;
    noticeGiven: boolean;
    ltaApprovalCurrent: boolean;
  };
  financialCompliance: {
    notForProfitVerified: boolean;
    separateFaresConfigured: boolean;
    communityPurposeDocumented: boolean;
  };
  overallScore: number;
  complianceLevel: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

/**
 * GET /api/tenants/:tenantId/section22-compliance
 * Get comprehensive Section 22 compliance status
 */
router.get('/tenants/:tenantId/section22-compliance', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const client = await pool.connect();

    try {
      // 1. Check organizational permit
      const permitResult = await client.query(
        `SELECT
          permit_number,
          expiry_date,
          issuing_authority,
          permit_status
        FROM organizational_permits
        WHERE tenant_id = $1 AND permit_type = 'section_22'
        ORDER BY expiry_date DESC
        LIMIT 1`,
        [tenantId]
      );

      const permit = permitResult.rows[0];
      let organizationalPermit: ComplianceStatus['organizationalPermit'];

      if (!permit) {
        organizationalPermit = { status: 'not_registered' };
      } else {
        const expiryDate = new Date(permit.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        organizationalPermit = {
          permitNumber: permit.permit_number,
          expiryDate: permit.expiry_date,
          issuingAuthority: permit.issuing_authority,
          daysUntilExpiry,
          status:
            permit.permit_status === 'expired' || daysUntilExpiry < 0 ? 'expired' :
            daysUntilExpiry <= 30 ? 'expiring_soon' :
            'active'
        };
      }

      // 2. Check EU exemptions (from tenant settings)
      const exemptionResult = await client.query(
        `SELECT
          organization_type,
          cooperative_model,
          service_bus_enabled
        FROM tenants
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const tenant = exemptionResult.rows[0];
      const isNotForProfit = ['charity', 'cic', 'third_sector', 'cooperative', 'cooperative_commonwealth'].includes(tenant.organization_type);

      const euExemptions = {
        notForProfitConfirmed: isNotForProfit,
        tenMileExemptionApplicable: true, // Assume local service only
        localServiceOnly: true,
        exemptFromOperatorLicense: isNotForProfit
      };

      // 3. Check driver compliance
      const driverResult = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as total_drivers,
          COUNT(*) FILTER (WHERE status = 'active' AND section_22_qualified = true) as section22_qualified,
          COUNT(*) FILTER (
            WHERE status = 'active'
            AND section_22_qualified = true
            AND section_22_expiry_date IS NOT NULL
            AND section_22_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          ) as expiring_permits
        FROM drivers
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const driverStats = driverResult.rows[0];
      const driverCompliance = {
        totalDrivers: parseInt(driverStats.total_drivers) || 0,
        section22Qualified: parseInt(driverStats.section22_qualified) || 0,
        expiringPermits: parseInt(driverStats.expiring_permits) || 0,
        qualificationRate: driverStats.total_drivers > 0
          ? Math.round((driverStats.section22_qualified / driverStats.total_drivers) * 100)
          : 0
      };

      // 4. Check vehicle compliance
      const vehicleResult = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as total_vehicles,
          COUNT(*) FILTER (WHERE status = 'active' AND capacity >= 9) as section22_suitable,
          COUNT(*) FILTER (
            WHERE status = 'active'
            AND mot_expiry_date IS NOT NULL
            AND mot_expiry_date > CURRENT_DATE
          ) as mot_current,
          COUNT(*) FILTER (
            WHERE status = 'active'
            AND insurance_expiry_date IS NOT NULL
            AND insurance_expiry_date > CURRENT_DATE
          ) as insurance_valid
        FROM vehicles
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const vehicleStats = vehicleResult.rows[0];
      const section22Suitable = parseInt(vehicleStats.section22_suitable) || 0;
      const vehicleCompliance = {
        totalVehicles: parseInt(vehicleStats.total_vehicles) || 0,
        section22Suitable,
        motCurrent: parseInt(vehicleStats.mot_current) || 0,
        insuranceValid: parseInt(vehicleStats.insurance_valid) || 0,
        complianceRate: section22Suitable > 0
          ? Math.round(((parseInt(vehicleStats.mot_current) + parseInt(vehicleStats.insurance_valid)) / (section22Suitable * 2)) * 100)
          : 0
      };

      // 5. Check service registration
      const serviceResult = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as registered_services,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_registration
        FROM bus_routes
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const serviceStats = serviceResult.rows[0];
      const serviceRegistration = {
        registeredServices: parseInt(serviceStats.registered_services) || 0,
        pendingRegistration: parseInt(serviceStats.pending_registration) || 0,
        noticeGiven: true, // Assume 28-day notice given if services are active
        ltaApprovalCurrent: organizationalPermit.status === 'active'
      };

      // 6. Check financial compliance
      const fareSettingsResult = await client.query(
        `SELECT
          show_cost_breakdown,
          show_surplus_allocation,
          show_commonwealth_impact
        FROM fare_calculation_settings
        WHERE tenant_id = $1`,
        [tenantId]
      );

      const fareSettings = fareSettingsResult.rows[0];
      const financialCompliance = {
        notForProfitVerified: isNotForProfit,
        separateFaresConfigured: fareSettings?.show_cost_breakdown || false,
        communityPurposeDocumented: isNotForProfit
      };

      // 7. Calculate overall compliance score
      let score = 0;
      let maxScore = 0;

      // Organizational permit (20 points)
      maxScore += 20;
      if (organizationalPermit.status === 'active') score += 20;
      else if (organizationalPermit.status === 'expiring_soon') score += 15;
      else if (organizationalPermit.status === 'expired') score += 5;

      // EU exemptions (15 points)
      maxScore += 15;
      if (euExemptions.notForProfitConfirmed) score += 5;
      if (euExemptions.tenMileExemptionApplicable) score += 5;
      if (euExemptions.exemptFromOperatorLicense) score += 5;

      // Driver compliance (25 points)
      maxScore += 25;
      score += Math.round((driverCompliance.qualificationRate / 100) * 25);

      // Vehicle compliance (20 points)
      maxScore += 20;
      score += Math.round((vehicleCompliance.complianceRate / 100) * 20);

      // Service registration (10 points)
      maxScore += 10;
      if (serviceRegistration.registeredServices > 0) score += 5;
      if (serviceRegistration.ltaApprovalCurrent) score += 5;

      // Financial compliance (10 points)
      maxScore += 10;
      if (financialCompliance.notForProfitVerified) score += 5;
      if (financialCompliance.separateFaresConfigured) score += 5;

      const overallScore = Math.round((score / maxScore) * 100);
      const complianceLevel: ComplianceStatus['complianceLevel'] =
        overallScore >= 90 ? 'excellent' :
        overallScore >= 75 ? 'good' :
        overallScore >= 60 ? 'needs_attention' :
        'critical';

      const complianceStatus: ComplianceStatus = {
        organizationalPermit,
        euExemptions,
        driverCompliance,
        vehicleCompliance,
        serviceRegistration,
        financialCompliance,
        overallScore,
        complianceLevel
      };

      res.json({
        compliance: complianceStatus,
        message: 'Section 22 compliance status retrieved successfully'
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching Section 22 compliance', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch compliance status',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/section22-compliance/drivers
 * Get detailed driver compliance breakdown
 */
router.get('/tenants/:tenantId/section22-compliance/drivers', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
          driver_id,
          first_name,
          last_name,
          section_22_qualified,
          section_22_permit_number,
          section_22_expiry_date,
          CASE
            WHEN section_22_expiry_date IS NULL THEN NULL
            WHEN section_22_expiry_date <= CURRENT_DATE THEN 'expired'
            WHEN section_22_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END as permit_status,
          CASE
            WHEN section_22_expiry_date IS NOT NULL
            THEN EXTRACT(DAY FROM section_22_expiry_date - CURRENT_DATE)::INTEGER
            ELSE NULL
          END as days_until_expiry
        FROM drivers
        WHERE tenant_id = $1 AND status = 'active'
        ORDER BY section_22_expiry_date ASC NULLS LAST`,
        [tenantId]
      );

      res.json({
        drivers: result.rows,
        total: result.rows.length,
        qualified: result.rows.filter(d => d.section_22_qualified).length,
        expiringSoon: result.rows.filter(d => d.permit_status === 'expiring_soon').length,
        expired: result.rows.filter(d => d.permit_status === 'expired').length
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching driver compliance', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch driver compliance',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/tenants/:tenantId/section22-compliance/vehicles
 * Get detailed vehicle compliance breakdown
 */
router.get('/tenants/:tenantId/section22-compliance/vehicles', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
          vehicle_id,
          registration_number,
          make,
          model,
          capacity,
          mot_expiry_date,
          insurance_expiry_date,
          CASE
            WHEN mot_expiry_date IS NULL THEN 'missing'
            WHEN mot_expiry_date <= CURRENT_DATE THEN 'expired'
            WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END as mot_status,
          CASE
            WHEN insurance_expiry_date IS NULL THEN 'missing'
            WHEN insurance_expiry_date <= CURRENT_DATE THEN 'expired'
            WHEN insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
          END as insurance_status,
          CASE
            WHEN capacity >= 9 THEN true
            ELSE false
          END as section22_suitable
        FROM vehicles
        WHERE tenant_id = $1 AND status = 'active'
        ORDER BY capacity DESC, registration_number ASC`,
        [tenantId]
      );

      res.json({
        vehicles: result.rows,
        total: result.rows.length,
        section22Suitable: result.rows.filter(v => v.section22_suitable).length,
        motCurrent: result.rows.filter(v => v.mot_status === 'active').length,
        insuranceCurrent: result.rows.filter(v => v.insurance_status === 'active').length
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching vehicle compliance', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch vehicle compliance',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/tenants/:tenantId/section22-compliance/export
 * Generate compliance report (PDF export data)
 */
router.post('/tenants/:tenantId/section22-compliance/export', verifyTenantAccess, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { format = 'json' } = req.body;

    // Get compliance status (reuse the main endpoint logic)
    const complianceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/tenants/${tenantId}/section22-compliance`);
    const complianceData = await complianceResponse.json();

    // Get driver details
    const driversResponse = await fetch(`${req.protocol}://${req.get('host')}/api/tenants/${tenantId}/section22-compliance/drivers`);
    const driversData = await driversResponse.json();

    // Get vehicle details
    const vehiclesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/tenants/${tenantId}/section22-compliance/vehicles`);
    const vehiclesData = await vehiclesResponse.json();

    const exportData = {
      generatedAt: new Date().toISOString(),
      tenantId: parseInt(tenantId),
      compliance: (complianceData as any).compliance,
      drivers: driversData,
      vehicles: vehiclesData,
      format
    };

    res.json({
      export: exportData,
      message: 'Compliance report generated successfully'
    });

  } catch (error: any) {
    logger.error('Error generating compliance report', { error });
    res.status(500).json({
      error: {
        message: error.message || 'Failed to generate compliance report',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
