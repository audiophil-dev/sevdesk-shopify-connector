import { ShopifyClient } from '../clients/shopify';
import { syncProducts } from '../product-sync';
import { config } from '../../config';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.variant-mapping-cache.json');

/**
 * CLI command to sync products from source shop to target shop.
 * Usage: npm run import:products
 */
async function run() {
  console.log('[import:products] Starting product synchronization...');

  // Parse environment variables
  const sourceShop = config.shopify.shop;
  const targetShop = config.shopify.targetShop;

  if (!sourceShop || !targetShop) {
    console.error('[import:products] Missing required environment variables:');
    console.error('  SOURCE_SHOPIFY_SHOP (e.g., "paurum-prod-shop")');
    console.error('  TARGET_SHOPIFY_SHOP (e.g., "paurum-dev-shop")');
    console.error('');
    console.error('Required environment variables:');
    console.error('  Shopify access tokens (optional if using OAuth):');
    console.error('    SHOPIFY_ACCESS_TOKEN_SOURCE');
    console.error('    SHOPIFY_ACCESS_TOKEN_TARGET');
    console.error('');
    console.error('Note: Set SHOPIFY_ACCESS_TOKEN to "direct" if using custom app tokens');
    process.exit(1);
  }

  console.log(`[import:products] Source shop: ${sourceShop}`);
  console.log(`[import:products] Target shop: ${targetShop}`);

  // Create Shopify client instances
  const sourceClient = new ShopifyClient(sourceShop);
  const targetClient = new ShopifyClient(targetShop);

  try {
    // Sync products
    const skuMapping = await syncProducts(sourceClient, targetClient);

    console.log(`[import:products] Synced ${skuMapping.size} product variants`);

    // Save to cache file
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheData = {
      timestamp: new Date().toISOString(),
      sourceShop,
      targetShop,
      mapping: Object.fromEntries(skuMapping),
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log(`[import:products] Saved variant mapping to ${CACHE_FILE}`);

    // Output summary
    console.log('[import:products] Product sync completed successfully');
    console.log('[import:products] ');
    console.log('[import:products] Variant mapping saved to cache file');
    console.log('[import:products] Use this mapping when importing orders.');
    console.log('[import:products] ');

    process.exit(0);
  } catch (error) {
    console.error('[import:products] Fatal error during product sync:', error.message);
    process.exit(1);
  }
}

run();
