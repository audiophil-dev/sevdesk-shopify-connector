# Research Synthesis: Shopify-Sevdesk Connector Architecture

**Date**: 2026-02-17
**Coordinator**: @research-coordinator
**Research Agents**: @technology-researcher (4 parallel tasks)
**Total Sources**: 40+ across all domains
**Confidence**: High

---

## Executive Summary

This synthesis combines findings from four comprehensive research tasks covering Shopify API capabilities, Sevdesk API capabilities, integration patterns, and technology stack recommendations. The research supports building a real-time order synchronization system between Shopify and Sevdesk with payment synchronization latency under 5 minutes and zero data loss.

**Key Recommendation**: Implement a webhook-first architecture using Node.js/TypeScript on AWS Lambda, with PostgreSQL for state tracking, AWS SQS for message queuing, and a hybrid approach combining real-time webhooks with periodic reconciliation for reliability.

**Estimated Monthly Cost**: $1-20 for small business deployment

---

## 1. Research Overview

### 1.1 Objective

Conduct comprehensive API research and integration pattern analysis to inform the technical architecture of a real-time order sync system between Shopify and Sevdesk.

### 1.2 Scope

| Dimension | Coverage |
|-----------|----------|
| **Domains** | Technology (APIs, patterns, stack) |
| **Depth** | Comprehensive |
| **Time Invested** | ~4 hours total (parallel execution) |
| **Deliverables** | 4 research documents + synthesis |

### 1.3 Research Tasks Completed

| Task | Agent | Output | Status |
|------|-------|--------|--------|
| R1 | @technology-researcher | shopify-api-research.md | Complete |
| R2 | @technology-researcher | sevdesk-api-research.md | Complete |
| R3 | @technology-researcher | integration-patterns.md | Complete |
| R4 | @technology-researcher | tech-stack-recommendation.md | Complete |

---

## 2. Integrated Findings

### 2.1 Shopify API Capabilities

**Webhooks**:
- Primary events: `orders/create`, `orders/paid`, `orders/updated`, `orders/cancelled`
- `orders/paid` webhook is optimal for payment synchronization (meets <5 min latency requirement)
- HMAC-SHA256 signature verification mandatory for security
- Automatic retry: 8 attempts over ~4 hours with exponential backoff
- 5-second timeout before retry; subscription auto-deleted after 8 failures
- Use `X-Shopify-Webhook-Id` header for idempotency

**Order Data Structure**:
- GraphQL Admin API is required (REST is legacy as of October 2024)
- Complete order object includes: financial status, customer info, addresses, line items with tax
- `financialStatus` field provides payment state (PENDING, AUTHORIZED, PAID, etc.)
- Default access limited to last 60 days of orders

**Rate Limits**:
- GraphQL: 100 points/second (standard), 1000 points/second (Plus)
- Single query limit: 1,000 points maximum
- Leaky bucket algorithm with restore rate

**Authentication**:
- OAuth 2.0 for public apps
- Required scopes: `read_orders`, `read_customers`, `read_transactions`, `read_refunds`
- `read_all_orders` requires Partner approval for access beyond 60 days

**Critical Limitation**: No direct API for sending transactional emails - requires third-party integration.

### 2.2 Sevdesk API Capabilities

**Invoice Creation**:
- Primary endpoint: `POST https://my.sevdesk.de/api/v1/Invoice`
- Contact must exist before invoice creation
- Line items require: name, quantity, unitPrice, taxRate
- Supports e-invoices (XRechnung/ZUGFeRD) via `propertyIsEInvoice: true`

**Authentication**:
- API key authentication only (no OAuth)
- Header format: `Authorization: api_key SEVDESK_API_KEY`
- February 2025: Older authentication method removed

**Rate Limits**:
- Pagination capped at 1000 records per request (effective May 2025)
- No explicit rate limit documented; implement exponential backoff

