/**
 * E2E Test Helpers
 *
 * Provides utility functions for E2E tests including:
 * - Waiting for async operations
 * - Triggering poller checks manually
 * - Seeding test data in the database
 */

import {
  SevdeskInvoice
} from '../../../src/types/sevdesk';
import {
  ShopifyOrder
} from '../../../src/types/shopify';
import { getTestPool } from '../../setup/database';

/**
 * Wait for a condition to become true
 *
 * Polls a function until it returns true or timeout is reached.
 * Useful for waiting for async operations to complete.
 *
 * @param {() => boolean} fn - Function to evaluate for truthiness
 * @param {number} [timeout=10000] - Maximum wait time in milliseconds (default: 10s)
 * @param {number} [interval=100] - Check interval in milliseconds (default: 100ms)
 *
 * @returns {Promise<void>} Resolves when condition is true
 * @throws {Error} If timeout is reached before condition becomes true
 *
 * @example
 * ```typescript
 * await waitFor(() => {
 *   const status = await getOrderStatus();
 *   return status === 'completed';
 * }, 5000);
 * ```
 */
export function waitFor(
  fn: () => boolean | Promise<boolean>,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  return new Promise<void>((resolve, reject) => {
    const check = async () => {
      try {
        const result = await fn();

        if (result) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: Condition did not become true within ${timeout}ms`));
          return;
        }

        setTimeout(check, interval);
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

/**
 * Wait for a specific number of milliseconds
 *
 * Simple delay function for test pauses.
 *
 * @param {number} ms - Milliseconds to wait
 *
 * @returns {Promise<void>} Resolves after delay
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trigger poller check manually (for testing scheduled jobs)
 *
 * For E2E testing, we need to manually trigger the poller's
 * check function instead of waiting for the actual scheduled interval.
 * This allows faster, deterministic testing.
 *
 * Note: This requires modifying the poller service to expose its
 * check function or importing it directly. In a real implementation,
 * you would import and call the poller's processInvoices function.
 *
 * @returns {Promise<void>} Resolves when poller check completes
 *
 * @example
 * ```typescript
 * // In your E2E test:
 * await triggerPollerCheck();
 * // Verify database state after check
 * ```
 */
export async function triggerPollerCheck(): Promise<void> {
  console.log('[E2E Helpers] Triggering poller check for E2E testing...');

  try {
    // Import the processor module which contains the processPaidInvoice function
    const processorModule = await import('../../../src/services/processor');
    const processPaidInvoice = processorModule.processPaidInvoice;

    if (typeof processPaidInvoice === 'function') {
      // Get unpaid invoices from database and process them
      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM sevdesk_invoices WHERE status != $1',
        ['paid']
      );
      const invoices = result.rows;

      for (const invoice of invoices) {
        await processPaidInvoice(invoice);
      }
      console.log(`[E2E Helpers] Poller check completed: processed ${invoices.length} invoices`);
    } else {
      console.warn('[E2E Helpers] Could not find processPaidInvoice function');
    }
  } catch (error) {
    console.error('[E2E Helpers] Error triggering poller check:', error);
    throw error;
  }
}

/**
 * Seed test data in the database
 *
 * Inserts test Sevdesk invoices, Shopify orders, and mappings
 * into the test database. Useful for setting up test scenarios.
 *
 * @param {Object} data - Test data to seed
 * @param {SevdeskInvoice[]} [data.sevdeskInvoices] - Invoices to insert
 * @param {ShopifyOrder[]} [data.shopifyOrders] - Orders to insert
 *
 * @returns {Promise<void>} Resolves when data is seeded
 * @throws {Error} If database insertion fails
 *
 * @example
 * ```typescript
 * await seedE2EData({
 *   sevdeskInvoices: [
 *     { id: 'inv-1', invoiceNumber: 'PE001', status: '1000', total: 100.00, currency: 'EUR' }
 *   ],
 *   shopifyOrders: [
 *     { id: 'order-1', name: '#1001', email: 'test@example.com', displayFinancialStatus: 'pending' }
 *   ]
 * });
 * ```
 */
export async function seedE2EData(data: {
  sevdeskInvoices?: SevdeskInvoice[];
  shopifyOrders?: ShopifyOrder[];
}): Promise<void> {
  console.log('[E2E Helpers] Seeding test data...');

  const pool = getTestPool();

  try {
    // Seed Sevdesk invoices
    if (data.sevdeskInvoices && data.sevdeskInvoices.length > 0) {
      console.log(`[E2E Helpers] Seeding ${data.sevdeskInvoices.length} Sevdesk invoices...`);

      for (const invoice of data.sevdeskInvoices) {
        const status = invoice.status;

        await pool.query(`
          INSERT INTO sevdesk_invoices (id, invoice_number, status, total, currency, invoice_date, due_date, header, update_time, contact_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          invoice.id,
          invoice.invoiceNumber,
          status,
          invoice.total,
          invoice.currency,
          invoice.invoiceDate,
          invoice.dueDate,
          invoice.header || null,
          invoice.update || null,
          invoice.contact.id,
        ]);
      }

      console.log('[E2E Helpers] Sevdesk invoices seeded');
    }

    // Seed Shopify orders
    if (data.shopifyOrders && data.shopifyOrders.length > 0) {
      console.log(`[E2E Helpers] Seeding ${data.shopifyOrders.length} Shopify orders...`);

      for (const order of data.shopifyOrders) {
        await pool.query(`
          INSERT INTO shopify_orders (id, name, email, display_financial_status, total_price, currency_code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          order.id,
          order.name,
          order.email,
          order.displayFinancialStatus,
          order.totalPriceSet.shopMoney.amount,
          order.totalPriceSet.shopMoney.currencyCode,
          order.createdAt,
          order.updatedAt,
        ]);
      }

      console.log('[E2E Helpers] Shopify orders seeded');
    }

    console.log('[E2E Helpers] Test data seeded successfully');
  } catch (error) {
    console.error('[E2E Helpers] Error seeding test data:', error);
    throw error;
  }
}

/**
 * Clean up test data from database
 *
 * Removes seeded test data but preserves database schema.
 * Useful for cleaning up between E2E tests.
 *
 * @param {Object} options - Cleanup options
 * @param {string[]} [options.invoiceIds] - Specific invoice IDs to remove
 * @param {string[]} [options.orderIds] - Specific order IDs to remove
 *
 * @returns {Promise<void>} Resolves when data is cleaned up
 *
 * @example
 * ```typescript
 * await cleanupE2EData({
 *   invoiceIds: ['inv-1', 'inv-2'],
 *   orderIds: ['order-1', 'order-2']
 * });
 * ```
 */
export async function cleanupE2EData(options?: {
  invoiceIds?: string[];
  orderIds?: string[];
}): Promise<void> {
  console.log('[E2E Helpers] Cleaning up test data...');

  const pool = getTestPool();

  try {
    // Clean up specific invoices
    if (options?.invoiceIds && options.invoiceIds.length > 0) {
      await pool.query(`
        DELETE FROM sync_mapping
        WHERE sevdesk_invoice_id = ANY($1)
      `, [options.invoiceIds]);

      await pool.query(`
        DELETE FROM sevdesk_invoices
        WHERE id = ANY($1)
      `, [options.invoiceIds]);

      console.log(`[E2E Helpers] Cleaned up ${options.invoiceIds.length} invoices`);
    }

    // Clean up specific orders
    if (options?.orderIds && options.orderIds.length > 0) {
      await pool.query(`
        DELETE FROM shopify_orders
        WHERE id = ANY($1)
      `, [options.orderIds]);

      console.log(`[E2E Helpers] Cleaned up ${options.orderIds.length} orders`);
    }

    console.log('[E2E Helpers] Test data cleaned up successfully');
  } catch (error) {
    console.error('[E2E Helpers] Error cleaning up test data:', error);
    throw error;
  }
}

/**
 * Get count of records in database table
 *
 * Useful for verifying test data was inserted correctly.
 *
 * @param {string} table - Table name to count
 *
 * @returns {Promise<number>} Number of records in table
 *
 * @example
 * ```typescript
 * const count = await getTableCount('sevdesk_invoices');
 * expect(count).toBeGreaterThan(0);
 * ```
 */
export async function getTableCount(table: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Verify a record exists in database
 *
 * Useful for checking if a specific record was inserted or updated.
 *
 * @param {string} table - Table name to check
 * @param {string} id - Record ID to check
 * @param {string} [idColumn='id'] - Name of the ID column
 *
 * @returns {Promise<boolean>} True if record exists
 *
 * @example
 * ```typescript
 * const exists = await recordExists('sevdesk_invoices', 'inv-1');
 * expect(exists).toBe(true);
 * ```
 */
export async function recordExists(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  const pool = getTestPool();
  const result = await pool.query(`
    SELECT COUNT(*) FROM ${table}
    WHERE ${idColumn} = $1
  `, [id]);
  const count = parseInt(result.rows[0].count, 10);
  return count > 0;
}

/**
 * Reset test database to clean state
 *
 * Truncates all tables and removes all test data.
 * Useful between E2E tests to ensure isolation.
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await resetTestDatabase();
 * });
 * ```
 */
export async function resetTestDatabase(): Promise<void> {
  console.log('[E2E Helpers] Resetting test database...');

  const { teardownTestDatabase } = await import('../../setup/database');
  await teardownTestDatabase();

  console.log('[E2E Helpers] Test database reset');
}
