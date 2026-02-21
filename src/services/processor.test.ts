/**
 * Unit tests for processor service
 */

// Mock dependencies
const mockSevdeskClient = {
  getInvoice: jest.fn(),
  getPaidInvoices: jest.fn(),
  getInvoiceContact: jest.fn(),
  searchInvoicesByCustomerEmail: jest.fn(),
};

const mockShopifyClient = {
  findOrderByEmail: jest.fn(),
  findOrderByOrderName: jest.fn(),
  markOrderAsPaid: jest.fn(),
  getAccessToken: jest.fn(),
};

const mockDbQuery = jest.fn();
const mockDbQueryOne = jest.fn();

jest.mock('../clients/sevdesk', () => ({
  sevdeskClient: mockSevdeskClient,
}));

jest.mock('../clients/shopify', () => ({
  shopifyClient: mockShopifyClient,
}));

jest.mock('../database/connection', () => ({
  query: mockDbQuery,
  queryOne: mockDbQueryOne,
}));

jest.mock('../services/emailSender', () => ({
  sendPaymentEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../config', () => ({
  config: {
    shopify: { shop: 'test-shop', clientId: 'test-id', clientSecret: 'test-secret' },
    sevdesk: { apiKey: 'test-key', baseUrl: 'https://test.sevdesk.de' },
    database: { url: 'postgresql://test' },
    server: { port: 3000 },
    polling: { intervalMs: 60000, enabled: false },
    dryRun: false,
  },
}));

import { processPaidInvoice } from './processor';
import { sendPaymentEmail } from './emailSender';
import { sevdeskInvoices, shopifyOrders } from '../test/fixtures';

describe('Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendPaymentEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('processPaidInvoice', () => {
    it('should skip if invoice already processed (idempotency)', async () => {
      // Mock: existing notification found
      mockDbQueryOne.mockResolvedValueOnce({
        id: 1,
        sevdesk_invoice_id: sevdeskInvoices.paid.id,
        notification_type: 'payment_received',
        status: 'sent',
      });

      await processPaidInvoice(sevdeskInvoices.paid);

      // Should not call Shopify, just return early
      expect(mockShopifyClient.findOrderByOrderName).not.toHaveBeenCalled();
    });

    it('should skip cancellation invoices', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);

      await processPaidInvoice(sevdeskInvoices.cancellation);

      // Should record as skipped
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining([
          sevdeskInvoices.cancellation.id,
          'payment_received',
          '',
          null,
          'skipped',
          'No Shopify order number in invoice header (may be cancellation or manual invoice)',
        ])
      );
    });

    it('should fail if no Shopify order found by order number', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: no order found
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(null);

      await processPaidInvoice(sevdeskInvoices.paid);

      // Should record failure
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining([
          sevdeskInvoices.paid.id,
          'payment_received',
          '',
          null,
          'failed',
          'No matching Shopify order found for order number 1001',
        ])
      );
    });

    it('should successfully process invoice with order match', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: order found
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(shopifyOrders.pending);
      // Mock: mark as paid succeeds
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      // Mock: notification recorded
      mockDbQuery.mockResolvedValueOnce({});

      await processPaidInvoice(sevdeskInvoices.paid);

      // Verify order was searched by order number
      expect(mockShopifyClient.findOrderByOrderName).toHaveBeenCalledWith('1001');
      
      // Verify order marked as paid
      expect(mockShopifyClient.markOrderAsPaid).toHaveBeenCalledWith(shopifyOrders.pending.id);

       // Verify notification recorded as sent
       expect(mockDbQuery).toHaveBeenLastCalledWith(
         expect.stringContaining('INSERT INTO notification_history'),
         expect.arrayContaining([
           sevdeskInvoices.paid.id,
           'payment_received',
           shopifyOrders.pending.email,
           shopifyOrders.pending.id,
           'sent',
         ])
       );
    });

    it('should handle markOrderAsPaid failure', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: order found
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(shopifyOrders.pending);
      // Mock: mark as paid fails
      mockShopifyClient.markOrderAsPaid.mockRejectedValueOnce(new Error('API Error'));

      await processPaidInvoice(sevdeskInvoices.paid);

       // Should record failure
       expect(mockDbQuery).toHaveBeenLastCalledWith(
         expect.stringContaining('INSERT INTO notification_history'),
         expect.arrayContaining([
           sevdeskInvoices.paid.id,
           'payment_received',
           shopifyOrders.pending.email,
           shopifyOrders.pending.id,
           'failed',
         ])
       );
    });

    it('should continue even if email sending fails', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: order found
      mockShopifyClient.findOrderByOrderName.mockResolvedValueOnce(shopifyOrders.pending);
      // Mock: mark as paid succeeds
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      // Mock: email fails
      (sendPaymentEmail as jest.Mock).mockRejectedValueOnce(new Error('Email failed'));
      // Mock: notification recorded
      mockDbQuery.mockResolvedValueOnce({});

      await processPaidInvoice(sevdeskInvoices.paid);

       // Should still record success
       expect(mockDbQuery).toHaveBeenLastCalledWith(
         expect.stringContaining('INSERT INTO notification_history'),
         expect.arrayContaining([
           sevdeskInvoices.paid.id,
           'payment_received',
           shopifyOrders.pending.email,
           shopifyOrders.pending.id,
           'sent',
         ])
       );
    });
  });
});
