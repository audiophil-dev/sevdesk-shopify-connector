/**
 * Integration tests for payment notification flow
 * 
 * These tests verify the complete flow from Sevdesk invoice to Shopify order update.
 * They use mocks to simulate external services.
 */

// Mock dependencies
const mockSevdeskClient = {
  getInvoice: jest.fn(),
  getPaidInvoices: jest.fn(),
};

const mockShopifyClient = {
  findOrderByOrderName: jest.fn(),
  markOrderAsPaid: jest.fn(),
  getAccessToken: jest.fn(),
};

const mockDbQuery = jest.fn();
const mockDbQueryOne = jest.fn();

jest.mock('../../clients/sevdesk', () => ({
  sevdeskClient: mockSevdeskClient,
}));

jest.mock('../../clients/shopify', () => ({
  shopifyClient: mockShopifyClient,
}));

jest.mock('../../database/connection', () => ({
  query: mockDbQuery,
  queryOne: mockDbQueryOne,
}));

jest.mock('../../services/emailSender', () => ({
  sendPaymentEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../config', () => ({
  config: {
    shopify: { shop: 'test-shop', clientId: 'test-id', clientSecret: 'test-secret' },
    sevdesk: { apiKey: 'test-key', baseUrl: 'https://test.sevdesk.de' },
    database: { url: 'postgresql://test' },
    server: { port: 3000 },
    polling: { intervalMs: 60000, enabled: false },
  },
}));

import { processPaidInvoice } from '../../services/processor';

describe('Payment Notification Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
     it('should process paid invoice end-to-end', async () => {
       // Arrange: Mock responses
       mockDbQueryOne.mockResolvedValueOnce(null); // No existing notification
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce({
        id: 'gid://shopify/Order/123',
        name: '#1001',
        email: 'customer@test.com',
        displayFinancialStatus: 'PENDING',
        totalPriceSet: {
          shopMoney: { amount: '99.99', currencyCode: 'EUR' },
        },
        createdAt: '2026-02-20T10:00:00Z',
        updatedAt: '2026-02-20T10:00:00Z',
      });
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      mockDbQuery.mockResolvedValueOnce({});

      // Act
      await processPaidInvoice({
        id: 'INV-001',
        invoiceNumber: '2026-00001',
        status: '1000',
        total: 99.99,
        currency: 'EUR',
        invoiceDate: '2026-02-15',
        dueDate: '2026-03-15',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        header: 'Rechnung zum Auftrag #1001',
      });

      // Assert
      expect(mockShopifyClient.findOrderByOrderName).toHaveBeenCalledWith('1001');
      expect(mockShopifyClient.markOrderAsPaid).toHaveBeenCalledWith('gid://shopify/Order/123');
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining(['INV-001', 'payment_received', 'customer@test.com', 'gid://shopify/Order/123', 'sent'])
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing order number in header', async () => {
      // Arrange
      mockDbQueryOne.mockResolvedValueOnce(null);

      // Act - invoice without order number in header
      await processPaidInvoice({
        id: 'INV-001',
        invoiceNumber: '2026-00001',
        status: '1000',
        total: 99.99,
        currency: 'EUR',
        invoiceDate: '2026-02-15',
        dueDate: '2026-03-15',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        header: undefined,
      });

      // Assert - error is caught and recorded as skipped (not a failure, just no order number)
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining(['INV-001', 'payment_received', '', null, 'skipped'])
      );
    });

    it('should handle Shopify API failure gracefully', async () => {
       // Arrange
       mockDbQueryOne.mockResolvedValueOnce(null);
       mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce({
        id: 'gid://shopify/Order/123',
        name: '#1001',
        email: 'customer@test.com',
        displayFinancialStatus: 'PENDING',
        totalPriceSet: {
          shopMoney: { amount: '99.99', currencyCode: 'EUR' },
        },
        createdAt: '2026-02-20T10:00:00Z',
        updatedAt: '2026-02-20T10:00:00Z',
      });
       mockShopifyClient.markOrderAsPaid.mockRejectedValueOnce(new Error('Shopify rate limit'));

      // Act
      await processPaidInvoice({
        id: 'INV-001',
        invoiceNumber: '2026-00001',
        status: '1000',
        total: 99.99,
        currency: 'EUR',
        invoiceDate: '2026-02-15',
        dueDate: '2026-03-15',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        header: 'Rechnung zum Auftrag #1001',
      });

      // Assert - should record failure
      expect(mockDbQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining([
          'INV-001',
          'payment_received',
          'customer@test.com',
          'gid://shopify/Order/123',
          'failed',
        ])
      );
    });

    it('should handle duplicate invoice processing (idempotency)', async () => {
      // Arrange: Existing notification
      mockDbQueryOne.mockResolvedValueOnce({
        id: 1,
        sevdesk_invoice_id: 'INV-001',
        notification_type: 'payment_received',
        status: 'sent',
      });

      // Act
      await processPaidInvoice({
        id: 'INV-001',
        invoiceNumber: '2026-00001',
        status: '1000',
        total: 99.99,
        currency: 'EUR',
        invoiceDate: '2026-02-15',
        dueDate: '2026-03-15',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        header: 'Rechnung zum Auftrag #1001',
      });

      // Assert - Should not make any external calls
      expect(mockShopifyClient.findOrderByOrderName).not.toHaveBeenCalled();
      expect(mockShopifyClient.markOrderAsPaid).not.toHaveBeenCalled();
    });
  });
});
