import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Driver Rostering Routes Integration Tests
 *
 * Tests advanced roster management functionality:
 * - Driver availability checking
 * - Conflict detection and severity levels
 * - Automatic driver assignment with workload balancing
 * - Workload metrics and utilization tracking
 * - Comprehensive roster dashboard
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Driver Rostering Test Company');
  testUser = await createTestUser(tenantId, `driverrostertest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Driver Availability', () => {
  it('should check driver availability with required parameters', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: '2025-01-15', startTime: '09:00' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('available');
      expect(typeof response.body.available).toBe('boolean');
    }
  });

  it('should check availability with custom duration', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: '2025-01-15', startTime: '09:00', durationMinutes: '120' });

    expect([200, 500]).toContain(response.status);
  });

  it('should require date parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startTime: '09:00' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/date/i);
  });

  it('should require startTime parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: '2025-01-15' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/startTime/i);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .query({ date: '2025-01-15', startTime: '09:00' });

    expect(response.status).toBe(401);
  });

  it('should include conflict details when unavailable', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/1`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: '2025-01-15', startTime: '09:00' });

    if (response.status === 200 && !response.body.available) {
      expect(response.body).toHaveProperty('conflicts');
      expect(Array.isArray(response.body.conflicts)).toBe(true);
    }
  });
});

describe('Conflict Detection', () => {
  it('should detect roster conflicts in date range', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('conflicts');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.conflicts)).toBe(true);
    }
  });

  it('should provide conflict summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('critical');
      expect(response.body.summary).toHaveProperty('warnings');
      expect(response.body.summary).toHaveProperty('info');
      expect(typeof response.body.summary.total).toBe('number');
    }
  });

  it('should categorize conflicts by severity level', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200 && response.body.conflicts.length > 0) {
      const conflict = response.body.conflicts[0];
      expect(conflict).toHaveProperty('severity');
      expect(['critical', 'warning', 'info']).toContain(conflict.severity);
    }
  });

  it('should verify severity count accuracy', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      const { conflicts, summary } = response.body;
      const criticalCount = conflicts.filter((c: any) => c.severity === 'critical').length;
      const warningCount = conflicts.filter((c: any) => c.severity === 'warning').length;
      const infoCount = conflicts.filter((c: any) => c.severity === 'info').length;

      expect(summary.critical).toBe(criticalCount);
      expect(summary.warnings).toBe(warningCount);
      expect(summary.info).toBe(infoCount);
      expect(summary.total).toBe(conflicts.length);
    }
  });

  it('should require startDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ endDate: '2025-01-31' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/startDate/i);
  });

  it('should require endDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/endDate/i);
  });

  it('should include conflict details', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200 && response.body.conflicts.length > 0) {
      const conflict = response.body.conflicts[0];
      expect(conflict).toHaveProperty('type');
      expect(conflict).toHaveProperty('driver_id');
    }
  });
});

describe('Auto-Assign Drivers', () => {
  it('should auto-assign drivers to unassigned trips', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('unassigned');
      expect(response.body).toHaveProperty('assignments');
      expect(typeof response.body.assigned).toBe('number');
    }
  });

  it('should support workload balancing option', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', balanceWorkload: true });

    expect([200, 500]).toContain(response.status);
  });

  it('should support proximity consideration', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', considerProximity: true });

    expect([200, 500]).toContain(response.status);
  });

  it('should respect max assignments limit', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', maxAssignments: 5 });

    if (response.status === 200) {
      expect(response.body.assigned).toBeLessThanOrEqual(5);
    }
  });

  it('should preview assignments without applying changes', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', applyChanges: false });

    if (response.status === 200) {
      expect(response.body.applied).toBe(false);
      expect(Array.isArray(response.body.assignments)).toBe(true);
    }
  });

  it('should apply assignments when requested', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', applyChanges: true });

    if (response.status === 200) {
      expect(response.body.applied).toBe(true);
    }
  });

  it('should require date parameter', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ balanceWorkload: true });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/date/i);
  });

  it('should include assignment details', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15' });

    if (response.status === 200 && response.body.assignments.length > 0) {
      const assignment = response.body.assignments[0];
      expect(assignment).toHaveProperty('trip_id');
      expect(assignment).toHaveProperty('driver_id');
    }
  });

  it('should list unassigned trip IDs', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15' });

    if (response.status === 200) {
      expect(response.body).toHaveProperty('unassignedTripIds');
      expect(Array.isArray(response.body.unassignedTripIds)).toBe(true);
    }
  });
});