**Contact Management**:
- Must create/find contact by email before invoice creation
- Supports addresses, phone, email per contact

**German Accounting**:
- GoBD-compliant out of the box
- Supports all required invoice fields per German law
- E-invoice mandate compliant (XRechnung/ZUGFeRD)

**Document Types**:
- Invoice (RE), Advance (AR), Partial (TR), Final (ER), Credit Note (GU)

### 2.3 Integration Patterns

**Architecture Recommendation**: Webhook-first with polling fallback

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Webhook (primary) | Real-time sync | Subscribe to `orders/paid` |
| Polling (fallback) | Reconciliation | Every 5-10 minutes |
| Idempotency | Duplicate prevention | Use `X-Shopify-Webhook-Id` |
| Circuit Breaker | API protection | 5 failures threshold |
| Dead Letter Queue | Failed messages | Manual recovery |

**Retry Configuration**:
- Initial delay: 1 second
- Max delay: 30 seconds
- Multiplier: 2x
- Jitter: +/-20%
- Max retries: 5

**Reliability Requirements**:
- HMAC verification before any processing
- Queue-first pattern: persist to queue, return 200 OK immediately
- Database-level unique constraints for deduplication
- Outbox pattern for multi-step operations

### 2.4 Technology Stack

**Recommended Stack**:

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | Node.js + TypeScript | Best Shopify SDK (263K npm downloads), async handling |
| Deployment | AWS Lambda | 20-30% cost savings for variable workloads |
| Database | PostgreSQL (Supabase) | Free tier, ACID compliance, JSON support |
| Queue | AWS SQS | Native Lambda integration, built-in retry/DLQ |
| Monitoring | Prometheus + Grafana | Production-grade, ~$10/month |

**Alternative for Solo Developers**: Railway deployment with built-in PostgreSQL and Redis, simpler setup at $10-20/month.

---

## 3. Cross-Domain Analysis

### 3.1 Consensus Points

All research domains agree on:

1. **Webhook-first architecture**: Shopify webhooks provide the optimal real-time sync mechanism
2. **Idempotency is critical**: Use Shopify's webhook ID to prevent duplicate invoice creation
3. **Node.js is optimal**: Best SDK support for Shopify, excellent async handling for webhooks
4. **Database required**: For tracking sync state, idempotency, and audit logs
5. **Retry with backoff**: Essential for handling transient failures

### 3.2 Key Integration Points

| Shopify Output | Transformation | Sevdesk Input |
|----------------|----------------|----------------|
| order.id | Store as reference | Custom field |
| customer.email | Direct mapping | Contact.email |
| customer.name | Concatenate | Contact.name |
| billing_address | Direct mapping | Invoice.address |
| line_items | Transform | Invoice.positions |
| tax_lines | Calculate rate | Position.taxRate |
| financialStatus | Map to status | Invoice.status |

### 3.3 Critical Gaps Identified

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No Shopify email API | Cannot send invoice emails via Shopify | Use external service (SendGrid) |
| Sevdesk rate limits undocumented | May hit limits unexpectedly | Implement backoff, monitor |
| 60-day order limit | Cannot sync historical orders | Request `read_all_orders` scope |
| Webhook delivery not guaranteed | May miss orders | Polling reconciliation |

---

## 4. Architecture Recommendation

### 4.1 System Architecture

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    CONNECTOR SERVICE                        │
                                    │                                                             │
