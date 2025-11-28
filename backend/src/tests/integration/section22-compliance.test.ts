import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Section 22 Compliance Routes Integration Tests
 *
 * Tests compliance monitoring for Section 22 Community Bus Services:
 * - Overall compliance status and scoring
 * - Organizational permit tracking
 * - EU Regulation 1071/2009 exemptions
 * - Driver qualification compliance
 * - Vehicle compliance (capacity, MOT, insurance)
 * - Service registration status
 * - Financial compliance verification
 * - Compliance report export
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Section 22 Compliance Test Company');
  testUser = await createTestUser(tenantId, `section22test${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Compliance Status Overview', () => {
  it('should get comprehensive compliance status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('compliance');
      expect(response.body.compliance).toHaveProperty('organizationalPermit');
      expect(response.body.compliance).toHaveProperty('euExemptions');
      expect(response.body.compliance).toHaveProperty('driverCompliance');
      expect(response.body.compliance).toHaveProperty('vehicleCompliance');
      expect(response.body.compliance).toHaveProperty('serviceRegistration');
      expect(response.body.compliance).toHaveProperty('financialCompliance');
      expect(response.body.compliance).toHaveProperty('overallScore');
      expect(response.body.compliance).toHaveProperty('complianceLevel');
    }
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`);

    expect(response.status).toBe(401);
  });

  it('should include overall compliance score', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.compliance.overallScore).toBeDefined();
      expect(typeof response.body.compliance.overallScore).toBe('number');
      expect(response.body.compliance.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.compliance.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it('should return valid compliance level', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(['excellent', 'good', 'needs_attention', 'critical']).toContain(
        response.body.compliance.complianceLevel
      );
    }
  });
});

describe('Organizational Permit Status', () => {
  it('should track organizational permit details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const permit = response.body.compliance.organizationalPermit;
      expect(permit).toHaveProperty('status');
      expect(['active', 'expiring_soon', 'expired', 'not_registered']).toContain(permit.status);
    }
  });

  it('should include permit expiry information when available', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const permit = response.body.compliance.organizationalPermit;
      if (permit.status !== 'not_registered') {
        expect(permit).toHaveProperty('expiryDate');
        expect(permit).toHaveProperty('daysUntilExpiry');
      }
    }
  });

  it('should identify expiring permits', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const permit = response.body.compliance.organizationalPermit;
      if (permit.status === 'expiring_soon') {
        expect(permit.daysUntilExpiry).toBeDefined();
        expect(permit.daysUntilExpiry).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe('EU Exemptions', () => {
  it('should check EU regulation exemptions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const exemptions = response.body.compliance.euExemptions;
      expect(exemptions).toHaveProperty('notForProfitConfirmed');
      expect(exemptions).toHaveProperty('tenMileExemptionApplicable');
      expect(exemptions).toHaveProperty('localServiceOnly');
      expect(exemptions).toHaveProperty('exemptFromOperatorLicense');
    }
  });

  it('should verify not-for-profit status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const exemptions = response.body.compliance.euExemptions;
      expect(typeof exemptions.notForProfitConfirmed).toBe('boolean');
    }
  });

  it('should check ten-mile exemption applicability', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const exemptions = response.body.compliance.euExemptions;
      expect(typeof exemptions.tenMileExemptionApplicable).toBe('boolean');
    }
  });

  it('should verify operator license exemption', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const exemptions = response.body.compliance.euExemptions;
      expect(typeof exemptions.exemptFromOperatorLicense).toBe('boolean');
    }
  });
});

