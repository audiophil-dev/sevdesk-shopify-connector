# Shopify API Capabilities for Real-Time Order Sync Connector

**Agent**: @technology-researcher
**Date**: 2026-02-17
**Research Question**: Shopify API capabilities: webhooks, order data structure, payment integration, email capabilities, rate limits, authentication
**Depth**: Comprehensive (1-2 hours equivalent)
**Context**: Project goal is to build a real-time order sync system between Shopify and Sevdesk with payment synchronization latency < 5 minutes and email delivery > 99%

## Executive Summary

This research provides comprehensive analysis of Shopify's Admin API capabilities relevant to building a real-time order sync system between Shopify and Sevdesk. Key findings:

1. **Webhooks**: Shopify provides robust webhook infrastructure with `orders/create`, `orders/paid`, and `orders/updated` events. The `orders/paid` webhook is ideal for meeting the sub-5-minute payment synchronization latency requirement.

2. **Order Data Structure**: The GraphQL Admin API is the recommended approach (REST is legacy as of October 2024). The Order object provides comprehensive data including financial status, customer information, and line items.

3. **Payment Integration**: Payment status is tracked via the `financialStatus` field and `OrderTransaction` objects. Transaction types include authorization, sale, refund, and void.

4. **Email Capabilities**: Shopify does not provide a direct API for sending custom transactional emails. Third-party integration or external email services are required.

5. **Rate Limits**: GraphQL Admin API uses a calculated query cost system (100 points/second for standard plans) with leaky bucket algorithm. REST API uses simple request counting.

6. **Authentication**: OAuth 2.0 with token exchange (embedded apps) or authorization code grant (non-embedded apps).

## 1. Webhooks

### 1.1 Available Order-Related Events

For order synchronization, Shopify supports the following webhook topics [5/5]:

| Event Topic | Description |
|-------------|-------------|
| `orders/create` | Triggered when any order is created |
| `orders/updated` | Triggered when any order field is modified |
| `orders/paid` | Triggered specifically when an order transitions to paid status |
| `orders/fulfilled` | Triggered when order is fulfilled |
| `orders/cancelled` | Triggered when order is cancelled |
| `transactions/create` | Triggered when a transaction is created |
| `refunds/create` | Triggered when a refund is created |

**Important Note**: The `orders/updated` webhook can fire before or after `orders/create` within the same second. For payment synchronization, relying on `orders/paid` is more reliable than checking `financialStatus` on `orders/create` [3/5].

### 1.2 Webhook Registration

Webhooks can be registered via two methods [5/5]:

**Method 1: App Configuration File (TOML)**
```toml
[webhooks]
api_version = "2024-01"

[[webhooks.subscriptions]]
topics = ["orders/create", "orders/paid"]
uri = "https://your-server.com/webhooks"
```

**Method 2: GraphQL Admin API**
```graphql
mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    webhookSubscription {
      id
      topic
      format
      uri
    }
  }
}
```

### 1.3 Webhook Headers

Each webhook includes the following headers [5/5]:

| Header | Description |
|--------|-------------|
| `X-Shopify-Topic` | The event topic name |
| `X-Shopify-Hmac-Sha256` | HMAC-SHA256 signature for verification |
| `X-Shopify-Shop-Domain` | The store domain (e.g., `store.myshopify.com`) |
| `X-Shopify-API-Version` | API version used |
| `X-Shopify-Webhook-Id` | Unique identifier for deduplication |
| `X-Shopify-Triggered-At` | Timestamp when the event occurred |
| `X-Shopify-Event-Id` | Unique event ID for duplicate detection |

### 1.4 Signature Verification

HMAC-SHA256 signature verification is mandatory for security. The process involves [5/5]:

1. Extract the `X-Shopify-Hmac-Sha256` header from the request
2. Generate a signature using the raw request body and the app's client secret
3. Compare using timing-safe comparison to prevent timing attacks

