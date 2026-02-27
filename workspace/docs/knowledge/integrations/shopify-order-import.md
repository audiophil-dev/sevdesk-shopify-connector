# Shopify Order Import via Admin GraphQL API

**Created**: 2026-02-27
**Source**: Shopify Admin GraphQL API Documentation (2026-01)
**Purpose**: Import historical orders from production shop to development shop

## Overview

Shopify provides two methods for creating orders via the Admin GraphQL API:

1. **Individual `orderCreate` mutations** - Best for small batches (<50 orders)
2. **Bulk Operations with JSONL** - Best for large batches (50+ orders)

Development stores have a rate limit of 5 orders/minute, making bulk operations strongly recommended for any significant import.

## API Requirements

### Authentication

- Admin API access token with offline access
- Required scope: `write_orders`

### Rate Limits

| Store Type | Individual Mutations | Bulk Operations |
|------------|---------------------|-----------------|
| Development | 5 orders/minute | 5 concurrent operations |
| Production | 2 calls/second | 5 concurrent operations |

### API Version

Minimum recommended: `2024-10` (supports bulk mutation operations)
Latest: `2026-01` (supports bulk operation status polling)

---

## Method 1: Individual OrderCreate Mutation

### Use Case

- Small batches (<50 orders)
- Testing and validation
- Incremental imports

### Mutation Signature

```graphql
mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    userErrors { field message }
    order { 
      id 
      name
      displayFinancialStatus 
      lineItems(first: 10) {
        nodes { id title quantity variant { id } }
      }
    }
  }
}
```

### Input Schema (OrderCreateOrderInput)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lineItems` | [OrderCreateLineItemInput!]! | Yes | Array of products in order |
| `customer` | OrderCreateCustomerInput | No | Customer to link/create |
| `financialStatus` | OrderFinancialStatus | No | PAID, PENDING, PARTIALLY_PAID |
| `fulfillmentStatus` | OrderFulfillmentStatus | No | FULFILLED, NULL, PARTIAL |
| `currency` | CurrencyCode | No | ISO 4217 code (EUR, USD) |
| `processedAt` | DateTime | No | ISO8601 date for backdating |
| `shippingAddress` | MailingAddressInput | No | Shipping address |
| `billingAddress` | MailingAddressInput | No | Billing address |
| `transactions` | [OrderCreateTransactionInput!] | No | Payment records |
| `discountCode` | String | No | Single discount code |
| `note` | String | No | Order notes |
| `tags` | [String!] | No | Order tags |
| `metafields` | [MetafieldsSetInput!] | No | Custom data |

### Line Item Input (OrderCreateLineItemInput)

```json
{
  "variantId": "gid://shopify/ProductVariant/12345",
  "quantity": 2,
  "title": "Product Name",
  "priceSet": {
    "shopMoney": { "amount": "29.99", "currencyCode": "EUR" }
  },
  "taxLines": [
    {
      "priceSet": { "shopMoney": { "amount": "5.70", "currencyCode": "EUR" } },
      "rate": 0.19,
      "title": "DE VAT"
    }
  ]
}
```

### Customer Input (OrderCreateCustomerInput)

Two modes available:

**Upsert Mode** (create or update by email):
```json
{
  "toUpsert": {
    "email": "customer@example.com",
    "firstName": "Max",
    "lastName": "Mustermann",
    "phone": "+491234567890"
  }
}
```

**Associate Mode** (link existing customer by ID):
```json
{
  "toAssociate": {
    "id": "gid://shopify/Customer/67890"
  }
}
```

### Options Input (OrderCreateOptionsInput)

```json
{
  "sendReceipt": false,
  "sendFulfillmentReceipt": false,
  "inventoryBehaviour": "bypass"
}
```

| Option | Values | Description |
|--------|--------|-------------|
| `sendReceipt` | true/false | Send order confirmation email |
| `sendFulfillmentReceipt` | true/false | Send fulfillment email |
| `inventoryBehaviour` | `decrement_ignoring_policy`, `bypass` | How to handle inventory |

### Complete Example

