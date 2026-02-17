# Implementation Plan: Phase 1 - Core Webhook Infrastructure

**Plan Type**: Implementation  
**Assigned to**: @backend-specialist  
**Branch**: feature/webhook-infrastructure  
**Ticket**: PHASE1-001  
**Date**: 2026-02-17  
**Status**: Ready for Implementation  
**Revision**: 1.0

---

## Executive Summary

Phase 1 establishes the core webhook infrastructure for receiving and processing Shopify order/paid events. The deliverable is a production-ready webhook endpoint that:
- Verifies HMAC signatures (security)
- Prevents duplicate processing (idempotency)
- Creates Sevdesk invoices from Shopify orders
- Logs all operations for debugging
- Includes 60%+ unit test coverage

**Effort Estimate**: 12 hours  
**Blockers**: None  
**Dependencies**: Shopify custom app created and authenticated (manual step, 30 min)

---

## Problem Statement

Currently, when a Shopify order is paid, there is no automatic invoice creation in Sevdesk. Store owner must manually create invoices, causing:
- Accounting delays (orders and invoices out of sync)
- Data entry errors
- Loss of transaction history
- No audit trail of payment→invoice flow

Phase 1 solves this by automatically creating Sevdesk invoices within seconds of payment.

---

## Acceptance Criteria

### Primary Criteria (Must Have)

- [ ] AC1: Webhook endpoint accepts POST requests at `/webhooks/shopify/order-paid`
- [ ] AC2: HMAC signature verification rejects unsigned/tampered requests with 403
- [ ] AC3: Valid HMAC passes verification; request processing begins
- [ ] AC4: Idempotency: identical webhook (same X-Shopify-Webhook-Id) processed only once
- [ ] AC5: PostgreSQL `sync_state` table created with migration
- [ ] AC6: Order parsed from webhook payload; customer email extracted
- [ ] AC7: Contact created/found in Sevdesk by email
- [ ] AC8: Invoice created in Sevdesk with line items from order
- [ ] AC9: Sync state recorded in database with success/failure status
- [ ] AC10: All operations logged with shopify_order_id and timestamp
- [ ] AC11: Unit tests cover HMAC verification (3+ test cases)
- [ ] AC12: Unit tests cover idempotency (duplicate webhook test)
- [ ] AC13: Integration test: mock webhook → actual invoice creation
- [ ] AC14: Error handling: malformed webhook returns 400 with explanation
- [ ] AC15: Webhook endpoint returns 200 OK within 500ms (async processing if longer)

### Secondary Criteria (Nice To Have)

- [ ] AC16: Sentry integration for error tracking (optional for Phase 1)
- [ ] AC17: Structured logging in JSON format
- [ ] AC18: Environment variable validation at startup

---

## Architecture & Design

### 3.1 High-Level Flow

```
POST /webhooks/shopify/order-paid
    ↓
1. Parse JSON
    ↓
2. Extract HMAC from X-Shopify-Hmac-SHA256 header
    ↓
3. Verify HMAC against request body using SHOPIFY_WEBHOOK_SECRET
    ├→ FAIL: Return 403, log security event
    ├→ PASS: Continue
    ↓
4. Extract X-Shopify-Webhook-Id (deduplication key)
    ↓
5. Check database: is webhook_id already processed?
    ├→ YES: Return 200 OK (idempotency)
    ├→ NO: Continue
    ↓
6. Parse order payload
    - shopify_order_id, customer email, total, line_items
    ↓
7. Create sync_state record: status = "processing"
    ↓
8. Async: Create/find contact in Sevdesk
    ↓
9. Async: Create invoice in Sevdesk
    ↓
10. Update sync_state: status = "completed", sevdesk_invoice_id = "..."
    ↓
Return 200 OK (to Shopify, immediately, before Sevdesk calls if async)
```

### 3.2 Error Paths

```
HMAC Verification Failed
    → Return 403 Forbidden
    → Log: security_event(failed_hmac, webhook_id)
    → Shopify retries automatic (8 attempts)

Order Parsing Failed (malformed)
    → Return 400 Bad Request
    → Log: parse_error(webhook_id, error_details)

Database Insert Failed
    → Return 202 Accepted (tell Shopify OK, but failed internally)
    → Log: database_error(webhook_id, sync_state)
    → Reconciliation will retry in next cycle

Sevdesk API Failed (contact creation)
    → Catch error, log, update sync_state: status = "failed"
    → Return 200 OK to Shopify (we tried)
    → Reconciliation will retry

Sevdesk API Failed (invoice creation)
    → Same as above: log, update sync_state, 200 OK

Duplicate Webhook (webhook_id already in database)
    → Check: is previous one completed?
      - YES: Return 200 OK (already processed, idempotency)
      - NO: Check if still processing (> 30s old)
        - YES: Return 202 Accepted (try again in 5s)
        - NO: Something wrong, log anomaly
```

