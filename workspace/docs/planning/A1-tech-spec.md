# Technical Specification: Shopify-Sevdesk Connector

**Document Type**: Technical Specification  
**Project**: sevdesk-shopify-connector  
**Date**: 2026-02-17  
**Status**: Ready for Implementation Planning  
**Revision**: 1.0

---

## Executive Summary

This specification defines the technical architecture for a real-time order and payment synchronization system between Shopify and Sevdesk. The system implements bidirectional data flow with payment confirmations via email, webhook-first architecture with polling fallback, and deployment on Uberspace for guaranteed availability.

**Key Characteristics**:
- Real-time order sync via Shopify webhooks (<5 min latency)
- Automatic Sevdesk invoice creation from Shopify orders
- Payment confirmation emails sent by Shopify
- Zero data loss through idempotency and duplicate detection
- Monthly cost: EUR 6-9 (hosting) + optional email service
- Development effort: 12-20 hours for core implementation

---

## 1. System Architecture

### 1.1 High-Level Data Flow

```
Shopify Store
    ↓ (webhook: orders/paid)
├→ Webhook Handler (Node.js Express)
│  ├→ HMAC Verification
│  ├→ Idempotency Check
│  └→ Message Queue (or direct processing)
    ↓
├→ Order Processor
│  ├→ Fetch complete order from Shopify GraphQL API
│  ├→ Create/Find contact in Sevdesk
│  ├→ Create invoice in Sevdesk
│  ├→ Track sync state in PostgreSQL
│  └→ Handle retries and circuit breaker
    ↓
├→ Sevdesk
    Invoice Created ✓
    
Polling Reconciliation (every 5-10 min)
├→ Query recent Shopify orders
├→ Compare with Sevdesk invoices
├→ Identify missing/failed syncs
└→ Retry with exponential backoff
```

### 1.2 Component Architecture

| Component | Technology | Purpose | Notes |
|-----------|-----------|---------|-------|
| **Web Server** | Node.js + Express | Webhook endpoint, HTTP handler | Single-threaded sufficient |
| **API Client** | @shopify/shopify-api | Shopify API calls (webhooks, orders) | Official SDK, 263K npm downloads |
| **API Client** | axios (or node-fetch) | Sevdesk API calls (invoices) | Sevdesk has no official SDK |
| **Database** | PostgreSQL 14+ | State tracking, sync log, dedup | Included with Uberspace |
| **Job Scheduler** | node-cron (or supervisord) | Reconciliation polling job | 5-10 min intervals |
| **Error Handling** | Sentry (free tier 5K/month) | Error tracking and alerting | Optional but recommended |
| **Deployment** | Uberspace (EUR 6-9/month) | Hosting platform | Always-on, Germany-based |
| **Process Manager** | supervisord | Ensure node app always running | Included with Uberspace |

### 1.3 Data Models

#### Order Record (from Shopify)
```json
{
  "shopify_order_id": "4920834957",
  "shop_id": "gid://shopify/Shop/12345",
  "order_number": "1001",
  "customer_email": "customer@example.com",
  "total": 99.99,
  "currency": "EUR",
  "financial_status": "PAID",
  "line_items": [
    {
      "title": "Product Name",
      "quantity": 1,
      "price": 99.99,
      "tax": 0.00
    }
  ],
  "created_at": "2026-02-17T10:00:00Z"
}
```

#### Sevdesk Invoice Record
```json
{
  "sevdesk_invoice_id": "2026-00001",
  "contact_id": "123456",
  "invoice_date": "2026-02-17",
  "due_date": "2026-03-17",
  "line_items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "unitPrice": 99.99,
      "taxRate": 0
    }
  ],
  "total_gross": 99.99,
  "total_net": 99.99,
  "currency": "EUR"
}
```

#### Sync State Record (PostgreSQL)
```sql
CREATE TABLE sync_state (
  id SERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(50) NOT NULL UNIQUE,
  sevdesk_contact_id VARCHAR(50),
  sevdesk_invoice_id VARCHAR(50),
  sync_status VARCHAR(20), -- pending, processing, completed, failed
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  webhook_id VARCHAR(50) -- X-Shopify-Webhook-Id for dedup
);
```

---

## 2. Integration Points

### 2.1 Shopify Integration

#### Webhook Subscription
- **Events to subscribe**: `orders/paid`
- **Endpoint**: `https://[uberspace-domain]/webhooks/shopify/order-paid`
- **Verification**: HMAC-SHA256 signature check mandatory
- **Deduplication**: Use `X-Shopify-Webhook-Id` header as unique constraint
- **Timeout tolerance**: Shopify times out at 5 seconds; return 200 OK immediately, process async