```json
{
  "order": {
    "lineItems": [
      {
        "variantId": "gid://shopify/ProductVariant/12345",
        "quantity": 2,
        "title": "Custom Product",
        "priceSet": {
          "shopMoney": { "amount": "29.99", "currencyCode": "EUR" }
        }
      }
    ],
    "customer": {
      "toUpsert": {
        "email": "customer@example.com",
        "firstName": "Max",
        "lastName": "Mustermann"
      }
    },
    "financialStatus": "PAID",
    "fulfillmentStatus": "FULFILLED",
    "currency": "EUR",
    "processedAt": "2024-01-15T10:30:00Z",
    "shippingAddress": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "address1": "Hauptstrasse 123",
      "city": "Berlin",
      "zip": "10115",
      "countryCode": "DE"
    },
    "transactions": [
      {
        "kind": "SALE",
        "status": "SUCCESS",
        "amountSet": {
          "shopMoney": { "amount": "59.98", "currencyCode": "EUR" }
        }
      }
    ]
  },
  "options": {
    "sendReceipt": false,
    "sendFulfillmentReceipt": false,
    "inventoryBehaviour": "bypass"
  }
}
```

---

## Method 2: Bulk Operations (Recommended)

### Use Case

- Large batches (50+ orders)
- Production imports
- Avoiding rate limits

### Workflow Overview

1. Create JSONL file with mutation variables
2. Upload via staged upload mutation
3. Run bulk operation mutation
4. Poll status or subscribe to webhook
5. Download and process results

### Step 1: Create JSONL File

Each line contains variables for one order mutation:

```jsonl
{"input": {"lineItems": [{"variantId": "gid://shopify/ProductVariant/123", "quantity": 1, "priceSet": {"shopMoney": {"amount": "19.99", "currencyCode": "EUR"}}}], "customer": {"toUpsert": {"email": "user1@example.com"}}, "financialStatus": "PAID", "currency": "EUR"}}
{"input": {"lineItems": [{"variantId": "gid://shopify/ProductVariant/456", "quantity": 2, "priceSet": {"shopMoney": {"amount": "29.99", "currencyCode": "EUR"}}}], "customer": {"toUpsert": {"email": "user2@example.com"}}, "financialStatus": "PAID", "currency": "EUR"}}
```

**File Constraints**:
- Maximum size: 100MB
- Format: JSONL (JSON Lines)
- Encoding: UTF-8
- One mutation per line

### Step 2: Get Staged Upload URL

```graphql
mutation {
  stagedUploadsCreate(input: [{
    resource: BULK_MUTATION_VARIABLES,
    filename: "orders.jsonl",
    mimeType: "text/jsonl",
    httpMethod: POST
  }]) {
    stagedTargets {
      url
      parameters { name value }
    }
    userErrors { field message }
  }
}
```

### Step 3: Upload JSONL File

POST the file to the URL from step 2. Use the returned parameters as form fields:

```bash
curl -X POST \
  -F "key=tmp/uploads/orders.jsonl" \
  -F "policy=..." \
  -F "x-amz-credential=..." \
  -F "x-amz-algorithm=..." \
  -F "x-amz-date=..." \
  -F "x-amz-signature=..." \
  -F "file=@orders.jsonl" \
  "https://shopify.s3.amazonaws.com/"
```

### Step 4: Run Bulk Mutation

```graphql
mutation {
  bulkOperationRunMutation(
    mutation: "mutation call($input: OrderCreateOrderInput!) { orderCreate(order: $input) { order { id name } userErrors { message field } } }",
    stagedUploadPath: "tmp/uploads/orders.jsonl"
  ) {
    bulkOperation { 
      id 
      status 
      createdAt 
    }
    userErrors { field message }
  }
}
```

### Step 5: Poll Status

```graphql
query {
  bulkOperation(id: "gid://shopify/BulkOperation/12345") {
    id
    status
    errorCode
    createdAt
    completedAt
    objectCount
    fileSize
    url
  }
}
```

**Status Values**:
- `CREATED` - Operation created, not started
- `RUNNING` - Currently processing
- `COMPLETED` - Successfully finished
- `CANCELED` - User canceled
- `FAILED` - Operation failed
- `EXPIRED` - Timed out (24h for mutations)

### Step 6: Download Results

Results are JSONL with line numbers matching input:

```jsonl
{"data":{"orderCreate":{"order":{"id":"gid://shopify/Order/123","name":"#1001"},"userErrors":[]}},"__lineNumber":0}
{"data":{"orderCreate":{"order":null,"userErrors":[{"field":["lineItems",0,"variantId"],"message":"Variant not found"}]}},"__lineNumber":1}
```

### Webhook Alternative

Subscribe to `bulk_operations/finish` webhook:

```json
{
  "topic": "bulk_operations/finish",
  "address": "https://your-app.com/webhooks/bulk-operations",
  "format": "json"
}
```

---

## CSV-to-Shopify Field Mapping

### Required CSV Fields

