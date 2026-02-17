# Decision: Custom Shopify App for Sevdesk Integration

**Date**: 2026-02-17
**Status**: Approved
**Hosting**: Uberspace
**Context**: Small shop with few orders per week, need bidirectional sync

---

## Decision

Build a custom Shopify app for Sevdesk integration, hosted on Uberspace, instead of using the existing sevdesk Shopify app or building a production-grade connector service.

---

## Background

### Requirements

| Requirement | Priority |
|-------------|----------|
| Sync Shopify orders to Sevdesk invoices | High |
| Send invoices to customers via email | High |
| Bidirectional payment sync (Sevdesk -> Shopify) | High |
| Low cost | Medium |
| Simple maintenance | Medium |

### Options Evaluated

| Option | Cost | Bidirectional | Complexity |
|--------|------|---------------|------------|
| sevdesk Shopify app | $13/month | No | Low |
| Integration platform (Make/Integrately) | Free-$20/month | Possible | Medium |
| Production-grade connector | $5-20/month | Yes | High |
| Custom Shopify app on Railway | $10-15/month | Yes | Medium |
| Custom Shopify app on Uberspace | EUR 6-9/month | Yes | Medium |

---

## Rationale

### Why Not sevdesk Shopify App

The existing sevdesk Shopify app ($13/month) provides excellent one-way sync but does not support bidirectional payment sync. When a customer pays via bank transfer and payment is recorded in Sevdesk, the Shopify order status is not automatically updated.

### Why Not Integration Platform

Platforms like Make or Integrately could potentially handle bidirectional sync, but:
- Require ongoing subscription
- Add external dependency
- Less control over error handling
- Learning curve for configuration

### Why Not Production-Grade Connector

The initial research produced an enterprise-grade architecture (AWS Lambda, SQS, PostgreSQL, etc.) which is overkill for a small shop with few orders per week.

### Why Not Railway

Railway was initially considered but has critical issues for webhook handling:
- Cold starts (15-22 seconds) cause webhook failures
- Requires disabling Serverless feature ($10-15/month)
- Multiple platform incidents in 2025-2026
- Database costs extra

### Why Uberspace

| Factor | Assessment |
|--------|------------|
| Cost | EUR 6-9/month (~$6.50-9.75) - lower than Railway |
| Cold starts | None - always-on server with supervisord |
| Database | PostgreSQL included |
| Backups | Daily and weekly included |
| Stability | Operating since 2010, German hosting |
| GDPR | Germany-based, GDPR-friendly |

---

## Decision Details

### App Type: Custom App (Not Public)

Custom apps are created directly in Shopify Admin and are only usable by the store that created them. This is ideal because:

- No approval process required
- Instant setup
- Same API access as public apps
- No OAuth flow needed (tokens generated directly)
- Can convert to public app later if needed

### Hosting: Uberspace

Uberspace provides the best balance for this use case:
- EUR 6-9/month fixed pricing
- No cold starts (critical for webhooks)
- PostgreSQL database included
- Daily/weekly backups included
- SSH access with supervisord for process management
- Germany-based (GDPR-friendly, close to Sevdesk)

### Architecture

```
Shopify Order ──webhook──▶ Custom App ──API──▶ Sevdesk Invoice
                                                    │
Sevdesk Payment ──webhook──▶ Custom App ──API──▶ Shopify Order (mark paid)
```

---

## Implementation Plan

### Phase 1: Basic Setup (2-4 hours)
- Create custom app in Shopify admin
- Set up Uberspace account
- Deploy initial code

### Phase 2: Shopify -> Sevdesk (4-6 hours)
- Receive Shopify webhooks
- Create Sevdesk contact (if not exists)
- Create Sevdesk invoice

### Phase 3: Sevdesk -> Shopify (4-6 hours)
- Set up Sevdesk webhook
- Receive payment notifications
- Update Shopify order via API

### Phase 4: Polish (2-4 hours)
- Error handling
- Logging
- Testing

**Total estimated: 12-20 hours**

---

## Consequences

### Positive
- Full control over sync behavior
- Bidirectional payment sync
- Lower monthly cost (EUR 6-9 vs $13+)
- Learning opportunity
- No vendor lock-in
- No cold start issues
- Database and backups included

### Negative
- Development time investment upfront
- Responsible for maintenance
- Need to handle errors and edge cases
- Manual deployment (SSH + supervisord)

### Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Webhook delivery failures | Implement retry logic, logging |
| API changes | Monitor Shopify/Sevdesk changelogs |
| Sevdesk breaking changes | Subscribe to tech blog, version detection |

---

## Related Documents

- [Shopify API Research](shopify-api-research.md) - Detailed Shopify API capabilities
- [Sevdesk API Research](sevdesk-api-research.md) - Detailed Sevdesk API capabilities
- [Integration Patterns](integration-patterns.md) - Reliability patterns for reference
- [Custom App Implementation Guide](custom-app-implementation.md) - Step-by-step build guide
- [Risk Assessment](risk-assessment-consolidated.md) - Comprehensive risk analysis

---

## Review History

| Date | Reviewer | Outcome |
|------|----------|---------|
| 2026-02-17 | Initial | Approved |
| 2026-02-17 | Hosting update | Changed from Railway to Uberspace |