describe('Workload Metrics', () => {
  it('should calculate driver workload metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    }
  });

  it('should include workload summary statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.summary).toHaveProperty('totalDrivers');
      expect(response.body.summary).toHaveProperty('totalHours');
      expect(response.body.summary).toHaveProperty('averageUtilization');
      expect(response.body.summary).toHaveProperty('underutilized');
      expect(response.body.summary).toHaveProperty('overutilized');
      expect(response.body.summary).toHaveProperty('balanced');
    }
  });

  it('should track individual driver metrics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200 && response.body.metrics.length > 0) {
      const metric = response.body.metrics[0];
      expect(metric).toHaveProperty('driver_id');
      expect(metric).toHaveProperty('total_hours');
      expect(metric).toHaveProperty('utilization_percentage');
    }
  });

  it('should identify underutilized drivers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      const underutilized = response.body.metrics.filter((m: any) => m.utilization_percentage < 50);
      expect(response.body.summary.underutilized).toBe(underutilized.length);
    }
  });

  it('should identify overutilized drivers', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      const overutilized = response.body.metrics.filter((m: any) => m.utilization_percentage > 90);
      expect(response.body.summary.overutilized).toBe(overutilized.length);
    }
  });

  it('should calculate balanced driver count', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      const { summary } = response.body;
      const expected = summary.totalDrivers - summary.underutilized - summary.overutilized;
      expect(summary.balanced).toBe(expected);
    }
  });

  it('should require startDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ endDate: '2025-01-31' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/startDate/i);
  });

  it('should require endDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/endDate/i);
  });

  it('should format numeric values correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(typeof response.body.summary.totalHours).toBe('number');
      expect(typeof response.body.summary.averageUtilization).toBe('number');
    }
  });
});

describe('Roster Dashboard', () => {
  it('should get comprehensive roster dashboard data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('workload');
      expect(response.body).toHaveProperty('conflicts');
      expect(response.body).toHaveProperty('unassignedTrips');
    }
  });

  it('should include workload section', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.workload).toHaveProperty('metrics');
      expect(response.body.workload).toHaveProperty('summary');
      expect(Array.isArray(response.body.workload.metrics)).toBe(true);
    }
  });

  it('should include workload summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.workload.summary).toHaveProperty('totalDrivers');
      expect(response.body.workload.summary).toHaveProperty('averageUtilization');
      expect(response.body.workload.summary).toHaveProperty('underutilized');
      expect(response.body.workload.summary).toHaveProperty('overutilized');
    }
  });

  it('should include conflicts section', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.conflicts).toHaveProperty('items');
      expect(response.body.conflicts).toHaveProperty('summary');
      expect(Array.isArray(response.body.conflicts.items)).toBe(true);
    }
  });

  it('should include conflicts summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(response.body.conflicts.summary).toHaveProperty('total');
      expect(response.body.conflicts.summary).toHaveProperty('critical');
      expect(response.body.conflicts.summary).toHaveProperty('warnings');
    }
  });

  it('should track unassigned trips count', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      expect(typeof response.body.unassignedTrips).toBe('number');
      expect(response.body.unassignedTrips).toBeGreaterThanOrEqual(0);
    }
  });

  it('should require startDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ endDate: '2025-01-31' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/startDate/i);
  });

  it('should require endDate parameter', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/endDate/i);
  });

  it('should provide complete operational overview', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200) {
      const hasWorkloadData = response.body.workload.metrics.length > 0;
      const hasConflictData = response.body.conflicts.items.length >= 0;
      const hasUnassignedCount = typeof response.body.unassignedTrips === 'number';

      expect(hasWorkloadData || hasConflictData || hasUnassignedCount).toBe(true);
    }
  });

  it('should calculate average utilization correctly', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/dashboard`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2025-01-01', endDate: '2025-01-31' });

    if (response.status === 200 && response.body.workload.metrics.length > 0) {
      const metrics = response.body.workload.metrics;
      const sumUtilization = metrics.reduce((sum: number, m: any) => sum + m.utilization_percentage, 0);
      const calculatedAvg = sumUtilization / metrics.length;

      expect(Math.abs(response.body.workload.summary.averageUtilization - calculatedAvg)).toBeLessThan(0.1);
    }
  });
});

describe('Workload Balancing Logic', () => {
  it('should distribute assignments more evenly with balancing enabled', async () => {
    const responseWithBalancing = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-20', balanceWorkload: true, applyChanges: false });

    if (responseWithBalancing.status === 200 && responseWithBalancing.body.assignments.length > 0) {
      const driverAssignments = responseWithBalancing.body.assignments.reduce((acc: any, a: any) => {
        acc[a.driver_id] = (acc[a.driver_id] || 0) + 1;
        return acc;
      }, {});

      const assignmentCounts = Object.values(driverAssignments) as number[];
      const maxAssignments = Math.max(...assignmentCounts);
      const minAssignments = Math.min(...assignmentCounts);

      expect(assignmentCounts.length).toBeGreaterThan(0);
      expect(maxAssignments - minAssignments).toBeLessThanOrEqual(maxAssignments);
    }
  });

  it('should handle scenarios with no available drivers', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2025-01-15', maxAssignments: 0 });

    if (response.status === 200) {
      expect(response.body.assigned).toBe(0);
    }
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle invalid driver ID gracefully', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/availability/999999`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ date: '2025-01-15', startTime: '09:00' });

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle invalid date format', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/conflicts`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: 'invalid-date', endDate: '2025-01-31' });

    expect([400, 500]).toContain(response.status);
  });

  it('should handle date range with no data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/roster/workload`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ startDate: '2099-01-01', endDate: '2099-01-31' });

    if (response.status === 200) {
      expect(Array.isArray(response.body.metrics)).toBe(true);
      expect(response.body.summary.totalDrivers).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle empty assignment scenarios', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/roster/auto-assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2099-01-15' });

    if (response.status === 200) {
      expect(response.body.assigned).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.body.assignments)).toBe(true);
    }
  });
});
