export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  displayFinancialStatus: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyOrdersResponse {
  orders: {
    edges: Array<{
      node: ShopifyOrder;
    }>;
  };
}

export interface ShopifyGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
}