---

## Implementation Tasks

### Task 1: Project Setup & Dependencies

**Description**: Initialize Node.js project with dependencies and TypeScript configuration.

**Checklist**:
- [ ] Create `src/` directory structure
- [ ] Initialize `package.json` with dependencies:
  - `express` (web server)
  - `@shopify/shopify-api` (Shopify SDK, though phase 1 may use direct REST)
  - `pg` (PostgreSQL client)
  - `dotenv` (environment variables)
  - `typescript` (type safety)
  - `ts-node` (TypeScript runner)
  - `jest` (testing)
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `.env.example` with required variables
- [ ] Add `.env` to `.gitignore`
- [ ] Create `src/index.ts` entry point
- [ ] Add `npm start` and `npm test` scripts

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `.env.example`
- `src/index.ts`

**Effort**: 1 hour

---

### Task 2: Express Server & Webhook Endpoint

**Description**: Set up Express server and webhook endpoint that listens for POST requests.

**Checklist**:
- [ ] Create `src/server.ts` with Express app
- [ ] Create `src/routes/webhooks.ts` with webhook route
- [ ] Implement `POST /webhooks/shopify/order-paid` endpoint
- [ ] Extract and log request headers
- [ ] Parse JSON body
- [ ] Return 200 OK response (placeholder, no processing yet)
- [ ] Error handler for invalid JSON (400 response)
- [ ] Server starts on port 3000
- [ ] Health check endpoint: `GET /health` returns 200

**Files to Create**:
- `src/server.ts`
- `src/routes/webhooks.ts`
- `src/middleware/errorHandler.ts`

**Testing**:
- Manual: `curl -X POST http://localhost:3000/webhooks/shopify/order-paid -d '{}' -H "Content-Type: application/json"`

**Effort**: 2 hours

---

### Task 3: HMAC Verification

**Description**: Implement HMAC-SHA256 signature verification for webhook security.

**Checklist**:
- [ ] Create `src/utils/hmacVerifier.ts`
- [ ] Function: `verifyHmac(requestBody: string, hmacHeader: string, secret: string): boolean`
  - Compute SHA256(secret, requestBody)
  - Compare with base64-decoded HMAC header
  - Return boolean
- [ ] Middleware: `verifyShopifyHmac()` that checks header and returns 403 if invalid
- [ ] Attach middleware to webhook route
- [ ] Test vector: Use Shopify's official test vectors for SHA256
- [ ] Log HMAC verification failures as security events

**Test Cases**:
- [ ] Valid HMAC passes verification
- [ ] Invalid HMAC fails verification
- [ ] Missing HMAC header fails verification
- [ ] Tampered request body fails verification (change one character)
- [ ] Case sensitivity: HMAC is base64, verify correct encoding

**Files to Create**:
- `src/utils/hmacVerifier.ts`
- `src/middleware/verifyHmac.ts`
- `src/utils/hmacVerifier.test.ts` (unit tests)

**Effort**: 3 hours (including unit tests)

---

### Task 4: PostgreSQL Database Schema & Migrations

**Description**: Create PostgreSQL schema for tracking sync state.

**Checklist**:
- [ ] Create `src/database/connection.ts` for pg connection pool
- [ ] Create `src/database/migrations/` directory
- [ ] Migration 001: `001_create_sync_state_table.sql`
  ```sql
  CREATE TABLE sync_state (
    id SERIAL PRIMARY KEY,
    shopify_order_id VARCHAR(50) NOT NULL UNIQUE,
    sevdesk_contact_id VARCHAR(50),
    sevdesk_invoice_id VARCHAR(50),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    webhook_id VARCHAR(50) NOT NULL UNIQUE
  );
  CREATE INDEX idx_sync_status ON sync_state(sync_status);
  CREATE INDEX idx_updated_at ON sync_state(updated_at);
  ```
- [ ] Create migration runner: `src/database/runMigrations.ts`
  - Read all SQL files from `migrations/` in order
  - Execute each once (idempotent via UNIQUE constraints)
- [ ] Environment variable: `DATABASE_URL`
- [ ] Connection pooling with 10 connections max
- [ ] Connection error handling

