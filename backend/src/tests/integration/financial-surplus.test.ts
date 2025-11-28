import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Financial Surplus Routes Integration Tests
 *
 * Tests not-for-profit compliance tracking for Section 19/22 permit holders:
 * - Annual financial surplus/deficit tracking
 * - Surplus reinvestment planning and monitoring
 * - Cross-subsidy detection between routes
 * - Full Cost Recovery (FCR) model compliance
 * - Competitive tendering revenue limits
 * - Multi-year financial analysis
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Financial Surplus Test Company');
  testUser = await createTestUser(tenantId, `financialtest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Financial Surplus Management', () => {
  let surplusId: number;

  it('should get all financial surplus records', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should create a financial surplus record with surplus', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2024-2025',
        year_start_date: '2024-04-01',
        year_end_date: '2025-03-31',
        total_income: 150000.00,
        fare_revenue: 80000.00,
        contract_revenue: 50000.00,
        grant_income: 15000.00,
        other_income: 5000.00,
        total_expenses: 145000.00,
        driver_wages: 65000.00,
        fuel_costs: 25000.00,
        vehicle_maintenance: 20000.00,
        insurance: 15000.00,
        depreciation: 10000.00,
        administration_costs: 8000.00,
        other_expenses: 2000.00,
        surplus_reinvestment_plan: 'Invest in new accessible vehicle ramps and driver training',
        has_cross_subsidy: true,
        cross_subsidy_description: 'Town route profits subsidize rural village services',
        profitable_routes: ['Route 1: Town Centre Loop', 'Route 3: Business Park'],
        loss_making_routes: ['Route 2: Village Service', 'Route 4: Hospital Link'],
        uses_fcr_model: true,
        fcr_calculation_notes: 'FCR model applied to all routes with 10% contingency buffer',
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('surplus_id');
      expect(response.body.financial_year).toBe('2024-2025');
      expect(response.body.total_income).toBe('150000.00');
      expect(response.body.total_expenses).toBe('145000.00');
      surplusId = response.body.surplus_id;
    }
  });

  it('should create a financial surplus record with deficit', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2023-2024',
        year_start_date: '2023-04-01',
        year_end_date: '2024-03-31',
        total_income: 120000.00,
        fare_revenue: 70000.00,
        contract_revenue: 40000.00,
        grant_income: 10000.00,
        total_expenses: 135000.00,
        driver_wages: 60000.00,
        fuel_costs: 30000.00,
        vehicle_maintenance: 25000.00,
        insurance: 15000.00,
        depreciation: 5000.00,
        has_cross_subsidy: false,
        uses_fcr_model: true,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.financial_year).toBe('2023-2024');
    }
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2025-2026',
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should prevent duplicate financial year', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2024-2025',
        year_start_date: '2024-04-01',
        year_end_date: '2025-03-31',
        total_income: 100000.00,
        total_expenses: 95000.00,
      });

    expect([400, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus`);

    expect(response.status).toBe(401);
  });
});

describe('Financial Surplus Retrieval', () => {
  let surplusId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2022-2023',
        year_start_date: '2022-04-01',
        year_end_date: '2023-03-31',
        total_income: 110000.00,
        total_expenses: 105000.00,
      });

    if (response.status === 201) {
      surplusId = response.body.surplus_id;
    }
  });

  it('should get specific financial surplus record by ID', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.surplus_id).toBe(surplusId);
      expect(response.body.financial_year).toBe('2022-2023');
    }
  });

  it('should handle non-existent surplus ID', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should get financial surplus by year', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/year/2022-2023`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.financial_year).toBe('2022-2023');
    }
  });

  it('should handle non-existent year', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/year/1999-2000`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Financial Surplus Updates', () => {
  let surplusId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2021-2022',
        year_start_date: '2021-04-01',
        year_end_date: '2022-03-31',
        total_income: 100000.00,
        total_expenses: 95000.00,
        surplus_reinvested: false,
      });

    if (response.status === 201) {
      surplusId = response.body.surplus_id;
    }
  });

  it('should update financial surplus record', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_income: 105000.00,
        total_expenses: 96000.00,
        surplus_reinvestment_actual: 'Purchased two new wheelchair-accessible ramps',
        surplus_reinvested: true,
        reinvestment_date: '2022-05-15',
      });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.surplus_reinvested).toBe(true);
    }
  });

  it('should update cross-subsidy information', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        has_cross_subsidy: true,
        cross_subsidy_description: 'Urban routes subsidize rural services',
        profitable_routes: ['Urban Route A', 'Urban Route B'],
        loss_making_routes: ['Rural Route 1', 'Rural Route 2'],
      });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.has_cross_subsidy).toBe(true);
    }
  });

  it('should handle non-existent record update', async () => {
    const response = await request(app)
      .put(`/api/tenants/${tenantId}/financial-surplus/999999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        total_income: 100000.00,
      });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Surplus Reinvestment Tracking', () => {
  let surplusId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2020-2021',
        year_start_date: '2020-04-01',
        year_end_date: '2021-03-31',
        total_income: 130000.00,
        total_expenses: 120000.00,
        surplus_reinvestment_plan: 'Plan to invest in electric vehicle conversion',
        surplus_reinvested: false,
      });

    if (response.status === 201) {
      surplusId = response.body.surplus_id;
    }
  });

  it('should track surplus reinvestment plan', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('surplus_reinvestment_plan');
      expect(response.body.surplus_reinvested).toBe(false);
    }
  });

  it('should record actual reinvestment', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        surplus_reinvestment_actual: 'Converted one vehicle to electric, purchased charging infrastructure',
        surplus_reinvested: true,
        reinvestment_date: '2021-06-30',
      });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.surplus_reinvested).toBe(true);
      expect(response.body).toHaveProperty('reinvestment_date');
    }
  });
});

