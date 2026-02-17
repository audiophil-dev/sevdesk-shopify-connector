# Shopify-Sevdesk Connector: Comprehensive Knowledge Synthesis

**Project**: Custom Shopify app for bidirectional order and invoice synchronization  
**Status**: Planning complete, ready for implementation  
**Date**: 2026-02-17  
**Hosting Decision**: Uberspace (EUR 6-9/month)  
**Overall Risk**: Medium (viable with mitigations)

---

## Executive Summary

This document synthesizes all research, architectural decisions, implementation guidance, and risk assessments for building a custom Shopify app that synchronizes orders to Sevdesk invoices and payment status bidirectionally.

### Project Overview

**Business Goal**: Automate the order-to-invoice workflow for a small German e-commerce business using Shopify and Sevdesk accounting software, reducing manual data entry and ensuring accurate financial records.

**Technical Approach**: Build a custom Shopify app (not public app) deployed on Uberspace that receives Shopify webhooks, creates Sevdesk invoices via API, and optionally syncs payment status back to Shopify.

**Key Decisions**:
- Custom Shopify app (no approval process needed)
- Uberspace hosting (EUR 6-9/month, no cold starts)
- Node.js with TypeScript
- PostgreSQL for state tracking
- Webhook-first architecture with polling fallback

### Cost Summary

| Component | Monthly Cost |
|-----------|--------------|
| Uberspace hosting | EUR 6-9 (~$6.50-9.75) |
| PostgreSQL database | Included |
| Backups | Included |
| Shopify Basic | $29 (existing) |
| Sevdesk | Existing subscription |
| **Total additional** | **EUR 6-9/month** |

### Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Setup | 2-4 hours | Custom app created, deployed to Uberspace |
| 2. Shopify → Sevdesk | 4-6 hours | Orders sync to Sevdesk invoices |
| 3. Sevdesk → Shopify | 4-6 hours | Payments update Shopify orders (optional) |
| 4. Polish | 2-4 hours | Error handling, logging, testing |
| **Total** | **12-20 hours** | Working bidirectional sync |

### Risk Level: Medium

**Critical Risks** (must address before production):
- Webhook spoofing (mitigation: HMAC-SHA256 verification)
- 2026 Shopify auth changes (mitigation: design for OAuth from start)
- Sevdesk system version differences (mitigation: detect version via API)

**High Risks** (address in Phase 1):
- Webhook duplicates (mitigation: idempotency using `X-Shopify-Webhook-Id`)
- Webhook delivery failures (mitigation: respond in <5 seconds, polling fallback)
- API breaking changes (mitigation: monitor tech blog, version detection)
- Tax validation errors (mitigation: pre-validate tax configuration)

---

## Document Navigation

This synthesis is organized into the following sections:

