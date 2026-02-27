# A2-plan: Shopify Order Import Implementation

**Plan Type**: Implementation
**Execution Mode**: Autonomous
**Assigned to**: @backend-specialist
**Branch**: feature/shopify-order-import
**Dependencies**: none
**Documentation**: workspace/docs/knowledge/integrations/shopify-order-import.md

## Context

User needs to import 9000+ orders from production to dev Shopify shop. This requires:
1. Syncing products first (variants must exist before orders)
2. Using bulk operations API (individual mutations would take 30+ hours at 5/min rate limit)

Existing ShopifyClient provides GraphQL support but needs bulk operations methods and API version upgrade.

## Scope

### In Scope
- API version upgrade to 2024-10
- Product sync CLI (export from source, import to target)
- Order import CLI with bulk operations
- CSV parsing with line item grouping
- Variant lookup (SKU to GID mapping)
- Order transformation (CSV to OrderCreateOrderInput)
- Bulk operations workflow (upload, poll, download)
- Dual-format reporting (JSON + Markdown)

### Out of Scope
- Incremental sync (one-time import only)
- Gift card orders
- Customer account creation
- Multiple discount codes per order

## Implementation Steps

### Step 1: Upgrade API Version and Add Types

**Files**: `src/clients/shopify.ts`, `src/types/shopify.ts`

1. Change API version from `2024-01` to `2024-10` in ShopifyClient
2. Add bulk operation types to `src/types/shopify.ts`:

```typescript
interface StagedUploadTarget {
  url: string;
  resource: string;
  parameters: Array<{ name: string; value: string }>;
}

interface BulkOperation {
  id: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  errorCode?: string;
  objectCount: number;
  url?: string; // Results download URL
}

interface OrderCreateOrderInput {
  lineItems: OrderCreateLineItemInput[];
  customer?: { toUpsert: { emailAddress: string } };
  financialStatus?: string;
  currency: string;
  processedAt?: string;
  shippingAddress?: AddressInput;
  billingAddress?: AddressInput;
  transactions?: TransactionInput[];
  discountCode?: string;
  note?: string;
  tags?: string[];
}

interface OrderCreateLineItemInput {
  variantId: string;
  quantity: number;
  priceSet: { presentmentMoney: { amount: string; currencyCode: string } };
  taxLines?: TaxLineInput[];
}

interface CsvOrderRow {
  Id: string;
  Email: string;
  [key: string]: string; // 67 other fields
}
```

### Step 2: Add Bulk Operations Methods to ShopifyClient

**Files**: `src/clients/shopify.ts`

Add methods:
1. `async stagedUploadsCreate(filename: string, fileSize: number): Promise<StagedUploadTarget>`
2. `async uploadToStagedTarget(target: StagedUploadTarget, content: Buffer): Promise<void>`
3. `async bulkOperationRunMutation(mutation: string, uploadPath: string): Promise<string>` - returns operation ID
4. `async getBulkOperationStatus(operationId: string): Promise<BulkOperation>`
5. `async getAllProductsWithVariants(): Promise<Map<string, { id: string, variants: Map<string, string> }>>` - SKU to GID mapping

Implementation pattern follows existing `graphql()` method. Upload uses native `fetch` with multipart form data.

### Step 3: Create Import Types

**Files**: `src/import/types.ts`

Create file with:
- `ImportConfig` - environment variable configuration
- `ParsedOrder` - intermediate representation between CSV and Shopify input
- `ImportResult` - success/failure tracking
- `ImportReport` - final report structure

### Step 4: Implement CSV Parser

**Files**: `src/import/csv-parser.ts`

1. Use `csv-parse` library (add to dependencies if not present)
2. Parse CSV with headers
3. Group rows by `Id` column (multiple rows = one order with multiple line items)
4. Aggregate line items: quantity, name, price, sku
5. Return array of `ParsedOrder` objects
6. Handle encoding issues (UTF-8, BOM)

Export function: `async parseOrdersCsv(filePath: string): Promise<ParsedOrder[]>`

### Step 5: Implement Product Sync

**Files**: `src/import/product-sync.ts`

1. Create two ShopifyClient instances (source and target)
2. Fetch all products from source with variants
3. Build product create input for each product
4. Import to target shop via `productCreate` mutation
5. Return SKU to new GID mapping
6. Handle duplicate SKUs (update vs create)

Export function: `async syncProducts(source: ShopifyClient, target: ShopifyClient): Promise<Map<string, string>>`

### Step 6: Implement Variant Lookup

**Files**: `src/import/variant-lookup.ts`

1. Query target shop for all products with variants
2. Build Map<SKU, variantGID>
3. Cache in memory for import duration
4. Provide lookup function that returns null for missing SKUs

Export function: `async buildVariantLookup(client: ShopifyClient): Promise<Map<string, string>>`

