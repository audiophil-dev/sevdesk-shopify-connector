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
  },
}));

import { processPaidInvoice } from './processor';
import { sendPaymentEmail } from './emailSender';
import { sevdeskInvoices, sevdeskContacts, shopifyOrders } from '../test/fixtures';

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

      // Should not call Shopify or Sevdesk, just return early
      expect(mockShopifyClient.findOrderByEmail).not.toHaveBeenCalled();
      expect(mockSevdeskClient.getInvoiceContact).not.toHaveBeenCalled();
    });

    it('should fail if no customer email found', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: contact without email
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce(sevdeskContacts.withoutEmail);

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
        ])
      );
    });

    it('should fail if no Shopify order found', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: contact with email
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce(sevdeskContacts.withEmail);
      // Mock: no order found
      mockShopifyClient.findOrderByEmail.mockResolvedValueOnce(null);

      await processPaidInvoice(sevdeskInvoices.paid);

      // Should record failure
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_history'),
        expect.arrayContaining([
          sevdeskInvoices.paid.id,
          'payment_received',
          sevdeskContacts.withEmail.emailPersonal,
          null,
          'failed',
        ])
      );
    });

    it('should successfully process invoice with order match', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: contact with email
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce(sevdeskContacts.withEmail);
      // Mock: order found
      mockShopifyClient.findOrderByEmail.mockResolvedValueOnce(shopifyOrders.pending);
      // Mock: mark as paid succeeds
      mockShopifyClient.markOrderAsPaid.mockResolvedValueOnce(true);
      // Mock: notification recorded
      mockDbQuery.mockResolvedValueOnce({});

      await processPaidInvoice(sevdeskInvoices.paid);

      // Verify order marked as paid
      expect(mockShopifyClient.markOrderAsPaid).toHaveBeenCalledWith(shopifyOrders.pending.id);

       // Verify notification recorded as sent
       expect(mockDbQuery).toHaveBeenLastCalledWith(
         expect.stringContaining('INSERT INTO notification_history'),
         expect.arrayContaining([
           sevdeskInvoices.paid.id,
           'payment_received',
           sevdeskContacts.withEmail.emailPersonal,
           shopifyOrders.pending.id,
           'sent',
         ])
       );
    });

    it('should handle markOrderAsPaid failure', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: contact with email
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce(sevdeskContacts.withEmail);
      // Mock: order found
      mockShopifyClient.findOrderByEmail.mockResolvedValueOnce(shopifyOrders.pending);
      // Mock: mark as paid fails
      mockShopifyClient.markOrderAsPaid.mockRejectedValueOnce(new Error('API Error'));

      await processPaidInvoice(sevdeskInvoices.paid);

       // Should record failure
       expect(mockDbQuery).toHaveBeenLastCalledWith(
         expect.stringContaining('INSERT INTO notification_history'),
         expect.arrayContaining([
           sevdeskInvoices.paid.id,
           'payment_received',
           sevdeskContacts.withEmail.emailPersonal,
           shopifyOrders.pending.id,
           'failed',
         ])
       );
    });

    it('should continue even if email sending fails', async () => {
      // Mock: no existing notification
      mockDbQueryOne.mockResolvedValueOnce(null);
      // Mock: contact with email
      mockSevdeskClient.getInvoiceContact.mockResolvedValueOnce(sevdeskContacts.withEmail);
      // Mock: order found
      mockShopifyClient.findOrderByEmail.mockResolvedValueOnce(shopifyOrders.pending);
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
           sevdeskContacts.withEmail.emailPersonal,
           shopifyOrders.pending.id,
           'sent',
         ])
       );
    });
  });
});
