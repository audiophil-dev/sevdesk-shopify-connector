# A1-spec: Shopify Order Import

## Problem Statement

User needs to import 9000+ historical orders from a production Shopify shop to a development shop. The production shop exports orders as CSV, and the dev shop must receive them via Shopify Admin API.

## Current State

- Source: Production Shopify shop with order export (CSV)
- Target: Development Shopify shop (rate limited to 5 orders/minute for individual mutations)
- Existing code: ShopifyClient with GraphQL support (API version 2024-01)
- Missing: Products in target shop, order import functionality

## Proposed Solution

Build a two-phase import pipeline:

### Phase 1: Product Sync
Export all products (with variants) from production shop and import to dev shop. This creates the variant IDs required for order creation.

### Phase 2: Order Import via Bulk Operations
Use Shopify Bulk Operations API to import 9000+ orders efficiently. Bulk operations bypass the 5 orders/minute rate limit by processing orders server-side.

## Technical Requirements

### API Version Upgrade
Current ShopifyClient uses API version 2024-01. Upgrade to 2024-10 or later for full bulk mutation support.

### New Components

| Component | Purpose |
|-----------|---------|
| `src/import/types.ts` | Import-related TypeScript interfaces |
| `src/import/csv-parser.ts` | Parse CSV, group rows by order |
| `src/import/product-sync.ts` | Export products from source, import to target |
| `src/import/variant-lookup.ts` | Build SKU to Shopify GID mapping |
| `src/import/transformer.ts` | CSV row to OrderCreateOrderInput |
| `src/import/bulk-importer.ts` | Shopify bulk operations workflow |
| `src/import/reporter.ts` | Success/failure reporting (JSON + Markdown) |
| `src/import/commands/import-products.ts` | CLI for product sync |
| `src/import/commands/import-orders.ts` | CLI for order import |

### ShopifyClient Extensions

Add to existing `src/clients/shopify.ts`:
- `stagedUploadsCreate()` - Get S3 upload URL
- `bulkOperationRunMutation()` - Start bulk mutation
- `bulkOperationStatus()` - Poll operation status
- `getAllProducts()` - Fetch all products with variants

### CSV Processing

Input CSV has 68 columns with one row per line item. Multiple rows may share the same order (identified by Id column). Parser must:
1. Group rows by Order Id
2. Aggregate line items per order
3. Map 68 CSV fields to OrderCreateOrderInput schema
4. Handle missing/null values gracefully

### Bulk Operations Workflow

1. Transform orders to JSONL format (one OrderCreateInput per line)
2. Call `stagedUploadsCreate` mutation to get S3 upload URL
3. Upload JSONL file to S3 (multipart form upload)
4. Call `bulkOperationRunMutation` with orderCreate mutation string
5. Poll `bulkOperationStatus` until complete (or use webhook)
6. Download results JSONL
7. Parse results, match line numbers to input orders
8. Generate success/failure report

### Error Handling

- Missing variant SKU: Skip order, log to failures
- Parse error: Skip row, log to failures
- Bulk operation error: Continue processing, aggregate errors
- Final report includes all failures with error messages

### Configuration

All credentials via environment variables:
- `SOURCE_SHOP_NAME` - Production shop name
- `SOURCE_SHOP_ACCESS_TOKEN` - Production shop access token
- `TARGET_SHOP_NAME` - Dev shop name
- `TARGET_SHOP_ACCESS_TOKEN` - Dev shop access token

### Output

Both JSON and Markdown reports in specified output directory:
- `import-report.json` - Machine-readable results
- `import-report.md` - Human-readable summary

## Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Rate limit (bulk) | 5 concurrent operations | Shopify limit |
| Max file size | 100MB | Shopify staged upload limit |
| API version | 2024-10+ | Required for bulk mutations |
| Variant requirement | Must exist before order | Shopify API requirement |

## Acceptance Criteria

1. Product sync exports all products from source shop with variants
2. Product sync imports products to target shop, preserving SKUs
3. Order import processes 9000+ orders via bulk operations
4. Orders with missing SKUs are skipped and logged
5. Final report shows success count, failure count, and failure details
6. Reports generated in both JSON and Markdown formats

## Related Documentation

- `workspace/docs/knowledge/integrations/shopify-order-import.md` - Research and API details
- `src/clients/shopify.ts` - Existing Shopify client
- `src/types/shopify.ts` - Existing Shopify types

## Out of Scope

- Incremental/delta sync (one-time import only)
- Gift card orders (not supported by Shopify API)
- Multiple discount codes per order (Shopify API limit)
- Customer account creation (use toUpsert mode)
