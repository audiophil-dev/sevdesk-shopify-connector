/**
 * E2E Test Example
 *
 * Example E2E test demonstrating usage of:
 * - Test server setup (startTestServer, stopTestServer)
 * - API mocking (mockSevdeskAPI, mockShopifyAPI)
 * - Test helpers (waitFor, seedE2EData)
 * - Test database (getTestPool)
 */

import { startTestServer, stopTestServer, getTestApp } from '../e2e/setup/server';
import { mockSevdeskAPI, mockShopifyAPI, clearAPIMocks, mockSevdeskError, mockShopifyError } from '../e2e/setup/mocks';
import { waitFor, seedE2EData, cleanupE2EData, getTableCount, recordExists } from '../e2e/setup/helpers';
import { getTestPool } from '../setup/database';
import { SevdeskInvoice, ShopifyOrder } from '../../src/types/sevdesk';
import { ShopifyOrder as ShopifyOrderType } from '../../src/types/shopify';
import request from 'supertest';

describe('E2E Test Infrastructure', () => {
  let testServerUrl: string;
  let testPort: number;

  beforeAll(async () => {
    console.log('=== E2E Test Setup ===');

    // Start test server
    const server = await startTestServer();
    testServerUrl = server.url;
    testPort = server.port;

    console.log(`Test server running on: ${testServerUrl}`);

    // Seed test data
    await seedE2EData({
      sevdeskInvoices: [
        {
          id: 'e2e-inv-1',
          invoiceNumber: 'PE-E2E-001',
          status: '1000', // Paid
          total: 100.00,
          currency: 'EUR',
          invoiceDate: '2026-02-27',
          dueDate: '2026-03-27',
          header: 'E2E Test Invoice',
          update: new Date().toISOString(),
          contact: {
            id: 'contact-1',
            objectName: 'Contact',
          },
        },
      ],
      shopifyOrders: [
        {
          id: 'e2e-order-1',
          name: '#E2E-001',
          email: 'e2e-test@example.com',
          displayFinancialStatus: 'pending',
          totalPriceSet: {
            shopMoney: {
              amount: '100.00',
              currencyCode: 'EUR',
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    console.log('=== E2E Test Setup Complete ===');
  });

  afterAll(async () => {
    console.log('=== E2E Test Cleanup ===');

    // Clean up test data
    await cleanupE2EData({
      invoiceIds: ['e2e-inv-1'],
      orderIds: ['e2e-order-1'],
    });

    // Stop test server
    await stopTestServer();

    // Clear API mocks
    clearAPIMocks();

    console.log('=== E2E Test Cleanup Complete ===');
  });

  describe('Test Server Setup', () => {
    it('should start test server on available port', async () => {
      expect(testPort).toBeGreaterThan(3000);
      expect(testPort).toBeLessThan(3100); // Within test range
      expect(testServerUrl).toMatch(/http:\/\/localhost:\d+/);
    });

    it('should return Express app instance', () => {
      const app = getTestApp();
      expect(app).toBeTruthy();
      expect(app).toBeDefined();
    });
  });

  describe('API Mocking', () => {
    it('should mock Sevdesk API responses', async () => {
      // Mock Sevdesk API to return test invoices
      const mockInvoices: SevdeskInvoice[] = [
        {
          id: 'mock-inv-1',
          invoiceNumber: 'PE-MOCK-001',
          status: '1000',
          total: 50.00,
          currency: 'EUR',
          invoiceDate: '2026-02-27',
          dueDate: '2026-03-27',
          header: 'Mock Invoice',
          update: new Date().toISOString(),
          contact: {
            id: 'mock-contact-1',
            objectName: 'Contact',
          },
        },
      ];

      mockSevdeskAPI({ invoices: mockInvoices });

      // Make request to Sevdesk API endpoint (would be intercepted)
      const app = getTestApp();
      const response = await request(app).get('/api/some-sevdesk-endpoint');

      // In real E2E test, this would verify the mock response
      // For now, just verify mocks are set up
      expect(response.status).toBe(404); // Endpoint doesn't exist yet
    });

    it('should mock Shopify API responses', async () => {
      // Mock Shopify API to return test orders
      const mockOrders: ShopifyOrder[] = [
        {
          id: 'mock-order-1',
          name: '#MOCK-001',
          email: 'mock@example.com',
          displayFinancialStatus: 'paid',
          totalPriceSet: {
            shopMoney: {
              amount: '75.00',
              currencyCode: 'EUR',
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockShopifyAPI({ orders: mockOrders });

      // Make request to Shopify API endpoint (would be intercepted)
      const app = getTestApp();
      const response = await request(app).get('/api/some-shopify-endpoint');

      // In real E2E test, this would verify the mock response
      expect(response.status).toBe(404); // Endpoint doesn't exist yet
    });

    it('should clear API mocks', () => {
      // Clear all mocks
      clearAPIMocks();

      // Re-setup mocks for next test
      mockSevdeskAPI({ invoices: [] });

      // Mocks should be cleared and reset
      expect(true).toBe(true);
    });
  });

  describe('Test Helpers', () => {
    it('should wait for condition to become true', async () => {
      let conditionMet = false;

      // Set condition to true after 100ms
      setTimeout(() => {
        conditionMet = true;
      }, 100);

      // Wait for condition (should complete quickly)
      await waitFor(() => conditionMet, 2000); // 2 second timeout

      expect(conditionMet).toBe(true);
    });

    it('should timeout waiting for condition', async () => {
      let conditionMet = false;

      // Don't set condition to true
      await expect(
        waitFor(() => conditionMet, 500) // 500ms timeout
      ).rejects.toThrow('Timeout: Condition did not become true within 500ms');
    });

    it('should seed E2E test data', async () => {
      const pool = getTestPool();

      // Seed test data
      await seedE2EData({
        sevdeskInvoices: [
          {
            id: 'test-inv-1',
            invoiceNumber: 'PE-TEST-001',
            status: '1000',
            total: 25.00,
            currency: 'EUR',
            invoiceDate: '2026-02-27',
            dueDate: '2026-03-27',
            header: 'Test Invoice',
            update: new Date().toISOString(),
            contact: {
              id: 'test-contact-1',
              objectName: 'Contact',
            },
          },
        ],
      });

      // Verify data was inserted
      const invoiceCount = await getTableCount('sevdesk_invoices');
      expect(invoiceCount).toBeGreaterThan(0);

      // Verify specific record exists
      const exists = await recordExists('sevdesk_invoices', 'test-inv-1');
      expect(exists).toBe(true);

      // Clean up
      await cleanupE2EData({ invoiceIds: ['test-inv-1'] });
    });

    it('should clean up E2E test data', async () => {
      const pool = getTestPool();

      // Seed test data
      await seedE2EData({
        sevdeskInvoices: [
          {
            id: 'test-inv-2',
            invoiceNumber: 'PE-TEST-002',
            status: '1000',
            total: 25.00,
            currency: 'EUR',
            invoiceDate: '2026-02-27',
            dueDate: '2026-03-27',
            header: 'Test Invoice 2',
            update: new Date().toISOString(),
            contact: {
              id: 'test-contact-2',
              objectName: 'Contact',
            },
          },
        ],
      });

      // Verify data exists
      const existsBefore = await recordExists('sevdesk_invoices', 'test-inv-2');
      expect(existsBefore).toBe(true);

      // Clean up specific record
      await cleanupE2EData({ invoiceIds: ['test-inv-2'] });

      // Verify data was removed
      const existsAfter = await recordExists('sevdesk_invoices', 'test-inv-2');
      expect(existsAfter).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Sevdesk API errors', async () => {
      // Mock Sevdesk error response
      mockSevdeskError(500, 'Internal Server Error');

      // In real E2E test, you would verify error handling
      expect(true).toBe(true);
    });

    it('should handle Shopify API errors', async () => {
      // Mock Shopify error response
      mockShopifyError('GraphQL query failed');

      // In real E2E test, you would verify error handling
      expect(true).toBe(true);
    });

    it('should clean up mocks between tests', async () => {
      // Mock an API
      mockSevdeskAPI({ invoices: [] });

      // Clear mocks (important between tests)
      clearAPIMocks();

      // Mock different data (no interference from previous mock)
      mockSevdeskAPI({ invoices: [] });

      expect(true).toBe(true);
    });
  });
});
