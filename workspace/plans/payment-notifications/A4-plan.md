# Implementation Plan: Testing & Documentation

**Plan Type**: Implementation  
**Assigned to**: @backend-specialist  
**Branch**: feature/payment-notifications  
**Ticket**: payment-notifications  
**Date**: 2026-02-20  
**Status**: Ready for Implementation  
**Revision**: 1.0  
**Dependencies**: A2-plan.md, A3-plan.md (both must be complete)

---

## Executive Summary

This plan adds comprehensive testing and documentation to the payment notification system. Tests ensure reliability and documentation enables future maintenance.

**Deliverables**:
- 60%+ unit test coverage
- Integration tests for complete flow
- Setup documentation
- Deployment guide
- README with usage instructions

**Effort Estimate**: 3-4 hours  
**Blockers**: None

---

## Acceptance Criteria

- [ ] AC1: Unit test coverage ≥ 60%
- [ ] AC2: All core modules have unit tests
- [ ] AC3: Integration test covers happy path
- [ ] AC4: Integration test covers error scenarios
- [ ] AC5: README.md explains project purpose and setup
- [ ] AC6: Setup guide has step-by-step instructions
- [ ] AC7: Deployment guide covers Uberspace deployment
- [ ] AC8: All tests pass: `npm test`

---

## Implementation Tasks

### Task 1: Unit Test Setup (30 min)

**Description**: Configure Jest for TypeScript testing.

**Checklist**:
- [ ] Create `jest.config.js`:
  ```javascript
  module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts'],
    coverageThreshold: {
      global: { branches: 60, functions: 60, lines: 60 }
    }
  };
  ```
- [ ] Add `npm run test:coverage` script
- [ ] Create test utilities in `src/test/`:
  - `mocks.ts` - Common mock factories
  - `fixtures.ts` - Test data fixtures

**Files to Create**:
- `jest.config.js`
- `src/test/mocks.ts`
- `src/test/fixtures.ts`

---

### Task 2: Core Module Tests (1.5 hours)

**Description**: Add unit tests for all core modules.

**Test Files to Create/Update**:

| Module | Test File | Test Cases |
|--------|-----------|------------|
| Sevdesk Client | `src/clients/sevdesk.test.ts` | API calls, error handling, rate limiting |
| Shopify Client | `src/clients/shopify.test.ts` | GraphQL queries, authentication, errors |
| Order Lookup | `src/services/orderLookup.test.ts` | Find by email, no results, multiple results |
| Order Update | `src/services/orderUpdate.test.ts` | Mark as paid, handle errors |
| Processor | `src/services/processor.test.ts` | Full flow, idempotency, error recovery |
| Poller | `src/services/poller.test.ts` | Polling interval, invoice processing |

**Test Case Template**:
```typescript
describe('OrderLookup', () => {
  it('finds order by customer email', async () => {
    // Arrange
    const mockShopify = createMockShopifyClient();
    mockShopify.graphql.mockResolvedValue({
      data: { orders: { edges: [{ node: mockOrder }] } }
    });

    // Act
    const result = await findOrderByEmail('test@example.com');

    // Assert
    expect(result).toEqual(mockOrder);
  });

  it('returns null when no order found', async () => {
    // ...
  });

  it('returns most recent order when multiple found', async () => {
    // ...
  });
});
```

---

### Task 3: Integration Tests (1 hour)

**Description**: Test complete payment notification flow.

**Checklist**:
- [ ] Create `src/tests/integration/payment-flow.test.ts`
- [ ] Test happy path:
  - Mock Sevdesk returns paid invoice
  - Mock Shopify returns order
  - Verify order updated
  - Verify notification recorded
- [ ] Test error scenarios:
  - Sevdesk API failure
  - Shopify API failure
  - Database failure
  - Duplicate invoice processing

