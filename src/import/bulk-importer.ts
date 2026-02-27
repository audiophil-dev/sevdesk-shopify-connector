import { ShopifyClient } from '../clients/shopify';
import { ImportConfig, ParsedOrder, ImportResult } from './types';

/**
 * Shopify Bulk Operations Importer
 * Handles the complete bulk order import workflow:
 * 1. Convert orders to JSONL format
 * 2. Upload JSONL to S3 via staged upload
 * 3. Run bulk operation mutation
 * 4. Poll status until complete
 * 5. Download results JSONL
 * 6. Parse results and match to input orders
 */

/**
 * Convert orders to JSONL format for bulk mutation.
 * Each line is one JSON object with parent_id (null for orders) and variables.
 */
function convertToJsonl(orders: ParsedOrder[]): string {
  const lines: string[] = [];

  for (const order of orders) {
    const lineData = {
      parent_id: null, // Orders are top-level
      variables: JSON.stringify({
        input: {
          lineItems: order.lineItems,
          customer: order.email ? {
            toUpsert: {
              emailAddress: order.email,
            },
          } : undefined,
          processedAt: order.raw['Created At'] ? new Date(order.raw['Created At']).toISOString() : undefined,
          inventoryBehaviour: 'bypass',
          sendReceipt: false,
        },
      }),
    };

    lines.push(JSON.stringify(lineData));
  }

  // Add header
  const jsonlContent = lines.join('\n');

  return jsonlContent;
}

/**
 * Run complete bulk import workflow.
 */
