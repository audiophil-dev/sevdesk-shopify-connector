# Risk Assessment: Sevdesk API Integration

**Research Date**: 2026-02-17  
**Researcher**: @technology-researcher  
**Purpose**: Risk and limitations analysis for Shopify-Sevdesk connector integration  
**Depth Level**: Moderate  
**Time Budget**: 30 minutes

---

## Executive Summary

This document identifies and assesses risks, limitations, and potential gotchas when integrating with the Sevdesk API. The analysis covers API stability, rate limits, webhooks, error handling, data validation, German accounting compliance, and community-reported issues.

**Key Findings Summary**:

| Risk Area | Severity | Likelihood | Mitigation Priority |
|-----------|----------|------------|---------------------|
| API Breaking Changes | High | Frequent | Critical |
| Undocumented Rate Limits | Medium | Likely | High |
| Webhook Reliability | Medium | Occasional | High |
| Documentation Quality | Medium | Constant | Medium |
| System Version Differences | High | Constant | Critical |
| Pagination Limits | High | Implemented | High |

---

## 1. API Stability

### 1.1 Breaking Changes History

**Finding**: Sevdesk has a pattern of releasing breaking changes without extended notice periods.

**Evidence**:

- **February 2025**: Sevdesk removed an older API authentication method, requiring immediate migration to the documented API token authentication ([sevDesk Tech Blog](https://tech.sevdesk.com/api_news/posts/2025_02_06-api-authentication-removal/) [5/5]).
- **April 2024 - System Update 2.0**: Major breaking changes including status management, tax handling, and e-invoice requirements ([sevDesk Tech Blog](https://tech.sevdesk.com/api_news/posts/2024_04_04-system-update-breaking-changes/) [5/5]).
- **March 2025**: New pagination limits introduced (1000 max), breaking integrations that used higher limits ([sevDesk Tech Blog](https://tech.sevdesk.com/api_news/posts/2025_03_11-api_pagination_limits/) [5/5]).
- **March 2025**: Breaking change to DATEV export endpoints ([sevDesk Tech Blog](https://tech.sevdesk.com/api_news/) [5/5]).

**Severity**: HIGH  
**Pattern**: Breaking changes occur 2-4 times per year with limited advance notice (sometimes only 2-3 weeks).

### 1.2 System Version Complexity

**Finding**: Sevdesk operates two parallel system versions (v1 and v2) with significant differences in API behavior.

**Differences Identified**:

| Feature | System v1 | System v2 |
|---------|-----------|-----------|
| Tax handling | `taxType` (string) | `taxRule` (numeric codes 1-21) |
| E-invoice support | Since Dec 2024 | Since Nov 2024 |
| Status changes | Direct modification | Must use endpoints |
| VAT rules | Limited | Full (OSS, Reverse Charge) |

**Severity**: HIGH  
**Risk**: Integrations may fail silently or produce incorrect data depending on which system version the user's account uses.

**Recommendation**: Always detect system version via `/api/v1/CheckAccount` and adjust API calls accordingly.

---

## 2. Rate Limits

### 2.1 Undocumented Limits

**Finding**: Sevdesk does not publicly document specific rate limits. The official tech blog and API documentation provide no explicit numbers.

**Community Reports**:

- Integration platforms (Make, Pipedream) report that reasonable usage works without issues
- No published requests-per-minute or daily limits
- 429 (Too Many Requests) responses have been reported but without consistent pattern

**Severity**: MEDIUM  
**Risk**: Production integrations may encounter throttling without warning.

**Mitigation**:

- Implement exponential backoff starting at 1 second, max 60 seconds
- Batch operations in chunks of 100-500 records
- Add jitter to request timing
- Monitor for 429 responses and dynamically adjust request rate

### 2.2 Pagination Limits (Documented)

**Finding**: As of May 30, 2025, pagination is strictly enforced.

**Limits**:

- Maximum: 1000 records per request
- Minimum: 1 record
- Invalid values: Returns HTTP 400 with message "Invalid 'limit' parameter. Please provide an integer value between 1 and 1000."

**Previous Behavior** (until May 30, 2025):

- Could request up to 10,000 records
- Arbitrary text values bypassed limit (now blocked)

**Severity**: HIGH (for existing integrations)  
**Risk**: Integrations using limit > 1000 will break after May 30, 2025.

---

## 3. Webhook Support

### 3.1 Availability and Features

**Finding**: Sevdesk provides webhook support for various events including invoice and contact operations.

**Confirmed Capabilities**:

- Webhook management API available
- Events for: Invoice created, updated, sent, paid
- Events for: Contact created, updated
- Events for: Voucher/receipt created, updated

**Source**: [apitracker.io - sevDesk API](https://apitracker.io/a/sevdesk) [3/5]

### 3.2 Reliability Concerns

**Finding**: Community feedback suggests occasional delays and reliability issues with webhooks.

**Reported Issues**:

- Webhook delivery delays (minutes to hours in some cases)
- No built-in retry mechanism visibility
- Limited webhook delivery logs in the UI

**Severity**: MEDIUM  
**Risk**: Relying solely on webhooks for critical business logic may result in missed events.

**Mitigation**:

- Implement idempotency in webhook handlers
- Use webhook events as supplementary to polling
- Implement a reconciliation process that runs periodically
- Log all webhook deliveries for debugging

### 3.3 Documentation Quality

**Finding**: Official webhook documentation is limited. Community members have noted difficulty understanding webhook configuration.

**Severity**: MEDIUM  
**Risk**: Developers may misconfigure webhooks or fail to handle edge cases.

---

## 4. Error Handling

### 4.1 Common Error Codes

**Finding**: Sevdesk uses standard HTTP status codes with variable error message quality.

**Standard Errors**:

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid parameters, pagination, missing required fields |
| 401 | Unauthorized | Invalid or expired API key |
| 404 | Not Found | Non-existent resource ID |
| 500 | Internal Server Error | Sevdesk-side issues |

**Error Response Format**: Not consistently documented. May include detailed messages or generic errors.

**Severity**: MEDIUM  
**Risk**: Error handling requires defensive programming and extensive logging.

### 4.2 Invoice Creation Errors

**Common Rejection Reasons** (from community reports):

1. **Missing Contact**: Invoice creation requires a valid contact ID that must exist in Sevdesk first
2. **Invalid Tax Configuration**: Tax rate or tax rule values not matching the account's configuration
3. **Missing Required Address Fields**: Street, city, zip, country all required
4. **E-invoice Validation Failures**: Missing buyerReference, vatNumber, or other e-invoice specific fields
5. **Status Transition Errors**: Cannot set status directly; must use dedicated endpoints
6. **Duplicate Invoice Numbers**: Custom invoice numbers that already exist

**Severity**: MEDIUM  
**Risk**: API returns generic errors that make debugging difficult.

**Mitigation**:

- Pre-validate all data before API calls
- Implement comprehensive error logging
- Create validation layer that mirrors Sevdesk requirements
- Store detailed error responses for support

---

## 5. Data Validation

### 5.1 Invoice Validation Requirements

**Finding**: Sevdesk performs server-side validation that may reject seemingly valid requests.

**Required Fields for Invoice Creation**:

- Contact (must pre-exist)
- Invoice date
- At least one line item with: name, quantity, unitPrice, taxRate
- Complete billing address (name, street, zip, city, country)
- Accounting type reference for line items

**E-invoice Additional Requirements**:

For e-invoice (XRechnung/ZUGFeRD) creation:

- sevClient: vatNumber, taxNumber, contactPhone, contactEmail, bankBic, bankIban
- Contact: email, buyerReference (USt-IdNr for B2B)
- Invoice: addressCountry, addressCity, addressZip, addressStreet, paymentMethod

**Source**: [sevDesk Tech Blog - E-Invoice API](https://tech.sevdesk.com/api_news/posts/2024_11_15-einvoice_changes/) [5/5]

### 5.2 Tax Validation

**Finding**: Tax configuration must exactly match the account's system version and settings.

**System v1 Tax Types**: default, eu, ss, noteu  
**System v2 Tax Rules**: Numeric codes 1-21 (different meaning than v1)

**Severity**: HIGH  
**Risk**: Wrong tax configuration results in validation failures or incorrect tax calculations.

---

## 6. German Accounting Compliance (GoBD)

### 6.1 GoBD Compliance Status

**Finding**: Sevdesk markets itself as GoBD-compliant software. However, integrations must maintain compliance.

**Key Requirements**:

- Digital accounting with audit trail
- Manipulation protection (changes logged)
- 10-year data retention
- Correct tax calculation and revenue posting

**Source**: [sevdesk.com](https://www.sevdesk.com/) [4/5]

### 6.2 Compliance Gotchas

**Identified Risks**:

1. **Invoice Number Sequence**: Automated systems must not create gaps in invoice numbering (violates German law)
2. **Date Requirements**: Invoice date, delivery date, and due date have specific legal requirements
3. **Required Fields**: German law requires specific fields that may not be obvious (payment terms, VAT ID for B2B)
4. **E-invoice Mandate**: Germany is implementing mandatory e-invoicing (2025: receive, 2028: issue)

**Severity**: MEDIUM-HIGH  
**Risk**: Non-compliant invoices can result in tax authority issues.

**Recommendation**: Enable e-invoice support in integrations to prepare for 2028 mandate.

---

## 7. Contact and Invoice Limits

### 7.1 Storage Limits

**Finding**: Specific storage limits are not publicly documented for the API.

**Known Information**:

- Limits appear to be plan-dependent
- No explicit API-based limits found in documentation
- Community reports suggest very large datasets (10,000+ invoices) work with pagination

**Severity**: LOW (for typical Shopify integration)  
**Risk**: Very high volume stores may encounter limits.

### 7.2 Data Volume Considerations

**Finding**: With 1000-record pagination limit, large datasets require multiple API calls.

**Calculation Example**:

- 10,000 invoices = 10 API calls
- 100,000 invoices = 100 API calls

**Severity**: MEDIUM  
**Risk**: Data synchronization operations become slow for large datasets.

---

## 8. Community and Developer Issues

### 8.1 Documentation Quality Issues

**Finding**: Multiple community sources report documentation problems.

**Evidence**:

- Unofficial OpenAPI documentation project exists specifically to address official docs issues ([j-mastr/sevdesk-api](https://github.com/j-mastr/sevdesk-api)) [3/5]
- README states: "The official API documentation is sometimes inaccurate, frequently updated and the updates are poorly communicated"
- Developer blog posts confirm: "Creating invoices via the API... can be quite frustrating" ([Martin Appelmann](https://martin-appelmann.de/en/blog/laravel-sevdesk-creating-invoices-via-api/)) [3/5]

**Severity**: MEDIUM-HIGH  
**Risk**: Developers spend significant time on debugging and trial-and-error.

### 8.2 SDK Limitations

**Finding**: Limited official SDK support; community SDKs have varying quality.

| Language | Library | Stars | Status |
|----------|---------|-------|--------|
| PHP | sevdesk-php-client | 11 | Active but community-maintained |
| PHP | sevdesk-php-sdk | 6 | Auto-generated, community-maintained |
| Go | gowizzard/sevdesk | 5 | Community |
| Python | dltHub/dlt | N/A | Integration platform |
| Node.js | None | N/A | No official or major community SDK |

**Severity**: MEDIUM  
**Risk**: Node.js/JavaScript integrations must implement HTTP client manually.

### 8.3 Authentication Security

**Finding**: API key authentication only; no OAuth 2.0.

**Security Considerations**:

- API key provides full account access
- No granular permissions or scopes
- No token expiration or rotation
- Key must be stored securely (not in client-side code)

**Severity**: MEDIUM  
**Risk**: Compromised API key grants full access to accounting data.

---

## 9. Integration Platform Feedback

### 9.1 Make (formerly Integromat) Experience

**Observations from Make Sevdesk module documentation**:

- Modules support: create, book, retrieve, search, cancel, delete invoices
- Send invoice via email
- Render and retrieve PDF
- Mark as sent
- Check partial payment status

**Module Reliability**: Generally stable for standard operations.

### 9.2 Common Integration Patterns

**Successful patterns reported**:

1. Contact lookup before invoice creation (by email)
2. Caching contact IDs to reduce API calls
3. Storing Shopify order ID in Sevdesk for reconciliation
4. Using webhook + polling hybrid for reliability

---

## 10. Risk Summary Table

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| API breaking changes | HIGH | Frequent | Integration breakage | Monitor tech blog, version detection |
| System version differences | HIGH | Constant | Incorrect data | Check version before API calls |
| Pagination limits (new) | HIGH | Implemented | Query failures | Update to limit=1000 |
| Undocumented rate limits | MEDIUM | Possible | Throttling | Exponential backoff |
| Webhook reliability | MEDIUM | Occasional | Missed events | Polling reconciliation |
| Documentation quality | MEDIUM | Constant | Development time | Community resources |
| Tax validation errors | HIGH | Frequent | Invoice rejection | Pre-validation layer |
| GoBD compliance | MEDIUM | Constant | Legal risk | Enable e-invoice support |
| E-invoice requirements | MEDIUM | Upcoming | 2028 mandate | Prepare now |
| SDK limitations | MEDIUM | Constant | Development time | Manual HTTP implementation |

---

## 11. Recommendations

### Critical (Implement Before Production)

1. **System Version Detection**: Always check system version via `/api/v1/CheckAccount` before making API calls
2. **Pagination Compliance**: Use `limit=1000` maximum (effective May 30, 2025)
3. **Contact Pre-existence**: Never attempt invoice creation without valid contact ID
4. **Error Handling**: Implement comprehensive error logging with full response capture

### High Priority

5. **Exponential Backoff**: Implement retry logic with exponential backoff for all API calls
6. **Idempotency**: Design webhook handlers to handle duplicate deliveries
7. **Reconciliation**: Implement periodic polling to catch missed webhook events
8. **E-invoice Readiness**: Prepare for XRechnung/ZUGFeRD requirements for B2B customers

### Medium Priority

9. **API Key Security**: Store API keys securely; rotate periodically
10. **Monitoring**: Set up alerts for API error rate increases
11. **Testing**: Test with both system v1 and v2 accounts if possible

---

## 12. Sources

### Primary Sources (Authoritative)

- [sevDesk Tech Blog - API News](https://tech.sevdesk.com/api_news/) [5/5]
- [sevDesk Tech Blog - Pagination Limits](https://tech.sevdesk.com/api_news/posts/2025_03_11-api_pagination_limits/) [5/5]
- [sevDesk Tech Blog - System Update 2.0](https://tech.sevdesk.com/api_news/posts/2024_04_04-system-update-breaking-changes/) [5/5]
- [sevDesk Tech Blog - E-Invoice API](https://tech.sevdesk.com/api_news/posts/2024_11_15-einvoice_changes/) [5/5]
- [sevDesk Tech Blog - Status Changes](https://tech.sevdesk.com/api_news/posts/2024_04_04-changing-status-invoices-cretid-notes/) [5/5]

### Community Sources

- [j-mastr/sevdesk-api - Unofficial OpenAPI](https://github.com/j-mastr/sevdesk-api) [3/5]
- [Pommespanzer/sevdesk-php-client](https://github.com/Pommespanzer/sevdesk-php-client) [3/5]
- [Martin Appelmann - Laravel Sevdesk](https://martin-appelmann.de/en/blog/laravel-sevdesk-creating-invoices-via-api/) [3/5]
- [apitracker.io - sevDesk API](https://apitracker.io/a/sevdesk) [3/5]
- [Make - Sevdesk Integration](https://apps.make.com/sevdesk) [3/5]

---

## Appendix A: Key API Endpoints

| Resource | Endpoint | Notes |
|----------|----------|-------|
| Invoice Create | POST /Invoice | Requires contact ID first |
| Invoice Status | PUT /Invoice/{id}/bookAmount | Use for payment tracking |
| Contact Create | POST /Contact | Must exist before invoice |
| Check Version | GET /CheckAccount | Determines v1 vs v2 |
| E-invoice XML | GET /Invoice/{id}/getXml | XRechnung format |

---

## Appendix B: Severity Rating Criteria

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| **CRITICAL** | Immediate production impact | Fix before launch |
| **HIGH** | Likely to cause issues | Implement mitigation |
| **MEDIUM** | May cause issues | Monitor and plan |
| **LOW** | Minor impact | Accept risk |

---

*Document created: 2026-02-17*  
*Research completed: 2026-02-17 21:30:00*