**Integration Test Setup**:
```typescript
describe('Payment Notification Flow', () => {
  let testDb: TestDatabase;
  let mockSevdesk: MockSevdeskServer;
  let mockShopify: MockShopifyServer;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    mockSevdesk = await createMockSevdeskServer();
    mockShopify = await createMockShopifyServer();
  });

  afterAll(async () => {
    await testDb.cleanup();
    await mockSevdesk.stop();
    await mockShopify.stop();
  });

  it('processes paid invoice end-to-end', async () => {
    // Setup: Create unpaid invoice in mock Sevdesk
    mockSevdesk.addInvoice({ id: 'INV-001', status: 'paid', customerEmail: 'test@example.com' });
    
    // Setup: Create pending order in mock Shopify
    mockShopify.addOrder({ id: 'ORD-001', email: 'test@example.com', status: 'pending' });

    // Trigger: Run processor
    await processPaidInvoices();

    // Verify: Order status updated
    const order = mockShopify.getOrder('ORD-001');
    expect(order.status).toBe('paid');

    // Verify: Notification recorded
    const notification = await testDb.getNotification('INV-001');
    expect(notification).toBeDefined();
    expect(notification.status).toBe('sent');
  });
});
```

---

### Task 4: README Documentation (30 min)

**Description**: Create project README.

**Checklist**:
- [ ] Project description and purpose
- [ ] Prerequisites (link to A0-prerequisites.md)
- [ ] Quick start guide
- [ ] Configuration options
- [ ] Development commands
- [ ] License

**README Structure**:
```markdown
# Shopify-Sevdesk Payment Notifier

Automatically sends payment confirmation emails to customers when payments 
are recorded in Sevdesk.

## Features
- Polls Sevdesk for paid invoices
- Updates Shopify order status
- Sends customer email notifications
- Prevents duplicate notifications

## Quick Start

1. Complete prerequisites (see docs/A0-prerequisites.md)
2. Install dependencies: `npm install`
3. Configure environment: `cp .env.example .env`
4. Run migrations: `npm run migrate`
5. Start server: `npm run dev`

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| SHOPIFY_STORE_URL | Your Shopify store URL | Yes |
| SHOPIFY_ACCESS_TOKEN | Admin API access token | Yes |
| SEVDESK_API_KEY | Sevdesk API key | Yes |
| DATABASE_URL | PostgreSQL connection string | Yes |
| POLL_INTERVAL_MS | Polling interval in milliseconds | No (default: 60000) |

## Development

- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## License

MIT
```

**Files to Create**:
- `README.md`

---

### Task 5: Setup Documentation (30 min)

**Description**: Create detailed setup guide.

**Checklist**:
- [ ] Step-by-step Shopify custom app creation
- [ ] Step-by-step Sevdesk API key retrieval
- [ ] Local PostgreSQL setup (Docker and native)
- [ ] Environment variable configuration
- [ ] First run verification

**Files to Create**:
- `docs/setup-guide.md`

---

### Task 6: Deployment Documentation (30 min)

**Description**: Create Uberspace deployment guide.

**Checklist**:
- [ ] Uberspace account creation
- [ ] PostgreSQL setup on Uberspace
- [ ] Application deployment steps
- [ ] supervisord configuration
- [ ] SSL/HTTPS setup
- [ ] Monitoring and logs

**supervisord Config**:
```ini
[program:sevdesk-notifier]
command=node /var/www/sevdesk-shopify-connector/dist/index.js
directory=/var/www/sevdesk-shopify-connector
user=uberlab
autostart=true
autorestart=true
stderr_logfile=/var/log/sevdesk-notifier.err.log
stdout_logfile=/var/log/sevdesk-notifier.out.log
environment=NODE_ENV="production"
```

**Files to Create**:
- `docs/deployment-guide.md`
- `deploy/supervisord.conf`

---

## Effort Breakdown

| Task | Time | Status |
|------|------|--------|
| 1. Unit Test Setup | 30 min | Not Started |
| 2. Core Module Tests | 1.5 hours | Not Started |
| 3. Integration Tests | 1 hour | Not Started |
| 4. README Documentation | 30 min | Not Started |
| 5. Setup Documentation | 30 min | Not Started |
| 6. Deployment Documentation | 30 min | Not Started |
| **Total** | **4.5 hours** | - |

---

## Success Criteria

After completing this plan:
- [ ] `npm test` passes all tests
- [ ] `npm run test:coverage` shows ≥ 60%
- [ ] README explains project clearly
- [ ] Setup guide enables new developer to start
- [ ] Deployment guide enables production deployment
- [ ] Project is ready for production use

---

## Final Checklist

Before marking payment-notifications as complete:
- [ ] All A2, A3, A4 tasks complete
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Tested with real Shopify and Sevdesk accounts
- [ ] Ready for production deployment

---

**Plan Version**: 1.0  
**Created**: 2026-02-20