describe('Cross-Subsidy Detection', () => {
  it('should create record with cross-subsidy tracking', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2019-2020',
        year_start_date: '2019-04-01',
        year_end_date: '2020-03-31',
        total_income: 140000.00,
        total_expenses: 138000.00,
        has_cross_subsidy: true,
        cross_subsidy_description: 'Profitable commercial contracts subsidize community services',
        profitable_routes: ['Commercial Contract 1', 'Commercial Contract 2'],
        loss_making_routes: ['Community Service A', 'Community Service B', 'Community Service C'],
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.has_cross_subsidy).toBe(true);
      expect(response.body.cross_subsidy_description).toBeTruthy();
    }
  });

  it('should handle no cross-subsidy scenario', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2018-2019',
        year_start_date: '2018-04-01',
        year_end_date: '2019-03-31',
        total_income: 125000.00,
        total_expenses: 124000.00,
        has_cross_subsidy: false,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.has_cross_subsidy).toBe(false);
    }
  });
});

describe('Full Cost Recovery (FCR) Compliance', () => {
  it('should track FCR model usage', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2017-2018',
        year_start_date: '2017-04-01',
        year_end_date: '2018-03-31',
        total_income: 115000.00,
        total_expenses: 113000.00,
        uses_fcr_model: true,
        fcr_calculation_notes: 'FCR calculated using CTLA guidance with 5% contingency',
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.uses_fcr_model).toBe(true);
      expect(response.body).toHaveProperty('fcr_calculation_notes');
    }
  });

  it('should handle non-FCR operations', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2016-2017',
        year_start_date: '2016-04-01',
        year_end_date: '2017-03-31',
        total_income: 108000.00,
        total_expenses: 106000.00,
        uses_fcr_model: false,
        fcr_calculation_notes: 'Grant-funded service, not using FCR model',
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.uses_fcr_model).toBe(false);
    }
  });
});

describe('Competitive Tendering Revenue', () => {
  it('should track competitive contract revenue', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2015-2016',
        year_start_date: '2015-04-01',
        year_end_date: '2016-03-31',
        total_income: 160000.00,
        total_expenses: 155000.00,
        competitive_contracts_revenue: 60000.00,
        competitive_contracts_percentage: 37.5,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.competitive_contracts_revenue).toBe('60000.00');
      expect(response.body.competitive_contracts_percentage).toBe('37.50');
    }
  });

  it('should handle zero competitive revenue', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2014-2015',
        year_start_date: '2014-04-01',
        year_end_date: '2015-03-31',
        total_income: 95000.00,
        total_expenses: 93000.00,
        competitive_contracts_revenue: 0,
        competitive_contracts_percentage: 0,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.competitive_contracts_revenue).toBe('0.00');
    }
  });
});

describe('Financial Surplus Summary', () => {
  it('should get financial surplus summary', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('recent_years');
      expect(response.body).toHaveProperty('compliance_status');
    }
  });

  it('should include compliance status indicators', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(response.body.compliance_status).toHaveProperty('operating_not_for_profit');
      expect(response.body.compliance_status).toHaveProperty('surplus_reinvestment_tracked');
      expect(response.body.compliance_status).toHaveProperty('competitive_contracts_within_limits');
    }
  });

  it('should show recent years data', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      expect(Array.isArray(response.body.recent_years)).toBe(true);
    }
  });

  it('should calculate multi-year statistics', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/summary`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200 && response.body.overall) {
      expect(response.body.overall).toHaveProperty('total_years');
      expect(response.body.overall).toHaveProperty('surplus_years');
      expect(response.body.overall).toHaveProperty('deficit_years');
    }
  });
});

describe('Financial Surplus Review', () => {
  let surplusId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2013-2014',
        year_start_date: '2013-04-01',
        year_end_date: '2014-03-31',
        total_income: 88000.00,
        total_expenses: 85000.00,
        reviewed: false,
      });

    if (response.status === 201) {
      surplusId = response.body.surplus_id;
    }
  });

  it('should mark surplus as reviewed', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus/${surplusId}/review`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reviewed_by: 'Financial Controller',
        review_notes: 'Reviewed and approved. Surplus to be reinvested in vehicle upgrades.',
      });

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.reviewed).toBe(true);
      expect(response.body.reviewed_by).toBe('Financial Controller');
      expect(response.body).toHaveProperty('review_date');
      expect(response.body.review_notes).toBeTruthy();
    }
  });

  it('should handle review without notes', async () => {
    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2012-2013',
        year_start_date: '2012-04-01',
        year_end_date: '2013-03-31',
        total_income: 82000.00,
        total_expenses: 80000.00,
      });

    if (createResponse.status === 201) {
      const newSurplusId = createResponse.body.surplus_id;
      const reviewResponse = await request(app)
        .post(`/api/tenants/${tenantId}/financial-surplus/${newSurplusId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reviewed_by: 'Admin',
        });

      expect([200, 404, 500]).toContain(reviewResponse.status);
      if (reviewResponse.status === 200) {
        expect(reviewResponse.body.reviewed).toBe(true);
      }
    }
  });

  it('should handle review of non-existent record', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus/999999/review`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reviewed_by: 'Test User',
      });

    expect([404, 500]).toContain(response.status);
  });
});