```javascript
// Node.js example
const crypto = require('crypto');

function verifyShopifyWebhook(req, shopifySecret) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const hash = crypto
    .createHmac('sha256', shopifySecret)
    .update(req.rawBody, 'utf8')
    .digest('base64.timingSafeEqual');
  return crypto(Buffer.from(hmacHeader), Buffer.from(hash));
}
```

### 1.5 Retry Behavior

Shopify implements automatic retry with the following behavior [5/5]:

- **Timeout**: Shopify waits 5 seconds for a 200 OK response before considering the delivery failed
- **Retry attempts**: Up to 8 retries over approximately 4 hours using exponential backoff
- **Subscription deletion**: If delivery fails 8 consecutive times, the subscription is automatically deleted
- **Warning emails**: Notifications are sent to the app's emergency developer email before deletion

The delivery metrics report in the Dev Dashboard provides visibility into failed deliveries for the past 7 days.

### 1.6 Webhook Filtering and Payload Modification

Shopify provides two ways to optimize webhook delivery [5/5]:

**Filtering**: Use filters to control whether webhooks are delivered based on rules
```toml
[[webhooks.subscriptions]]
topics = ["orders/update"]
uri = "https://example.com/webhooks"
filter = "financial_status:paid AND total_price:>100"
```

**Payload Modification**: Specify which fields to include in the payload
```toml
[[webhooks.subscriptions]]
topics = ["orders/create"]
uri = "https://example.com/webhooks"
include_fields = ["id", "email", "total_price", "financial_status"]
```

## 2. Order Data Structure

### 2.1 API Choice: GraphQL vs REST

The **REST Admin API is legacy as of October 1, 2024**. All new public apps must be built exclusively with the GraphQL Admin API starting April 1, 2025 [5/5].

### 2.2 GraphQL Order Object

The Order object in GraphQL provides comprehensive data about customer purchases [5/5]:

```graphql
query GetOrderForSync($id: ID!) {
  order(id: $id) {
    id
    name
    processedAt
    email
    
    # Financial Status - Key for payment sync
    financialStatus
    
    # Financial Data
    totalPriceSet {
      shopMoney {
        amount
        currencyCode
      }
    }
    subtotalPriceSet {
      shopMoney {
        amount
      }
    }
    totalTaxSet {
      shopMoney {
        amount
      }
    }
    totalShippingPriceSet {
      shopMoney {
        amount
      }
    }
    totalDiscountsSet {
      shopMoney {
        amount
      }
    }
    
    # Customer Data
    customer {
      id
      email
      firstName
      lastName
      phone
    }
    
    # Address Data
    billingAddress {
      firstName
      lastName
      company
      address1
      address2
      city
      province
      provinceCode
      country
      countryCode
      zip
      phone
    }
    shippingAddress {
      firstName
      lastName
      company
      address1
      address2
      city
      province
      provinceCode
      country
      countryCode
      zip
      phone
    }
    
    # Line Items
    lineItems(first: 50) {
      edges {
        node {
          id
          title
          variantTitle
          quantity
          originalTotalSet {
            shopMoney {
              amount
            }
          }
          taxLines {
            title
            priceSet {
              shopMoney {
                amount
              }
            }
          }
        }
      }
    }
    
    # Additional fields
    note
    tags
    createdAt
    updatedAt
  }
}
```

### 2.3 Financial Status Values

The `financialStatus` field provides the current payment state with valid values [5/5]:

| Status | Description |
|--------|-------------|
| `PENDING` | Payment is pending |
| `AUTHORIZED` | Payment has been authorized but not captured |
| `PARTIALLY_PAID` | Only part of the order has been paid |
| `PAID` | Order is fully paid |
| `PARTIALLY_REFUNDED` | Part of the order has been refunded |
| `REFUNDED` | Full refund has been issued |
| `VOIDED` | Authorization has been voided |

### 2.4 Default Access Limits

By default, you can only retrieve the last 60 days of orders. Access to older orders requires requesting explicit access [5/5].

For large datasets, bulk operations are recommended as they don't have the same rate limits as single queries.

## 3. Payment Integration

### 3.1 Transaction Object

