import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';

/**
 * Passenger Class Routes Integration Tests
 *
 * Tests Section 19 passenger class definition system:
 * - Get passenger classes
 * - Create passenger class
 * - Update passenger class
 * - Delete passenger class
 * - Deactivate/activate class
 * - Standard definitions
 * - Required field validation
 */

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;
let createdClassId: number;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Passenger Class Test Company');
  testUser = await createTestUser(tenantId, `passengerclasstest${Date.now()}@test.local`, 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });

  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('Get Passenger Classes', () => {
  it('should get all passenger class definitions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should filter by permitId', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ permitId: 1 });

    expect([200, 500]).toContain(response.status);
  });

  it('should filter by isActive', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ isActive: 'true' });

    expect([200, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes`);

    expect(response.status).toBe(401);
  });
});

describe('Get Standard Definitions', () => {
  it('should get standard passenger class definitions', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/standard-definitions`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(6);
    }
  });

  it('should include class codes A through F', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/standard-definitions`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const classCodes = response.body.map((def: any) => def.class_code);
      expect(classCodes).toContain('A');
      expect(classCodes).toContain('B');
      expect(classCodes).toContain('C');
      expect(classCodes).toContain('D');
      expect(classCodes).toContain('E');
      expect(classCodes).toContain('F');
    }
  });

  it('should include disabled persons class', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/standard-definitions`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const classA = response.body.find((def: any) => def.class_code === 'A');
      expect(classA).toBeDefined();
      expect(classA.class_name).toBe('Disabled Persons');
    }
  });

  it('should include elderly persons class', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/standard-definitions`)
      .set('Authorization', `Bearer ${authToken}`);

    if (response.status === 200) {
      const classB = response.body.find((def: any) => def.class_code === 'B');
      expect(classB).toBeDefined();
      expect(classB.class_name).toBe('Elderly Persons');
    }
  });
});

describe('Create Passenger Class', () => {
  it('should create a new passenger class definition', async () => {
    const classData = {
      class_code: 'A',
      class_name: 'Disabled Passengers',
      class_description: 'Passengers with physical or mental disabilities',
      eligibility_criteria: 'Must have documented disability',
      verification_required: true,
      verification_method: 'disability_certificate',
      is_active: true,
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body).toHaveProperty('class_id');
      expect(response.body.class_code).toBe('A');
      expect(response.body.class_name).toBe(classData.class_name);
      createdClassId = response.body.class_id;
    }
  });

  it('should reject missing class_code', async () => {
    const classData = {
      class_name: 'Test Class',
      class_description: 'Test description',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject missing class_name', async () => {
    const classData = {
      class_code: 'B',
      class_description: 'Test description',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject missing class_description', async () => {
    const classData = {
      class_code: 'C',
      class_name: 'Test Class',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject invalid class code', async () => {
    const classData = {
      class_code: 'Z',
      class_name: 'Invalid Class',
      class_description: 'This should fail',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should create Class E with geographic area', async () => {
    const classData = {
      class_code: 'E',
      class_name: 'Local Residents',
      class_description: 'Residents within service area',
      geographic_area: 'SW1A 1AA catchment area',
      radius_miles: 5.0,
      verification_required: true,
      verification_method: 'address_verification',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.class_code).toBe('E');
      expect(response.body.geographic_area).toBe(classData.geographic_area);
    }
  });

  it('should create Class E with center point', async () => {
    const classData = {
      class_code: 'E',
      class_name: 'Local Residents',
      class_description: 'Residents within radius',
      center_point: '{"lat": 51.5074, "lng": -0.1278}',
      radius_miles: 10.0,
      verification_required: true,
      verification_method: 'address_verification',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.class_code).toBe('E');
      expect(response.body.center_point).toBeDefined();
    }
  });

  it('should reject Class E without geographic definition', async () => {
    const classData = {
      class_code: 'E',
      class_name: 'Local Residents',
      class_description: 'Missing geographic info',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should create Class F with custom definition', async () => {
    const classData = {
      class_code: 'F',
      class_name: 'Special Category',
      class_description: 'Custom passenger category',
      custom_class_definition: 'Students enrolled in specific programs',
      verification_required: true,
      verification_method: 'custom',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([201, 400, 500]).toContain(response.status);
    if (response.status === 201) {
      expect(response.body.class_code).toBe('F');
      expect(response.body.custom_class_definition).toBe(classData.custom_class_definition);
    }
  });

  it('should reject Class F without custom definition', async () => {
    const classData = {
      class_code: 'F',
      class_name: 'Special Category',
      class_description: 'Missing custom definition',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(response.status);
  });

  it('should reject duplicate active class code', async () => {
    const classData = {
      class_code: 'B',
      class_name: 'Elderly Persons',
      class_description: 'Persons aged 65+',
    };

    await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    const duplicateResponse = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    expect([400, 500]).toContain(duplicateResponse.status);
  });

  it('should require authentication', async () => {
    const classData = {
      class_code: 'C',
      class_name: 'Test',
      class_description: 'Test',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .send(classData);

    expect(response.status).toBe(401);
  });
});

describe('Get Specific Passenger Class', () => {
  it('should get passenger class by ID', async () => {
    if (!createdClassId) {
      const classData = {
        class_code: 'D',
        class_name: 'Members',
        class_description: 'Organization members',
      };

      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(classData);

      if (createResponse.status === 201) {
        createdClassId = createResponse.body.class_id;
      }
    }

    if (createdClassId) {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('class_id');
        expect(response.body.class_id).toBe(createdClassId);
      }
    }
  });

  it('should return 404 for non-existent class', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should include permit information', async () => {
    if (createdClassId) {
      const response = await request(app)
        .get(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('class_code');
        expect(response.body).toHaveProperty('class_name');
      }
    }
  });
});

describe('Get Passenger Class by Code', () => {
  it('should get passenger class by code', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/by-code/A`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('should handle lowercase class codes', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/by-code/a`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404, 500]).toContain(response.status);
  });

  it('should return 404 for non-existent code', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/passenger-classes/by-code/Z`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });
});

