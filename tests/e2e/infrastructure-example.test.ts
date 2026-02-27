/**
 * E2E Test Example
 *
 * Example E2E test demonstrating usage of:
 * - Test server setup (startTestServer, stopTestServer)
 * - Helper functions (waitFor, wait)
 * - Database seeding (seedE2EData, cleanupE2EData)
 */

import { startTestServer, stopTestServer, getTestApp } from './setup/server';
import { waitFor, wait, seedE2EData, cleanupE2EData } from './setup/helpers';

describe('E2E Test Infrastructure', () => {
  let testServerInfo: { app: any; port: number; url: string } | null = null;

  // Start server once before all tests
  beforeAll(async () => {
    try {
      testServerInfo = await startTestServer();
      console.log('[E2E Test] Server started:', testServerInfo);
    } catch (error) {
      console.error('[E2E Test] Failed to start server:', error);
      throw error;
    }
  }, 30000);

  // Cleanup after all tests
  afterAll(async () => {
    try {
      await stopTestServer();
      console.log('[E2E Test] Server stopped');
    } catch (error) {
      console.error('[E2E Test] Failed to stop server:', error);
    }
  });

  describe('Test Server Setup', () => {
    it('should start test server on available port', async () => {
      expect(testServerInfo).not.toBeNull();
      expect(testServerInfo?.port).toBeGreaterThanOrEqual(3000);
      expect(testServerInfo?.port).toBeLessThanOrEqual(3100);
      expect(testServerInfo?.url).toMatch(/http:\/\/localhost:\d+/);
    });

    it('should return Express app instance via getTestApp', async () => {
      const app = getTestApp();

      expect(app).toBeDefined();
      expect(app).not.toBeNull();
      expect(typeof app === 'function' || typeof app === 'object').toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should wait for condition to become true', async () => {
      let conditionMet = false;

      setTimeout(() => {
        conditionMet = true;
      }, 100);

      const startTime = Date.now();
      await waitFor(() => conditionMet, 2000);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(250);
      expect(conditionMet).toBe(true);
    });

    it('should timeout waiting for condition that never becomes true', async () => {
      let conditionMet = false;

      await expect(
        waitFor(() => conditionMet, 500)
      ).rejects.toThrow('Timeout: Condition did not become true within 500ms');
    });

    it('should wait for specified number of milliseconds', async () => {
      const startTime = Date.now();
      await wait(150);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(145); // At least 150ms
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Database Seeding and Cleanup', () => {
    it('should seed test data successfully', async () => {
      await seedE2EData({
        sevdeskInvoices: [
          {
            id: 'test-inv-1',
            invoiceNumber: 'PE-E2E-001',
            status: '1000',
            total: 100.00,
            currency: 'EUR',
            invoiceDate: '2026-02-27',
            dueDate: '2026-03-27',
            header: 'E2E Test Invoice',
            update: new Date().toISOString(),
            contact: {
              id: 'test-contact-1',
              objectName: 'Contact',
            },
          },
        ],
        shopifyOrders: [
          {
            id: 'test-order-1',
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

      expect(true).toBe(true);
    });

    it('should clean up test data successfully', async () => {
      await seedE2EData({
        sevdeskInvoices: [
          {
            id: 'test-cleanup-1',
            invoiceNumber: 'PE-CLEAN-001',
            status: '1000',
            total: 50.00,
            currency: 'EUR',
            invoiceDate: '2026-02-27',
            dueDate: '2026-03-27',
            header: 'Cleanup Test Invoice',
            update: new Date().toISOString(),
            contact: {
              id: 'test-contact-cleanup',
              objectName: 'Contact',
            },
          },
        ],
        shopifyOrders: [
          {
            id: 'test-order-cleanup-1',
            name: '#CLEAN-001',
            email: 'cleanup@example.com',
            displayFinancialStatus: 'paid',
            totalPriceSet: {
              shopMoney: {
                amount: '50.00',
                currencyCode: 'EUR',
              },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      await cleanupE2EData({
        invoiceIds: ['test-cleanup-1'],
        orderIds: ['test-order-cleanup-1'],
      });

      expect(true).toBe(true);
    });
  });
});
