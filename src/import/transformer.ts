import { OrderCreateOrderInput, ParsedOrder, ParsedLineItem } from './types';

/**
 * Transform a parsed order from CSV into Shopify OrderCreateOrderInput.
 * Uses variant lookup to map SKU to variant GID.
 */
export function transformOrder(order: ParsedOrder, variantLookup: Map<string, string>): OrderCreateOrderInput | null {
  // Check if all line items have valid variant SKUs
  const validLineItems = order.lineItems.filter(item => {
    if (!item.sku) {
      console.warn(`[transformer] Skipping line item without SKU in order ${order.id}`);
      return false;
    }

    const variantGid = variantLookup.get(item.sku);
    if (!variantGid) {
      console.warn(`[transformer] Skipping line item with missing variant: SKU ${item.sku} in order ${order.id}`);
      return false;
    }

    return true;
  });

  // If no valid line items, skip this order
  if (validLineItems.length === 0) {
    console.warn(`[transformer] Skipping order ${order.id} - no valid line items`);
    return null;
  }

  // Build customer input from email
  const customerInput = order.email ? {
    toUpsert: {
      emailAddress: order.email,
    },
  } : undefined;

  // Build line items input
  const lineItemsInput = validLineItems.map(item => {
    const variantGid = variantLookup.get(item.sku)!;

    return {
      variantId: variantGid,
      quantity: item.quantity,
      priceSet: {
        presentmentMoney: {
          amount: item.price,
          currencyCode: 'EUR', // Default to EUR, should come from config
        },
      },
    };
  });

  // Build address inputs from raw data
  const addressKeys = ['Shipping Address1', 'Shipping Address2', 'Shipping City', 'Shipping Province',
                        'Shipping Country', 'Shipping Zip', 'Billing Address1', 'Billing Address2',
                        'Billing City', 'Billing Province', 'Billing Country', 'Billing Zip'];

  const shippingAddressInput: buildAddressInput(order.raw, 'Shipping');
  const billingAddressInput = buildAddressInput(order.raw, 'Billing');

  // Build financial status from raw data
  const financialStatus = mapFinancialStatus(order.raw['Financial Status']);

  // Build transactions input from raw data (simplified)
  const transactionsInput = [{
    amount: order.raw['Total Price'] || '0',
    kind: 'sale',
    status: 'success',
    gateway: 'manual',
    processedAt: new Date().toISOString(),
  }];

  // Build processedAt date from Created At
  const processedAt = order.raw['Created At'] ? 
    new Date(order.raw['Created At']).toISOString() : 
    undefined;

  // Build input
  const orderInput: OrderCreateOrderInput = {
    lineItems: lineItemsInput,
    customer: customerInput,
    financialStatus,
    currency: 'EUR',
    processedAt,
    shippingAddress: shippingAddressInput,
    billingAddress: billingAddressInput,
    transactions: transactionsInput,
    discountCode: order.raw['Discount Code'] || undefined,
    note: `Imported from CSV. Order ${order.id}`,
    tags: ['csv-import'],
  };

  // Set Shopify-specific options
  const inputWithOptions = {
    ...orderInput,
    options: {
      inventoryBehaviour: 'bypass',
      sendReceipt: false,
    },
  };

  return inputWithOptions;
}

/**
 * Build address input from raw order data.
 * Handles string/undefined values gracefully.
 */
function buildAddressInput(raw: Record<string, string>, prefix: 'Shipping' | 'Billing'): AddressInput | undefined {
  const address: {
    firstName: raw[`${prefix} First Name`] || undefined,
    lastName: raw[`${prefix} Last Name`] || undefined,
    address1: raw[`${prefix} Address1`] || undefined,
    address2: raw[`${prefix} Address2`] || undefined,
    city: raw[`${prefix} City`] || undefined,
    province: raw[`${prefix} Province`] || undefined,
    country: raw[`${prefix} Country`] || undefined,
    countryCode: raw[`${prefix} Country Code`] || undefined,
    zip: raw[`${prefix} Zip`] || undefined,
    company: raw.Company || undefined,
    phone: raw.Phone || undefined,
  };

  // Only include address if at least one field has a value
  const hasValue = Object.values(address).some(val => val !== undefined && val !== '');

  return hasValue ? address : undefined;
}

/**
 * Map CSV financial status to Shopify format.
 */
function mapFinancialStatus(csvStatus?: string): string | undefined {
  if (!csvStatus) {
    return undefined;
  }

  // Map common CSV values to Shopify values
  const statusMap: Record<string, string> = {
    'paid': 'PAID',
    'authorized': 'PAID',
    'partially_paid': 'PARTIALLY_PAID',
    'refunded': 'REFUNDED',
    'voided': 'VOIDED',
  };

  const normalizedStatus = csvStatus.toLowerCase().replace(/[\s\-_]/g, '');

  return statusMap[normalizedStatus] || undefined;
}
