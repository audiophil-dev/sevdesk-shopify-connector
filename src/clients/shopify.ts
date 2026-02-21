import { config } from '../config';
import { 
  ShopifyAccessTokenResponse, 
  ShopifyGraphQLResponse, 
  ShopifyOrdersResponse,
  ShopifyOrder
} from '../types/shopify';

export class ShopifyClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  private getShopifyUrl(): string {
    return config.shopify.shop;
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Option 1: Use direct access token from config (for custom apps)
    if (config.shopify.accessToken) {
      this.accessToken = config.shopify.accessToken;
      // Direct tokens don't expire (or we don't know when)
      this.tokenExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      console.log('[shopify] Using direct access token from config');
      return this.accessToken;
    }

    // Option 2: Use client credentials grant (for Dev Dashboard apps)
    // See: https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens
    const url = `${this.getShopifyUrl()}/admin/oauth/access_token`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.shopify.clientId,
        client_secret: config.shopify.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Shopify access token: ${response.status} ${error}`);
    }

    const data = await response.json() as ShopifyAccessTokenResponse;
    
    this.accessToken = data.access_token;
    // Token expires in ~24 hours (86399 seconds), refresh 1 hour before expiry
    const expiresIn = data.expires_in || 86399;
    this.tokenExpiresAt = new Date(Date.now() + (expiresIn - 3600) * 1000);
    
    console.log(`[shopify] Token acquired via client credentials (expires in ${Math.floor(expiresIn / 3600)}h)`);
    
    return this.accessToken;
  }

  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.getShopifyUrl()}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify GraphQL request failed: ${response.status} ${error}`);
    }

    const result = await response.json() as ShopifyGraphQLResponse<T>;
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`Shopify GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  async getOrders(limit = 50): Promise<ShopifyOrdersResponse> {
    const query = `
      query GetOrders($first: Int!) {
        orders(first: $first) {
          edges {
            node {
              id
              name
              email
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    return this.graphql<ShopifyOrdersResponse>(query, { first: limit });
  }

  async getOrderById(orderId: string): Promise<ShopifyOrdersResponse> {
    const query = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          id
          name
          email
          displayFinancialStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.graphql<{ order: unknown }>(query, { id: orderId });
    return { orders: { edges: [{ node: data.order as never }] } };
  }

  /**
   * Find a Shopify order by order name (e.g., "PE4994", "#1001").
   * Returns the order matching the name.
   */
  async findOrderByOrderName(orderName: string): Promise<ShopifyOrder | null> {
    if (!orderName) {
      console.log('[shopify] No order name provided for lookup');
      return null;
    }

    const query = `
      query GetOrdersByName($query: String!, $first: Int!) {
        orders(first: $first, query: $query) {
          edges {
            node {
              id
              name
              email
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    // Search by order name in Shopify (remove # prefix if present)
    const cleanName = orderName.replace(/^#/, '');
    const searchQuery = `name:${cleanName}`;
    const response = await this.graphql<ShopifyOrdersResponse>(query, { 
      query: searchQuery, 
      first: 1 
    });

    if (!response.orders || response.orders.edges.length === 0) {
      console.log(`[shopify] No order found for name: ${orderName}`);
      return null;
    }

    const order = response.orders.edges[0].node;
    console.log(`[shopify] Found order ${order.name} (ID: ${order.id})`);
    
    return order;
  }

  /**
   * Find a Shopify order by customer email.
   * Returns the most recent order matching the email.
   */
  async findOrderByEmail(email: string): Promise<ShopifyOrder | null> {
    if (!email) {
      console.log('[shopify] No email provided for order lookup');
      return null;
    }

    const query = `
      query GetOrdersByEmail($query: String!, $first: Int!) {
        orders(first: $first, query: $query) {
          edges {
            node {
              id
              name
              email
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    // Search by email in Shopify
    const searchQuery = `email:${email}`;
    const response = await this.graphql<ShopifyOrdersResponse>(query, { 
      query: searchQuery, 
      first: 10 
    });

    if (!response.orders || response.orders.edges.length === 0) {
      console.log(`[shopify] No orders found for email: ${email}`);
      return null;
    }

    // Return the most recent order (first edge has most recent due to Shopify's sort)
    const mostRecentOrder = response.orders.edges[0].node;
    console.log(`[shopify] Found order ${mostRecentOrder.name} for email: ${email}`);
    
    return mostRecentOrder;
  }

  /**
   * Mark a Shopify order as paid.
   * Uses the orderUpdate mutation to set financial status to PAID.
   */
  async markOrderAsPaid(orderId: string): Promise<boolean> {
    const query = `
      mutation OrderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            displayFinancialStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await this.graphql<{
      orderUpdate: {
        order: { id: string; displayFinancialStatus: string } | null;
        userErrors: Array<{ field: string; message: string }>;
      };
    }>(query, {
      input: {
        id: orderId,
        financialStatus: "PAID",
      },
    });

    if (response.orderUpdate.userErrors && response.orderUpdate.userErrors.length > 0) {
      const errorMessages = response.orderUpdate.userErrors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to mark order as paid: ${errorMessages}`);
    }

    if (!response.orderUpdate.order) {
      throw new Error('Order update returned no order');
    }

    console.log(`[shopify] Order ${orderId} marked as paid (status: ${response.orderUpdate.order.displayFinancialStatus})`);
    return true;
  }
}

export const shopifyClient = new ShopifyClient();
