# Shopify-Sevdesk Connector Documentation

**Project**: Custom Shopify app for bidirectional sync with Sevdesk
**Status**: Planning complete, implementation pending
**Last Updated**: 2026-02-17

---

## Quick Start

For the implementation guide, see [Custom App Implementation Guide](custom-app-implementation.md).

---

## Documentation Index

### Decision and Planning

| Document | Purpose |
|----------|---------|
| [Decision: Custom App](decision-custom-app.md) | Why we chose to build custom vs use existing solutions |
| [Research Plan](research-plan.md) | Original research scope and objectives |

### API Reference

| Document | Content |
|----------|---------|
| [Shopify API Research](shopify-api-research.md) | Webhooks, order data, authentication, rate limits |
| [Sevdesk API Research](sevdesk-api-research.md) | Invoice creation, contacts, German accounting |

### Implementation

| Document | Content |
|----------|---------|
| [Custom App Implementation](custom-app-implementation.md) | Step-by-step build guide |
| [Integration Patterns](integration-patterns.md) | Reliability patterns (retry, idempotency, DLQ) |

### Reference

| Document | Content |
|----------|---------|
| [Simple Integration Options](simple-integration-options.md) | Comparison of all integration approaches |
| [Tech Stack Recommendation](tech-stack-recommendation.md) | Original enterprise-grade stack (archived) |
| [Connector Architecture Synthesis](connector-architecture-synthesis.md) | Original synthesis (archived) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SHOPIFY                     CUSTOM APP               SEVDESK  │
│                                                                 │
│   Order Created ──webhook──▶  Receive     ──API──▶  Create     │
│   Order Paid     ──webhook──▶  Process    ──API──▶  Invoice    │
│                                                                 │
│   Order Status   ◀──API─────  Update     ◀──webhook── Payment  │
│   (mark paid)                 Shopify                Received  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App type | Custom app (not public) | No approval needed, same API access |
| Hosting | Railway | $5/month, simple deployment |
| Language | Node.js | Best Shopify SDK support |
| Database | None initially | Can add later if needed |

---

## Cost Summary

| Component | Monthly Cost |
|-----------|--------------|
| Railway hosting | $5 |
| Shopify Basic | $29 (existing) |
| Sevdesk | Existing subscription |
| **Total additional** | **$5/month** |

---

## Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Setup | 2-4 hours | Custom app created, deployed to Railway |
| 2. Shopify -> Sevdesk | 4-6 hours | Orders sync to Sevdesk invoices |
| 3. Sevdesk -> Shopify | 4-6 hours | Payments update Shopify orders |
| 4. Polish | 2-4 hours | Error handling, logging, testing |
| **Total** | **12-20 hours** | Working bidirectional sync |

---

## Risk Assessment

**Overall Risk Level**: Medium (viable with mitigations)

### Critical Risks (Must Address Before Production)

| Risk | Mitigation |
|------|------------|
| Webhook Spoofing | HMAC-SHA256 verification on every request |
| Shopify 2026 Auth Changes | Design for OAuth token management |
| Sevdesk System Versions | Detect version via `/api/v1/CheckAccount` |
| Webhook Duplicates | Idempotency key tracking |

### Cost Estimate

| Component | Cost |
|-----------|------|
| Uberspace hosting | EUR 6-9/month (~$6.50-9.75) |
| PostgreSQL database | Included |
| Backups | Included |
| **Total** | **EUR 6-9/month** |

See [Consolidated Risk Assessment](risk-assessment-consolidated.md) for full analysis.

---

## Hosting: Uberspace

**Why Uberspace over Railway**:

| Factor | Uberspace | Railway |
|--------|-----------|---------|
| Cold starts | None | Problematic for webhooks |
| Cost | Fixed EUR 6-9/month | Variable $10-15/month |
| Database | PostgreSQL included | Extra cost |
| Backups | Daily/weekly included | Manual |
| Location | Germany (GDPR-friendly) | US/EU |

---

## Next Steps

1. Review [Risk Assessment](risk-assessment-consolidated.md)
2. Create custom app in Shopify Admin
3. Set up project structure with security mitigations
4. Implement webhook handlers with HMAC verification
5. Deploy to Uberspace
6. Register webhooks
7. Test with sample orders

See [Custom App Implementation Guide](custom-app-implementation.md) for detailed instructions.