| CSV Field | Shopify Field | Type | Notes |
|-----------|---------------|------|-------|
| Order ID | (reference only) | String | Shopify generates new ID |
| Email | customer.toUpsert.email | String | Required for customer |
| Order Date | processedAt | DateTime | ISO8601 format |
| Financial Status | financialStatus | Enum | PAID, PENDING |
| Fulfillment Status | fulfillmentStatus | Enum | FULFILLED, NULL |

### Line Item Fields

| CSV Field | Shopify Field | Type | Notes |
|-----------|---------------|------|-------|
| Product SKU | (lookup variantId) | String | Must exist in dev shop |
| Quantity | lineItems[].quantity | Int | Required |
| Price | lineItems[].priceSet | Money | Per-unit price |
| Tax | lineItems[].taxLines | Array | Tax breakdown |

### Address Fields

| CSV Field | Shopify Field | Type |
|-----------|---------------|------|
| First Name | shippingAddress.firstName | String |
| Last Name | shippingAddress.lastName | String |
| Address 1 | shippingAddress.address1 | String |
| Address 2 | shippingAddress.address2 | String |
| City | shippingAddress.city | String |
| ZIP | shippingAddress.zip | String |
| Country Code | shippingAddress.countryCode | String (ISO 3166-1) |
| Province Code | shippingAddress.provinceCode | String |

### Transaction Fields

| CSV Field | Shopify Field | Type |
|-----------|---------------|------|
| Total Amount | transactions[].amountSet | Money |
| Payment Method | transactions[].gateway | String |
| Payment Status | transactions[].status | Enum |

---

## Critical Limitations

### Order Creation Constraints

1. **Single Discount Code**: Only one discount code per order via API
2. **No Automatic Discounts**: Must manually replicate discount amounts in line items
3. **No Multiple Line-Item Discounts**: Per-item discounts not supported
4. **Products Must Exist**: Variant IDs must reference existing products in target shop
5. **No Gift Cards**: Cannot create orders containing gift cards via API
6. **Transaction Types**: Limited to SALE, AUTHORIZATION, CAPTURE, VOID, REFUND

### Dev Store Specific

1. **Rate Limit**: 5 orders/minute for individual mutations
2. **Checkout Disabled**: Cannot test checkout flow on dev stores
3. **Test Orders**: Orders created on dev stores are test orders

### Bulk Operation Constraints

1. **Concurrent Operations**: Maximum 5 per shop
2. **File Size**: Maximum 100MB JSONL
3. **Timeout**: 24 hours for mutations
4. **No Cancellation**: Cannot cancel once running (only before)

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Variant not found` | SKU does not exist in target shop | Create product/variant first |
| `Access denied` | Missing `write_orders` scope | Update app permissions |
| `Rate limit exceeded` | Too many requests | Use bulk operations |
| `Invalid email` | Malformed customer email | Validate email format |
| `Throttled` | Query cost exceeded | Implement backoff/retry |

### Bulk Operation Error Handling

```jsonl
// Success
{"data":{"orderCreate":{"order":{"id":"gid://shopify/Order/123"},"userErrors":[]}},"__lineNumber":0}

// Validation Error (continues processing other lines)
{"data":{"orderCreate":{"order":null,"userErrors":[{"field":["lineItems",0,"variantId"],"message":"Invalid ID"}]}},"__lineNumber":1}

// Parse Error (line skipped)
{"__lineNumber":2,"errors":[{"message":"Unexpected token"}]}
```

---

## Implementation Recommendations

### Phase 1: Prerequisites

1. Export products from production shop
2. Import products to development shop (preserve SKUs)
3. Build variant lookup map (SKU → Shopify GID)

### Phase 2: CSV Processing

1. Parse CSV file
2. Validate required fields
3. Transform to Shopify schema
4. Handle edge cases (missing addresses, etc.)

### Phase 3: Import Execution

1. Choose method based on order count:
   - <50 orders: Individual mutations with rate limiting
   - 50+ orders: Bulk operations
2. Implement progress tracking
3. Log successes and failures

### Phase 4: Validation

1. Compare order counts
2. Verify financial totals
3. Check customer associations
4. Validate fulfillment status

### Code Structure

```
src/import/
├── csv-parser.ts        # Parse and validate CSV
├── variant-lookup.ts    # Map SKU to Shopify GID
├── transformer.ts       # CSV row → Shopify input
├── bulk-import.ts       # Bulk operation execution
├── individual-import.ts # Single order creation
└── validator.ts         # Post-import validation
```

---

## References

- [Shopify OrderCreate Mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/ordercreate)
- [Bulk Operations Import Guide](https://shopify.dev/docs/api/usage/bulk-operations/imports)
- [Order Management Apps](https://shopify.dev/docs/apps/build/orders-fulfillment/order-management-apps)