The `OrderTransaction` object provides detailed payment transaction data. Transactions represent every monetary exchange associated with an order [5/5]:

**Transaction Types**:
- `authorization`: Amount reserved against the cardholder's funding source
- `sale`: Capture of an authorization (actual charge)
- `refund`: Return of funds to customer
- `void`: Cancellation of an authorization
- `capture`: Capture of a previously authorized amount

**Transaction Status Values**:
- `SUCCESS`: Transaction completed successfully
- `PENDING`: Transaction is in progress
- `FAILURE`: Transaction failed
- `ERROR`: There was an error processing
- `AWAITING_RESPONSE`: Waiting for response

### 3.2 Querying Transactions

```graphql
query GetOrderTransactions($id: ID!) {
  order(id: $id) {
    transactions(first: 20) {
      edges {
        node {
          id
          kind
          status
          amountSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          gateway
          authorization
          createdAt
        }
      }
    }
  }
}
```

### 3.3 Payment Detection Strategy

To reliably detect successful payments, use one of these approaches:

1. **Webhook-based**: Subscribe to `orders/paid` webhook - provides immediate notification
2. **Query-based**: Check for transactions where `kind` equals `sale` and `status` equals `success`
3. **Status-based**: Check `financialStatus` equals `PAID`

**Recommended approach**: Use `orders/paid` webhook for real-time sync (meets sub-5-minute latency requirement), with periodic reconciliation as backup.

## 4. Email Capabilities

### 4.1 Critical Limitation

**Shopify does not provide a direct API for sending custom transactional emails** from your own email infrastructure [5/5]. The platform manages order confirmation emails internally based on merchant settings.

### 4.2 Available Options

**Option 1: Shopify Email App**
- Merchants can use the native Shopify Email app
- Requires manual configuration
- Doesn't provide API-driven sending from external systems [4/5]

**Option 2: Third-Party Email Apps**
- Apps like Klaviyo, Omnisend, or Postscript provide API access
- Separate subscriptions and integrations required [3/5]

**Option 3: Custom App with External Email Service**
- Receive order webhooks
- Send emails via SendGrid, Mailgun, AWS SES, or similar [4/5]

### 4.3 Order Confirmation Triggers

When creating orders via API:
- `send_receipt` boolean triggers order confirmation email
- Cannot read this value back from the API [4/5]

For fulfillment:
- `notify_customer` on fulfillments endpoint sends shipping notification
- `canNotifyCustomer` field on Order object can be read

### 4.4 Recommendation for Connector

For the Shopify-Sevdesk connector, the recommended approach:
1. Handle order synchronization via webhooks
2. Use an external email service (SendGrid, Mailgun) for sending accounting-related notifications
3. Do not rely on Shopify to send custom accounting notifications

## 5. Rate Limits

### 5.1 GraphQL Admin API Rate Limits

Uses calculated query cost system rather than simple request counting [5/5]:

| Plan Tier | Rate Limit | Bucket Size |
|-----------|------------|-------------|
| Standard | 100 points/second | ~6000 points |
| Advanced Shopify | 200 points/second | ~12000 points |
| Shopify Plus | 1000 points/second | ~60000 points |
| Enterprise | 2000 points/second | ~120000 points |

### 5.2 Cost Calculation

Each field in a query has a cost value [5/5]:

| Field Returns | Cost Value |
|---------------|------------|
| Scalar | 0 |
| Enum | 0 |
| Object | 1 |
| Interface | Maximum of possible selections |
| Union | Maximum of possible selections |
| Connection | Sized by `first` and `last` arguments |
| Mutation | 10 |

### 5.3 Response Headers

```json
{
  "extensions": {
    "cost": {
      "requestedQueryCost": 101,
      "actualQueryCost": 46,
      "throttleStatus": {
        "maximumAvailable": 1000,
        "currentlyAvailable": 954,
        "restoreRate": 50
      }
    }
  }
}
```

Use `Shopify-GraphQL-Cost-Debug=1` header to get detailed cost breakdown.

### 5.4 Single Query Limit