**Testing**:
- [ ] Create test database
- [ ] Run migrations, verify schema
- [ ] Verify unique constraints work

**Files to Create**:
- `src/database/connection.ts`
- `src/database/runMigrations.ts`
- `src/database/migrations/001_create_sync_state_table.sql`

**Effort**: 2 hours

---

### Task 5: Idempotency & Deduplication

**Description**: Prevent duplicate invoice creation for same order.

**Checklist**:
- [ ] Create `src/services/deduplication.ts`
- [ ] Function: `isWebhookProcessed(webhookId: string): boolean`
  - Query database: SELECT * FROM sync_state WHERE webhook_id = ?
  - Return true if found
- [ ] Function: `recordWebhookStart(webhookId: string, shopifyOrderId: string)`
  - INSERT into sync_state: webhook_id, shopify_order_id, status = 'processing'
  - Handle UNIQUE constraint violation (duplicate webhook_id)
- [ ] Middleware: Check webhook_id before processing
  - If already processed and completed: Return 200 OK
  - If already processing and < 30s old: Return 202 Accepted (try later)
  - If already processing and > 30s old: Log anomaly, retry

**Test Cases**:
- [ ] First webhook: webhook_id not in database, processing begins
- [ ] Duplicate webhook (same webhook_id): returns 200, no duplicate invoice
- [ ] Webhook for same order but different webhook_id: processed separately

**Files to Create**:
- `src/services/deduplication.ts`
- `src/middleware/checkIdempotency.ts`
- `src/services/deduplication.test.ts` (unit tests)

**Effort**: 2 hours

---

### Task 6: Order Parsing & Validation

**Description**: Extract and validate order data from webhook payload.

**Checklist**:
- [ ] Create `src/types/shopifyOrder.ts` with TypeScript interface
  ```typescript
  interface ShopifyOrder {
    id: string;
    order_number: number;
    email: string;
    total_price: string;
    currency: string;
    line_items: Array<{
      title: string;
      quantity: number;
      price: string;
    }>;
    created_at: string;
  }
  ```
- [ ] Create `src/services/orderParser.ts`
- [ ] Function: `parseOrder(payload: any): ShopifyOrder`
  - Extract required fields
  - Validate email format
  - Validate total_price is number > 0
  - Validate line_items is array
  - Return parsed object or throw ValidationError
- [ ] Function: `validateOrder(order: ShopifyOrder): void`
  - Throw if any required field missing
  - Throw if email invalid
  - Throw if price <= 0

**Test Cases**:
- [ ] Valid order parses successfully
- [ ] Missing email throws error
- [ ] Invalid email format throws error
- [ ] Missing line_items throws error
- [ ] Zero or negative price throws error
- [ ] Extra fields are ignored

**Files to Create**:
- `src/types/shopifyOrder.ts`
- `src/services/orderParser.ts`
- `src/services/orderParser.test.ts` (unit tests)

**Effort**: 2 hours

---

### Task 7: Sevdesk Contact & Invoice Creation

**Description**: Implement API calls to create/find contacts and invoices in Sevdesk.

**Checklist**:
- [ ] Create `src/clients/sevdesk.ts` (API client)
- [ ] Class: `SevdeskClient`
  - Constructor: takes SEVDESK_API_KEY
  - Method: `findOrCreateContact(email: string, firstName: string, lastName: string): Promise<{id: string}>`
    - Query: GET /Contact?email={email}
    - If found: return contact.id
    - If not found: POST /Contact with firstName, lastName, email
    - Return created contact.id
  - Method: `createInvoice(contactId: string, order: ShopifyOrder): Promise<{id: string}>`
    - POST /Invoice with:
      - contactId
      - invoice date (today)
      - due date (today + 14 days)
      - line items from order
      - total = order.total_price
    - Return invoice.id

- [ ] Error handling:
  - Shopify HTTP errors (429, 500) throw RetryableError
  - Sevdesk HTTP errors (429, 500) throw RetryableError
  - Sevdesk validation errors (missing field) throw ValidationError

- [ ] Logging: Every API call logged with timestamp, endpoint, response time

**Test Cases** (unit tests with mocked HTTP):
- [ ] Find existing contact: returns contact ID
- [ ] Create new contact: returns new contact ID
- [ ] Create invoice: returns invoice ID
- [ ] Sevdesk 429 rate limit: throws RetryableError
- [ ] Sevdesk 500 server error: throws RetryableError

