# System Patterns: Coding Standards & Architecture

# System Patterns: Coding Standards & Architecture

## Project Structure

```
workspace/
├── memory/                 # Agent context (persistent across sessions)
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md   (this file)
│   ├── decisionLog.md
│   ├── progress.md
│   └── taskRegistry.md     (git-ignored)
├── docs/                   # All project documentation
│   ├── global/             # Symlink → ~/.config/opencode/workspace/docs/global
│   ├── knowledge/          # Stable reference material (low volatility)
│   │   ├── market/         # Market research, Sevdesk ecosystem
│   │   ├── business/       # Business model, pricing
│   │   ├── technical/      # API research, technical deep-dives
│   │   └── research/       # Raw data, research artifacts
│   ├── planning/           # Active plans and strategy (medium volatility)
│   │   └── integration-architecture-spec.md  # Shopify-Sevdesk integration design
│   └── tracking/           # Progress tracking (high volatility)
│       ├── timeline.md
│       ├── milestones.md
│       └── sprints/
└── scripts/                # Utility scripts
    └── global/             # Symlink → ~/.config/opencode/scripts/global
```

**OpenCode Integration**:
- `AGENTS.md` → symlink to ~/.config/opencode/AGENTS.md
- `.github/agents/` → symlink to ~/.config/opencode/.github/agents
- `.github/chatmodes/` → symlink to ~/.config/opencode/.github/chatmodes
- `.github/prompts/` → symlink to ~/.config/opencode/.github/prompts

## Document Ownership

| Document | Owner | Purpose |
|----------|-------|---------|
| `docs/knowledge/technical/shopify-api-research.md` | @technology-researcher | Shopify API capabilities |
| `docs/knowledge/technical/sevdesk-api-research.md` | @technology-researcher | Sevdesk API documentation |
| `workspace/docs/planning/integration-architecture-spec.md` | @software-architect | Architecture decisions |
| `workspace/docs/tracking/timeline.md` | @planning-collaborator | Development timeline |

## Architecture Overview

**Technology Stack** (from research synthesis):
- **Language**: Node.js with TypeScript
- **Framework**: Express.js
- **Deployment**: Railway (simple) or AWS Lambda (cost-efficient)
- **Database**: PostgreSQL (Supabase or Railway)
- **Queue**: AWS SQS or BullMQ+Redis
- **Monitoring**: Sentry
- **Email**: External service (SendGrid/Mailgun)

**Key Architecture Decision**: Webhook-first with polling fallback
- Primary: Shopify `orders/paid` webhooks for real-time sync (<5 min latency)
- Fallback: Polling reconciliation every 5-10 minutes for missed orders
- Idempotency: Use `X-Shopify-Webhook-Id` header to prevent duplicates

## Integration Architecture

**Core Flow**:
1. Shopify sends `orders/paid` webhook to connector endpoint
2. Verify HMAC-SHA256 signature, check idempotency
3. Enqueue to message queue, return 200 OK
4. Worker processes order, creates Sevdesk invoice
5. Store sync state in PostgreSQL
6. Send payment confirmation via external email service

**Key Components**:
- Webhook endpoint (HMAC verification, idempotency check)
- Message queue (SQS or BullMQ+Redis)
- Order processor (transform, create invoice)
- Circuit breaker (protect Sevdesk API)
- Dead letter queue (failed messages)
- Reconciliation job (polling fallback)

**Critical Limitation**: Shopify has NO email API. Must use external service (SendGrid, Mailgun, AWS SES).

## Key Patterns

### Error Handling
- Transient errors: Retry with exponential backoff (1s, 2s, 4s, 8s, 16s with jitter)
- Rate limiting: Circuit breaker (5 failures threshold, 60s timeout)
- Permanent failures: Move to dead letter queue for manual review
- Error classification: Retryable (5xx, 429, timeout) vs non-retryable (400, 401, 403, 422)

### Logging
- **Framework**: Winston or Pino (structured JSON logging)
- **Log levels**: debug, info, warn, error
- **Fields**: timestamp, correlationId, shopifyOrderId, sevdeskInvoiceId, status
- **Retention**: 30 days in database, 7 days in application logs

### Testing
- **Framework**: Jest + Supertest
- **Patterns**: 
  - Unit: Mock Shopify/Sevdesk APIs
  - Integration: Test webhook flow end-to-end
  - E2E: Test against Shopify dev store
- **Coverage**: 80%+ required
- **Mocking**: Use nock for HTTP mocking

### Idempotency
- **Key**: `X-Shopify-Webhook-Id` header from Shopify
- **Storage**: PostgreSQL `idempotency_keys` table
- **Status flow**: pending -> processing -> completed/failed
- **TTL**: 30 days retention
- **Database constraint**: UNIQUE on shopify_order_id

### Retry Pattern
```typescript
const retryConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: 0.2
};
```

### Circuit Breaker
```typescript
const circuitBreakerConfig = {
  failureThreshold: 5,
  timeout: 60000,
  halfOpenRequests: 1
};
```

## Framework-Specific Patterns

### Express.js + TypeScript
- Use Zod for request validation
- Use async handler wrapper for error catching
- Middleware pattern: auth -> validation -> handler
- Route organization by domain (webhooks, health, admin)

## Performance Patterns
- Queue-first: Accept webhook, enqueue, return immediately (<5s)
- Batch Sevdesk API calls when possible
- Cache contact lookups (1 hour TTL)
- Connection pooling for PostgreSQL

## Security Patterns
- **Webhook verification**: HMAC-SHA256 signature validation
- **API keys**: Store in environment, never in code
- **HTTPS**: Required for all endpoints
- **Timing-safe comparison**: Prevent timing attacks on signature
- **Rate limiting**: Protect webhook endpoint from abuse

---

**Last Updated**: 2026-02-17 19:15:00 (architecture decisions from research synthesis)
