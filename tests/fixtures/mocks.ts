/**
 * Test utilities - Mock factories for testing
 */

import { SevdeskInvoice, SevdeskContact } from '../types/sevdesk';
import { ShopifyOrder } from '../types/shopify';

/**
 * Create a mock Shopify order
 */
export function createMockShopifyOrder(overrides: Partial<ShopifyOrder> = {}): ShopifyOrder {
  return {
    id: 'gid://shopify/Order/123',
    name: '#1001',
    email: 'test@example.com',
    displayFinancialStatus: 'PENDING',
    totalPriceSet: {
      shopMoney: {
        amount: '99.99',
        currencyCode: 'EUR',
      },
    },
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock Sevdesk invoice
 */
export function createMockSevdeskInvoice(overrides: Partial<SevdeskInvoice> = {}): SevdeskInvoice {
  return {
    id: 'INV-2026-001',
    invoiceNumber: '2026-00001',
    status: '1000',
    total: 99.99,
    currency: 'EUR',
    invoiceDate: '2026-02-15',
    dueDate: '2026-03-15',
    header: 'Rechnung zum Auftrag #1001',
    contact: {
      id: 'CONTACT-123',
      objectName: 'Contact',
    },
    ...overrides,
  };
}

/**
 * Create a mock Sevdesk contact
 */
export function createMockSevdeskContact(overrides: Partial<SevdeskContact> = {}): SevdeskContact {
  return {
    id: 'CONTACT-123',
    emailPersonal: 'test@example.com',
    emailWork: null,
    name: 'Test Customer',
    ...overrides,
  };
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
  } as unknown as Response;
}

/**
 * Create a mock fetch that throws an error
 */
export function createMockFetchError(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    text: async () => `Error: ${statusText}`,
    json: async () => ({ error: statusText }),
  } as unknown as Response;
}

/**
 * Mock console methods to track calls
 */
export function createMockConsole() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
}