1. [Architecture Decision](#1-architecture-decision)
2. [Shopify API Capabilities](#2-shopify-api-capabilities)
3. [Sevdesk API Capabilities](#3-sevdesk-api-capabilities)
4. [Integration Patterns](#4-integration-patterns)
5. [Technology Stack](#5-technology-stack)
6. [Risk Assessment](#6-risk-assessment)
7. [Implementation Guide](#7-implementation-guide)
8. [Security Requirements](#8-security-requirements)
9. [Hosting Configuration](#9-hosting-configuration)
10. [Ongoing Maintenance](#10-ongoing-maintenance)

---

## 1. Architecture Decision

### 1.1 Decision: Custom App on Uberspace

**Date**: 2026-02-17  
**Status**: Approved

#### Why Custom App?

Custom apps are created directly in Shopify Admin and are only usable by the store that created them. This approach is ideal because:

- No approval process required
- Instant setup
- Same API access as public apps
- No OAuth flow needed (tokens generated directly)
- Can convert to public app later if needed

#### Why Uberspace?

Uberspace provides the best balance for this use case:

| Factor | Uberspace | Railway (Alternative) |
|--------|-----------|---------------------|
| Cold starts | None - always-on server | Critical - 15-22s delays, 502 errors |
| Pricing | Fixed EUR 6-9/month | Variable $10-15/month |
| Database | PostgreSQL included | Extra cost |
| Backups | Daily/weekly included | Manual |
| Platform stability | Operating since 2010 | Multiple incidents 2025-2026 |
| Location | Germany (GDPR-friendly) | US/EU regions |

#### Why Not Existing Solutions?

| Option | Cost | Bidirectional | Why Not |
|--------|------|---------------|---------|
| sevdesk Shopify app | $13/month | No | No payment status sync back to Shopify |
| Integration platform (Make/Integrately) | Free-$20/month | Possible | Less control, external dependency, learning curve |
| Production-grade connector (AWS Lambda) | $5-20/month | Yes | Overkill for small shop with few orders/week |

### 1.2 System Architecture

```mermaid
graph TD
    %% System Architecture Overview
    
    subgraph External ["External Services"]
        Shopify[Shopify Store API]
        Sevdesk[Sevdesk API]
    end
    style External fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Uberspace ["Uberspace Hosting"]
        WebhookEndpoint[Webhook Endpoint]
        Reconciliation[Reconciliation Job]
        Database[(PostgreSQL)]
    end
    style Uberspace fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Shopify -- "1. Order Paid Event" --> WebhookEndpoint
    WebhookEndpoint -- "2. Create Invoice" --> Sevdesk
    WebhookEndpoint -- "3. Log Sync State" --> Database
    Reconciliation -- "4. Poll Orders" --> Shopify
    Reconciliation -- "5. Retry Failed" --> Sevdesk
    Reconciliation -- "6. Update State" --> Database
    
    %% Classes
    class Shopify,Sevdesk software;
    class WebhookEndpoint,Reconciliation software;
    class Database files;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the core system flow:

- `Shopify Store API`: Triggers order/paid webhook events
- `Webhook Endpoint`: Receives webhooks, creates invoices (real-time)
- `Reconciliation Job`: Polls for missed orders, retries failures (5-10 min cycle)
- `Sevdesk API`: Invoice and contact management
- `PostgreSQL`: Tracks sync state, idempotency, retry counts

### 1.3 Data Flow

**Shopify → Sevdesk (Primary Flow)**:
1. Customer places order in Shopify
2. Shopify sends `orders/create` or `orders/paid` webhook
3. Custom app receives webhook, verifies HMAC signature
4. App checks idempotency key (prevents duplicates)
5. App finds or creates Sevdesk contact by customer email
6. App creates Sevdesk invoice with order details
7. App stores sync state in PostgreSQL

**Sevdesk → Shopify (Optional Flow)**:
1. Customer pays via bank transfer (outside Shopify)
2. Payment recorded in Sevdesk
3. Sevdesk sends webhook (if configured)
4. Custom app receives notification
5. App updates Shopify order financial status to "paid"

---

## 2. Shopify API Capabilities

### 2.1 Webhooks

Shopify provides robust webhook infrastructure for real-time order notifications.

#### Available Events

| Event Topic | Description | Use Case |
|-------------|-------------|----------|
| `orders/create` | Order created | Initial order sync |
| `orders/paid` | Payment received | Payment sync (recommended) |
| `orders/updated` | Order modified | Update existing invoice |
| `orders/cancelled` | Order cancelled | Cancel invoice |
| `transactions/create` | Transaction created | Detailed payment tracking |
| `refunds/create` | Refund issued | Create credit note |

**Recommendation**: Use `orders/paid` webhook as primary trigger. It provides immediate notification when payment succeeds, meeting sub-5-minute latency requirement.

#### Webhook Headers

Every webhook includes these headers:

| Header | Purpose |
|--------|---------|
| `X-Shopify-Topic` | Event type |
| `X-Shopify-Hmac-Sha256` | Signature for verification |
| `X-Shopify-Shop-Domain` | Store domain |
| `X-Shopify-Webhook-Id` | Unique ID (use for idempotency) |
| `X-Shopify-Triggered-At` | Event timestamp |

#### Retry Behavior

- **Timeout**: 5 seconds for 200 OK response
- **Retries**: Up to 8 attempts over ~4 hours (exponential backoff)
- **Subscription deletion**: After 8 failures, webhook subscription auto-deleted
- **Warning**: Notifications sent to emergency developer email before deletion

**Critical**: Always respond within 5 seconds. Process business logic asynchronously.

### 2.2 Order Data Structure

#### GraphQL vs REST

**Important**: REST Admin API is legacy as of October 1, 2024. All new apps must use GraphQL Admin API starting April 1, 2025.

#### Key Order Fields for Invoice Creation

```graphql
query GetOrder($id: ID!) {
  order(id: $id) {
    # Order identification
    id
    name                  # Order number (e.g., "#1001")
    processedAt
    
    # Financial status - KEY for payment sync
    financialStatus       # PENDING, AUTHORIZED, PAID, etc.
    
    # Financial data
    totalPriceSet {
      shopMoney {
        amount
        currencyCode
      }
    }
    subtotalPriceSet { shopMoney { amount } }
    totalTaxSet { shopMoney { amount } }
    totalShippingPriceSet { shopMoney { amount } }
    
    # Customer
    customer {
      id
      email
      firstName
      lastName
    }
    
    # Billing address - REQUIRED for Sevdesk invoice
    billingAddress {
      firstName
      lastName
      company
      address1
      address2
      city
      zip
      country
      countryCode
    }
    
    # Line items
    lineItems(first: 50) {
      edges {
        node {
          title
          variantTitle
          quantity
          originalTotalSet { shopMoney { amount } }
          taxLines {
            title
            priceSet { shopMoney { amount } }
          }
        }
      }
    }
  }
}
```

#### Financial Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Payment pending |
| `AUTHORIZED` | Payment authorized but not captured |
| `PARTIALLY_PAID` | Partial payment |
| `PAID` | Fully paid |
| `PARTIALLY_REFUNDED` | Partial refund |
| `REFUNDED` | Full refund |
| `VOIDED` | Authorization voided |

### 2.3 Authentication

#### OAuth 2.0 (Required as of Jan 1, 2026)

Starting January 1, 2026, new custom apps require OAuth-based token management with expiring tokens (24-hour expiry). Legacy static tokens no longer available.

**Authorization Code Flow**:
1. Redirect merchant to authorization URL
2. Merchant authorizes app
3. Exchange authorization code for access token
4. Store token securely (encrypted at rest)
5. Implement token refresh before expiration

**Required Scopes**:
```
read_orders, write_orders, read_customers, read_transactions, read_refunds
```

**Optional Scope** (requires approval):
```
read_all_orders  # Access orders beyond 60 days
```

### 2.4 Rate Limits

#### GraphQL Admin API

Uses calculated query cost system:

| Plan Tier | Rate Limit | Bucket Size |
|-----------|------------|-------------|
| Standard | 100 points/second | ~6000 points |
| Shopify Plus | 1000 points/second | ~60000 points |

**Single query limit**: 1,000 points maximum

**Best Practices**:
- Only request needed fields
- Implement client-side throttling
- Track remaining budget in response headers
- Use exponential backoff on 429 errors

### 2.5 Critical Limitations

1. **No Email API**: Cannot send transactional emails via Shopify API. Must use external service (SendGrid, Mailgun).
2. **60-day Order Limit**: Default access limited to last 60 days. Requires `read_all_orders` scope for historical data.
3. **No Guaranteed Webhook Delivery**: Must implement polling reconciliation as backup.
4. **Webhook Ordering Not Guaranteed**: `orders/updated` may arrive before `orders/create`. Use timestamps for ordering.

---

## 3. Sevdesk API Capabilities

### 3.1 Invoice Creation

#### Primary Endpoint

```
POST https://my.sevdesk.de/api/v1/Invoice
```

#### Required Components

1. **Contact** (customer) - Must exist before invoice creation
2. **Invoice Header**:
   - `invoiceDate` - Date of invoice
   - `deliveryDate` - Optional delivery date
   - `contact` - Reference to contact ID
   - `invoiceType` - Type (RE, AR, TR, ER, GU)
   - `status` - Initial status (100 = Draft)

3. **Address**:
   - `name` - Contact name
   - `street` - Street address
   - `zip` - Postal code
   - `city` - City
   - `country` - Country code

4. **Line Items** - Invoice positions:
   - `name` - Item description
   - `quantity` - Number of units
   - `unitPrice` - Price per unit
   - `taxRate` - VAT percentage

#### Example Request

```json
{
  "invoice": {
    "invoiceDate": "2026-02-17",
    "deliveryDate": "2026-02-17",
    "contact": {
      "id": 12345,
      "objectName": "Contact"
    },
    "invoiceType": "RE",
    "status": 100,
    "address": {
      "name": "Max Mustermann",
      "street": "Musterstraße 123",
      "zip": "12345",
      "city": "Berlin",
      "country": "DE"
    }
  },
  "invoicePosSave": [
    {
      "name": "Product Name",
      "quantity": 2,
      "unitPrice": 49.99,
      "taxRate": 19
    }
  ]
}
```

### 3.2 Contact Management

#### Create Contact

```
POST https://my.sevdesk.de/api/v1/Contact
```

**Workflow for Shopify Integration**:
1. Search for existing contact by email: `GET /Contact?email={email}`
2. If not found, create new contact with Shopify customer data
3. Store contact ID for invoice creation

**Required Fields**:
- `name` - Full name or company name
- `email` - Contact email
- `customerNumber` - Optional (can use Shopify customer ID)

**Optional Fields**:
- `firstName`, `lastName` - For person contacts
- `phone` - Phone number

### 3.3 Authentication

**API Key Authentication Only** (no OAuth):

```
Authorization: SEVDESK_API_KEY
```

Or via query parameter:
```
https://my.sevdesk.de/api/v1/Invoice?token=SEVDESK_API_KEY
```

**Important Change (February 2025)**: Older authentication method removed. Ensure using documented API token authentication.

### 3.4 Rate Limits

**Pagination Limits** (effective May 30, 2025):
- Maximum: 1000 records per request
- Minimum: 1 record
- Invalid limits return HTTP 400

**General Rate Limits**: Not publicly documented. Implement exponential backoff for 429 responses.

### 3.5 Invoice Status Management

#### Status Codes

| Status | Name | Description |
|--------|------|-------------|
| 50 | Deactivated | Recurring invoice deactivated |
| 100 | Draft | Invoice created but not sent |
| 200 | Open | Invoice sent, awaiting payment |
| 500 | Partially Paid | Partial payment received |
| 1000 | Paid | Fully paid |

#### Changing Status

**Important**: As of April 2024, manual status changes deprecated. Use dedicated endpoints:

- `PUT /Invoice/{id}/bookAmount` - Mark as paid
- `PUT /Invoice/{id}/resetToOpen` - Reset to open
- `PUT /Invoice/{id}/resetToDraft` - Reset to draft
- `PUT /Invoice/{id}/sendBy` - Mark as sent
- `POST /Invoice/{id}/sendViaEmail` - Send via email

### 3.6 Tax Handling

#### German Accounting Requirements

Sevdesk supports all German tax requirements:
- Standard VAT (19%, 7%)
- Reverse Charge (§18b UStG)
- OSS (One-Stop-Shop for EU)
- Non-EU services

#### System Version Differences

Sevdesk operates two parallel systems with different tax handling:

| Feature | System v1 | System v2 |
|---------|-----------|-----------|
| Tax handling | `taxType` (string) | `taxRule` (numeric 1-21) |
| Status changes | Direct modification | Must use endpoints |
| E-invoice | Since Dec 2024 | Since Nov 2024 |

**Critical**: Call `/api/v1/CheckAccount` on startup to detect which system version the account uses, then adjust tax fields accordingly.

### 3.7 E-Invoice Support (XRechnung/ZUGFeRD)

As of November 2024, Sevdesk supports e-invoice creation:

- Set `propertyIsEInvoice: true` on invoice
- XML embedded in PDF (ZUGFeRD format)
- Get standalone XML via `/Invoice/{id}/getXml`
- Supported for both system versions

**Required Data**:
- sevClient: vatNumber, taxNumber, contactPhone, contactEmail, bankBic, bankIban
- Contact: email, buyerReference
- Invoice: addressCountry, addressCity, addressZip, addressStreet, paymentMethod

### 3.8 German Accounting Compliance

**GoBD Compliance**: Sevdesk is GoBD-compliant out of the box. Invoices are automatically numbered, archived, and audit-proof.

**E-Invoice Mandate**: Germany requires e-invoices for B2B transactions. Sevdesk supports XRechnung and ZUGFeRD formats.

---

## 4. Integration Patterns

### 4.1 Architecture Recommendation: Webhook-First with Polling Fallback

For the Shopify-Sevdesk connector, a hybrid architecture provides optimal reliability:

**Primary**: Webhook-based event-driven architecture
- Handles 95%+ of events in real-time
- Sub-5-minute latency for payment sync

**Fallback**: Periodic polling reconciliation
- Runs every 5-10 minutes
- Catches missed webhooks
- Ensures zero data loss

### 4.2 Reliability Patterns

#### 4.2.1 HMAC Signature Verification

**Purpose**: Prevent webhook spoofing attacks

```javascript
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

**Implementation**:
- Verify BEFORE any business logic
- Use timing-safe comparison
- Log all verification failures
- Reject invalid signatures with 401

#### 4.2.2 Idempotency

**Purpose**: Prevent duplicate invoice creation when webhooks are delivered multiple times

**Implementation**:
- Use `X-Shopify-Webhook-Id` as idempotency key
- Store processed webhook IDs in database
- Check for duplicates before processing
- Return success immediately if already processed

**Database Schema**:
```sql
CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,  -- X-Shopify-Webhook-Id
  shopify_order_id VARCHAR(255),
  status VARCHAR(50),
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.2.3 Retry Logic with Exponential Backoff

**Purpose**: Handle transient failures without overwhelming services

**Configuration**:
- Initial delay: 1 second
- Max delay: 30 seconds
- Multiplier: 2x
- Jitter: ±20% (prevent thundering herd)
- Max retries: 5

**Retryable Errors**:
- Network timeouts
- 429 (Rate Limited)
- 503 (Service Unavailable)
- 5xx server errors

**Non-Retryable Errors**:
- 400 Bad Request (invalid payload)
- 401 Unauthorized (wrong credentials)
- 404 Not Found (resource doesn't exist)
- 422 Unprocessable Entity (validation failed)

#### 4.2.4 Dead Letter Queue (DLQ)

**Purpose**: Capture failed messages for manual recovery

**When to Move to DLQ**:
- After max retries exhausted
- Non-retryable errors
- Circuit breaker open

**DLQ Processing**:
- Manual review and correction
- Replay after fixes
- Alert on DLQ depth > threshold

#### 4.2.5 Circuit Breaker

**Purpose**: Prevent cascading failures when downstream service is unavailable

**States**:
- **CLOSED**: Normal operation
- **OPEN**: Service failing, fail fast
- **HALF_OPEN**: Testing recovery

**Configuration**:
- Failure threshold: 5 consecutive failures
- Timeout: 60 seconds
- Success threshold to close: 2 consecutive successes

### 4.3 Queue-First Pattern

**Recommended Implementation**:

```
Webhook Receiver:
1. Verify HMAC signature
2. Persist payload to message queue or database
3. Return 200 OK immediately (< 100ms)

Worker Process (async):
1. Read from queue
2. Check idempotency
3. Process business logic (create Sevdesk invoice)
4. Acknowledge message on success
5. Retry with backoff on failure
6. Move to DLQ after max retries
```

**Benefits**:
- Fast webhook acknowledgment (< 5 seconds)
- Decouples receipt from processing
- Enables retry without re-delivery
- Survives application crashes

---

## 5. Technology Stack

### 5.1 Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | Node.js 20.x + TypeScript | Best Shopify SDK support, async handling |
| Framework | Express.js | Lightweight, well-documented |
| Deployment | Uberspace (supervisord) | No cold starts, fixed cost, Germany-based |
| Database | PostgreSQL | ACID compliance, JSON support, included with Uberspace |
| Monitoring | Logs + Sentry (optional) | Simple error tracking, free tier |

### 5.2 Node.js SDK Support

#### Shopify

**Official SDK**: `@shopify/shopify-api`
- 263,000+ weekly npm downloads
- Full authentication, webhook handling, GraphQL/REST support
- Active maintenance

#### Sevdesk

**No Official SDK**: Direct REST API calls recommended
- Use `fetch` or `axios` for HTTP requests
- Well-documented API at api.sevdesk.de
- Simple API key authentication

### 5.3 Alternative Stack (If Scaling Needed Later)

**Enterprise-Grade Stack** (for higher order volumes):

| Component | Technology | Monthly Cost |
|-----------|------------|--------------|
| Compute | AWS Lambda | $0-5 |
| Database | Supabase (free tier) | $0 |
| Queue | AWS SQS | $0-2 |
| Monitoring | Prometheus + Grafana | $0-10 |
| **Total** | | **$1-20/month** |

**When to Consider**:
- Order volume > 1000/month
- Need for advanced queuing
- Multi-region deployment
- Complex retry logic

---

## 6. Risk Assessment

### 6.1 Overall Risk Level: Medium

The project is **viable with mitigations**. Hosting on Uberspace eliminates cold start risk that was critical with Railway.

### 6.2 Critical Risks (Must Address Before Production)

#### Risk 1: Webhook Spoofing

**Severity**: Critical  
**Likelihood**: Medium if not mitigated  
**Impact**: Duplicate invoices, financial record manipulation

**Mitigation**:
```javascript
// REQUIRED: HMAC-SHA256 verification on EVERY webhook
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

**Implementation Priority**: Phase 1 (before production)  
**Effort**: 1 hour

#### Risk 2: 2026 Shopify Authentication Changes

**Severity**: Critical  
**Likelihood**: High (already in effect for new apps)  
**Impact**: App cannot access Shopify API if not prepared

**Mitigation**:
- Design for OAuth token management from start
- Implement secure token storage (encrypted at rest)
- Build token refresh logic that triggers before expiration
- Monitor token expiration and alert on failures

**Implementation Priority**: Phase 1 (before production)  
**Effort**: 4 hours

#### Risk 3: Sevdesk System Version Differences

**Severity**: High  
**Likelihood**: Medium (depends on account)  
**Impact**: Invoice creation failures due to wrong tax fields

**Mitigation**:
```javascript
// Call on startup
async function detectSystemVersion() {
  const result = await sevdeskRequest('/CheckAccount');
  return result.systemVersion; // 'v1' or 'v2'
}

// Adjust tax handling
function getTaxConfig(systemVersion, taxRate) {
  if (systemVersion === 'v2') {
    return { taxRule: mapTaxRateToRule(taxRate) };
  }
  return { taxType: 'default', taxRate };
}
```

**Implementation Priority**: Phase 1 (before production)  
**Effort**: 1 hour

### 6.3 High Risks (Address in Phase 1)

#### Risk 4: Webhook Duplicates

**Severity**: High  
**Likelihood**: Medium (Shopify retries up to 8 times)  
**Impact**: Duplicate invoices, incorrect accounting

**Mitigation**:
- Implement idempotency using `X-Shopify-Webhook-Id`
- Store processed webhook IDs in database
- Check for duplicates before processing

**Implementation Priority**: Phase 1  
**Effort**: 2 hours

#### Risk 5: Webhook Delivery Failures

**Severity**: High  
**Likelihood**: Medium (network issues, downtime)  
**Impact**: Missed orders, incomplete accounting

**Mitigation**:
- Respond within 5 seconds (queue-first pattern)
- Implement polling reconciliation job (every 5-10 minutes)
- Monitor webhook subscription status

**Implementation Priority**: Phase 2  
**Effort**: 3 hours

#### Risk 6: API Breaking Changes

**Severity**: High  
**Likelihood**: Low-Medium (Sevdesk releases 2-4 breaking changes/year)  
**Impact**: Integration breaks without warning

**Mitigation**:
- Subscribe to sevDesk Tech Blog RSS feed
- Implement version detection
- Schedule quarterly API reviews
- Build flexible API client

**Implementation Priority**: Phase 2  
**Effort**: Ongoing

#### Risk 7: Tax Validation Errors

**Severity**: High  
**Likelihood**: Medium (wrong tax config causes rejection)  
**Impact**: Invoice creation failures

**Mitigation**:
- Pre-validate tax configuration on app startup
- Store tax rules for the account
- Validate line items before API call
- Log detailed error responses

**Implementation Priority**: Phase 1  
**Effort**: 2 hours

### 6.4 Medium Risks (Address in Phase 2)

| Risk | Mitigation |
|------|------------|
| API rate limits | Implement queuing and backoff |
| Undocumented Sevdesk rate limits | Exponential backoff, monitor |
| DDoS via webhooks | Rate limiting, queue-based processing |
| Documentation quality | Use community resources, test thoroughly |

### 6.5 Mitigation Implementation Priority

#### Phase 1: Before Production (Critical)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 1 | HMAC signature verification | 1 hour |
| 2 | Idempotency key tracking | 2 hours |
| 3 | Sevdesk system version detection | 1 hour |
| 4 | Environment variable secrets | 30 minutes |

#### Phase 2: First Month (High)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 5 | OAuth token management | 4 hours |
| 6 | Timestamp validation | 1 hour |
| 7 | Reconciliation job | 3 hours |
| 8 | Error handling and logging | 3 hours |

#### Phase 3: Ongoing (Medium)

| Priority | Mitigation | Effort |
|----------|------------|--------|
| 9 | Rate limiting | 2 hours |
| 10 | Circuit breaker | 2 hours |
| 11 | Secret rotation process | 1 hour |
| 12 | Quarterly API reviews | Ongoing |

---

## 7. Implementation Guide

### 7.1 Part 1: Create Custom App in Shopify

#### Step 1: Create the App

1. Log in to Shopify Admin
2. Go to **Settings** > **Apps and sales channels**
3. Click **Develop apps** (bottom of page)
4. Click **Create an app**
5. Name it: `Sevdesk Sync`
6. Click **Create app**

#### Step 2: Configure API Scopes

1. In the app, click **Configuration**
2. Under **Admin API integration**, click **Configure**
3. Select these scopes:

| Scope | Access | Purpose |
|-------|--------|---------|
| `read_orders` | Read | Receive order webhooks |
| `write_orders` | Write | Update order status |
| `read_customers` | Read | Get customer data for invoices |
| `read_transactions` | Read | Access payment info |

4. Click **Save**

#### Step 3: Install and Get Credentials

1. Click **Install app**
2. Confirm installation
3. **Immediately save the Admin API access token** (shown only once)
4. Note the API key and secret from the Credentials tab

#### Step 4: Get Webhook Secret

1. Go to **Configuration** > **Webhooks**
2. Note the **Webhook signing secret** - needed for HMAC verification

### 7.2 Part 2: Project Setup

#### Step 1: Initialize Project

```bash
mkdir sevdesk-sync
cd sevdesk-sync
npm init -y
npm install express crypto dotenv pg
```

#### Step 2: Project Structure

```
sevdesk-sync/
├── src/
│   ├── index.js           # Main server
│   ├── routes/
│   │   └── webhooks.js    # Webhook handlers
│   ├── services/
│   │   ├── shopify.js     # Shopify API client
│   │   └── sevdesk.js     # Sevdesk API client
│   └── utils/
│       └── verify.js      # Webhook signature verification
├── .env                   # Environment variables (not in git)
├── .env.example           # Template for env vars
├── package.json
└── README.md
```

#### Step 3: Environment Variables

Create `.env.example`:

```env
# Shopify
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_WEBHOOK_SECRET=whsec_xxxxx

# Sevdesk
SEVDESK_API_KEY=xxxxx
SEVDESK_BASE_URL=https://my.sevdesk.de/api/v1

# Server
PORT=3000
NODE_ENV=production

# Database (optional - for idempotency tracking)
DATABASE_URL=postgresql://username:password@localhost/sevdesk
```

### 7.3 Part 3: Core Implementation

See the full implementation guide in `custom-app-implementation.md` for complete code examples including:

- Main server setup (Express.js)
- HMAC signature verification
- Sevdesk service (contact management, invoice creation)
- Shopify service (order updates)
- Webhook route handlers
- Error handling and retry logic

### 7.4 Part 4: Deploy to Uberspace

#### Step 1: Create Account

1. Go to [uberspace.de](https://uberspace.de)
2. Click **Join** to create account
3. Choose username (becomes `username.uber.space`)
4. First month free - no payment required initially

#### Step 2: SSH Setup

```bash
ssh username@username.uber.space
```

#### Step 3: Configure Node.js

```bash
# Check available versions
uberspace tools version list node

# Set Node.js version
uberspace tools version use node 20

# Verify
node --version
```

#### Step 4: Upload Code

```bash
# Option A: Clone from GitHub
git clone https://github.com/yourusername/sevdesk-sync.git
cd sevdesk-sync
npm install

# Option B: Upload via SCP
# From local machine:
scp -r ./sevdesk-sync username@username.uber.space:/home/username/
```

#### Step 5: Configure Environment

```bash
cd ~/sevdesk-sync
nano .env  # Copy values from .env.example
```

#### Step 6: Create Supervisord Service

```bash
# Create services directory
mkdir -p ~/etc/services.d

# Create daemon configuration
cat > ~/etc/services.d/sevdesk-sync.ini << 'EOF'
[program:sevdesk-sync]
directory=/home/username/sevdesk-sync
command=node src/index.js
autostart=true
autorestart=true
environment=NODE_ENV=production
stdout_logfile=/home/username/sevdesk-sync/logs/stdout.log
stderr_logfile=/home/username/sevdesk-sync/logs/stderr.log
EOF

# Create logs directory
mkdir -p ~/sevdesk-sync/logs
```

#### Step 7: Start Service

```bash
# Register service
supervisorctl reread
supervisorctl update

# Check status
supervisorctl status
# Should show: sevdesk-sync    RUNNING   pid 12345, uptime 0:00:05
```

#### Step 8: Configure Web Backend

```bash
# Connect to web server on port 3000
uberspace web backend set / --http --port 3000

# Verify
uberspace web backend list
```

#### Step 9: Test Deployment

```bash
curl https://username.uber.space/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 7.5 Part 5: Register Webhooks

Use this script to register Shopify webhook:

```javascript
// scripts/register-webhook.js
require('dotenv').config();

async function registerWebhook() {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/paid',
          address: 'https://username.uber.space/webhooks/shopify',
          format: 'json',
        },
      }),
    }
  );
  
  console.log(await response.json());
}

registerWebhook();
```

Run with: `node scripts/register-webhook.js`

---

## 8. Security Requirements

### 8.1 Critical Security Checklist

Before deploying to production, verify:

| Item | Status | Implementation |
|------|--------|----------------|
| HMAC signature verification | Required | Every webhook must be verified |
| Idempotency key tracking | Required | Prevents duplicate invoices |
| Environment variables for secrets | Required | Never hardcode secrets |
| HTTPS | Required | Automatic on Uberspace (Let's Encrypt) |
| Timestamp validation | Recommended | Reject webhooks older than 5 minutes |

### 8.2 HMAC Verification Implementation

```javascript
// src/utils/verify.js
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

module.exports = { verifyShopifyWebhook };
```

**Usage**:
```javascript
app.post('/webhooks/shopify', (req, res) => {
  const signature = req.headers['x-shopify-hmac-sha256'];
  
  if (!verifyShopifyWebhook(req.body, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
});
```

### 8.3 Secret Management

**DO**:
- Store secrets in environment variables
- Use `.env` file (not in git)
- Add `.env` to `.gitignore`
- Rotate secrets every 90 days
- Use separate secrets per environment

**DON'T**:
- Hardcode secrets in source code
- Commit secrets to version control
- Share secrets via email or chat
- Use production secrets in development

### 8.4 Replay Attack Prevention

```javascript
// Check timestamp to prevent replay attacks
function isRecentWebhook(timestamp, maxAgeMinutes = 5) {
  const webhookTime = new Date(timestamp);
  const now = new Date();
  const ageMinutes = (now - webhookTime) / 1000 / 60;
  return ageMinutes <= maxAgeMinutes;
}

app.post('/webhooks/shopify', (req, res) => {
  const timestamp = req.headers['x-shopify-triggered-at'];
  
  if (!isRecentWebhook(timestamp)) {
    return res.status(400).send('Webhook too old');
  }
  
  // Continue processing
});
```

---

## 9. Hosting Configuration

### 9.1 Uberspace Configuration

#### PostgreSQL Setup (Optional but Recommended)

```bash
# Create database
uberspace database create postgresql sevdesk

# Note connection details
# Add to .env:
# DATABASE_URL=postgresql://username:password@localhost/sevdesk
```

#### Database Schema

```sql
-- Sync state tracking
CREATE TABLE sync_state (
  id SERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(255) UNIQUE NOT NULL,
  sevdesk_invoice_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Idempotency tracking
CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  shopify_order_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
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

#### Monitoring Logs

```bash
# View stdout logs
tail -f ~/sevdesk-sync/logs/stdout.log

# View stderr logs
tail -f ~/sevdesk-sync/logs/stderr.log

# View supervisord status
supervisorctl status sevdesk-sync
```

### 9.2 Backup Strategy

**Automatic Backups** (included with Uberspace):
- Daily backups of home directory
- Weekly backups retained longer
- Database backups included

**Manual Backup**:
```bash
# PostgreSQL backup
pg_dump sevdesk > ~/backups/sevdesk-$(date +%Y%m%d).sql

# Code backup
tar -czf ~/backups/sevdesk-sync-$(date +%Y%m%d).tar.gz ~/sevdesk-sync/
```

### 9.3 Updating the Application

```bash
# SSH into Uberspace
ssh username@username.uber.space

# Navigate to app directory
cd ~/sevdesk-sync

# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart service
supervisorctl restart sevdesk-sync

# Check status
supervisorctl status
```

---

## 10. Ongoing Maintenance

### 10.1 Monitoring Checklist

**Daily**:
- Check service status: `supervisorctl status`
- Review error logs: `tail ~/sevdesk-sync/logs/stderr.log`

**Weekly**:
- Review successful orders synced
- Check for failed syncs in database
- Monitor DLQ depth (if implemented)

**Monthly**:
- Review webhook subscription status in Shopify
- Check for Sevdesk API changes (tech blog)
- Test end-to-end flow with test order

**Quarterly**:
- Review and update dependencies
- Rotate API keys and secrets
- Review rate limit usage
- Test disaster recovery

### 10.2 Common Issues and Solutions

#### Issue: Webhook Subscription Deleted

**Symptom**: Orders not syncing to Sevdesk

**Cause**: 8 consecutive webhook delivery failures

**Solution**:
1. Check service status: `supervisorctl status`
2. Review error logs
3. Fix underlying issue
4. Re-register webhook using script

#### Issue: Duplicate Invoices Created

**Symptom**: Same order creates multiple invoices in Sevdesk

**Cause**: Idempotency not working

**Solution**:
1. Check database connection
2. Verify idempotency_keys table exists
3. Review webhook processing logic
4. Manually delete duplicate invoices in Sevdesk

#### Issue: Tax Validation Errors

**Symptom**: Invoice creation fails with tax error

**Cause**: Wrong tax configuration for account

**Solution**:
1. Call `/api/v1/CheckAccount` to detect system version
2. Adjust tax fields based on version
3. Verify tax rates match Sevdesk configuration

### 10.3 Monitoring Sevdesk API Changes

**Subscribe to Tech Blog**:
- URL: https://tech.sevdesk.com/api_news/
- RSS feed available
- Publishes breaking changes with advance notice

**Recent Breaking Changes**:
- February 2025: Auth method removed
- May 2025: Pagination limits enforced
- April 2024: Status change endpoints required

### 10.4 Performance Optimization

**When to Optimize**:
- Order volume > 100/month
- Response time > 2 seconds
- Database queries slow

**Optimization Strategies**:
1. Add database indexes on frequently queried fields
2. Implement Redis caching for Sevdesk contact lookups
3. Batch process multiple orders if possible
4. Use connection pooling for database

### 10.5 Disaster Recovery

**Scenario 1: Complete Server Failure**

1. Provision new Uberspace account
2. Restore code from git repository
3. Restore database from backup
4. Update webhook URLs in Shopify
5. Test with sample order

**Scenario 2: Sevdesk Account Migration**

1. Update `SEVDESK_API_KEY` in `.env`
2. Clear cached contact IDs
3. Re-create contacts in new account
4. Test sync with new order

**Scenario 3: Shopify Store Migration**

1. Create new custom app in new store
2. Update credentials in `.env`
3. Re-register webhooks
4. Test sync with new order

---

## Related Documents

### Decision Documents
- [Decision: Custom App](decision-custom-app.md) - Why we chose custom app approach
- [Simple Integration Options](simple-integration-options.md) - Comparison of all approaches

### API Research
- [Shopify API Research](shopify-api-research.md) - Detailed Shopify API capabilities
- [Sevdesk API Research](sevdesk-api-research.md) - Detailed Sevdesk API capabilities

### Architecture
- [Integration Patterns](integration-patterns.md) - Reliability patterns (retry, idempotency, DLQ)
- [Tech Stack Recommendation](tech-stack-recommendation.md) - Technology choices and rationale
- [Connector Architecture Synthesis](connector-architecture-synthesis.md) - Original enterprise-grade design (archived)

### Risk & Implementation
- [Risk Assessment Consolidated](risk-assessment-consolidated.md) - Comprehensive risk analysis
- [Custom App Implementation Guide](custom-app-implementation.md) - Step-by-step code guide

---

## Appendix: Data Mapping

### Shopify Order → Sevdesk Invoice

| Shopify Field | Sevdesk Field | Notes |
|---------------|---------------|-------|
| `order.id` | Custom field / Note | Store for reference |
| `order.name` | Invoice number suggestion | Optional |
| `customer.email` | Contact lookup/create | Required first |
| `customer.firstName + lastName` | Contact.name | Concatenate |
| `billingAddress` | Invoice.address | Map each field |
| `lineItems[].title` | InvoicePos.name | Line item description |
| `lineItems[].quantity` | InvoicePos.quantity | Number of units |
| `lineItems[].price` | InvoicePos.unitPrice | Price per unit |
| `lineItems[].taxLines[].rate` | InvoicePos.taxRate | Percentage (19, 7) |
| `financialStatus` | Invoice status logic | PAID → bookAmount |
| `transactions[]` | Payment tracking | Optional |

### Sevdesk Invoice → Shopify Order (Optional Reverse Sync)

| Sevdesk Field | Shopify Field | Action |
|---------------|---------------|--------|
| Invoice.status = 1000 (Paid) | Order.financialStatus | Update to "paid" |
| Payment date | Order transaction | Create transaction |

---

## Conclusion

This comprehensive synthesis consolidates all research, decisions, and implementation guidance for building a reliable Shopify-Sevdesk connector. The custom app approach on Uberspace hosting provides the optimal balance of cost, simplicity, and reliability for small German e-commerce businesses.

**Key Success Factors**:
1. HMAC signature verification (security)
2. Idempotency tracking (prevent duplicates)
3. System version detection (Sevdesk compatibility)
4. OAuth token management (2026 compliance)
5. Polling reconciliation (zero data loss)

**Next Steps**:
1. Create custom app in Shopify Admin
2. Set up Uberspace account
3. Implement core webhook handler with security
4. Deploy and test with sample orders
5. Monitor and iterate based on real usage

**Total Investment**:
- Upfront: 12-20 hours development
- Ongoing: EUR 6-9/month hosting + quarterly maintenance

This project is **approved for implementation** with the mitigations and guidance documented in this synthesis.
