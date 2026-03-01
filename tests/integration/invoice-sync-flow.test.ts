/**
 * Integration tests for invoice sync flow
 *
 * Tests the complete processor flow with mocked external services.
 */

// Mock dependencies - must be defined before jest.mock() calls
const mockShopifyClient = {
  findOrderByOrderName: jest.fn(),
  markOrderAsPaid: jest.fn(),
};

const mockSevdeskClient = {
  getInvoiceContact: jest.fn(),
};

const mockDbQuery = jest.fn();
const mockDbQueryOne = jest.fn();

jest.mock('../../src/clients/shopify', () => ({
  shopifyClient: mockShopifyClient,
}));

jest.mock('../../src/clients/sevdesk', () => ({
  sevdeskClient: mockSevdeskClient,
}));

jest.mock('../../src/database/connection', () => ({
  query: mockDbQuery,
  queryOne: mockDbQueryOne,
}));

jest.mock('../../src/services/emailSender', () => ({
  sendPaymentEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/config', () => ({
  config: {
    shopify: { shop: 'test-shop.myshopify.com', clientId: 'test-id', clientSecret: 'test-secret' },
    sevdesk: { apiKey: 'test-key', baseUrl: 'https://my.sevdesk.de' },
    database: { url: 'postgresql://test' },
    server: { port: 3000 },
    polling: { intervalMs: 60000, enabled: false },
    email: { from: 'test@example.com' },
  },
}));

import { processPaidInvoice } from '../../src/services/processor';

/**
 * Helper to create a test invoice
 */
function createInvoice(id: string, orderRef: string) {
  return {
    id,
    invoiceNumber: 'RE-001',
    status: '1000' as const,
    total: 100.00,
    currency: 'EUR',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-15',
    header: `Order #${orderRef}`,
    contact: {
      id: 'CONTACT-001',
      objectName: 'Contact',
    },
    update: '2024-01-15T10:00:00+00:00',
  };
}

/**
 * Helper to create a mock Shopify order
 */
function createShopifyOrder(name: string) {
  return {
    id: `gid://shopify/Order/${name.replace('#', '')}`,
    name: `#${name}`,
    email: 'customer@example.com',
    displayFinancialStatus: 'PENDING',
    totalPriceSet: {
      shopMoney: { amount: '100.00', currencyCode: 'EUR' },
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };
}

describe('Invoice Sync Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('processes paid invoice successfully', async () => {
      mockDbQueryOne.mockResolvedValueOnce(null);
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(createShopifyOrder('ORD12345'));
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce({
        id: 'CONTACT-001',
        name: 'Test Customer',
        emailPersonal: 'customer@example.com',
      });
      mockDbQuery.mockResolvedValueOnce({});

      // Note: extractOrderNumber regex captures only alphanumeric, no dashes
      await processPaidInvoice(createInvoice('INV-001', 'ORD12345'));

      expect(mockShopifyClient.findOrderByOrderName).toHaveBeenCalledWith('ORD12345');
      expect(mockShopifyClient.markOrderAsPaid).toHaveBeenCalled();
    });

    it('processes multiple invoices in sequence', async () => {
      for (let i = 1; i <= 3; i++) {
        mockDbQueryOne.mockResolvedValueOnce(null);
        mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(createShopifyOrder(`ORD${i}00`));
        mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
        mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce({
          id: 'CONTACT-001',
          name: 'Test Customer',
          emailPersonal: 'customer@example.com',
        });
        mockDbQuery.mockResolvedValueOnce({});
      }

      await processPaidInvoice(createInvoice('INV-A', 'ORD100'));
      await processPaidInvoice(createInvoice('INV-B', 'ORD200'));
      await processPaidInvoice(createInvoice('INV-C', 'ORD300'));

      expect(mockShopifyClient.markOrderAsPaid).toHaveBeenCalledTimes(3);
    });
  });

  describe('Idempotency', () => {
    it('skips already processed invoices', async () => {
      mockDbQueryOne.mockResolvedValueOnce({
        id: 1,
        sevdesk_invoice_id: 'INV-EXISTING',
        status: 'sent',
      });

      await processPaidInvoice(createInvoice('INV-EXISTING', 'ORD12345'));

      expect(mockShopifyClient.findOrderByOrderName).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles Shopify API failure gracefully', async () => {
      mockDbQueryOne.mockResolvedValueOnce(null);
      mockShopifyClient.findOrderByOrderName.mockRejectedValueOnce(new Error('API error'));
      mockDbQuery.mockResolvedValueOnce({});

      await expect(
        processPaidInvoice(createInvoice('INV-ERROR', 'ORD12345'))
      ).resolves.not.toThrow();
    });

    it('handles missing Shopify order', async () => {
      mockDbQueryOne.mockResolvedValueOnce(null);
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(null);
      mockDbQuery.mockResolvedValueOnce({});

      await expect(
        processPaidInvoice(createInvoice('INV-MISSING', 'ORDNOTFOUND'))
      ).resolves.not.toThrow();
    });
  });

  describe('Order Number Extraction', () => {
    it('extracts order number from header', async () => {
      mockDbQueryOne.mockResolvedValueOnce(null);
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(createShopifyOrder('TEST999'));
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce({
        id: 'CONTACT-001',
        name: 'Test Customer',
        emailPersonal: 'customer@example.com',
      });
      mockDbQuery.mockResolvedValueOnce({});

      await processPaidInvoice(createInvoice('INV-EXTRACT', 'TEST999'));

      expect(mockShopifyClient.findOrderByOrderName).toHaveBeenCalledWith('TEST999');
    });

    it('skips invoice without order reference', async () => {
      await processPaidInvoice({
        id: 'INV-NO-ORDER',
        invoiceNumber: 'RE-001',
        status: '1000' as const,
        total: 100.00,
        currency: 'EUR',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        header: 'Regular invoice without order number',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        update: '2024-01-15T10:00:00+00:00',
      });

      expect(mockShopifyClient.findOrderByOrderName).not.toHaveBeenCalled();
    });

    it('skips cancellation invoices', async () => {
      await processPaidInvoice({
        id: 'INV-CANCEL',
        invoiceNumber: 'RE-001',
        status: '1000' as const,
        total: -100.00,
        currency: 'EUR',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        header: 'Stornorechnung Order #ORD-12345',
        contact: { id: 'CONTACT-001', objectName: 'Contact' },
        update: '2024-01-15T10:00:00+00:00',
      });

      expect(mockShopifyClient.findOrderByOrderName).not.toHaveBeenCalled();
    });
  });
});