**Files to Create**:
- `src/clients/sevdesk.ts`
- `src/types/sevdesk.ts` (TypeScript interfaces)
- `src/clients/sevdesk.test.ts` (unit tests with mocks)

**Effort**: 3 hours

---

### Task 8: Webhook Handler & State Machine

**Description**: Orchestrate webhook processing: parse → dedup → find contact → create invoice → update state.

**Checklist**:
- [ ] Create `src/handlers/webhookHandler.ts`
- [ ] Function: `handleOrderPaidWebhook(req: Request, res: Response)`
  1. Extract webhook_id from header
  2. Check if already processed (dedup service)
  3. Parse order from body (order parser)
  4. Record webhook start in database (status = "processing")
  5. Create/find contact in Sevdesk (sevdesk client)
  6. Create invoice in Sevdesk (sevdesk client)
  7. Update database: status = "completed", sevdesk_invoice_id
  8. Return 200 OK
  
  - Error paths:
    - Parse error: status = "failed", error_message, return 400
    - Sevdesk error: status = "failed", error_message, return 202 (will retry)
    - Database error: status = "failed", error_message, return 202
  
  - All operations logged
  - Retry count incremented on failure

- [ ] Try-catch wraps entire function
- [ ] All errors caught, logged, sync_state updated

**Integration Test**:
- [ ] Mock Shopify webhook payload
- [ ] Mock Sevdesk API responses
- [ ] Send webhook → verify invoice created in mock
- [ ] Verify database has correct sync_state record

**Files to Create**:
- `src/handlers/webhookHandler.ts`
- `src/handlers/webhookHandler.test.ts` (integration test)

**Effort**: 3 hours

---

### Task 9: Logging & Observability

**Description**: Structured logging for debugging and monitoring.

**Checklist**:
- [ ] Create `src/utils/logger.ts`
- [ ] Logger outputs JSON to stdout (for Uberspace log collection)
- [ ] Log levels: ERROR, WARN, INFO, DEBUG
- [ ] Every log includes: timestamp, level, event, context (webhook_id, order_id, etc.)
- [ ] Security: Never log customer email in plaintext, use hash or truncate
- [ ] Performance: Log processing time for webhook
- [ ] Webhook events logged:
  - `webhook_received` with webhook_id
  - `hmac_verified` or `hmac_failed`
  - `duplicate_detected` or `new_order`
  - `contact_found` or `contact_created`
  - `invoice_created` or `invoice_failed`
  - `webhook_completed` with total_time_ms
  - `webhook_failed` with error_message

**Files to Create**:
- `src/utils/logger.ts`

**Effort**: 1 hour

---

### Task 10: Unit & Integration Tests

**Description**: Comprehensive test coverage (60%+).

**Checklist**:
- [ ] HMAC verification tests (3+ cases) - already done in Task 3
- [ ] Deduplication tests (3+ cases) - already done in Task 5
- [ ] Order parsing tests (5+ cases) - already done in Task 6
- [ ] Sevdesk client tests (mocked, 5+ cases) - already done in Task 7
- [ ] Integration test: webhook → database → invoice (1 case)
  - Setup: mock Sevdesk, real database (test instance)
  - Send POST with valid webhook
  - Verify sync_state record created
  - Verify mock Sevdesk received invoice request
  
- [ ] Error scenario tests:
  - Malformed JSON (400)
  - Invalid HMAC (403)
  - Duplicate webhook (200)
  - Sevdesk API error (202)
  - Database error (202)

- [ ] Code coverage report: `npm run coverage`
  - Target: 60% overall coverage
  - Core logic: 80%+ (hmac, dedup, order parsing, handler)

**Files**:
- `src/**/*.test.ts` (test files alongside source)

**Effort**: 4 hours (included in earlier tasks)

---

### Task 11: Documentation & Setup Guide

**Description**: Document how to set up and test Phase 1.

**Checklist**:
- [ ] Create `docs/planning/PHASE1_SETUP.md`:
  - Prerequisites: Node.js 18+, PostgreSQL, Shopify custom app
  - Environment variables: copy `.env.example` to `.env`
  - Database setup: `npm run migrate`
  - Start server: `npm start`
  - Run tests: `npm test`
  - Manual testing: curl examples for webhook
  
- [ ] Create `docs/planning/PHASE1_DEPLOYMENT.md`:
  - Uberspace setup steps (deferred to Phase 3)
  - supervisord configuration (deferred to Phase 3)
  
