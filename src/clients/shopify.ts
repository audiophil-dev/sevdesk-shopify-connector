import { config } from '../config';
import { 
  ShopifyAccessTokenResponse, 
  ShopifyGraphQLResponse, 
  ShopifyOrdersResponse 
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

    // Get new token using client credentials grant
    const url = `${this.getShopifyUrl()}/admin/oauth/access_token`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.shopify.clientId,
        client_secret: config.shopify.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Shopify access token: ${response.status} ${error}`);
    }

    const data = await response.json() as ShopifyAccessTokenResponse;
    
    // Cache the token with 5 minute buffer before expiry
    this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000);
    this.accessToken = data.access_token;
    
    console.log(`[shopify] Token acquired, expires in ${data.expires_in} seconds`);
    
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
}

export const shopifyClient = new ShopifyClient();
