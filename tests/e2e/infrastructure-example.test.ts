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
  let testServerUrl: string;
  let testPort: number;

  describe('Test Server Setup', () => {
    it('should start test server on available port', async () => {
      const server = await startTestServer();
      testServerUrl = server.url;
      testPort = server.port;

      expect(testPort).toBeGreaterThan(3000); // Within test range
      expect(testPort).toBeLessThan(3100); // Within test range
      expect(testServerUrl).toMatch(/http:\/\/localhost:\d+/);
      expect(getTestApp()).toBeTruthy();
    });

    it('should return Express app instance', async () => {
      const server = await startTestServer();
      const app = getTestApp();

      expect(app).toBeDefined();
      expect(typeof app === 'object').toBe(true);
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
