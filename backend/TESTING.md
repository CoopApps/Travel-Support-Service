# Testing Guide

## Quick Start

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:security      # Security tests only

# Development mode (watch)
npm run test:watch

# CI/CD mode
npm run test:ci
```

## Test Structure

```
backend/src/tests/
├── setup/                 # Test utilities and configuration
│   ├── testApp.ts        # Express app factory for testing
│   ├── testDatabase.ts   # Database utilities (create tenant, cleanup)
│   └── testHelpers.ts    # Common test helpers (auth, data generators)
├── integration/          # Integration tests (API endpoints)
│   ├── auth.test.ts      # Authentication flows
│   ├── customer.test.ts  # Customer CRUD
│   ├── driver.test.ts    # Driver management
│   ├── vehicle.test.ts   # Vehicle management
│   ├── health.test.ts    # Health check endpoints
│   ├── gdpr.test.ts      # GDPR compliance
│   └── tenant-isolation.test.ts
├── security/             # Security-focused tests
│   ├── auth-cookie.test.ts
│   ├── csrf.test.ts
│   └── tenant-isolation.test.ts
└── unit/                 # Unit tests (services, utilities)
    └── piiEncryption.test.ts
```

## Writing New Tests

### Integration Tests Template

```typescript
import request from 'supertest';
import { Application } from 'express';
import { createTestTenant, createTestUser, cleanupTestTenant, closeTestPool } from '../setup/testDatabase';
import { createTestApp } from '../setup/testApp';
import { testData, loginAsUser, expectSuccess } from '../setup/testHelpers';

let app: Application;
let tenantId: number;
let testUser: { userId: number; username: string; email: string; password: string };
let authToken: string;

beforeAll(async () => {
  app = createTestApp();
  tenantId = await createTestTenant('Test Company');
  testUser = await createTestUser(tenantId, 'test@test.local', 'admin');

  const loginResponse = await request(app)
    .post(`/api/tenants/${tenantId}/login`)
    .send({ username: testUser.username, password: testUser.password });
  authToken = loginResponse.body.token;
}, 30000);

afterAll(async () => {
  await cleanupTestTenant(tenantId);
  await closeTestPool();
}, 30000);

describe('GET /api/tenants/:tenantId/resource', () => {
  it('should return resources with valid auth', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/resource`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/);

    expectSuccess(response, 200);
  });

  it('should reject without authentication', async () => {
    const response = await request(app)
      .get(`/api/tenants/${tenantId}/resource`);

    expect(response.status).toBe(401);
  });
});
```

### Using Test Helpers

```typescript
import { testData, loginAsUser, expectError, expectPaginated } from '../setup/testHelpers';

// Generate test data
const customer = testData.customer({ name: 'Custom Name' });
const driver = testData.driver();
const vehicle = testData.vehicle({ wheelchair_accessible: true });

// Login and get authenticated agent
const agent = await loginAsUser(app, tenantId, username, password);
const response = await agent.get('/api/tenants/1/customers');

// Assertion helpers
expectError(response, 400, 'missing required');
expectPaginated(response, 'customers');
```

## Test Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Routes | ~15% | 80%+ |
| Services | ~10% | 80%+ |
| Middleware | ~20% | 80%+ |
| **Overall** | ~15% | **80%+** |

## Running Coverage Report

```bash
npm run test:coverage
```

This generates:
- Console output with summary
- `coverage/lcov-report/index.html` - Detailed HTML report
- `coverage/lcov.info` - For CI tools

## Environment Setup

Tests use environment variables from `.env.test` (falls back to `.env`):

```env
# .env.test
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_support_test
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=test-jwt-secret
```

## Best Practices

1. **Isolation**: Each test file creates its own tenant and cleans up after
2. **Authentication**: Use `loginAsUser()` helper for authenticated requests
3. **Data Generation**: Use `testData.*` generators for unique test data
4. **Cleanup**: Always cleanup in `afterAll()` to prevent test pollution
5. **Timeouts**: Set generous timeouts for database operations (30s)
6. **Parallel Safety**: Tests should be able to run in parallel

## Adding Route Coverage

To add tests for a new route file:

1. Add route import to `testApp.ts`:
   ```typescript
   import newRoutes from '../../routes/new.routes';
   app.use('/api', newRoutes);
   ```

2. Create test file `integration/new.test.ts` using the template

3. Test all CRUD operations plus edge cases:
   - Valid requests with auth
   - Missing/invalid authentication
   - Invalid input data
   - Not found cases
   - Tenant isolation

## CI/CD Integration

For CI pipelines, use:

```bash
npm run test:ci
```

This:
- Runs with `--ci` flag (better output for CI)
- Generates lcov coverage report
- Uses reduced workers for resource constraints
