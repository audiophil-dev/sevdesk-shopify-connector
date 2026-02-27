import { ShopifyClient } from '../clients/shopify';
import { parseOrdersCsv } from './csv-parser';
import { transformOrder } from './transformer';
import { runBulkImport } from './bilk-importer';
import { config } from '../../../config';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CLI command to import orders from CSV file using Shopify bulk operations.
 * Usage: npm run import:orders --file orders.csv --output ./reports
 */
async function run() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const outputIndex = args.indexOf('--output');
  const dryRunIndex = args.indexOf('--dry-run');

  if (fileIndex === -1 || outputIndex === -1) {
    console.error('Usage: npm run import:orders --file orders.csv --output ./reports');
    console.error('');
    console.error('Required arguments:');
    console.error('  --file <path>        Path to CSV file with orders');
    console.error('  --output <path>      Directory for reports (default: ./reports)');
    console.error('  --dry-run                Validate only without importing');
    process.exit(1);
  }

  const csvFilePath = args[fileIndex + 1];
  const outputDir = outputIndex > -1 ? args[outputIndex + 1] : './reports';
  const dryRun = dryRunIndex > -1;

  if (dryRun) {
    console.log('[import:orders] Dry-run mode enabled - validating inputs only');
  }

  console.log('[import:orders] CSV file:', csvFilePath);
  console.log('[import:orders] Output directory:', outputDir);
  console.log('[import:orders] Dry run:', dryRun);

  // Validate environment variables
  if (!config.shopify.targetShop) {
    console.error('[import:orders] Missing required environment variable: TARGET_SHOPIFY_SHOP');
    process.exit(1);
  }

  // Validate CSV file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`[import:orders] CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('[import:orders] Starting order import...');

  try {
    // Create Shopify client
    const client = new ShopifyClient();

    // Load or build variant lookup
    let variantLookup: Map<string, string>;

    // Check for cached mapping
    const cacheFile = path.join(process.cwd(), '.variant-mapping-cache.json');
    if (fs.existsSync(cacheFile)) {
      const cacheData = fs.readFileSync(cacheFile, 'utf-8');
      variantLookup = new Map(JSON.parse(cacheData));
      console.log('[import:orders] Loaded variant mapping from cache');
    } else {
      console.log('[import:orders] No cache found, building variant lookup...');
      const { buildVariantLookup } = require('./variant-lookup');
      variantLookup = await buildVariantLookup(client);
      
      // Save to cache
      fs.writeFileSync(cacheFile, JSON.stringify(Array.from(variantLookup.entries()), null, 2));
      console.log('[import:orders] Variant mapping cached for future imports');
    }

    if (!dryRun) {
      // Parse CSV orders
      console.log('[import:orders] Parsing CSV file...');
      const parsedOrders = await parseOrdersCsv(csvFilePath);
      console.log(`[import:orders] Parsed ${parsedOrders.length} unique orders`);

      // Transform orders
      console.log('[import:orders] Transforming orders for Shopify...');
      const transformedOrders = [];
      let skippedCount = 0;

      for (const parsedOrder of parsedOrders) {
        const transformed = transformOrder(parsedOrder, variantLookup);
        if (transformed) {
          transformedOrders.push(transformed);
        } else {
          skippedCount++;
        }
      }

      console.log(`[import:orders] Transformed ${transformedOrders.length} orders, skipped ${skippedCount}`);

      // Run bulk import
      console.log('[import:orders] Running bulk import...');
      const results = await runBulkImport({
        client,
        orders: transformedOrders,
      });

      // Generate reports
      console.log('[import:orders] Generating reports...');
      const { generateJsonReport, generateMarkdownReport } = require('./reporter');
      const timestamp = new Date().toISOString();
      
      await generateJsonReport(results, path.join(outputDir, `import-results-${timestamp}.json`));
      await generateMarkdownReport(results, path.join(outputDir, `import-results-${timestamp}.md`));

      // Output summary
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log('[import:orders] ');
      console.log('[import:orders] Import complete!');
      console.log(`[import:orders] Success: ${successCount}`);
      console.log(`[import:orders] Failed: ${failedCount}`);
      console.log(`[import:orders] Skipped: ${skippedCount}`);
      console.log('[import:orders] ');
      console.log('[import:orders] Reports generated:');
      console.log(`[import:orders]   JSON: ${path.join(outputDir, `import-results-${timestamp}.json`)}`);
      console.log(`[import:orders]   Markdown: ${path.join(outputDir, `import-results-${timestamp}.md`)}`);
    } catch (error) {
    console.error('[import:orders] Fatal error:', error.message);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  run();
}
