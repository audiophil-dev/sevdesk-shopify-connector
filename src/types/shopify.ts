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

export interface StagedUploadTarget {
  url: string;
  resource: string;
  parameters: Array<{ name: string; value: string }>;
}

export interface BulkOperation {
  id: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  errorCode?: string;
  objectCount: number;
  url?: string; // Results download URL
}

export interface BulkOperationRunResponse {
  bulkOperation: {
    id: string;
    status: string;
    errorCode?: string;
    objectCount: number;
    url?: string;
    userErrors: Array<{ field: string; message: string }> | null;
  };
}

export interface BulkOperationStatusResponse {
  node: BulkOperation | null;
}

export interface OrderCreateOrderInput {
  lineItems: OrderCreateLineItemInput[];
  customer?: { toUpsert: { emailAddress: string } };
  financialStatus?: string;
  currency?: string;
  processedAt?: string;
  shippingAddress?: AddressInput;
  billingAddress?: AddressInput;
  transactions?: TransactionInput[];
  discountCode?: string;
  note?: string;
  tags?: string[];
}

export interface OrderCreateLineItemInput {
  variantId: string;
  quantity: number;
  priceSet: { presentmentMoney: { amount: string; currencyCode: string } };
  taxLines?: TaxLineInput[];
}

export interface CsvOrderRow {
  Id: string;
  Email: string;
  [key: string]: string; // 67 other fields
}

export interface AddressInput {
  address1?: string;
  address2?: string;
  city?: string;
  company?: string;
  country?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  province?: string;
  provinceCode?: string;
  zip?: string;
}

export interface OrderCreateOrderInput {
  address1?: string;
  address2?: string;
  city?: string;
  company?: string;
  country?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  province?: string;
  provinceCode?: string;
  zip?: string;
}

export interface TransactionInput {
  amount?: string;
  gateway?: string;
  kind?: string;
  paymentId?: string;
  processedAt?: string;
  source?: string;
  status?: string;
  test?: boolean;
}

export interface TaxLineInput {
  price?: string;
  priceSet?: {
    shopMoney?: {
      amount?: string;
      currencyCode?: string;
    };
  };
  rate?: string;
  ratePercentage?: string;
  title?: string;
}
