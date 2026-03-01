/**
 * API Mocking Setup
 *
 * Provides utilities for mocking Sevdesk and Shopify API responses
 * for E2E tests. Uses nock library to intercept HTTP requests.
 */

import nock from 'nock';
import {
  SevdeskInvoice,
  SevdeskInvoiceResponse,
  SevdeskContact,
  SevdeskContactResponse
} from '../../../src/types/sevdesk';
import {
  ShopifyOrder,
} from '../../../src/types/shopify';

let activeMocks: nock.Scope[] = [];

/**
 * Mock Sevdesk API responses
 *
 * Intercepts HTTP requests to Sevdesk API and returns mock responses.
 * Useful for testing without hitting real Sevdesk API.
 *
 * @param {Object} options - Mock configuration options
 * @param {SevdeskInvoice[]} [options.invoices] - Mock invoices to return
 * @param {SevdeskContact[]} [options.contacts] - Mock contacts to return
 *
 * @throws {Error} If nock is not properly configured
 */
export function mockSevdeskAPI(options?: {
  invoices?: SevdeskInvoice[];
  contacts?: SevdeskContact[];
}): void {
  console.log('[E2E Mocks] Setting up Sevdesk API mocks...');

  const scope = nock(/sevdesk\.api/, { allowUnmocked: true });
  activeMocks.push(scope);

  // Mock GET /Invoice endpoint
  if (options?.invoices) {
    scope
      .get(/\/Invoice\//)
      .query(true)
      .reply(200, {
        objects: options.invoices,
        total: options.invoices.length,
      } as SevdeskInvoiceResponse)
      .persist();
  } else {
    // Default empty response
    scope
      .get(/\/Invoice\//)
      .query(true)
      .reply(200, {
        objects: [],
        total: 0,
      } as SevdeskInvoiceResponse)
      .persist();
  }

  // Mock GET /Invoice with query parameters (for getPaidInvoices)
  scope
    .get(/\/Invoice/)
    .query(true)
    .reply(200, {
      objects: options?.invoices || [],
      total: options?.invoices?.length || 0,
    } as SevdeskInvoiceResponse)
    .persist();

  // Mock GET /Contact endpoint
  if (options?.contacts) {
    scope
      .get(/\/Contact\//)
      .query(true)
      .reply(200, {
        objects: options.contacts,
        total: options.contacts.length,
      } as SevdeskContactResponse)
      .persist();
  } else {
    // Default empty response
    scope
      .get(/\/Contact\//)
      .query(true)
      .reply(200, {
        objects: [],
        total: 0,
      } as SevdeskContactResponse)
      .persist();
  }

  console.log(`[E2E Mocks] Sevdesk mocks configured with ${options?.invoices?.length || 0} invoices, ${options?.contacts?.length || 0} contacts`);
}

/**
 * Mock Shopify API responses
 *
 * Intercepts HTTP requests to Shopify API and returns mock responses.
 * Useful for testing without hitting real Shopify API.
 *
 * @param {Object} options - Mock configuration options
 * @param {ShopifyOrder[]} [options.orders] - Mock orders to return
 *
 * @throws {Error} If nock is not properly configured
 */
export function mockShopifyAPI(options?: {
  orders?: ShopifyOrder[];
}): void {
  console.log('[E2E Mocks] Setting up Shopify API mocks...');

  const scope = nock(/myshopify\.com/, { allowUnmocked: true });
  activeMocks.push(scope);

  // Mock GraphQL endpoint
  if (options?.orders) {
    scope
      .post(/\/admin\/api\/.*\/graphql\.json/)
      .reply(200, {
        data: {
          orders: {
            edges: options.orders.map(order => ({
              node: order,
            })),
          },
        },
      })
      .persist();
  } else {
    // Default empty response
    scope
      .post(/\/admin\/api\/.*\/graphql\.json/)
      .reply(200, {
        data: {
          orders: {
            edges: [],
          },
        },
      })
      .persist();
  }

  console.log(`[E2E Mocks] Shopify mocks configured with ${options?.orders?.length || 0} orders`);
}

/**
 * Clear all API mocks
 *
 * Removes all mocked HTTP requests and restores normal request behavior.
 * Should be called in afterEach or afterAll to clean up between tests.
 */
export function clearAPIMocks(): void {
  console.log('[E2E Mocks] Clearing all API mocks...');

  // Clean up all active mock scopes
  activeMocks.forEach(_scope => {
    try {
      // nock v14 uses persist() to keep mocks, just clear the array
      // The scopes will be cleaned up when the test ends
    } catch {
      // Ignore cleanup errors
    }
  });
  activeMocks.length = 0;
  activeMocks = [];

  // Clean up any remaining nock interceptors
  nock.cleanAll();
  nock.restore();

  console.log('[E2E Mocks] All API mocks cleared');
}

/**
 * Mock Sevdesk error response
 *
 * Configures Sevdesk API to return error responses.
 * Useful for testing error handling and retry logic.
 *
 * @param {number} statusCode - HTTP status code to return
 * @param {string} message - Error message to return
 */
export function mockSevdeskError(statusCode: number, message: string): void {
  console.log(`[E2E Mocks] Mocking Sevdesk error ${statusCode}: ${message}`);

  const scope = nock(/sevdesk\.api/, { allowUnmocked: true });
  activeMocks.push(scope);

  scope
    .get(/.*/)
    .query(true)
    .reply(statusCode, {
      error: message,
    });

  console.log(`[E2E Mocks] Sevdesk error mock configured`);
}

/**
 * Mock Shopify error response
 *
 * Configures Shopify API to return error responses.
 * Useful for testing error handling and retry logic.
 *
 * @param {string} message - Error message to return
 */
export function mockShopifyError(message: string): void {
  console.log(`[E2E Mocks] Mocking Shopify GraphQL error: ${message}`);

  const scope = nock(/myshopify\.com/, { allowUnmocked: true });
  activeMocks.push(scope);

  scope
    .post(/\/admin\/api\/.*\/graphql\.json/)
    .reply(200, {
      data: null,
      errors: [
        {
          message,
        },
      ],
    });

  console.log(`[E2E Mocks] Shopify error mock configured`);
}

/**
 * Mock network error
 *
 * Simulates network failures for testing retry logic and error handling.
 *
 * @param {string} apiUrl - URL pattern to match for error
 */
export function mockNetworkError(apiUrl: string): void {
  console.log(`[E2E Mocks] Mocking network error for ${apiUrl}`);

  const scope = nock(apiUrl, { allowUnmocked: true });
  activeMocks.push(scope);

  scope
    .get(/.*/)
    .replyWithError({
      message: 'ECONNREFUSED',
      code: 'ECONNREFUSED',
    });

  console.log('[E2E Mocks] Network error mock configured');
}
