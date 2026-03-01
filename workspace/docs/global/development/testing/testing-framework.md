# Testing Framework

This document describes the testing framework for the sevdesk-shopify-connector project.

## Overview

The testing framework follows the test pyramid pattern with three levels:

| Level | Count | Purpose | Speed |
|-------|-------|---------|-------|
| Unit | 23 | Fast, isolated tests with mocks | Fast (<1s each) |
| Integration | 22 | Database and API integration | Medium (1-5s each) |
| E2E | 11 | Full stack with test server | Slower (5-30s each) |
| **Total** | **56** | | |

## Running Tests

### All Tests

```bash
npm test                  # Run all tests
npm run verify            # Typecheck + lint + test (pre-commit check)
```

### By Category

```bash
npm run test:unit         # Unit tests only (tests/unit/)
npm run test:integration  # Integration tests only (tests/integration/)
npm run test:e2e          # E2E tests only (tests/e2e/)
```

### Coverage

```bash
npm run test:coverage     # Generate coverage report
```

Coverage output is written to `coverage/` directory.

### Watch Mode

```bash
npm run test:watch        # Run tests on file changes
```

### Specific Test Files

```bash
npm test -- tests/unit/services/processor.test.ts
npm test -- tests/integration/api.test.ts
```

## Test Categories

### Unit Tests

Location: `tests/unit/`

Unit tests are fast, isolated tests that mock all external dependencies. They test individual functions and classes in isolation.

**Structure:**
```
tests/unit/
├── clients/
│   ├── sevdesk.test.ts    # SevdeskClient unit tests
│   └── shopify.test.ts    # ShopifyClient unit tests
└── services/
    ├── processor.test.ts  # processPaidInvoice unit tests
    └── emailSender.test.ts # Email sender unit tests
```

**When to use:**
- Testing pure functions and business logic
- Testing error handling in isolation
- Fast feedback during development

### Integration Tests

Location: `tests/integration/`

Integration tests verify that multiple components work together correctly. They may use the test database and test real API endpoints.

**Structure:**
```
tests/integration/
├── api.test.ts              # API endpoint tests (health, errors)
├── payment-flow.test.ts     # Payment processing flow
└── invoice-sync-flow.test.ts # Invoice sync scenarios
```

**When to use:**
- Testing database interactions
- Testing API endpoints
- Testing multi-component workflows

### E2E Tests

Location: `tests/e2e/`

End-to-end tests run the full application stack with a test server and mocked external APIs.

**Structure:**
```
tests/e2e/
├── setup/
│   ├── server.ts     # Test server management
│   ├── mocks.ts      # External API mocks (Shopify, Sevdesk)
│   ├── helpers.ts    # Test utilities
│   └── jest.setup.ts # E2E-specific Jest config
└── infrastructure-example.test.ts
```

**When to use:**
- Testing complete user workflows
- Testing with realistic external API responses
- Catching integration issues between all layers

## Test Database

### Configuration

The test database is configured via environment variables:

```env
TEST_DATABASE_URL=postgresql://testuser:testpass@postgres-test:5432/sevdesk_shopify_test
```

### Tables

The test database creates these tables:

| Table | Purpose |
|-------|---------|
| `sevdesk_invoices` | Invoice data from Sevdesk |
| `shopify_orders` | Order data from Shopify |
| `sync_mapping` | Invoice-to-order mapping |
| `notification_history` | Idempotency tracking |
| `schema_migrations` | Migration tracking |

### Setup Functions

```typescript
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  resetTestData, 
  getTestPool 
} from '../setup/database';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await resetTestData();
});
```

### Seeding Data

```typescript
import { seedE2EData, cleanupE2EData } from '../e2e/setup/helpers';

beforeEach(async () => {
  await seedE2EData({
    sevdeskInvoices: [invoice1, invoice2],
    shopifyOrders: [order1],
  });
});

afterEach(async () => {
  await cleanupE2EData();
});
```

## Writing New Tests

### File Naming

- Test files: `*.test.ts`
- Place in appropriate directory: `tests/unit/`, `tests/integration/`, or `tests/e2e/`
- Mirror source structure: `tests/unit/clients/` for `src/clients/`

### Basic Test Structure

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Using Fixtures

```typescript
import { sevdeskInvoices, shopifyOrders } from '../fixtures/fixtures';

it('processes invoice', async () => {
  const invoice = sevdeskInvoices.paid[0];
  // Use fixture in test
});
```

### Using Mocks

```typescript
import { createMockSevdeskInvoice, createMockShopifyOrder } from '../fixtures/mocks';

it('handles mock data', async () => {
  const invoice = createMockSevdeskInvoice({ status: '1000' });
  const order = createMockShopifyOrder({ name: '#ORD-123' });
});
```

### Database Tests

```typescript
import { getTestPool } from '../setup/database';

it('queries database', async () => {
  const pool = getTestPool();
  const result = await pool.query('SELECT * FROM sevdesk_invoices');
  expect(result.rows).toHaveLength(1);
});
```

## Static Analysis

### TypeScript Check

```bash
npm run typecheck    # Run tsc --noEmit
```

### Linting

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix linting issues
```

## CI/CD Integration

The project uses GitHub Actions for continuous integration. The workflow runs on:

- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

### Workflow Steps

1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run typecheck
5. Run lint
6. Run tests with coverage
7. Upload coverage to Codecov

### Viewing Results

1. Go to the GitHub repository
2. Click on "Actions" tab
3. Select the workflow run
4. View job output and test results

## Troubleshooting

### Tests Fail with Database Errors

Ensure the test database is running:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Or start it
docker-compose up -d postgres-test
```

### Tests Fail with Connection Errors

Check the `TEST_DATABASE_URL` environment variable:

```bash
echo $TEST_DATABASE_URL
```

### Jest Reports "Worker Process Failed"

This usually means a test didn't clean up properly. Try:

```bash
npm test -- --runInBand --forceExit
```

### Tests Pass Locally but Fail in CI

1. Check environment variables match
2. Ensure database migrations run
3. Check for hardcoded paths or URLs

### Coverage is Low

Run coverage report to identify gaps:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Pre-Completion Verification

Before committing, run the full verification:

```bash
npm run verify
```

This runs:
1. `npm run typecheck` - TypeScript type errors
2. `npm run lint` - ESLint issues
3. `npm test` - All tests

All checks must pass before merging.