#### GraphQL Queries Required
1. Fetch complete order details (tax, discounts, full line items)
   - Scope: `read_orders`
   - Query returns: `orders.nodes[0]` with all financial details
   
2. Rate limit: 100 points/second (GraphQL leaky bucket)

#### OAuth Scopes (Custom App)
- `read_orders` - Read order data
- `read_customers` - Read customer email and addresses
- `read_transactions` - Read payment transaction status

### 2.2 Sevdesk Integration

#### Contact API
- **Endpoint**: `POST https://my.sevdesk.de/api/v1/Contact`
- **Authentication**: `Authorization: api_key {SEVDESK_API_KEY}`
- **Required fields**: email, firstname, lastname
- **Upsert logic**: Query by email first; create if not exists

#### Invoice API
- **Endpoint**: `POST https://my.sevdesk.de/api/v1/Invoice`
- **Required fields**: 
  - `objectName`: "Invoice"
  - `mapAll`: true
  - `invoice` object with date, dueDate, currency
  - Line items array
- **Response**: Returns invoice ID in response body
- **Pagination**: Max 1000 records per query

#### Invoice Status
- **Created status**: Initially "DRAFT"
- **Finalization**: Can call finalize endpoint to set to "COMPLETED"
- **Accounting**: Automatically posted to accounting module

### 2.3 Email Integration

**Challenge**: Shopify has no transactional email API; cannot send custom emails directly via Shopify API.

**Solution Options**:
1. **Option A (Recommended)**: Use SendGrid or similar
   - Send email directly from Sevdesk invoice event
   - Template: "Payment Received - Invoice {invoice_id}"
   - Cost: ~$0-20/month depending on volume

2. **Option B**: Manual email via Sevdesk
   - Admin must manually confirm in Sevdesk
   - Less automated, not recommended

**For Phase 1**: Skip email sending; implement placeholder. Add in Phase 2 with SendGrid integration.

---

## 3. Implementation Plan (Phases)

### Phase 1: Core Webhook Infrastructure (12 hours)

**Deliverables**:
- Webhook endpoint with HMAC verification
- Shopify custom app created and authenticated
- Basic order→invoice sync for single order
- PostgreSQL schema and migrations
- Unit tests for webhook validation

**No Phase 1 Deliverable**:
- Email sending (Phase 2)
- Reconciliation polling (Phase 2)
- Sentry monitoring (Phase 2)
- Production deployment (Phase 3)

### Phase 2: Reliability & Reconciliation (8 hours)

**Deliverables**:
- Reconciliation job (5-10 min polling)
- Retry logic with exponential backoff
- Circuit breaker pattern for API failures
- Dead letter queue for investigation
- Email sending via SendGrid or similar
- Integration tests with mock APIs

### Phase 3: Deployment & Operations (Variable)