No single query may exceed 1,000 points regardless of plan tier [5/5].

### 5.5 Leaky Bucket Algorithm

Shopify uses the leaky bucket algorithm [5/5]:
- Each app has a bucket that holds a maximum number of points
- Requests add points to the bucket
- Points are removed at a steady rate (restoreRate) each second
- If bucket is full, a 429 error is returned

### 5.6 REST Admin API Rate Limits (Legacy)

| Plan | Bucket Size | Leak Rate |
|------|-------------|-----------|
| Standard | 40 requests | 2 requests/second |
| Shopify Plus | 400 requests | 20 requests/second |

Response header: `X-Shopify-Shop-Api-Call-Limit` (format: "X/Y")

### 5.7 Best Practices

1. **Optimize queries**: Only request needed fields
2. **Implement caching**: Cache frequently accessed data
3. **Use bulk operations**: For large data exports
4. **Client-side throttling**: Track request budget, pause when low
5. **Exponential backoff**: Wait and retry on 429 errors (recommended: 1 second initial delay)

## 6. Authentication

### 6.1 OAuth 2.0 Flow

Shopify uses OAuth 2.0 for app authentication with two grant types [5/5]:

**Token Exchange** (Embedded Apps):
- Exchange a session token for an access token
- Session tokens acquired via App Bridge

**Authorization Code Grant** (Non-embedded Apps):
1. Redirect merchant to authorization URL
2. Merchant authorizes the app
3. Exchange authorization code for access token

### 6.2 Authorization Code Flow

**Step 1 - Redirect to Authorization**:
```
GET https://{shop}.myshopify.com/admin/oauth/authorize
  ?client_id={client_id}
  &scope={scopes}
  &redirect_uri={redirect_uri}
  &state={nonce}
```

**Step 2 - Exchange Code for Token**:
```bash
curl -X POST https://{shop}.myshopify.com/admin/oauth/access_token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "{client_id}",
    "client_secret": "{client_secret}",
    "code": "{authorization_code}"
  }'
```

**Response**:
```json
{
  "access_token": "f85632530bf277ec9ac6f649fc327f17",
 read_orders,read "scope": "_customers"
}
```

### 6.3 Access Scopes

Required scopes for order synchronization [5/5]:

| Scope | Description |
|-------|-------------|
| `read_orders` | Read order data |
| `write_orders` | Create/update orders (if needed) |
| `read_customers` | Access customer data |
| `read_all_orders` | Access orders beyond 60 days (requires approval) |
| `read_refunds` | View refund data |
| `read_transactions` | View payment transactions |

**Scope Configuration in TOML**:
```toml
[access_scopes]
scopes = "read_orders,read_customers,read_refunds,read_transactions"
```

### 6.4 Token Types

- **Online tokens**: User-specific, expire when user logs out
- **Offline tokens**: Persistent, obtained by omitting `grant_options[]=per-user` [5/5]

### 6.5 Custom Apps

For custom apps created in Shopify admin:
- Tokens are generated directly during app installation
- No OAuth flow required
- Starting January 1, 2026, new legacy custom apps cannot be created - use Dev Dashboard [5/5]

### 6.6 Token Management

- **Offline tokens**: Historically non-expiring
- **Expiring tokens**: Enable via `expiring_offline_access_tokens: true` configuration
- Tokens are only returned once during OAuth flow - must be stored securely

## Implementation Recommendations

### For Real-Time Order Sync (Sevdesk Connector)

1. **Use `orders/paid` webhook as primary sync mechanism**
   - Provides immediate notification when payment succeeds
   - Meets sub-5-minute latency requirement [5/5]
   - More reliable than checking financialStatus on orders/create

2. **Implement idempotency**
   - Use order ID as key for deduplication
   - Shopify may send duplicate webhooks during retries [4/5]
   - Store processed order IDs with timestamps

3. **Use GraphQL exclusively**
   - REST is legacy as of October 2024
   - Better efficiency and query customization
   - Query cost optimization available

