/**
 * Unit tests for Sevdesk client
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock config
jest.mock('../config', () => ({
  config: {
    sevdesk: {
      apiKey: 'test-api-key',
      baseUrl: 'https://my.sevdesk.de/api/v1',
    },
  },
}));

import { SevdeskClient } from './sevdesk';
import { apiResponses, sevdeskInvoices, sevdeskContacts } from '../test/fixtures';

describe('SevdeskClient', () => {
  let client: SevdeskClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SevdeskClient();
  });

  describe('getInvoice', () => {
    it('should return invoice when found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          objects: [sevdeskInvoices.paid],
        }),
      });

      const result = await client.getInvoice('INV-2026-001');

      expect(result).toEqual(sevdeskInvoices.paid);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://my.sevdesk.de/api/v1/Invoice/INV-2026-001',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-api-key',
          }),
        })
      );
    });

    it('should throw when invoice not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ objects: [] }),
      });

      await expect(client.getInvoice('INVALID')).rejects.toThrow('Invoice not found: INVALID');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(client.getInvoice('INV-001')).rejects.toThrow('Sevdesk API error: 500 Internal Server Error');
    });
  });

  describe('getPaidInvoices', () => {
    it('should return list of paid invoices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponses.sevdeskInvoiceResponse,
      });

      const result = await client.getPaidInvoices();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(sevdeskInvoices.paid);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=1000'),
        expect.any(Object)
      );
    });

    it('should include date filter when since parameter provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ objects: [], total: 0 }),
      });

      const since = new Date('2026-01-01');
      await client.getPaidInvoices(since);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('invoiceDateFrom=2026-01-01'),
        expect.any(Object)
      );
    });

    it('should return empty array when no paid invoices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ objects: [], total: 0 }),
      });

      const result = await client.getPaidInvoices();

      expect(result).toHaveLength(0);
    });
  });

  describe('getInvoiceContact', () => {
    it('should return contact when found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponses.sevdeskContactResponse,
      });

      const result = await client.getInvoiceContact('CONTACT-001');

      expect(result).toEqual(sevdeskContacts.withEmail);
    });

    it('should throw when contact not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ objects: [] }),
      });

      await expect(client.getInvoiceContact('INVALID')).rejects.toThrow('Contact not found: INVALID');
    });
  });

  describe('searchInvoicesByCustomerEmail', () => {
    it('should return invoices matching customer email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponses.sevdeskInvoiceResponse,
      });

      const result = await client.searchInvoicesByCustomerEmail('customer1@example.com');

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('customer1%40example.com'),
        expect.any(Object)
      );
    });
  });
});
