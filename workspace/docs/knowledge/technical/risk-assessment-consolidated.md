# Consolidated Risk Assessment: Shopify-Sevdesk Custom App

**Date**: 2026-02-17
**Status**: Final
**Hosting**: Uberspace (updated from Railway)
**Decision**: Proceed with mitigations

---

## Executive Summary

This consolidated risk assessment synthesizes findings from four domain-specific risk analyses: Shopify custom app risks, Sevdesk API risks, hosting risks, and security risks. The overall risk level is **MEDIUM** with specific areas requiring mitigation before production deployment.

**Key Finding**: The project is viable with mitigations. Hosting on Uberspace eliminates the cold start risk that was critical with Railway, reducing overall risk level.

**Hosting Decision**: Uberspace selected over Railway for the following reasons:
- No cold starts (critical for webhooks)
- Fixed pricing (EUR 6-9/month)
- PostgreSQL database included
- Daily/weekly backups included
- Germany-based (GDPR-friendly)

---

## Risk Summary Matrix

### Critical Risks (Must Address Before Production)

| Risk | Domain | Severity | Mitigation |
|------|--------|----------|------------|
| **Webhook Spoofing** | Security | Critical | Implement HMAC-SHA256 verification on every request |
| **2026 Shopify Auth Changes** | Shopify | Critical | Design for OAuth token management from start |
| **Sevdesk System Version Differences** | Sevdesk | High | Detect version via `/api/v1/CheckAccount` before API calls |

### High Risks (Address in Phase 1)

| Risk | Domain | Severity | Mitigation |
|------|--------|----------|------------|
| Webhook Duplicates | Shopify | High | Implement idempotency using `X-Shopify-Webhook-Id` |
| Webhook Delivery Failures | Shopify | High | Respond in <5 seconds, implement reconciliation |
| API Breaking Changes | Sevdesk | High | Monitor tech blog, implement version detection |
| Tax Validation Errors | Sevdesk | High | Pre-validate tax configuration before invoice creation |
| Replay Attacks | Security | High | Timestamp validation + idempotency key tracking |
| Secret Management | Security | High | Environment variables, 90-day rotation |

### Medium Risks (Address in Phase 2)

| Risk | Domain | Severity | Mitigation |
|------|--------|----------|------------|
| API Rate Limits | Shopify | Medium | Implement queuing and backoff |
| Undocumented Rate Limits | Sevdesk | Medium | Exponential backoff, batch operations |
| DDoS via Webhooks | Security | Medium | Rate limiting, queue-based processing |
| Documentation Quality | Sevdesk | Medium | Use community resources, test thoroughly |

---

## Hosting Risk Comparison

### Why Uberspace Over Railway

| Risk Factor | Uberspace | Railway |
|-------------|-----------|---------|
| **Cold Starts** | None - always-on server | Critical - 15-22s delays, 502 errors |
| **Pricing** | Fixed EUR 6-9/month | Variable $10-15/month |
| **Database** | PostgreSQL included | Extra cost |
| **Backups** | Daily/weekly included | Manual |
| **Platform Stability** | Operating since 2010 | Multiple incidents 2025-2026 |
| **Location** | Germany | US/EU regions |

### Uberspace Risk Assessment

| Risk | Severity | Notes |
|------|----------|-------|
| Cold starts | None | Always-on server with supervisord |
| Platform incidents | Low | Stable since 2010, German hosting |
| Pricing changes | Low | Transparent, user chooses amount |
| Migration effort | Low | Standard SSH + supervisord setup |

---

## Detailed Risk Analysis by Domain

### 1. Shopify Custom App Risks

#### Critical: 2026 Authentication Changes

**Finding**: Starting January 1, 2026, new custom apps require OAuth-based token management with expiring tokens (24-hour expiry). Legacy static tokens are no longer available for new apps.

**Impact**: 
- Must implement token refresh logic
- More complex than static token approach
- Cannot use simple "set and forget" authentication

**Mitigation**:
```
1. Design for OAuth from the start
2. Implement secure token storage (encrypted at rest)
3. Build token refresh logic that triggers before expiration
4. Monitor token expiration and alert on failures
```

#### High: Webhook Reliability

**Finding**: Shopify webhooks have known reliability issues:
- Duplicates are common (no built-in deduplication)
- 8 retries over 4 hours, then subscription auto-deleted
- 5-second timeout requires async processing
- 80%+ failure rates reported during incidents

**Impact**:
- Duplicate invoice creation if not handled
- Missed orders if webhook subscription deleted
- Processing failures if synchronous

**Mitigation**:
```
1. Use X-Shopify-Webhook-Id as idempotency key
2. Return 200 OK immediately, process asynchronously
3. Implement dead letter queue for failed events
4. Run reconciliation job every 5-10 minutes
```