### Step 7: Implement Order Transformer

**Files**: `src/import/transformer.ts`

Transform `ParsedOrder` to `OrderCreateOrderInput`:
1. Map email to customer.toUpsert.emailAddress
2. Map line items with variant lookup
3. Map addresses (billing, shipping)
4. Map financial status, fulfillment status
5. Map dates (Created at → processedAt in ISO8601)
6. Map discount code (single code only)
7. Map transactions for total amount
8. Set options: `inventoryBehaviour: bypass`, `sendReceipt: false`

Export function: `transformOrder(order: ParsedOrder, variantLookup: Map<string, string>): OrderCreateOrderInput | null`

### Step 8: Implement Bulk Importer

**Files**: `src/import/bulk-importer.ts`

1. Accept array of `OrderCreateOrderInput`
2. Convert to JSONL (one JSON object per line, each with `parent_id` and variables)
3. Call `stagedUploadsCreate` for upload URL
4. Upload JSONL to S3
5. Start bulk operation with `orderCreate` mutation
6. Poll status every 10 seconds until complete
7. Download results JSONL
8. Parse results, match line numbers to input orders
9. Return `ImportResult[]`

JSONL format for bulk mutation:
```jsonl
{"parent_id": "gid://shopify/Product/123", "variables": {"input": {...}}}
{"parent_id": null, "variables": {"input": {...}}}
```

Note: For orderCreate, `parent_id` can be null (orders are top-level).

### Step 9: Implement Reporter

**Files**: `src/import/reporter.ts`

1. Accept `ImportResult[]`
2. Separate successes and failures
3. Generate JSON report with full details
4. Generate Markdown summary with:
   - Summary stats (total, success, failed)
   - Failed orders table (order ID, error message)
   - Timestamp and duration
5. Write both files to output directory

Export functions:
- `generateJsonReport(results: ImportResult[], outputPath: string): Promise<void>`
- `generateMarkdownReport(results: ImportResult[], outputPath: string): Promise<void>`

### Step 10: Create Product Sync CLI Command

**Files**: `src/import/commands/import-products.ts`

1. Parse environment variables for shop credentials
2. Create source and target ShopifyClient instances
3. Call `syncProducts()`
4. Print summary (products synced, variants created)
5. Save SKU mapping to cache file for order import

Add npm script: `"import:products": "tsx src/import/commands/import-products.ts"`

### Step 11: Create Order Import CLI Command

**Files**: `src/import/commands/import-orders.ts`

1. Parse CLI arguments (csv file path, output directory)
2. Validate environment variables
3. Create target ShopifyClient
4. Load or build variant lookup
5. Parse CSV orders
6. Transform orders (skip those with missing variants)
7. Run bulk import
8. Generate reports
9. Print summary

Add npm script: `"import:orders": "tsx src/import/commands/import-orders.ts"`

Usage:
```bash
npm run import:orders -- --file orders.csv --output ./import-reports
```

## Validation Criteria

- [ ] API version upgraded to 2024-10 in ShopifyClient
- [ ] Bulk operation methods added and tested
- [ ] Product sync exports and imports products with variants
- [ ] CSV parser correctly groups line items by order ID
- [ ] Variant lookup builds SKU to GID mapping
- [ ] Order transformer produces valid OrderCreateOrderInput
- [ ] Bulk importer completes end-to-end workflow
- [ ] Reports generated in both JSON and Markdown
- [ ] CLI commands work with environment variable configuration
- [ ] All existing tests pass

## Test Strategy

### Unit Tests
- CSV parser: sample CSV with multi-row orders
- Order transformer: various field combinations
- Variant lookup: missing SKU handling

### Integration Tests
- Product sync: mock Shopify API responses
- Bulk importer: mock staged upload and bulk operation

### Manual Verification
1. Run product sync on test shops (small subset)
2. Verify products exist in target shop
3. Run order import with 10-order CSV
4. Verify orders appear in target shop admin
5. Check report accuracy

## Risks

| Risk | Mitigation |
|------|------------|
| 100MB file size limit | 9000 orders at ~2KB each = ~18MB (safe margin) |
| Missing variants | Pre-validate all SKUs before bulk upload |
| API timeout during upload | Retry with exponential backoff |
| Bulk operation failure | Poll status, log errors, allow re-run |

## Estimated Effort

| Step | Effort |
|------|--------|
| Step 1-2: API + Types | 2 hours |
| Step 3-4: Types + Parser | 2 hours |
| Step 5-6: Product sync + Lookup | 3 hours |
| Step 7: Transformer | 2 hours |
| Step 8: Bulk importer | 4 hours |
| Step 9: Reporter | 1 hour |
| Step 10-11: CLI commands | 2 hours |
| Testing | 3 hours |
| **Total** | **19 hours** |