┌──────────────┐                    │  ┌─────────────┐    ┌─────────────┐    ┌───────────────┐  │
│              │  orders/paid       │  │             │    │             │    │               │  │
│   Shopify    │────────────────────┼──▶ Webhook    │───▶│  AWS SQS    │───▶│  Lambda       │  │
│   Store      │  webhook           │  │ Endpoint    │    │  Queue      │    │  Worker       │  │
│              │                    │  │ (Lambda)    │    │             │    │               │  │
└──────────────┘                    │  └──────┬──────┘    └──────┬──────┘    └───────┬───────┘  │
                                    │         │                  │                   │          │
                                    │         │                  │                   │          │
                                    │         ▼                  │                   ▼          │
                                    │  ┌─────────────┐           │           ┌───────────────┐  │
                                    │  │ HMAC        │           │           │ PostgreSQL    │  │
                                    │  │ Verify      │           │           │ (Supabase)    │  │
                                    │  └─────────────┘           │           │               │  │
                                    │                            │           │ - Sync state  │  │
                                    │                            │           │ - Idempotency │  │
                                    │                            │           │ - Audit logs  │  │
                                    │                            │           └───────────────┘  │
                                    │                            │                             │
                                    │                            │                             │
                                    │                            │                             │
┌──────────────┐                    │                            │                             │
│              │                    │                            │                             │
│   Sevdesk    │◀───────────────────┼────────────────────────────┼─────────────────────────────┤
│   API        │  POST /Invoice     │                            │                             │
│              │                    │                            │                             │
└──────────────┘                    │                            │                             │
                                    │  ┌─────────────┐           │                             │
                                    │  │ Circuit     │           │                             │
                                    │  │ Breaker     │           │                             │
                                    │  └─────────────┘           │                             │
                                    │                            │                             │
                                    │  ┌─────────────┐           │                             │
                                    │  │ Dead Letter │           │                             │
                                    │  │ Queue       │           │                             │
                                    │  └─────────────┘           │                             │
                                    │                            │                             │
                                    │  ┌─────────────┐           │                             │
                                    │  │ Reconciler  │◀──────────┘                             │
                                    │  │ (5-min job) │                                         │
                                    │  └─────────────┘                                         │
                                    │                                                            │
                                    └─────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

1. **Webhook Receipt**:
   - Shopify sends `orders/paid` webhook to Lambda endpoint
   - Lambda verifies HMAC-SHA256 signature
   - Lambda checks idempotency key (`X-Shopify-Webhook-Id`)
   - If new, persist to SQS and return 200 OK immediately

2. **Order Processing**:
   - Worker Lambda reads from SQS
   - Lookup/create Sevdesk contact by customer email
   - Map Shopify order to Sevdesk invoice format
   - Create invoice via Sevdesk API
   - Store sync state in PostgreSQL

3. **Error Handling**:
   - Transient errors: Retry with exponential backoff
   - Rate limiting: Circuit breaker opens
   - Permanent failures: Move to DLQ for manual review

4. **Reconciliation**:
   - Scheduled job runs every 5 minutes
   - Fetches recent Shopify orders
   - Compares with local sync state
   - Processes any missed orders

### 4.3 Database Schema