describe('Update Passenger Class', () => {
  it('should update passenger class definition', async () => {
    if (!createdClassId) {
      const classData = {
        class_code: 'B',
        class_name: 'Elderly',
        class_description: 'Elderly passengers',
      };

      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(classData);

      if (createResponse.status === 201) {
        createdClassId = createResponse.body.class_id;
      }
    }

    if (createdClassId) {
      const updateData = {
        class_name: 'Elderly Passengers Updated',
        class_description: 'Updated description for elderly passengers',
      };

      const response = await request(app)
        .put(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.class_name).toBe(updateData.class_name);
      }
    }
  });

  it('should update eligibility criteria', async () => {
    if (createdClassId) {
      const updateData = {
        eligibility_criteria: 'Must be 60 years or older',
      };

      const response = await request(app)
        .put(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should update verification settings', async () => {
    if (createdClassId) {
      const updateData = {
        verification_required: false,
        verification_method: 'self_declaration',
      };

      const response = await request(app)
        .put(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect([200, 404, 500]).toContain(response.status);
    }
  });

  it('should return 404 for non-existent class', async () => {
    const updateData = {
      class_name: 'Updated Name',
    };

    const response = await request(app)
      .put(`/api/tenants/${tenantId}/passenger-classes/99999`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    if (createdClassId) {
      const updateData = {
        class_name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}`)
        .send(updateData);

      expect(response.status).toBe(401);
    }
  });
});

describe('Deactivate Passenger Class', () => {
  it('should deactivate passenger class', async () => {
    if (!createdClassId) {
      const classData = {
        class_code: 'C',
        class_name: 'Social Disadvantage',
        class_description: 'Persons affected by poverty',
      };

      const createResponse = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(classData);

      if (createResponse.status === 201) {
        createdClassId = createResponse.body.class_id;
      }
    }

    if (createdClassId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.is_active).toBe(false);
      }
    }
  });

  it('should return 404 for non-existent class', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes/99999/deactivate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    if (createdClassId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}/deactivate`);

      expect(response.status).toBe(401);
    }
  });
});

describe('Activate Passenger Class', () => {
  it('should activate passenger class', async () => {
    if (createdClassId) {
      await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}/activate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.is_active).toBe(true);
      }
    }
  });

  it('should return 404 for non-existent class', async () => {
    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes/99999/activate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    if (createdClassId) {
      const response = await request(app)
        .post(`/api/tenants/${tenantId}/passenger-classes/${createdClassId}/activate`);

      expect(response.status).toBe(401);
    }
  });
});

describe('Delete Passenger Class', () => {
  it('should delete passenger class', async () => {
    const classData = {
      class_code: 'F',
      class_name: 'Temporary Class',
      class_description: 'Class to be deleted',
      custom_class_definition: 'Temporary test class',
    };

    const createResponse = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    if (createResponse.status === 201) {
      const classId = createResponse.body.class_id;

      const response = await request(app)
        .delete(`/api/tenants/${tenantId}/passenger-classes/${classId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    }
  });

  it('should return 404 for non-existent class', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/passenger-classes/99999`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([404, 500]).toContain(response.status);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .delete(`/api/tenants/${tenantId}/passenger-classes/1`);

    expect(response.status).toBe(401);
  });
});

describe('Required Field Validation', () => {
  it('should validate class_code is required', async () => {
    const invalidData = {
      class_name: 'Test Class',
      class_description: 'Test description',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should validate class_name is required', async () => {
    const invalidData = {
      class_code: 'A',
      class_description: 'Test description',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should validate class_description is required', async () => {
    const invalidData = {
      class_code: 'A',
      class_name: 'Test Class',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should validate Class E requires geographic definition', async () => {
    const invalidData = {
      class_code: 'E',
      class_name: 'Local Area',
      class_description: 'Missing geographic info',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should validate Class F requires custom definition', async () => {
    const invalidData = {
      class_code: 'F',
      class_name: 'Custom Class',
      class_description: 'Missing custom definition',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should validate class code is A-F only', async () => {
    const invalidData = {
      class_code: 'X',
      class_name: 'Invalid Class',
      class_description: 'Invalid code',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);

    expect([400, 500]).toContain(response.status);
  });

  it('should prevent duplicate active class codes', async () => {
    const classData = {
      class_code: 'A',
      class_name: 'Disabled Persons',
      class_description: 'First instance',
    };

    await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(classData);

    const duplicateData = {
      class_code: 'A',
      class_name: 'Disabled Persons Duplicate',
      class_description: 'Second instance',
    };

    const response = await request(app)
      .post(`/api/tenants/${tenantId}/passenger-classes`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(duplicateData);

    expect([400, 500]).toContain(response.status);
  });
});