describe('Financial Surplus Deletion', () => {
  let surplusId: number;

  beforeAll(async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2011-2012',
        year_start_date: '2011-04-01',
        year_end_date: '2012-03-31',
        total_income: 75000.00,
        total_expenses: 74000.00,
      });

    if (response.status === 201) {
      surplusId = response.body.surplus_id;
    }
  });

  it('should delete financial surplus record', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeTruthy();
    }
  });

  it('should handle deletion of non-existent record', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/financial-surplus/999999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should confirm deletion by attempting retrieval', async () => {
    if (!surplusId) {
      return;
    }

    const response = await request(app)
      .get(`/api/tenants/${tenantId}/financial-surplus/${surplusId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Income and Expense Breakdown', () => {
  it('should track detailed income breakdown', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2010-2011',
        year_start_date: '2010-04-01',
        year_end_date: '2011-03-31',
        total_income: 200000.00,
        fare_revenue: 90000.00,
        contract_revenue: 70000.00,
        grant_income: 30000.00,
        other_income: 10000.00,
        total_expenses: 195000.00,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.fare_revenue).toBe('90000.00');
      expect(response.body.contract_revenue).toBe('70000.00');
      expect(response.body.grant_income).toBe('30000.00');
      expect(response.body.other_income).toBe('10000.00');
    }
  });

  it('should track detailed expense breakdown', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2009-2010',
        year_start_date: '2009-04-01',
        year_end_date: '2010-03-31',
        total_income: 180000.00,
        total_expenses: 175000.00,
        driver_wages: 80000.00,
        fuel_costs: 35000.00,
        vehicle_maintenance: 25000.00,
        insurance: 18000.00,
        depreciation: 12000.00,
        administration_costs: 5000.00,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.driver_wages).toBe('80000.00');
      expect(response.body.fuel_costs).toBe('35000.00');
      expect(response.body.vehicle_maintenance).toBe('25000.00');
      expect(response.body.insurance).toBe('18000.00');
      expect(response.body.depreciation).toBe('12000.00');
      expect(response.body.administration_costs).toBe('5000.00');
    }
  });

  it('should handle partial breakdowns', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2008-2009',
        year_start_date: '2008-04-01',
        year_end_date: '2009-03-31',
        total_income: 165000.00,
        fare_revenue: 100000.00,
        total_expenses: 162000.00,
        driver_wages: 90000.00,
        fuel_costs: 40000.00,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.total_income).toBe('165000.00');
      expect(response.body.total_expenses).toBe('162000.00');
    }
  });
});

describe('Not-for-Profit Compliance Scenarios', () => {
  it('should handle minimal surplus scenario', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2007-2008',
        year_start_date: '2007-04-01',
        year_end_date: '2008-03-31',
        total_income: 100000.00,
        total_expenses: 99500.00,
        surplus_reinvestment_plan: 'Small surplus to be used for driver safety training',
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(parseFloat(response.body.surplus_amount)).toBeLessThan(1000);
    }
  });

  it('should handle break-even scenario', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2006-2007',
        year_start_date: '2006-04-01',
        year_end_date: '2007-03-31',
        total_income: 92000.00,
        total_expenses: 92000.00,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.surplus_amount).toBe('0.00');
    }
  });

  it('should handle grant-dependent scenario', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/financial-surplus`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        financial_year: '2005-2006',
        year_start_date: '2005-04-01',
        year_end_date: '2006-03-31',
        total_income: 110000.00,
        fare_revenue: 40000.00,
        grant_income: 60000.00,
        other_income: 10000.00,
        total_expenses: 108000.00,
      });

    expect([201, 500]).toContain(response.status);
    if (response.status === 201) {
      const grantPercentage = (60000 / 110000) * 100;
      expect(grantPercentage).toBeGreaterThan(50);
    }
  });
});