**Deliverables**:
- Uberspace account setup
- supervisord configuration
- SSL certificate (via Let's Encrypt via Uberspace)
- Sentry integration for error tracking
- Documentation for manual operations

---

## 4. Technical Constraints & Decisions

### 4.1 Language & Framework

**Decision**: Node.js/TypeScript with Express.js

**Rationale**:
- Shopify SDK has 263K npm downloads and excellent TypeScript support
- Async/await native for handling webhooks and API calls
- Rapid development for solo developer

**Constraint**: Limited to 12-20 hours development time; must use existing libraries where possible.

### 4.2 Database

**Decision**: PostgreSQL (included with Uberspace)

**Rationale**:
- ACID compliance essential for sync state
- JSON support for flexible payload storage
- No additional cost (included with Uberspace)

**Schema Requirements**:
- Unique constraint on `shopify_order_id` to prevent duplicate invoice creation
- Index on `sync_status` for querying pending/failed
- Index on `updated_at` for reconciliation queries

### 4.3 Hosting

**Decision**: Uberspace (EUR 6-9/month)

**Rationale**:
- Railway has 15-22 second cold starts causing webhook failures
- Uberspace provides always-on servers with no cold starts
- Germany-based hosting (GDPR-friendly)
- Includes PostgreSQL, daily backups, and email (if needed)
- SSH access for debugging

**Constraint**: Manual deployment via SSH + supervisord; no automated git push deployment.

### 4.4 Deployment Method

**Decision**: Manual deployment via SSH + supervisord

**Deployment Steps**:
1. Clone repository on Uberspace
2. Install dependencies: `npm install --production`
3. Create `.env` file with Shopify API key, Sevdesk API key, database URL
4. Run migrations: `npm run migrate`
5. Create supervisord config to restart node app on crash
6. Test webhook endpoint manually

**Zero-Downtime Updates**:
- Update code on Uberspace
- Run migrations (if any)
- supervisord auto-restarts node app
- If critical bug: stop app, roll back to previous commit, restart

---

## 5. Error Handling & Resilience

### 5.1 Webhook Failures

| Scenario | Handling | Recovery |
|----------|----------|----------|
| Malformed webhook payload | Return 400, log to Sentry | Manual investigation |
| HMAC verification fails | Return 403, log security event | Shopify retries automatically |
| Database insert fails | Return 202 (accepted but failed), add to DLQ | Reconciliation picks it up |
| Sevdesk API times out | Return 202, add to retry queue | Reconciliation retries with backoff |
| Duplicate webhook (same webhook ID) | Check database unique constraint, return 200 | No duplicate created |

### 5.2 Polling Reconciliation Failures

| Scenario | Handling | Recovery |
|----------|----------|----------|
| Shopify API rate limit hit | Wait and retry with exponential backoff | Built-in retry logic |
| Sevdesk API returns 429 | Wait 60s, retry | Built-in retry logic |
| Query finds 1000+ unsynced orders | Batch in groups of 50 | Implement pagination |
| Network timeout | Log and continue to next reconciliation | Try again in 5-10 min |

### 5.3 Circuit Breaker Pattern

```
Normal: 0 failures → Happy path
        ↓
Warning: 3 failures → Log and continue (Shopify may be slow)
        ↓
Open: 5 failures → Skip Sevdesk API calls for 30 seconds, return 202 immediately
        ↓
Recovery: 30s timer expires → Half-open state, retry 1 call
        ↓
Success: call succeeds → Reset to Normal
Failure: call fails → Back to Open for another 30s
```

---

## 6. Monitoring & Observability

### 6.1 Key Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Webhook latency (ms) | < 500ms from receive to process start | Express middleware timer |
| Invoice creation latency | < 2s (avg) | Database query timing |
| Sync success rate | > 99% | Sentry error rate |
| Duplicate prevention | 100% (0 duplicates) | Database constraint violations |
| Reconciliation runtime | < 30s per cycle | cron job logging |

### 6.2 Alerting (via Sentry free tier)

- HMAC verification failures (security)
- Database constraint violations (duplicates)
- Sevdesk API 5xx errors (service down)
- Circuit breaker trips (API degradation)
- Unhandled exceptions (bugs)

### 6.3 Logging

```javascript
// Every important operation logs:
logger.info({
  event: "order_sync_start",
  shopify_order_id: "123",
  timestamp: new Date(),
  retry_count: 0
});

logger.error({
  event: "sevdesk_api_failed",
  error: "429 Too Many Requests",
  shopify_order_id: "123",
  retry_in_seconds: 30
});
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (60% coverage target)

- HMAC signature verification
- Order parsing and validation
- Idempotency key deduplication
- Retry logic and exponential backoff
- Circuit breaker state transitions
- Error handling for each API integration point

### 7.2 Integration Tests (20% coverage target)

- Mock Shopify webhook → actual Sevdesk invoice creation
- Mock Sevdesk rate limiting → retry logic
- Database constraint violation handling
- Reconciliation job finding and retrying failed syncs

### 7.3 Manual Testing

- Create test order in Shopify sandbox
- Receive webhook, verify in database
- Verify invoice created in Sevdesk sandbox
- Manually trigger reconciliation, verify idempotency
- Test error scenarios: disconnect Sevdesk API, trigger circuit breaker

---

## 8. Security Considerations

### 8.1 API Authentication

- **Shopify**: Custom app with minimal scopes (read_orders, read_customers)
  - Token: Stored in environment variable `SHOPIFY_API_KEY`
  - Rotation: Manual; create new token when needed
  
- **Sevdesk**: API key
  - Token: Stored in environment variable `SEVDESK_API_KEY`
  - Rotation: Via Sevdesk dashboard

### 8.2 Webhook Security

- **HMAC verification**: Mandatory for all incoming webhooks
  - Algorithm: SHA256
  - Header: `X-Shopify-Hmac-SHA256`
  - Secret: Environment variable `SHOPIFY_WEBHOOK_SECRET`

### 8.3 Data Protection

- **Customer emails**: Treated as personal data per GDPR
  - Not logged or exposed in errors
  - Stored only as needed for invoice creation
  - Database: Password-protected on Uberspace
  
- **API keys**: Never committed to git
  - Stored in `.env` on Uberspace only
  - `.env` in `.gitignore`

### 8.4 Communication

- All API communication: HTTPS only
- Self-signed certificates rejected (trust public CAs)
- Certificate validation mandatory in all HTTP clients

---

## 9. Deployment Architecture

### 9.1 Uberspace Setup

```
Uberspace (EUR 6-9/month)
├── Web Root: /var/www/sevdesk-shopify-connector
├── PostgreSQL: Included, auto-started
├── Node.js: v18+ (via nvm or system)
├── Process Manager: supervisord (auto-started)
│   └── nodejs app (restarts on crash)
├── SSL: Let's Encrypt (managed by Uberspace)
├── Backups: Daily automated
└── Cron/Timers: supervisord + node-cron for jobs
```

### 9.2 Environment Variables Required

```bash
# .env (not in git)
SHOPIFY_API_KEY=your_key
SHOPIFY_WEBHOOK_SECRET=your_secret
SEVDESK_API_KEY=your_key

DATABASE_URL=postgresql://user:pass@localhost/sevdesk_sync
NODE_ENV=production
PORT=3000

# Optional
SENTRY_DSN=https://...
SENDGRID_API_KEY=your_key (Phase 2)
```

### 9.3 Startup Process

1. supervisord starts on Uberspace boot
2. supervisord reads config: `/etc/supervisor/conf.d/sevdesk-sync.conf`
3. Config specifies: `node /var/www/sevdesk-shopify-connector/src/index.js`
4. If node crashes, supervisord restarts it within 10 seconds
5. Express server listens on port 3000
6. Uberspace web server (Apache/nginx) proxies to port 3000

---

## 10. Success Criteria

### 10.1 Phase 1 Completion

- [ ] Webhook endpoint receives Shopify orders/paid events
- [ ] HMAC verification passes all test cases
- [ ] Single order creates invoice in Sevdesk
- [ ] No duplicate invoices created for same order
- [ ] Unit test coverage ≥ 60%
- [ ] Database schema created and tested
- [ ] Error handling catches and logs all failure modes

### 10.2 System Maturity (Phase 2+)

- [ ] Sync success rate ≥ 99%
- [ ] Zero data loss or duplicates across 1000+ orders
- [ ] Latency: <5 minutes from payment to Sevdesk
- [ ] Email confirmations sent reliably (Phase 2)
- [ ] Manual recovery process documented and tested
- [ ] Sentry alerting configured and responsive

---

## 11. Known Limitations & Future Work

### 11.1 Current Limitations

1. **Email API**: Shopify has no transactional email API; email sending deferred to Phase 2
2. **Order History**: Shopify GraphQL limited to 60 days; full sync requires Partner approval
3. **Testing**: Phase 1 uses mock APIs; sandbox testing added in Phase 2
4. **Scaling**: Single-server deployment suitable for <5000 orders/month
5. **UI/Admin Console**: No admin interface; all config via environment variables

### 11.2 Future Enhancements (not in scope)

- Web dashboard to monitor sync status
- Manual retry interface for failed orders
- Multi-store support
- Convert to public Shopify app for app store distribution
- Kubernetes deployment for high-volume scaling
- Webhook delivery guarantees (currently fire-and-forget)

---

## 12. References

### 12.1 API Documentation

- [Shopify GraphQL Admin API](https://shopify.dev/docs/admin-api/graphql)
- [Shopify Webhooks](https://shopify.dev/docs/admin-api/rest/reference/events/webhook)
- [Shopify Custom Apps](https://shopify.dev/docs/apps/custom-apps)
- [Sevdesk API Documentation](https://docs.sevdesk.de/en-EN/doc/tutorials/overview)
- [@shopify/shopify-api npm](https://www.npmjs.com/package/@shopify/shopify-api)

### 12.2 Technical References

- [HMAC-SHA256 Verification](https://shopify.dev/docs/admin-api/rest/reference/events/webhook#verify-webhook)
- [PostgreSQL Unique Constraints](https://www.postgresql.org/docs/14/ddl-constraints.html)
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Node.js Error Handling](https://nodejs.org/en/docs/guides/nodejs-error-handling/)

### 12.3 Research Documents

- `docs/knowledge/technical/shopify-api-research.md` - Shopify API capabilities
- `docs/knowledge/technical/sevdesk-api-research.md` - Sevdesk API capabilities
- `docs/knowledge/technical/integration-patterns.md` - Integration architecture patterns
- `docs/knowledge/technical/tech-stack-recommendation.md` - Technology selection rationale

---

## Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | AI Assistant | 2026-02-17 | ✓ Draft |
| Technical Review | (Pending) | - | - |
| Product Owner | (Pending) | - | - |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-17 22:10:00  
**Next Review**: After Phase 1 completion
