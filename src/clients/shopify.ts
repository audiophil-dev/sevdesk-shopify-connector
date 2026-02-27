import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { 
  ShopifyAccessTokenResponse, 
  ShopifyGraphQLResponse, 
  ShopifyOrdersResponse,
  ShopifyOrder,
  StagedUploadTarget,
  BulkOperation,
} from '../types/shopify';

interface StoredToken {
  accessToken: string;
  expiresAt: string; // ISO date string
  scope: string;
}

const TOKEN_FILE = path.join(process.cwd(), '.shopify-token.json');

export class ShopifyClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  /**
   * Get the Shopify shop URL in the correct format.
   * Handles multiple input formats:
   * - "paurum-dev-shop" -> "https://paurum-dev-shop.myshopify.com"
   * - "paurum-dev-shop.myshopify.com" -> "https://paurum-dev-shop.myshopify.com"
   * - "https://admin.shopify.com/store/paurum-dev-shop" -> "https://paurum-dev-shop.myshopify.com"
   */
  private getShopifyUrl(): string {
    const shop = config.shopify.shop;
    
    // Already a full myshopify.com URL
    if (shop.includes('.myshopify.com')) {
      return shop.startsWith('https://') ? shop : `https://${shop}`;
    }
    
    // Admin URL format: https://admin.shopify.com/store/{shop-name}
    const adminMatch = shop.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (adminMatch) {
      return `https://${adminMatch[1]}.myshopify.com`;
    }
    
    // Just the shop name
    return `https://${shop}.myshopify.com`;
  }

  /**
   * Load token from persistent storage (file).
   * Returns null if file doesn't exist or token is expired.
   */
  private loadTokenFromFile(): StoredToken | null {
    try {
      if (!fs.existsSync(TOKEN_FILE)) {
        return null;
      }
      
      const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
      const token = JSON.parse(data) as StoredToken;
      
      // Check if token is still valid (with 1 hour buffer)
      const expiresAt = new Date(token.expiresAt);
      const bufferMs = 60 * 60 * 1000; // 1 hour
      if (new Date().getTime() + bufferMs >= expiresAt.getTime()) {
        console.log('[shopify] Stored token has expired, will fetch new one');
        return null;
      }
      
      return token;
    } catch (error) {
      console.log('[shopify] Failed to load token from file:', error);
      return null;
    }
  }

  /**
   * Save token to persistent storage (file).
   */
  private saveTokenToFile(token: StoredToken): void {
    try {
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
      console.log('[shopify] Token saved to file for reuse');
    } catch (error) {
      console.error('[shopify] Failed to save token to file:', error);
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token in memory
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

    // Option 2: Try to load token from file
    const storedToken = this.loadTokenFromFile();
    if (storedToken) {
      this.accessToken = storedToken.accessToken;
      this.tokenExpiresAt = new Date(storedToken.expiresAt);
      console.log(`[shopify] Using stored token (expires at ${this.tokenExpiresAt.toISOString()})`);
      return this.accessToken;
    }

    // Option 3: Fetch new token via client credentials grant (for Dev Dashboard apps)
    // See: https://shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens
    console.log('[shopify] Fetching new access token via client credentials...');
    
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
    
    // Save token to file for reuse
    this.saveTokenToFile({
      accessToken: this.accessToken,
      expiresAt: this.tokenExpiresAt.toISOString(),
      scope: data.scope,
    });
    
    console.log(`[shopify] Token acquired via client credentials (expires in ${Math.floor(expiresIn / 3600)}h)`);
    
    return this.accessToken;
  }

  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.getShopifyUrl()}/admin/api/2024-10/graphql.json`, {
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

  /**
   * Create a staged upload target for bulk operations.
   * Returns URL and resource ID for uploading files.
   */
  async stagedUploadsCreate(filename: string, fileSize: number): Promise<import { StagedUploadTarget }> {
    const token = await this.getAccessToken();
    const query = `
      mutation StagedUploadsCreate($input: StagedUploadTargetCreateInput!) {
        stagedUploadsCreate {
          stagedUploadTarget {
            url
            resource {
              ... on BulkOperationResource {
                __typename
              }
            }
          }
          parameters {
            name
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const response = await this.graphql<{
      stagedUploadsCreate: {
        stagedUploadTarget: {
          url: string;
          resource: any;
          parameters: Array<{ name: string; value: string }> | null;
          userErrors: Array<{ field: string; message: string }> | null;
        };
      };
    }>(query, {
      input: {
        filename,
        fileSize,
        resource: 'BULK_MUTATION_VARIABLES',
      },
    });

    if (response.stagedUploadsCreate.userErrors && response.stagedUploadsCreate.userErrors.length > 0) {
      const errorMessages = response.stagedUploadsCreate.userErrors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create staged upload: ${errorMessages}`);
    }

    if (!response.stagedUploadsCreate.stagedUploadTarget) {
      throw new Error('Staged upload creation returned no target');
    }

    return response.stagedUploadsCreate.stagedUploadTarget;
  }

  /**
   * Upload content to a staged upload target URL.
   * Uses native fetch with multipart form data.
   */
  async uploadToStagedTarget(target: import { StagedUploadTarget }, content: Buffer): Promise<void> {
    const formData = new FormData();
    formData.append('file', content, target.parameters[0].value);

    const response = await fetch(target.url, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload to staged target: ${response.status} ${error}`);
    }

    console.log(`[shopify] Successfully uploaded to staged target`);
  }

  /**
   * Run a bulk operation mutation.
   * Returns operation ID for polling.
   */
  async bulkOperationRunMutation(mutation: string, uploadPath: string): Promise<string> {
    const token = await this.getAccessToken();
    const query = `
      mutation BulkOperationRun($input: BulkOperationRunInput!) {
        bulkOperationRun {
          bulkOperation {
            id
            status
            errorCode
            objectCount
            url
            userErrors {
              field
              message
            }
          }
        }
      }
    `;
    
    const response = await this.graphql<{
      bulkOperationRun: {
        bulkOperation: {
          id: string;
          status: string;
          errorCode?: string;
          objectCount: number;
          url?: string;
          userErrors: Array<{ field: string; message: string }> | null;
        };
      };
    }>(query, {
      input: {
        mutation,
        stagedUploadPath: uploadPath,
      },
    });

    if (response.bulkOperationRun.userErrors && response.bulkOperationRun.userErrors.length > 0) {
      const errorMessages = response.bulkOperationRun.userErrors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to run bulk operation: ${errorMessages}`);
    }

    if (!response.bulkOperationRun.bulkOperation) {
      throw new Error('Bulk operation run returned no operation');
    }

    console.log(`[shopify] Bulk operation started: ${response.bulkOperationRun.bulkOperation.id}`);
    return response.bulkOperationRun.bulkOperation.id;
  }

  /**
   * Get the status of a bulk operation.
   */
  async getBulkOperationStatus(operationId: string): Promise<import { BulkOperation }> {
    const token = await this.getAccessToken();
    const query = `
      query GetBulkOperation($id: ID!) {
        node {
          ... on BulkOperation {
            id
            status
            errorCode
            objectCount
            url
          }
        }
      }
    `;
    
    const response = await this.graphql<{
      node: import { BulkOperation } | null;
    }>(query, { id: operationId });

    if (!response.node) {
      throw new Error(`Bulk operation not found: ${operationId}`);
    }

    return response.node;
  }

  /**
   * Get all products with variants from the shop.
   * Returns Map<SKU, { productId: string, variants: Map<SKU, variantGID> }>.
   */
  async getAllProductsWithVariants(): Promise<Map<string, { id: string; variants: Map<string, string> }>> {
    const token = await this.getAccessToken();
    const productMap = new Map<string, { id: string; variants: Map<string, string> }>();
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const query = `
        query GetProductsWithVariants($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                handle
                variants(first: 100) {
                  edges {
                    node {
                      id
                      sku
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      
      const response = await this.graphql<{
        products: {
          edges: Array<{
            node: {
              id: string;
              handle: string;
              variants: {
                edges: Array<{
                  node: {
                    id: string;
                    sku: string | null;
                  }>;
                };
              };
            };
          }>;
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      }>(query, {
        first: 50,
        after: cursor,
      });

      for (const edge of response.products.edges) {
        const variantMap = new Map<string, string>();
        
        for (const variantEdge of edge.node.variants.edges) {
          if (variantEdge.node.sku) {
            variantMap.set(variantEdge.node.sku, variantEdge.node.id);
          }
        }
        
        // Also map by handle in case SKU lookup fails
        productMap.set(edge.node.handle, {
          id: edge.node.id,
          variants: variantMap,
        });
      }

      hasNextPage = response.products.pageInfo.hasNextPage;
      cursor = response.products.pageInfo.endCursor;
    }

    console.log(`[shopify] Fetched ${productMap.size} products with variants`);
    return productMap;
  }
}

export const shopifyClient = new ShopifyClient();
