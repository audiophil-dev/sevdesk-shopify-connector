# Shopify Custom App Risk Assessment

**Research Date**: February 17, 2026  
**Scope**: Risks, limitations, and gotchas for small integration projects using Shopify custom apps  
**Depth**: Moderate

---

## Executive Summary

Building a Shopify custom app for a small integration project involves several technical risks that require proactive planning. The most critical concerns are the **2026 authentication changes** that will require implementing OAuth-based token management, **webhook reliability issues** including duplicates and delivery failures, and **ongoing API version maintenance**. This assessment provides severity ratings and mitigation strategies for each identified risk.

---

## 1. API Rate Limits

### Finding

Shopify implements rate limiting using a leaky bucket algorithm across all Admin APIs.

**REST Admin API Limits**:
- Standard plans: 40 requests bucket, 2 requests/second leak rate
- Advanced Shopify plans: Higher limits apply
- Shopify Plus: 400 requests bucket, 20 requests/second leak rate

**GraphQL Admin API Limits**:
- Standard: 100 points/second
- Advanced: 200 points/second  
- Plus: 1000 points/second

When limits are exceeded, Shopify returns HTTP 429 (Too Many Requests) errors. The bucket gradually empties at the leak rate, allowing new requests.

**Source**: [Shopify API Limits Documentation](https://shopify.dev/docs/api/usage/rate-limits) [5/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Hitting rate limits | Medium | Causes integration failures; requires implementation of retry logic with exponential backoff |
| Burst handling | Low | Bucket allows short bursts up to bucket size before throttling |
| Plan dependency | Medium | Limits vary significantly by merchant plan; test with target plan |

### Mitigation

1. Implement request queuing with rate-aware scheduling
2. Use bulk operations (Shopify Batch API) for large data operations
3. Monitor `X-Shopify-Shop-Api-Call-Limit` headers to track usage
4. Consider GraphQL for more efficient data fetching (reduces point costs)

---

## 2. Webhook Reliability

### Finding

Webhooks are a critical component for real-time integration but have known reliability challenges:

**Delivery Behavior**:
- Shopify expects a 200 OK response within 5 seconds
- Failed deliveries trigger up to 8 retries over 4 hours using exponential backoff
- After 8 consecutive failures, the webhook subscription is automatically deleted
- Shopify sends warning emails before subscription removal

**Known Issues** (from community reports):
- Webhook delivery delays occur during high-volume periods
- Duplicate deliveries are common due to retry mechanisms and network issues
- Some developers report 80%+ failure rates during incidents
- EVENT_NAME webhook topics can have inconsistent behavior

**Source**: [Shopify Webhook Troubleshooting](https://shopify-dev.shopifycloud.com/docs/apps/build/webhooks/troubleshooting-webhooks) [5/5]
**Source**: [Shopify Community Forum - Webhook Failures](https://community.shopify.com/t/webhook-deliveries-80-failed/391797) [3/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Duplicate events | **High** | Must implement idempotency; no built-in deduplication |
| Missing events | **High** | Subscription auto-deletion after failures; no guaranteed delivery |
| Processing timeout | **High** | 5-second limit requires async processing pattern |
| Debugging difficulty | Medium | Failures may not show in logs; requires webhook metrics monitoring |
| Incident handling | Medium | During Shopify incidents, webhook delays are common |

### Mitigation

1. **Implement idempotent webhook handlers** - Use `X-Shopify-Webhook-Id` header as deduplication key
2. **Respond immediately** - Return 200 OK within 5 seconds; process asynchronously
3. **Implement dead letter queue** - Handle failed events for manual review
4. **Monitor webhook health** - Use webhook delivery metrics in Partner Dashboard
5. **Implement reconciliation** - Periodically poll to catch missing events

---

## 3. Custom App Limitations

### Finding

**2026 Major Change**: Starting January 1, 2026, Shopify will not allow creation of new legacy custom apps. All new custom apps must use the Dev Dashboard with OAuth-based authentication.

**Legacy vs. New Custom Apps**:

| Feature | Legacy Custom Apps | New Custom Apps (2026+) |
|---------|-------------------|------------------------|
| Authentication | Static API access token | OAuth client credentials flow |
| Token expiration | Permanent (until revoked) | Tokens expire; require refresh |
| Distribution | Single store only | Single store or same org (Plus) |
| Management | Shopify Admin | Dev Dashboard required |

**Feature Access**:
- Custom apps can access most Admin API endpoints
- Some advanced features (Shopify Functions) require Shopify Plus for custom apps
- Level 2 PII access requires Grow plan or higher

**Source**: [Shopify Custom Apps Help Center](https://help.shopify.com/en/manual/apps/app-types/custom-apps) [5/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| 2026 migration | **Critical** | Existing apps continue working; new apps require OAuth implementation |
| Token management | **High** | New apps require token refresh logic; more complex than static tokens |
| Feature restrictions | Low | Most integration needs met by standard APIs |
| Distribution limits | Medium | Cannot share with other merchants without public app submission |

### Mitigation

1. **For new projects**: Design for OAuth token management from start
2. **For existing legacy apps**: Monitor announcements for migration requirements
3. **Token refresh implementation**: Use client credentials grant flow with secure token storage

---

## 4. Token and Authentication Issues

### Finding

**Critical Change Coming in 2026**: New custom apps will use OAuth-based authentication with expiring tokens instead of permanent API access tokens.

**New Authentication Flow**:
- Apps receive `client_id` and `client_secret` from Dev Dashboard
- Must implement OAuth client credentials grant flow
- Access tokens expire (currently 24 hours mentioned in community discussions)
- Tokens must be refreshed before expiration

**Legacy Tokens** (existing custom apps):
- Static API access token generated in Shopify Admin
- Remains valid until app is uninstalled or manually revoked
- Simpler but being phased out for new apps

**Security Considerations**:
- Tokens provide full API access based on granted scopes
- No built-in token revocation endpoint for custom apps
- Uninstalling app immediately invalidates all tokens

**Source**: [Shopify Dev Dashboard Authentication](https://shopify-dev.shopifycloud.com/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) [5/5]
**Source**: [Medium - Custom App 2026 Changes](https://medium.com/@poopoo888888/shopify-suddenly-announced-that-new-custom-apps-wont-be-allowed-after-2026-this-feels-way-too-rushed-f185069c827e) [3/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Token expiration | **High** | New apps require refresh logic; tokens expire |
| Token storage | **High** | Secure storage critical; exposure risks data breach |
| Migration effort | Medium | Existing legacy apps work; new projects need OAuth |
| No per-token revocation | Low | Must uninstall entire app to revoke access |

### Mitigation

1. Implement secure token storage (encrypted at rest)
2. Build token refresh logic before expiration (monitor `expires_in`)
3. Use offline access scopes for background processing
4. Implement token lifecycle monitoring and alerting

---

## 5. API Versioning

### Finding

Shopify releases new API versions quarterly (January, April, July, October). Each version is supported for at least 12 months, with a 9-month overlap with the previous version.

**Versioning Behavior**:
- API version included in URL: `/admin/api/2025-10/graphql.json`
- Unversioned APIs exist (Ajax API, OAuth endpoints, Liquid)
- Deprecated versions stop working after support period
- Breaking changes can occur between versions

**Deprecation Process**:
1. New version released with changes
2. Previous version enters deprecation warning period
3. Deprecated version becomes unsupported
4. Requests to unsupported versions return 410 Gone

**Example**: 2024-01 API version stopped working January 1, 2025.

**Source**: [Shopify API Versioning](https://shopify.dev/docs/api/usage/versioning) [5/5]
**Source**: [Scale Shopify - API Versioning](https://scaleshopify.com/2025/02/22/shopify-api-versioning-key-milestones-explained/) [4/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Version deprecation | **High** | Requires quarterly maintenance; breaks if not updated |
| Breaking changes | Medium | Changes announced in changelog; migration guides provided |
| Unversioned APIs | Low | Risk of sudden breaks without notice |
| Testing burden | Medium | Each version change requires regression testing |

### Mitigation

1. Subscribe to Shopify Developer Changelog
2. Schedule quarterly API version reviews
3. Use latest stable version in development; pin version in production
4. Test in development store before deploying version updates
5. Consider automated testing for API compatibility

---

## 6. Support Options

### Finding

**Custom App Developer Support**:

| Support Channel | Availability | Notes |
|-----------------|--------------|-------|
| Shopify Community Forums | Public | Active developer community; peer help |
| Shopify Developer Documentation | 24/7 | Comprehensive but can be fragmented |
| Partner Dashboard | App owners | Health metrics, API call logs |
| Shopify Developer Support | Limited | Priority for Partners; varies for merchants |

**Important Limitations**:
- Shopify does not provide direct developer support for custom app troubleshooting
- No official support tickets for custom app technical issues
- Community forums are primary help resource
- Partner program provides additional resources (for agencies/Partners)

**Source**: [Shopify Help Center - Custom Apps](https://help.shopify.com/en/manual/apps/app-types/custom-apps) [5/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Direct support access | **High** | No official support channel for custom app developers |
| Issue resolution | Medium | Must rely on community or self-diagnosis |
| Critical bugs | Medium | No SLA for fixes; depends on Shopify incident response |

### Mitigation

1. Build comprehensive logging and monitoring
2. Use development stores for thorough testing
3. Engage Shopify Partner for complex implementations
4. Maintain active community participation for peer knowledge

---

## 7. Known Common Issues

### Finding

Based on developer community reports and troubleshooting guides:

**Frequently Encountered Problems**:

| Issue | Frequency | Impact |
|-------|-----------|--------|
| Deprecated API endpoints | Common | 30%+ developers report functionality errors from outdated endpoints |
| Webhook configuration errors | Common | 25% of developers face unexpected failures |
| Scope permission problems | Common | Incorrect scopes cause authentication failures |
| JSON payload validation | Common | Malformed requests cause silent failures |
| Token/scope mismatch | Occasional | Updated scopes require re-installation |

**Additional Concerns**:
- API response times should remain below 200ms for good UX
- Over-polling can trigger rate limits quickly
- Some webhook topics have inconsistent behavior
- Bulk operations have size limits (currently 100-1000 records depending on operation)

**Source**: [MoldStud - Troubleshooting Common Issues](https://moldstud.com/articles/p-troubleshooting-common-issues-in-shopify-apps-essential-faqs-for-developers) [4/5]

### Risk Assessment

| Aspect | Severity | Notes |
|--------|----------|-------|
| Deprecated endpoints | **High** | Regular maintenance required; breaking changes possible |
| Scope configuration | **High** | Misconfiguration causes complete failure |
| Debugging complexity | Medium | Errors often silent; requires careful logging |
| Integration fragility | Medium | Changes in Shopify can break assumptions |

### Mitigation

1. Validate all JSON payloads before sending
2. Implement comprehensive error handling and logging
3. Use GraphQL introspection to verify available fields
4. Test webhook handlers with sample payloads
5. Monitor API health reports in Partner Dashboard

---

## Summary: Risk Severity Matrix

| Risk Category | Severity | Action Required |
|---------------|----------|-----------------|
| **2026 Authentication Changes** | Critical | Plan OAuth implementation for new apps |
| **Webhook Duplicates** | High | Implement idempotent processing |
| **Webhook Delivery Failures** | High | Build retry logic and monitoring |
| **API Rate Limits** | Medium | Implement queuing and backoff |
| **API Version Deprecation** | High | Schedule quarterly maintenance |
| **Token Expiration** | High | Build refresh mechanism |
| **Limited Support Access** | High | Build robust self-documentation |
| **Scope Configuration** | High | Test thoroughly during development |

---

## Recommendations for Small Integration Projects

1. **Design for the 2026 model**: Even for small projects, implement proper OAuth token management from the start
2. **Prioritize webhook idempotency**: This is the most common source of integration bugs
3. **Implement comprehensive logging**: With limited support access, self-diagnosis is essential
4. **Use development stores**: Test all API changes and webhooks in isolation
5. **Plan for maintenance**: API versioning requires ongoing attention quarterly
6. **Monitor proactively**: Use Partner Dashboard metrics to catch issues before they escalate

---

## Sources

- [Shopify API Limits Documentation](https://shopify.dev/docs/api/usage/rate-limits) - [5/5] Authoritative
- [Shopify Custom Apps Help Center](https://help.shopify.com/en/manual/apps/app-types/custom-apps) - [5/5] Authoritative
- [Shopify Webhook Troubleshooting](https://shopify-dev.shopifycloud.com/docs/apps/build/webhooks/troubleshooting-webhooks) - [5/5] Authoritative
- [Shopify API Versioning](https://shopify.dev/docs/api/usage/versioning) - [5/5] Authoritative
- [Shopify Dev Dashboard Authentication](https://shopify-dev.shopifycloud.com/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) - [5/5] Authoritative
- [Scale Shopify - API Versioning Guide](https://scaleshopify.com/2025/02/22/shopify-api-versioning-key-milestones-explained/) - [4/5] Highly Credible
- [MoldStud - Troubleshooting Common Issues](https://moldstud.com/articles/p-troubleshooting-common-issues-in-shopify-apps-essential-faqs-for-developers) - [4/5] Credible
- [Shopify Community Forum - Webhook Failures](https://community.shopify.com/t/webhook-deliveries-80-failed/391797) - [3/5] Community Source