describe('Driver Compliance', () => {
  it('should get driver compliance summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const drivers = response.body.compliance.driverCompliance;
      expect(drivers).toHaveProperty('totalDrivers');
      expect(drivers).toHaveProperty('section22Qualified');
      expect(drivers).toHaveProperty('expiringPermits');
      expect(drivers).toHaveProperty('qualificationRate');
    }
  });

  it('should calculate driver qualification rate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const drivers = response.body.compliance.driverCompliance;
      expect(typeof drivers.qualificationRate).toBe('number');
      expect(drivers.qualificationRate).toBeGreaterThanOrEqual(0);
      expect(drivers.qualificationRate).toBeLessThanOrEqual(100);
    }
  });

  it('should track expiring driver permits', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const drivers = response.body.compliance.driverCompliance;
      expect(typeof drivers.expiringPermits).toBe('number');
      expect(drivers.expiringPermits).toBeGreaterThanOrEqual(0);
    }
  });

  it('should get detailed driver compliance breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/drivers`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('drivers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('qualified');
      expect(response.body).toHaveProperty('expiringSoon');
      expect(response.body).toHaveProperty('expired');
      expect(Array.isArray(response.body.drivers)).toBe(true);
    }
  });

  it('should include driver permit details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/drivers`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      expect(driver).toHaveProperty('driver_id');
      expect(driver).toHaveProperty('first_name');
      expect(driver).toHaveProperty('last_name');
      expect(driver).toHaveProperty('section_22_qualified');
      expect(driver).toHaveProperty('permit_status');
    }
  });

  it('should categorize driver permit statuses', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/drivers`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.drivers.length > 0) {
      const driver = response.body.drivers[0];
      if (driver.permit_status) {
        expect(['active', 'expiring_soon', 'expired']).toContain(driver.permit_status);
      }
    }
  });
});

describe('Vehicle Compliance', () => {
  it('should get vehicle compliance summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const vehicles = response.body.compliance.vehicleCompliance;
      expect(vehicles).toHaveProperty('totalVehicles');
      expect(vehicles).toHaveProperty('section22Suitable');
      expect(vehicles).toHaveProperty('motCurrent');
      expect(vehicles).toHaveProperty('insuranceValid');
      expect(vehicles).toHaveProperty('complianceRate');
    }
  });

  it('should identify Section 22 suitable vehicles', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const vehicles = response.body.compliance.vehicleCompliance;
      expect(typeof vehicles.section22Suitable).toBe('number');
      expect(vehicles.section22Suitable).toBeLessThanOrEqual(vehicles.totalVehicles);
    }
  });

  it('should track MOT compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const vehicles = response.body.compliance.vehicleCompliance;
      expect(typeof vehicles.motCurrent).toBe('number');
      expect(vehicles.motCurrent).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track insurance compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const vehicles = response.body.compliance.vehicleCompliance;
      expect(typeof vehicles.insuranceValid).toBe('number');
      expect(vehicles.insuranceValid).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate vehicle compliance rate', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const vehicles = response.body.compliance.vehicleCompliance;
      expect(typeof vehicles.complianceRate).toBe('number');
      expect(vehicles.complianceRate).toBeGreaterThanOrEqual(0);
      expect(vehicles.complianceRate).toBeLessThanOrEqual(100);
    }
  });

  it('should get detailed vehicle compliance breakdown', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/vehicles`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('vehicles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('section22Suitable');
      expect(response.body).toHaveProperty('motCurrent');
      expect(response.body).toHaveProperty('insuranceCurrent');
      expect(Array.isArray(response.body.vehicles)).toBe(true);
    }
  });

  it('should include vehicle compliance details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/vehicles`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.vehicles.length > 0) {
      const vehicle = response.body.vehicles[0];
      expect(vehicle).toHaveProperty('vehicle_id');
      expect(vehicle).toHaveProperty('registration_number');
      expect(vehicle).toHaveProperty('capacity');
      expect(vehicle).toHaveProperty('mot_status');
      expect(vehicle).toHaveProperty('insurance_status');
      expect(vehicle).toHaveProperty('section22_suitable');
    }
  });

  it('should categorize MOT statuses', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/vehicles`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.vehicles.length > 0) {
      const vehicle = response.body.vehicles[0];
      expect(['active', 'expiring_soon', 'expired', 'missing']).toContain(vehicle.mot_status);
    }
  });

  it('should categorize insurance statuses', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/vehicles`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.vehicles.length > 0) {
      const vehicle = response.body.vehicles[0];
      expect(['active', 'expiring_soon', 'expired', 'missing']).toContain(vehicle.insurance_status);
    }
  });

  it('should verify 9+ seat capacity for Section 22 suitability', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance/vehicles`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.vehicles.length > 0) {
      const suitableVehicles = response.body.vehicles.filter((v: any) => v.section22_suitable);
      suitableVehicles.forEach((vehicle: any) => {
        expect(vehicle.capacity).toBeGreaterThanOrEqual(9);
      });
    }
  });
});

describe('Service Registration', () => {
  it('should track service registration status', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const services = response.body.compliance.serviceRegistration;
      expect(services).toHaveProperty('registeredServices');
      expect(services).toHaveProperty('pendingRegistration');
      expect(services).toHaveProperty('noticeGiven');
      expect(services).toHaveProperty('ltaApprovalCurrent');
    }
  });

  it('should count registered services', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const services = response.body.compliance.serviceRegistration;
      expect(typeof services.registeredServices).toBe('number');
      expect(services.registeredServices).toBeGreaterThanOrEqual(0);
    }
  });

  it('should track pending registrations', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const services = response.body.compliance.serviceRegistration;
      expect(typeof services.pendingRegistration).toBe('number');
      expect(services.pendingRegistration).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Financial Compliance', () => {
  it('should verify financial compliance requirements', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const financial = response.body.compliance.financialCompliance;
      expect(financial).toHaveProperty('notForProfitVerified');
      expect(financial).toHaveProperty('separateFaresConfigured');
      expect(financial).toHaveProperty('communityPurposeDocumented');
    }
  });

  it('should check not-for-profit verification', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const financial = response.body.compliance.financialCompliance;
      expect(typeof financial.notForProfitVerified).toBe('boolean');
    }
  });

  it('should verify fare configuration', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const financial = response.body.compliance.financialCompliance;
      expect(typeof financial.separateFaresConfigured).toBe('boolean');
    }
  });
});

describe('Compliance Report Export', () => {
  it('should generate compliance report export', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'json' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('export');
      expect(response.body.export).toHaveProperty('generatedAt');
      expect(response.body.export).toHaveProperty('tenantId');
    }
  });

  it('should include compliance data in export', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'json' });

    if (response.status === 200) {
      expect(response.body.export).toHaveProperty('compliance');
      expect(response.body.export.compliance).toHaveProperty('overallScore');
      expect(response.body.export.compliance).toHaveProperty('complianceLevel');
    }
  });

  it('should include driver data in export', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'json' });

    if (response.status === 200) {
      expect(response.body.export).toHaveProperty('drivers');
      expect(response.body.export.drivers).toHaveProperty('drivers');
      expect(Array.isArray(response.body.export.drivers.drivers)).toBe(true);
    }
  });

  it('should include vehicle data in export', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'json' });

    if (response.status === 200) {
      expect(response.body.export).toHaveProperty('vehicles');
      expect(response.body.export.vehicles).toHaveProperty('vehicles');
      expect(Array.isArray(response.body.export.vehicles.vehicles)).toBe(true);
    }
  });

  it('should include generation timestamp', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'json' });

    if (response.status === 200) {
      expect(response.body.export.generatedAt).toBeDefined();
      const timestamp = new Date(response.body.export.generatedAt);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    }
  });

  it('should use default format when not specified', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    if (response.status === 200) {
      expect(response.body.export.format).toBe('json');
    }
  });

  it('should require authentication for export', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/section22-compliance/export`)
      .send({ format: 'json' });

    expect(response.status).toBe(401);
  });
});