- [ ] Create `docs/planning/PHASE1_TESTING.md`:
  - Unit test run instructions
  - Integration test with mock Sevdesk
  - Manual webhook test with ngrok (or Uberspace)

**Files to Create**:
- `docs/planning/PHASE1_SETUP.md`
- `docs/planning/PHASE1_TESTING.md`

**Effort**: 1 hour

---

## Dependencies & Blockers

### External Dependencies

1. **Shopify Custom App (Manual, ~30 min)**
   - Owner: User
   - Action: Create custom app in Shopify Admin
   - Deliverable: API Key and Webhook Secret
   - Deadline: Before Phase 1 testing

2. **Uberspace Account (Phase 3, not Phase 1 blocking)**
   - Owner: User
   - Action: Create account at uberspace.de
   - Cost: EUR 6-9/month
   - Deadline: Before Phase 3 deployment

### Internal Dependencies

- None between Phase 1 tasks; all can be done in parallel after Task 1 (setup)

### Blockers

- None currently; all prerequisites available

---

## Success Criteria & Testing

### Phase 1 Completion Checklist

- [ ] All 11 tasks completed and merged to develop branch
- [ ] Unit test coverage ≥ 60%
- [ ] Code review passed (linting, TypeScript strict mode)
- [ ] Integration test passes with mock Sevdesk
- [ ] Manual testing: webhook creates invoice in Sevdesk sandbox
- [ ] No uncommitted changes in git
- [ ] All documentation written
- [ ] Branch `feature/webhook-infrastructure` ready for merge

### Manual Testing Script

```bash
# 1. Start server
npm start

# 2. In another terminal, generate test webhook:
curl -X POST http://localhost:3000/webhooks/shopify/order-paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: base64-encoded-hmac-here" \
  -H "X-Shopify-Webhook-Id: test-webhook-123" \
  -d '{
    "id": "gid://shopify/Order/123",
    "order_number": 1001,
    "email": "customer@example.com",
    "total_price": "99.99",
    "currency": "EUR",
    "line_items": [
      {
        "title": "Test Product",
        "quantity": 1,
        "price": "99.99"
      }
    ]
  }'

# 3. Verify response: 200 OK

# 4. Check database:
psql $DATABASE_URL -c "SELECT * FROM sync_state WHERE shopify_order_id = 'gid://shopify/Order/123';"

# 5. Verify Sevdesk received request (check logs or mock)
```

---

## Effort Breakdown

| Task | Hours | Status |
|------|-------|--------|
| 1. Project Setup | 1 | Not Started |
| 2. Express Server | 2 | Not Started |
| 3. HMAC Verification | 3 | Not Started |
| 4. Database Schema | 2 | Not Started |
| 5. Deduplication | 2 | Not Started |
| 6. Order Parsing | 2 | Not Started |
| 7. Sevdesk Client | 3 | Not Started |
| 8. Webhook Handler | 3 | Not Started |
| 9. Logging | 1 | Not Started |
| 10. Testing | 4 | Not Started |
| 11. Documentation | 1 | Not Started |
| **Total** | **24 hours** | - |

**Actual Estimate**: 12 hours (aggressive) to 24 hours (comfortable)

---

## Handoff & Next Phase

### Phase 1 → Phase 2 Transition

When Phase 1 is complete:
1. Create pull request to develop branch
2. Code review by second pair of eyes
3. Merge when approved
4. Update memory bank with Phase 1 summary
5. Create Phase 2 plan: Reconciliation & Retry Logic

### Phase 2 Deliverables

- Reconciliation job (5-10 min polling)
- Retry logic with exponential backoff
- Circuit breaker for API failures
- Email sending integration
- Integration tests with sandbox APIs

---

## Code Quality Standards

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- All functions have type signatures
- All interfaces documented with JSDoc

### Testing

- Jest for unit tests
- Supertest for integration tests
- Mock all external APIs (Shopify, Sevdesk)
- Test both happy path and error cases
- Minimum 60% coverage

### Logging

- Structured JSON logging
- Never log sensitive data (emails, API keys)
- Every operation logged with context
- Errors include stack traces

### Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Atomic commits (one feature per commit)
- Branch: `feature/webhook-infrastructure`

---

## Approval

**Assigned to**: @backend-specialist

**Ready for**: Implementation

**Next Action**: Acknowledge acceptance and begin Task 1

---

**Plan Version**: 1.0  
**Created**: 2026-02-17  
**Updated**: 2026-02-17  
**Status**: Draft → Ready for Implementation
