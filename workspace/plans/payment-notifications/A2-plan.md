# Implementation Plan: Project Foundation

**Plan Type**: Implementation  
**Assigned to**: @backend-specialist  
**Branch**: feature/payment-notifications  
**Ticket**: payment-notifications  
**Date**: 2026-02-20  
**Status**: Ready for Implementation (partial - Shopify first)  
**Revision**: 1.1  
**Dependencies**: A0-prerequisites.md Phase 1A (Shopify credentials ready)

---

## Executive Summary

This plan establishes the project foundation: Node.js/TypeScript setup, Express server, PostgreSQL database, and Shopify integration. **Sevdesk integration is deferred** until API access is available.

**Deliverables**:
- Working Node.js/TypeScript project
- Express server with health check
- PostgreSQL database with schema
- Shopify GraphQL client (client credentials grant)
- Order lookup and update functionality

**Effort Estimate**: 3-4 hours (Shopify portion)  
**Blockers**: Sevdesk API access pending (plan change needed)

---

## Acceptance Criteria

### Can Complete Now (Shopify)
- [ ] AC1: `npm install` succeeds without errors
- [ ] AC2: `npm run dev` starts server on port 3000
- [ ] AC3: `GET /health` returns 200 OK
- [ ] AC4: PostgreSQL tables created: `sync_state`, `notification_history`
- [ ] AC5: Shopify token acquisition works (client credentials grant)
- [ ] AC6: Shopify GraphQL client can query orders
- [ ] AC7: TypeScript strict mode enabled, no compilation errors
- [ ] AC8: `.env.example` created with all required variables

### Deferred (Sevdesk - Blocked)
- [ ] AC9: Sevdesk API client can fetch invoices
- [ ] AC10: Polling job runs every 60 seconds
- [ ] AC11: Polling job logs paid invoices found in Sevdesk

---

## Implementation Tasks

### Task 1: Project Initialization (30 min)

**Description**: Set up Node.js project with TypeScript.

**Checklist**:
- [ ] Initialize `package.json` with `npm init -y`
- [ ] Install dependencies:
  ```bash
  npm install express pg dotenv
  npm install -D typescript ts-node @types/node @types/express @types/pg jest @types/jest ts-jest
  ```
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create directory structure:
  ```
  src/
  ├── index.ts
  ├── server.ts
  ├── config/
  ├── database/
  ├── clients/
  │   └── shopify.ts
  ├── services/
  ├── types/
  └── utils/
  ```
- [ ] Add npm scripts: `dev`, `build`, `start`, `test`
- [ ] Create `.env.example`
- [ ] Add `.env` to `.gitignore`

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.gitignore`
- `src/index.ts`

---

### Task 2: Express Server (45 min)

**Description**: Create basic Express server with health endpoint.

**Checklist**:
- [ ] Create `src/server.ts` with Express app
- [ ] Implement `GET /health` endpoint returning `{ status: "ok", timestamp: ISO }`
- [ ] Create `src/index.ts` that starts server on configured port
- [ ] Load environment variables with dotenv
- [ ] Add error handling middleware
- [ ] Server logs startup message with port

**Files to Create**:
- `src/server.ts`
- `src/index.ts`
- `src/middleware/errorHandler.ts`

**Testing**:
```bash
npm run dev
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2026-02-20T..."}
```

---

### Task 3: Database Schema (45 min)

**Description**: Create PostgreSQL schema for tracking.

**Checklist**:
- [ ] Create `src/database/connection.ts` with connection pool
- [ ] Create migration SQL files:
  - `001_create_notification_history.sql`
  - `002_create_sync_state.sql` (optional, for Shopify→Sevdesk later)
- [ ] Create `src/database/migrate.ts` to run migrations
- [ ] Add `npm run migrate` script

**Schema**:
```sql
-- notification_history: Track all customer notifications
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  sevdesk_invoice_id VARCHAR(50) NOT NULL,
  notification_type VARCHAR(30) NOT NULL, -- 'payment_received', 'payment_overdue'
  customer_email VARCHAR(255) NOT NULL,
  shopify_order_id VARCHAR(50),
  sent_at TIMESTAMP DEFAULT NOW(),
  shopify_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT
);

CREATE INDEX idx_notification_invoice ON notification_history(sevdesk_invoice_id);
CREATE INDEX idx_notification_status ON notification_history(status);
CREATE INDEX idx_notification_type ON notification_history(notification_type);