4. **Handle rate limits proactively**
   - Implement throttling with local bucket tracking
   - Use exponential backoff on 429s
   - Monitor throttle status in API responses

5. **Verify webhook signatures**
   - Always validate HMAC before processing
   - Use timing-safe comparison

6. **Implement reconciliation jobs**
   - Periodic full sync to catch missed webhooks
   - Shopify doesn't guarantee webhook delivery

7. **Use external email service**
   - Don't rely on Shopify for custom notifications
   - Integrate SendGrid, Mailgun, or similar

### Required Scopes for Invoice Generation

```
read_orders, read_customers, read_transactions, read_refunds
```

### Data Mapping for Sevdesk

| Shopify Field | Sevdesk Field |
|---------------|---------------|
| order.name | Invoice number |
| customer.email | Customer email |
| customer.firstName + lastName | Customer name |
| billingAddress | Invoice address |
| shippingAddress | Delivery address |
| lineItems (title, quantity, price, tax) | Invoice line items |
| transactions (payment status) | Payment recording |
| financialStatus | Payment status |
| refunds | Credit notes |

## Gaps and Limitations

1. **No email API**: Cannot send transactional emails via Shopify API; must use third-party service
2. **60-day order limit**: Default access only to last 60 days; requires `read_all_orders` scope approval for historical data
3. **No guaranteed webhook delivery**: Must implement reconciliation for completeness
4. **Webhook ordering not guaranteed**: `orders/updated` may arrive before or after `orders/create`; use timestamps for ordering
5. **Single query limit**: No query may exceed 1,000 points
6. **Webhook subscription removal**: After 8 failed delivery attempts over 4 hours, subscription is automatically removed
7. **API version requirement**: Must specify API version (e.g., `2024-01`); using `latest` can cause breaking changes

## Sources

### Primary Sources ([4/5]-[5/5])

- [Shopify Webhooks Documentation](https://shopify.dev/docs/api/webhooks) - [5/5] - Accessed 2026-02-17
- [Shopify API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits) - [5/5] - Accessed 2026-02-17
- [Shopify Token Acquisition](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens) - [5/5] - Accessed 2026-02-17
- [Shopify Order GraphQL Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/order) - [5/5] - Accessed 2026-02-17
- [Shopify OrderTransaction Object](https://shopify.dev/docs/api/admin-graphql/latest/objects/OrderTransaction) - [5/5] - Accessed 2026-02-17
- [Shopify OrderFinancialStatus Enum](https://shopify.dev/docs/api/storefront/latest/enums/orderfinancialstatus) - [5/5] - Accessed 2026-02-17
- [Shopify Troubleshooting Webhooks](https://shopify.dev/docs/apps/build/webhooks/troubleshooting-webhooks) - [5/5] - Accessed 2026-02-17
- [Shopify Generate Access Tokens for Custom Apps](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin) - [5/5] - Accessed 2026-02-17
- [Shopify Deliver Webhooks through HTTPS](https://shopify.dev/docs/apps/build/webhooks/subscribe/https) - [5/5] - Accessed 2026-02-17

### Supporting Sources ([3/5])

- [Orders/paid vs orders/updated - Shopify Community](https://community.shopify.dev/t/orders-paid-vs-orders-updated/715) - [3/5] - Accessed 2026-02-17
- [Reliable Shopify Webhooks: Idempotency, Retries, and Signature Verification - DEV Community](https://dev.to/sumeet_shrofffreelancer_/reliable-shopify-webhooks-idempotency-retries-and-signature-verification-30b3) - [3/5] - Accessed 2026-02-17
- [Shopify Community - Order Confirmation Email](https://community.shopify.com/c/payments-shipping-and/adding-customized-copy-on-post-purchase-email-order-confirmation/m-p/2666586) - [3/5] - Accessed 2026-02-17
- [Retainful - Shopify Order Confirmation Emails](https://www.retainful.com/blog/shopify-order-confirmation-emails) - [3/5] - Accessed 2026-02-17

---

**Research completed**: 2026-02-17
**Time spent**: Approximately 1.5 hours
