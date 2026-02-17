# Decision Log: Architecture & Decisions

## Format
```
[YYYY-MM-DD HH:MM:SS] - [Decision Title]
**Rationale**: Why this decision was made
**Impact**: Consequences of this decision
**Alternatives Considered**: What other options were explored
**Status**: Active | Superseded | Deprecated
```

## Decisions

### Architecture Decisions from Research (2026-02-17)

[2026-02-17 19:15] - Use Webhook-First Architecture with Polling Fallback
**Rationale**: Shopify webhooks provide real-time sync (<5 min latency) but are not guaranteed. Polling reconciliation every 5-10 minutes ensures no missed orders.
**Impact**: Requires webhook endpoint, message queue, and scheduled reconciliation job.
**Alternatives Considered**: Polling-only (too slow), webhook-only (may miss orders)
**Status**: Active

[2026-02-17 19:15] - Use Node.js/TypeScript with Express.js
**Rationale**: Official Shopify SDK (`@shopify/shopify-api`) has 263K npm downloads, best-in-class TypeScript support, excellent async handling for webhooks.
**Impact**: Team needs Node.js expertise; limited Sevdesk SDK support (use direct REST API).
**Alternatives Considered**: Python (worse Shopify SDK), Go (steeper learning curve)
**Status**: Active

[2026-02-17 19:15] - Use Railway for Deployment (Primary) or AWS Lambda (Alternative)
**Rationale**: Railway offers simplicity for solo developers ($10-20/month); Lambda offers cost efficiency at scale ($1-17/month). Both valid choices.
**Impact**: Railway simpler setup, Lambda cheaper at scale.
**Alternatives Considered**: Heroku (expensive), VPS (more maintenance)
**Status**: Active

[2026-02-17 19:15] - Use PostgreSQL for State Tracking
**Rationale**: ACID compliance essential for sync state, JSON support for flexible payload storage, managed options available (Supabase, Railway).
**Impact**: Requires database setup and migrations.
**Alternatives Considered**: SQLite (not suitable for production), Redis (no ACID)
**Status**: Active

[2026-02-17 19:15] - Use Sentry for Monitoring
**Rationale**: 5K errors/month free tier, minutes to set up, automatic error grouping, no infrastructure to manage.
**Impact**: Limited to error tracking; custom metrics require Prometheus/Grafana.
**Alternatives Considered**: Prometheus+Grafana (more complex), Datadog (expensive)
**Status**: Active

[2026-02-17 19:15] - Use External Email Service for Payment Confirmations
**Rationale**: Shopify does not provide an API for sending custom transactional emails. External service required.
**Impact**: Additional integration complexity, separate cost.
**Alternatives Considered**: None viable - Shopify has no email API
**Status**: Active

### Example Decision Entry
[2026-02-17 18:12:37] - Use OpenCode for AI-assisted development
**Rationale**: Standardize AI agent workflows and maintain context across sessions
**Impact**: Improved code quality, consistent patterns, better documentation
**Alternatives Considered**: Manual development, other AI tools
**Status**: Active

---

[Add architectural decisions here as they are made]

---

**Last Updated**: 2026-02-17 19:15:00
