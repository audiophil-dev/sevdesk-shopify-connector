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

### Key Decisions (2026-02-17)

[2026-02-17 21:35] - Build Custom Shopify App Instead of Using Existing sevdesk App
**Rationale**: Existing sevdesk Shopify app ($13/month) only supports one-way sync. Bidirectional payment sync (Sevdesk -> Shopify) is required for bank transfer payments.
**Impact**: 12-20 hours development time, but full control over sync behavior and lower monthly cost.
**Alternatives Considered**: sevdesk Shopify app (no bidirectional), Make/Integrately (less control), enterprise connector (overkill)
**Status**: Active

[2026-02-17 21:35] - Use Uberspace for Hosting (Changed from Railway)
**Rationale**: Railway has critical cold start issues (15-22 seconds) that cause webhook failures. Uberspace provides always-on servers with no cold starts, PostgreSQL included, daily backups, and Germany-based hosting (GDPR-friendly) for EUR 6-9/month.
**Impact**: Manual deployment via SSH + supervisord instead of git push auto-deploy.
**Alternatives Considered**: Railway (cold start issues), Render (higher cost), Fly.io (more complex)
**Status**: Active

[2026-02-17 21:35] - Use Custom App (Not Public App)
**Rationale**: Custom apps are created directly in Shopify Admin with no approval process, same API access as public apps, and tokens generated directly (no OAuth flow needed for legacy apps).
**Impact**: App only usable by this store; can convert to public app later if needed.
**Alternatives Considered**: Public app (approval required, more overhead)
**Status**: Active

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

[2026-02-17 19:15] - ~~Use Railway for Deployment (Primary) or AWS Lambda (Alternative)~~
**Rationale**: ~~Railway offers simplicity for solo developers ($10-20/month); Lambda offers cost efficiency at scale ($1-17/month). Both valid choices.~~
**Impact**: ~~Railway simpler setup, Lambda cheaper at scale.~~
**Alternatives Considered**: Heroku (expensive), VPS (more maintenance)
**Status**: Superseded - Changed to Uberspace due to cold start issues

[2026-02-17 19:15] - Use PostgreSQL for State Tracking
**Rationale**: ACID compliance essential for sync state, JSON support for flexible payload storage. Included with Uberspace at no extra cost.
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

**Last Updated**: 2026-02-17 21:45:00
