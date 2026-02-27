import { OrderCreateOrderInput } from '../types/shopify';

/**
 * Import configuration from environment variables.
 */
export interface ImportConfig {
  sourceShop: string;
  targetShop: string;
  csvFilePath: string;
  outputDir: string;
  dryRun?: boolean; // If true, validate only without importing
}

/**
 * Intermediate order representation from CSV.
 * Multiple CSV rows with same Id are grouped into one order.
 */
export interface ParsedOrder {
  id: string; // Order ID (from CSV "Id" column)
  email: string; // Customer email
  lineItems: ParsedLineItem[];
  raw: Record<string, string>; // All original CSV fields
}

/**
 * Parsed line item from CSV row.
 */
export interface ParsedLineItem {
  name: string;
  quantity: number;
  price: string;
  sku: string; // Variant SKU for lookup
}

/**
 * Result of importing a single order.
 */
export interface ImportResult {
  line: number; // Line number in input file
  orderId: string;
  success: boolean;
  variantId?: string; // If success, the variant GID used
  error?: string; // If failed, error message
  shopifyOrderId?: string; // If success, the created Shopify order ID
}

/**
 * Final import report structure.
 */
export interface ImportReport {
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number; // Orders with missing variants
  };
  results: ImportResult[];
  duration: number; // Time in seconds
  timestamp: string;
}