---

### 2. Sevdesk API Risks

#### High: System Version Differences

**Finding**: Sevdesk operates two parallel systems (v1 and v2) with significantly different API behavior:

| Feature | System v1 | System v2 |
|---------|-----------|-----------|
| Tax handling | `taxType` (string) | `taxRule` (numeric 1-21) |
| Status changes | Direct modification | Must use endpoints |
| E-invoice | Since Dec 2024 | Since Nov 2024 |

**Impact**:
- API calls may fail silently
- Incorrect tax calculations
- Invoice creation failures

**Mitigation**:
```
1. Call /api/v1/CheckAccount on startup
2. Store detected system version
3. Adjust API calls based on version
4. Test with both system types if possible
```

#### High: API Breaking Changes

**Finding**: Sevdesk releases breaking changes 2-4 times per year with limited notice:
- February 2025: Auth method removed
- April 2024: System 2.0 breaking changes
- March 2025: Pagination limits (1000 max)

**Impact**:
- Integration may break without warning
- Requires ongoing maintenance
- Development time for migrations

**Mitigation**:
```
1. Subscribe to sevDesk Tech Blog RSS
2. Implement version detection
3. Build flexible API client that can adapt
4. Schedule quarterly API reviews
```

#### High: Tax Validation

**Finding**: Tax configuration must exactly match account settings. Wrong values cause invoice rejection.

**Impact**:
- Invoice creation failures
- Debugging difficulty (generic errors)
- Customer-facing delays

**Mitigation**:
```
1. Pre-validate tax configuration on app startup
2. Store tax rules for the account
3. Validate line items before API call
4. Log detailed error responses
```

---

### 3. Security Risks

#### Critical: Webhook Spoofing

**Finding**: Without HMAC verification, attackers can forge webhook requests.

**Impact**:
- Duplicate invoice creation
- Incorrect accounting data
- Financial record manipulation

**Mitigation**:
```javascript
// Required implementation
const crypto = require('crypto');

function verifyShopifyWebhook(rawBody, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'base64'),
    Buffer.from(signature, 'base64')
  );
}
```

#### High: Replay Attacks

**Finding**: Captured valid requests can be replayed to cause duplicate processing.

**Impact**:
- Duplicate invoices
- Data corruption
- Resource exhaustion

**Mitigation**:
```
1. Extract timestamp from webhook headers
2. Reject requests older than 5 minutes
3. Store X-Shopify-Webhook-Id in database
4. Check for duplicates before processing
```

#### High: Secret Management

**Finding**: Hardcoded secrets in source code is the leading cause of breaches.

**Impact**:
- Full API access if compromised
- Cannot rotate without code changes
- Version control exposure

**Mitigation**:
```
1. Use environment variables (minimum)
2. Consider secrets management service (production)
3. Rotate secrets every 90 days
4. Separate secrets per environment
```

---

## Mitigation Implementation Priority

### Phase 1: Before Production (Critical)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 1 | HMAC signature verification | 1 hour |
| 2 | Idempotency key tracking | 2 hours |
| 3 | Sevdesk system version detection | 1 hour |
| 4 | Environment variable secrets | 30 minutes |

### Phase 2: First Month (High)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 5 | OAuth token management | 4 hours |
| 6 | Timestamp validation | 1 hour |
| 7 | Reconciliation job | 3 hours |
| 8 | Error handling and logging | 3 hours |

### Phase 3: Ongoing (Medium)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 9 | Rate limiting | 2 hours |
| 10 | Circuit breaker | 2 hours |
| 11 | Secret rotation process | 1 hour |
| 12 | Quarterly API reviews | Ongoing |

---

## Cost Estimate

| Component | Cost |
|-----------|------|
| Uberspace hosting | EUR 6-9/month (~$6.50-9.75) |
| PostgreSQL database | Included |
| Backups | Included |
| SSL/HTTPS | Included |
| **Total monthly** | **EUR 6-9** |

---

## Go/No-Go Recommendation

### Go

The project is viable with the following conditions:

1. **Budget EUR 6-9/month** for Uberspace
2. **Implement critical mitigations** before production
3. **Plan for ongoing maintenance** (quarterly API reviews)

### Risk Acceptance

The following residual risks are accepted:

| Risk | Acceptance Rationale |
|------|---------------------|
| Sevdesk breaking changes | Monitor tech blog, adapt quickly |
| Limited support | Self-sufficient with good logging |
| Manual deployment | Acceptable for small project |

---

## Related Documents

- [Risk Assessment: Shopify](risk-assessment-shopify.md)
- [Risk Assessment: Sevdesk](risk-assessment-sevdesk.md)
- [Risk Assessment: Security](risk-assessment-security.md)
- [Custom App Implementation Guide](custom-app-implementation.md)