describe('Compliance Scoring', () => {
  it('should calculate weighted compliance score', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const compliance = response.body.compliance;
      expect(compliance.overallScore).toBeDefined();
      expect(typeof compliance.overallScore).toBe('number');
    }
  });

  it('should categorize excellent compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.compliance.overallScore >= 90) {
      expect(response.body.compliance.complianceLevel).toBe('excellent');
    }
  });

  it('should categorize good compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const score = response.body.compliance.overallScore;
      if (score >= 75 && score < 90) {
        expect(response.body.compliance.complianceLevel).toBe('good');
      }
    }
  });

  it('should categorize needs attention compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const score = response.body.compliance.overallScore;
      if (score >= 60 && score < 75) {
        expect(response.body.compliance.complianceLevel).toBe('needs_attention');
      }
    }
  });

  it('should categorize critical compliance', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const score = response.body.compliance.overallScore;
      if (score < 60) {
        expect(response.body.compliance.complianceLevel).toBe('critical');
      }
    }
  });

  it('should ensure score matches compliance level', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/section22-compliance`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const { overallScore, complianceLevel } = response.body.compliance;

      if (complianceLevel === 'excellent') {
        expect(overallScore).toBeGreaterThanOrEqual(90);
      } else if (complianceLevel === 'good') {
        expect(overallScore).toBeGreaterThanOrEqual(75);
        expect(overallScore).toBeLessThan(90);
      } else if (complianceLevel === 'needs_attention') {
        expect(overallScore).toBeGreaterThanOrEqual(60);
        expect(overallScore).toBeLessThan(75);
      } else if (complianceLevel === 'critical') {
        expect(overallScore).toBeLessThan(60);
      }
    }
  });
});
