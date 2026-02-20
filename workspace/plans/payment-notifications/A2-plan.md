# Implementation Plan: Project Foundation

**Plan Type**: Implementation  
**Assigned to**: @backend-specialist  
**Branch**: feature/payment-notifications  
**Ticket**: payment-notifications  
**Date**: 2026-02-20  
**Status**: Ready for Implementation  
**Revision**: 1.0  
**Dependencies**: A0-prerequisites.md (user must complete first)

---

## Executive Summary

This plan establishes the project foundation: Node.js/TypeScript setup, Express server, PostgreSQL database, and the core polling mechanism that checks Sevdesk for payment status. This is the infrastructure layer that subsequent plans build upon.

**Deliverables**:
- Working Node.js/TypeScript project
- Express server with health check
- PostgreSQL database with schema
- Sevdesk API client (read-only)
- Polling job that queries Sevdesk for paid invoices

**Effort Estimate**: 4-5 hours  
**Blockers**: None (after A0-prerequisites complete)

---

## Acceptance Criteria

- [ ] AC1: `npm install` succeeds without errors
- [ ] AC2: `npm run dev` starts server on port 3000
- [ ] AC3: `GET /health` returns 200 OK
- [ ] AC4: PostgreSQL tables created: `sync_state`, `notification_history`
- [ ] AC5: Sevdesk API client can fetch invoices
- [ ] AC6: Polling job runs every 60 seconds (configurable)
- [ ] AC7: Polling job logs paid invoices found in Sevdesk
- [ ] AC8: TypeScript strict mode enabled, no compilation errors
- [ ] AC9: `.env.example` created with all required variables

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

### Task 4: Sevdesk API Client (1 hour)

**Description**: Create client to fetch invoice data from Sevdesk.

**Checklist**:
- [ ] Create `src/types/sevdesk.ts` with TypeScript interfaces
- [ ] Create `src/clients/sevdesk.ts` with `SevdeskClient` class
- [ ] Implement methods:
  - `getInvoice(invoiceId: string): Promise<SevdeskInvoice>`
  - `getPaidInvoices(since?: Date): Promise<SevdeskInvoice[]>`
  - `getInvoiceContact(invoiceId: string): Promise<SevdeskContact>`
- [ ] Add error handling for API failures
- [ ] Add request logging

**Types**:
```typescript
interface SevdeskInvoice {
  id: string;
  invoiceNumber: string;
  status: string; // "paid", "unpaid", "overdue"
  total: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  contactId: string;
}

interface SevdeskContact {
  id: string;
  email: string;
  name: string;
}
```

**Files to Create**:
- `src/types/sevdesk.ts`
- `src/clients/sevdesk.ts`
- `src/clients/sevdesk.test.ts`

**Testing**:
```bash
# Manual test with real API
curl -H "Authorization: api_key YOUR_KEY" https://my.sevdesk.de/api/v1/Invoice
```

---

### Task 5: Polling Job (1 hour)

**Description**: Create polling mechanism that checks Sevdesk for paid invoices.

**Checklist**:
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

| Task | Time | Status |
|------|------|--------|
| 1. Project Initialization | 30 min | Not Started |
| 2. Express Server | 45 min | Not Started |
| 3. Database Schema | 45 min | Not Started |
| 4. Sevdesk API Client | 1 hour | Not Started |
| 5. Polling Job | 1 hour | Not Started |
| **Total** | **4-5 hours** | - |

---

## Success Criteria

After completing this plan:
- [ ] Server runs locally without errors
- [ ] Database tables exist
- [ ] Can fetch invoices from Sevdesk API
- [ ] Polling job runs and logs paid invoices
- [ ] Ready for A3-plan.md (Shopify integration)

---

## Next Plan

**A3-plan.md**: Shopify Integration
- Shopify GraphQL client
- Order lookup by customer email
- Order status update
- Email triggering

---

**Plan Version**: 1.0  
**Created**: 2026-02-20