export async function runBulkImport(config: ImportConfig, parsedOrders: ParsedOrder[]): Promise<ImportResult[]> {
  console.log(`[bulk-importer] Starting bulk import for ${parsedOrders.length} orders`);
  console.log(`[bulk-importer] Config:`, config);

  // Validate variant lookup
  if (!config.variantLookup) {
    throw new Error('Variant lookup is required for order import');
  }

  const results: ImportResult[] = [];
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    // Step 1: Convert to JSONL format
    console.log('[bulk-importer] Converting orders to JSONL format...');
    const jsonlContent = convertToJsonl(parsedOrders);
    const filename = `orders-${Date.now()}.jsonl`;

    // Step 2: Create staged upload
    console.log('[bulk-importer] Creating staged upload...');
    const stagedUploadTarget = await config.client.stagedUploadsCreate(
      filename,
      jsonlContent.length.toString()
    );

    console.log(`[bulk-importer] Staged upload URL: ${stagedUploadTarget.url}`);
    console.log(`[bulk-importer] Staged upload resource: ${stagedUploadTarget.resource}`);

    // Step 3: Upload JSONL to S3
    console.log('[bulk-importer] Uploading JSONL file to S3...');
    const fileContent = Buffer.from(jsonlContent, 'utf-8');

    await config.client.uploadToStagedTarget(stagedUploadTarget, fileContent);

    // Step 4: Run bulk operation
    console.log('[bulk-importer] Starting bulk operation...');
    const mutation = `
      mutation BulkOperationRun($input: BulkOperationRunInput!) {
        bulkOperationRun {
          mutation: orderCreate
          stagedUploadPath: "${stagedUploadTarget.resource}"
        }
      }
    `;

    const operationId = await config.client.bulkOperationRunMutation(mutation, stagedUploadTarget.resource);

    console.log(`[bulk-importer] Bulk operation started: ${operationId}`);

    // Step 5: Poll status until complete
    console.log('[bulk-importer] Polling bulk operation status...');
    let bulkOperation = await config.client.getBulkOperationStatus(operationId);

    while (bulkOperation.status === 'RUNNING') {
      console.log(`[bulk-importer] Operation status: ${bulkOperation.status}`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      bulkOperation = await config.client.getBulkOperationStatus(operationId);
    }

    // Check final status
    if (bulkOperation.status !== 'COMPLETED') {
      console.error(`[bulk-importer] Bulk operation failed with status: ${bulkOperation.status}`);
      if (bulkOperation.errorCode) {
        console.error(`[bulk-importer] Error code: ${bulkOperation.errorCode}`);
      }

      // Mark all as failed
      for (let i = 0; i < parsedOrders.length; i++) {
        const order = parsedOrders[i];
        const result: ImportResult = {
          line: i + 1,
          orderId: order.id,
          success: false,
          error: `Bulk operation ${bulkOperation.status}: ${bulkOperation.errorCode || 'Unknown error'}`,
        };
        results.push(result);
      }

      failedCount = parsedOrders.length;
      return results;
    }

    console.log(`[bulk-importer] Bulk operation completed with ${bulkOperation.objectCount} objects`);

    // Step 6: Download results
    console.log('[bulk-importer] Downloading results...');
    if (!bulkOperation.url) {
      console.error('[bulk-importer] No results URL available');
      throw new Error('Bulk operation completed but no results URL');
    }

    const response = await fetch(bulkOperation.url);
    if (!response.ok) {
      const error = await response.text();
      console.error(`[bulk-importer] Failed to download results: ${error}`);
      throw new Error(`Failed to download results: ${error}`);
    }

    const resultsJsonl = await response.text();
    console.log('[bulk-importer] Results downloaded');

    // Step 7: Parse results and match to input orders
    console.log('[bulk-importer] Parsing results and matching to orders...');
    const resultsLines = resultsJsonl.split('\n').filter(line => line.trim());

    // Create map for quick line number lookup
    const inputLineMap = new Map<number, { order: ParsedOrder; index: number }>();
    parsedOrders.forEach((order, index) => {
      inputLineMap.set(index + 1, { order, index: 0 });
    });

    for (let i = 0; i < resultsLines.length; i++) {
      const resultLine = resultsLines[i];
      if (!resultLine.trim()) continue;

      try {
        const parsed = JSON.parse(resultLine);

        // Handle both result formats
        const lineData = parsed.result || parsed.data || parsed;
        const lineInfo = parsed.lineInfo || parsed.metadata || {};

        // Find matching order
        const matchingEntry = inputLineMap.get(lineInfo.line);
        if (!matchingEntry) {
          // Result for line without matching input
          results.push({
            line: lineInfo.line,
            orderId: 'N/A',
            success: false,
            error: `No matching order found for line ${lineInfo.line}`,
          });
          continue;
        }

        const order = matchingEntry.order;
        const variantLookup = config.variantLookup;

        // Validate variant SKU
        let validOrder = false;
        let variantGid: string | null;

        for (const lineItem of order.lineItems) {
          const variantId = variantLookup.get(lineItem.sku);
          if (variantId) {
            variantGid = variantId;
          } else {
            console.warn(`[bulk-importer] Missing variant for SKU: ${lineItem.sku} in order ${order.id}`);
            variantGid = null;
          }
        }

        // Only proceed if all variants found
        if (variantGid) {
          validOrder = true;
        } else {
          const result: ImportResult = {
            line: lineInfo.line,
            orderId: order.id,
            success: false,
            error: `Missing variant for SKU: ${lineItem.sku}`,
          };
          results.push(result);
          break;
        }
        }

        // Check for GraphQL errors
        if (lineData.errors && lineData.errors.length > 0) {
          const errorMsgs = lineData.errors.map((e: any) => {
            if (typeof e === 'string') {
              return e;
            } else if (e.message) {
              return e.message;
            }
            return JSON.stringify(e);
          }).join(', ');
          const result: ImportResult = {
            line: lineInfo.line,
            orderId: order.id,
            success: false,
            error: `GraphQL error: ${errorMsgs}`,
          };
          results.push(result);
          validOrder = false;
        }

        // Check for success
        if (lineData.success && validOrder) {
          const result: ImportResult = {
            line: lineInfo.line,
            orderId: order.id,
            success: true,
            variantId: variantGid || undefined,
            shopifyOrderId: lineData.data?.orderCreate?.order?.id || undefined,
          };
          results.push(result);
          successCount++;
        }

        if (!validOrder) {
          // Unknown error (not GraphQL, not missing variant)
          const result: ImportResult = {
            line: lineInfo.line,
            orderId: order.id,
            success: false,
            error: 'Unknown error',
          };
          results.push(result);
        }
      } catch (error) {
        const result: ImportResult = {
          line: lineInfo.line,
          orderId: matchingEntry ? matchingEntry.order.id : 'N/A',
          success: false,
          error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        };
        results.push(result);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[bulk-importer] Import complete in ${duration.toFixed(2)}s`);
    console.log(`[bulk-importer] Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);

    return results;
}