```sql
-- Sync state tracking
CREATE TABLE sync_state (
    id SERIAL PRIMARY KEY,
    shopify_order_id VARCHAR(255) UNIQUE NOT NULL,
    sevdesk_invoice_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Idempotency tracking
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY, -- X-Shopify-Webhook-Id
    shopify_order_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    response_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    shopify_order_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

1. Set up AWS Lambda + API Gateway
2. Configure PostgreSQL (Supabase)
3. Implement webhook endpoint with HMAC verification
4. Create database schema

### Phase 2: Order Processing (Week 2)

1. Implement SQS queue integration
2. Build Sevdesk API client
3. Create contact lookup/creation logic
4. Implement invoice creation flow

### Phase 3: Reliability (Week 3)

1. Add idempotency tracking
2. Implement retry with exponential backoff
3. Configure circuit breaker
4. Set up dead letter queue

### Phase 4: Monitoring & Reconciliation (Week 4)

1. Deploy Prometheus + Grafana
2. Create reconciliation job
3. Set up alerting
4. End-to-end testing

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Webhook delivery failure | Medium | High | Polling reconciliation |
| Sevdesk API rate limiting | Low | Medium | Circuit breaker + backoff |
| Duplicate invoice creation | Medium | High | Idempotency keys + DB constraints |
| Shopify API changes | Low | Medium | Version pinning, monitoring |
| Cold start latency | Medium | Low | Provisioned concurrency if needed |
| Data mapping errors | Medium | Medium | Validation + testing |

---

## 7. Cost Analysis

### Monthly Cost Estimate (Small Business)

| Component | AWS Lambda Stack | Railway Stack |
|-----------|-----------------|---------------|
| Compute | $0-5 | $5-10 |
| Database | $0 (Supabase free) | $5 (Railway) |
| Queue | $0-2 | $0-5 |
| Monitoring | $0-10 | $0 (Sentry free) |
| Domain/SSL | $1-3 | $1-3 |
| **Total** | **$1-20/month** | **$10-20/month** |

### Cost Drivers

- Order volume (Lambda invocations)
- Retry rate (SQS messages)
- Data retention (PostgreSQL storage)
- Monitoring granularity

---

## 8. Recommendations Summary

### Primary Recommendations

1. **Architecture**: Webhook-first with polling fallback for reliability
2. **Language**: Node.js with TypeScript for best Shopify SDK support
3. **Deployment**: AWS Lambda for cost efficiency at variable workloads
4. **Database**: PostgreSQL via Supabase for state tracking and idempotency
5. **Queue**: AWS SQS for reliable message processing with built-in retry
6. **Monitoring**: Prometheus + Grafana (or Sentry for simpler setup)

### Critical Success Factors

1. Always verify webhook HMAC signatures before processing
2. Use `X-Shopify-Webhook-Id` for idempotency to prevent duplicates
3. Implement reconciliation job to catch missed webhooks
4. Store all sync state for audit and recovery
5. Monitor DLQ depth and alert on failures

### Next Steps

1. Review individual research documents for detailed API specifications
2. Set up development environment with recommended stack
3. Implement Phase 1 (core infrastructure)
4. Test with Shopify development store
5. Deploy to production with monitoring

---

## 9. Appendix

### 9.1 Research Inputs

| Document | Key Contribution |
|----------|------------------|
| shopify-api-research.md | Webhook events, order structure, rate limits, authentication |
| sevdesk-api-research.md | Invoice creation, contact management, German accounting |
| integration-patterns.md | Reliability patterns, retry logic, idempotency |
| tech-stack-recommendation.md | Language, deployment, database, monitoring choices |

### 9.2 Key Source References

**Shopify**:
- [Shopify Webhooks Documentation](https://shopify.dev/docs/api/webhooks) - [5/5]
- [Shopify Order GraphQL Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/order) - [5/5]
- [Shopify API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits) - [5/5]

**Sevdesk**:
- [Sevdesk API Documentation](https://api.sevdesk.de/) - [5/5]
- [Sevdesk Tech Blog - Pagination Limits](https://tech.sevdesk.com/api_news/posts/2025_03_11-api_pagination_limits/) - [5/5]
- [Sevdesk Tech Blog - E-Invoice API](https://tech.sevdesk.com/api_news/posts/2024_11_15-einvoice_changes/) - [5/5]

**Integration Patterns**:
- [AWS Circuit Breaker Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html) - [5/5]
- [Hookdeck - Shopify Webhooks Guide](https://hookdeck.com/webhooks/platforms/definitive-guide-shopify-webhooks-https-hookdeck) - [5/5]

**Technology Stack**:
- [NPM - @shopify/shopify-api](https://www.npmjs.com/package/@shopify/shopify-api) - [5/5]
- [AWS SQS Documentation](https://aws.amazon.com/sqs/) - [5/5]
- [Supabase Documentation](https://supabase.com/docs) - [5/5]

---

**Synthesis completed**: 2026-02-17
**Total research time**: ~4 hours (parallel execution reduced wall-clock time to ~1 hour)
**Confidence Level**: High - Based on 40+ authoritative sources with cross-domain validation
