import { ShopifyClient } from '../clients/shopify';
import { parseOrdersCsv } from './csv-parser';

/**
 * Synchronize products from source shop to target shop.
 * Returns Map<ProductHandle, { productId: string, variants: Map<SKU, variantGID> }>.
 * 
 * Export function: syncProducts(source, target)
 */
export async function syncProducts(source: ShopifyClient, target: ShopifyClient): Promise<Map<string, string>> {
  console.log('[product-sync] Starting product synchronization...');
  console.log(`[product-sync] Source: ${source['getShopifyUrl']}`);
  console.log(`[product-sync] Target: ${target['getShopifyUrl']}`);

  const skuToGidMap = new Map<string, string>();
  let syncedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  try {
    // Get all products from source with variants
    const sourceProducts = await source.getAllProductsWithVariants();
    console.log(`[product-sync] Found ${sourceProducts.size} products in source shop`);

    // Get all products from target to check for existing variants
    const targetProducts = await target.getAllProductsWithVariants();
    const existingVariantSkus = new Set<string>();

    // Build set of existing SKUs in target
    for (const [handle, product] of targetProducts) {
      for (const [sku, variantGid] of product.variants.entries()) {
        existingVariantSkus.add(sku);
      }
    }

    console.log(`[product-sync] Found ${existingVariantSkus.size} existing variants in target shop`);

    // Create products in target shop
    for (const [handle, product] of sourceProducts.entries()) {
      const variantMap = new Map<string, string>();

      // Process variants
      for (const [sku, variantGid] of product.variants.entries()) {
        if (existingVariantSkus.has(sku)) {
          console.log(`[product-sync] Skipping existing variant: ${sku}`);
          skippedCount++;
          continue;
        }

        // Build variant input for productCreate
        variantMap.set(sku, variantGid);
        skuToGidMap.set(sku, variantGid);
      }

      if (variantMap.size === 0) {
        console.warn(`[product-sync] Skipping product ${handle} - no variants to import`);
        continue;
      }

      // Build productCreate mutation
      // Note: This is a simplified version - production code would need more fields
      const mutation = `
        mutation ProductCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Build input with variants
      // In production, this would use proper input types
      const input: any = {
        handle,
        variants: Array.from(variantMap.entries()).map(([sku, variantId]) => ({
          sku,
          price: '0', // Would come from source data
        })),
      };

      try {
        // Execute mutation (simplified - actual implementation would use proper GraphQL types)
        const response = await target.graphql<{ productCreate: { product: { id: string } | null; userErrors: Array<{ field: string; message: string }> } }>(
          mutation,
          { input }
        );

        if (response.productCreate.userErrors && response.productCreate.userErrors.length > 0) {
          const errorMsgs = response.productCreate.userErrors.map(e => `${e.field}: ${e.message}`).join(', ');
          console.error(`[product-sync] Failed to create product ${handle}: ${errorMsgs}`);
          continue;
        }

        if (!response.productCreate.product) {
          console.error(`[product-sync] Product creation returned no product for ${handle}`);
          continue;
        }

        // Track SKU to GID mapping
        for (const [sku, variantId] of variantMap.entries()) {
          skuToGidMap.set(sku, variantId);
        }

        syncedCount++;
        console.log(`[product-sync] Synced product ${handle} with ${variantMap.size} variants`);
      } catch (error) {
        console.error(`[product-sync] Error syncing product ${handle}:`, error.message);
        // Continue with next product even if one fails
      }
    }

    console.log(`[product-sync] Product sync complete: ${syncedCount} products synced, ${updatedCount} updated, ${skippedCount} skipped`);

    return skuToGidMap;
  } catch (error) {
    console.error('[product-sync] Fatal error during product sync:', error.message);
    throw error;
  }
}
