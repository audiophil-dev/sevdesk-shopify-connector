/**
 * Unit tests for Shopify client functionality
 * 
 * Note: These tests require proper Jest mocking setup.
 * Run with: npm test
 */

// Mock fetch globally before importing the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock config
jest.mock('../config', () => ({
  config: {
    shopify: {
      shop: 'https://test-shop.myshopify.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
    },
  },
}));

// Import after mocking
import { ShopifyClient } from '../clients/shopify';

describe('ShopifyClient', () => {
  let client: ShopifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ShopifyClient();
  });

  describe('findOrderByEmail', () => {
    it('should return null when email is empty', async () => {
      const result = await client.findOrderByEmail('');
      expect(result).toBeNull();
    });

    it('should return order when found by email', async () => {
      // Mock successful response with order
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            orders: {
              edges: [
                {
                  node: {
                    id: 'gid://shopify/Order/123',
                    name: '#1001',
                    email: 'test@test.com',
                    displayFinancialStatus: 'PENDING',
                    totalPriceSet: {
                      shopMoney: { amount: '99.99', currencyCode: 'EUR' }
                    },
                    createdAt: '2026-02-20T10:00:00Z',
                    updatedAt: '2026-02-20T10:00:00Z'
                  }
                }
              ]
            }
          }
        })
      });

      const result = await client.findOrderByEmail('test@test.com');
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('#1001');
      expect(result?.email).toBe('test@test.com');
    });

    it('should return null when no orders found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { orders: { edges: [] } }
        })
      });

      const result = await client.findOrderByEmail('nonexistent@test.com');
      expect(result).toBeNull();
    });
  });

  describe('markOrderAsPaid', () => {
    it('should return true when successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            orderUpdate: {
              order: {
                id: 'gid://shopify/Order/123',
                displayFinancialStatus: 'PAID'
              },
              userErrors: []
            }
          }
        })
      });

      const result = await client.markOrderAsPaid('gid://shopify/Order/123');
      expect(result).toBe(true);
    });

    it('should throw when userErrors present', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            orderUpdate: {
              order: null,
              userErrors: [
                { field: ['financialStatus'], message: 'Invalid status' }
              ]
            }
          }
        })
      });

      await expect(client.markOrderAsPaid('gid://shopify/Order/123'))
        .rejects.toThrow('Failed to mark order as paid');
    });
  });
});