-- sync_state: Track Shopify→Sevdesk sync (Phase 2)
CREATE TABLE sync_state (
  id SERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(50) NOT NULL UNIQUE,
  sevdesk_invoice_id VARCHAR(50),
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Files to Create**:
- `src/database/connection.ts`
- `src/database/migrate.ts`
- `src/database/migrations/001_create_notification_history.sql`
- `src/database/migrations/002_create_sync_state.sql`

**Testing**:
```bash
npm run migrate
psql $DATABASE_URL -c "\dt"
# Should show notification_history and sync_state tables
```

---

### Task 4: Shopify GraphQL Client (1 hour)

**Description**: Create client for Shopify Admin GraphQL API using client credentials grant.

**Checklist**:
- [ ] Create `src/types/shopify.ts` with TypeScript interfaces
- [ ] Create `src/clients/shopify.ts` with `ShopifyClient` class
- [ ] Implement token acquisition:
  ```typescript
  async function getAccessToken(): Promise<string> {
    // POST to /admin/oauth/access_token
    // Cache token, refresh before 24h expiry
  }
  ```
- [ ] Implement GraphQL request helper:
  ```typescript
  async graphql<T>(query: string, variables?: object): Promise<T>
  ```
- [ ] Add authentication header: `X-Shopify-Access-Token`
- [ ] Add error handling for GraphQL errors
- [ ] Add request/response logging

**Types**:
```typescript
interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  displayFinancialStatus: string;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
}

interface ShopifyGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}
```

**Files to Create**:
- `src/types/shopify.ts`
- `src/clients/shopify.ts`
- `src/clients/shopify.test.ts`

**Testing**:
```bash
# Test token acquisition
npm run dev
# Check logs for: "Shopify token acquired, expires in 86399 seconds"

# Test GraphQL query
# Should be able to query shop name
```

---

### Task 5: Polling Job (DEFERRED - Sevdesk Blocked)

**Status**: Cannot implement until Sevdesk API access is available.

**Description**: Create polling mechanism that checks Sevdesk for paid invoices.

**Checklist** (when unblocked):
- [ ] Create `src/services/poller.ts`
- [ ] Implement `startPolling()` function:
  - Runs on configurable interval (default: 60 seconds)
  - Calls `SevdeskClient.getPaidInvoices(sinceLastCheck)`
  - Logs each paid invoice found
  - Stores last check timestamp
- [ ] Create `src/services/processor.ts` (placeholder for now):
  - `processPaidInvoice(invoice: SevdeskInvoice)` - logs only
- [ ] Add polling start to `src/index.ts`
- [ ] Make polling optional via `ENABLE_POLLING=true` env var

**Files to Create**:
- `src/services/poller.ts`
- `src/services/processor.ts`
- `src/types/config.ts`

**Testing**:
```bash
npm run dev
# Watch logs for:
# [poller] Checking for paid invoices since 2026-02-20T10:00:00Z
# [poller] Found 2 paid invoices
# [processor] Processing invoice INV-2026-001 for customer@example.com
```

---

## Effort Breakdown

| Task | Time | Status | Blocked? |
|------|------|--------|----------|
| 1. Project Initialization | 30 min | Not Started | No |
| 2. Express Server | 45 min | Not Started | No |
| 3. Database Schema | 45 min | Not Started | No |
| 4. Shopify GraphQL Client | 1 hour | Not Started | No |
| 5. Polling Job | 1 hour | Deferred | **Yes (Sevdesk)** |
| **Total (Shopify)** | **3-4 hours** | - | - |

---

## Success Criteria

### After Shopify Portion (Can Complete Now)
- [ ] Server runs locally without errors
- [ ] Database tables exist
- [ ] Can acquire Shopify access token via client credentials
- [ ] Can query Shopify GraphQL API
- [ ] Ready for A3-plan.md (Shopify order operations)

### After Sevdesk Unblocked (Later)
- [ ] Can fetch invoices from Sevdesk API
- [ ] Polling job runs and logs paid invoices

---

## Next Plan

**A3-plan.md**: Shopify Order Operations
- Order lookup by customer email
- Order status update to "paid"
- Email triggering

**Note**: A3-plan.md can be started immediately after A2 Shopify portion is complete.

---

**Plan Version**: 1.1  
**Created**: 2026-02-20  
**Updated**: 2026-02-20 (added Shopify client, deferred Sevdesk)
