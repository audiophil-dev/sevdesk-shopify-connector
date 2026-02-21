/**
 * Test fixtures - Sample data for tests
 */

import { SevdeskInvoice, SevdeskContact } from '../types/sevdesk';
import { ShopifyOrder } from '../types/shopify';

/**
 * Sample Shopify orders
 */
export const shopifyOrders = {
  pending: {
    id: 'gid://shopify/Order/1001',
    name: '#1001',
    email: 'customer1@example.com',
    displayFinancialStatus: 'PENDING',
    totalPriceSet: {
      shopMoney: {
        amount: '99.99',
        currencyCode: 'EUR',
      },
    },
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  } as ShopifyOrder,

  paid: {
    id: 'gid://shopify/Order/1002',
    name: '#1002',
    email: 'customer2@example.com',
    displayFinancialStatus: 'PAID',
    totalPriceSet: {
      shopMoney: {
        amount: '149.99',
        currencyCode: 'EUR',
      },
    },
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-16T10:00:00Z',
  } as ShopifyOrder,

  multiple: [
    {
      id: 'gid://shopify/Order/1003',
      name: '#1003',
      email: 'customer3@example.com',
      displayFinancialStatus: 'PENDING',
      totalPriceSet: {
        shopMoney: {
          amount: '50.00',
          currencyCode: 'EUR',
        },
      },
      createdAt: '2026-02-18T10:00:00Z',
      updatedAt: '2026-02-18T10:00:00Z',
    } as ShopifyOrder,
    {
      id: 'gid://shopify/Order/1004',
      name: '#1004',
      email: 'customer3@example.com',
      displayFinancialStatus: 'PENDING',
      totalPriceSet: {
        shopMoney: {
          amount: '25.00',
          currencyCode: 'EUR',
        },
      },
      createdAt: '2026-02-10T10:00:00Z',
      updatedAt: '2026-02-10T10:00:00Z',
    } as ShopifyOrder,
  ],
};

/**
 * Sample Sevdesk invoices
 */
export const sevdeskInvoices = {
  paid: {
    id: 'INV-2026-001',
    invoiceNumber: '2026-00001',
    status: '1000',
    total: 99.99,
    currency: 'EUR',
    invoiceDate: '2026-02-15',
    dueDate: '2026-03-15',
    contact: {
      id: 'CONTACT-001',
      objectName: 'Contact',
    },
  } as SevdeskInvoice,

  unpaid: {
    id: 'INV-2026-002',
    invoiceNumber: '2026-00002',
    status: '200',
    total: 149.99,
    currency: 'EUR',
    invoiceDate: '2026-02-14',
    dueDate: '2026-03-14',
    contact: {
      id: 'CONTACT-002',
      objectName: 'Contact',
    },
  } as SevdeskInvoice,

  overdue: {
    id: 'INV-2026-003',
    invoiceNumber: '2026-00003',
    status: '500',
    total: 199.99,
    currency: 'EUR',
    invoiceDate: '2026-01-15',
    dueDate: '2026-02-15',
    contact: {
      id: 'CONTACT-003',
      objectName: 'Contact',
    },
  } as SevdeskInvoice,

  multiple: [
    {
      id: 'INV-2026-004',
      invoiceNumber: '2026-00004',
      status: '1000',
      total: 50.00,
      currency: 'EUR',
      invoiceDate: '2026-02-18',
      dueDate: '2026-03-18',
      contact: {
        id: 'CONTACT-004',
        objectName: 'Contact',
      },
    } as SevdeskInvoice,
    {
      id: 'INV-2026-005',
      invoiceNumber: '2026-00005',
      status: '1000',
      total: 75.00,
      currency: 'EUR',
      invoiceDate: '2026-02-19',
      dueDate: '2026-03-19',
      contact: {
        id: 'CONTACT-004',
        objectName: 'Contact',
      },
    } as SevdeskInvoice,
  ],
};

/**
 * Sample Sevdesk contacts
 */
export const sevdeskContacts = {
  withEmail: {
    id: 'CONTACT-001',
    emailPersonal: 'customer1@example.com',
    emailWork: null,
    name: 'Test Customer',
  } as SevdeskContact,

  withoutEmail: {
    id: 'CONTACT-002',
    emailPersonal: null,
    emailWork: null,
    name: 'Customer Without Email',
  } as SevdeskContact,

  invalidEmail: {
    id: 'CONTACT-003',
    emailPersonal: 'invalid-email',
    emailWork: null,
    name: 'Customer With Invalid Email',
  } as SevdeskContact,
};

/**
 * Sample API responses
 */
export const apiResponses = {
  shopifyOrdersResponse: {
    data: {
      orders: {
        edges: [{ node: shopifyOrders.pending }],
      },
    },
  },

  shopifyOrdersEmptyResponse: {
    data: {
      orders: { edges: [] },
    },
  },

  shopifyMarkPaidResponse: {
    data: {
      orderUpdate: {
        order: {
          id: 'gid://shopify/Order/1001',
          displayFinancialStatus: 'PAID',
        },
        userErrors: [],
      },
    },
  },

  shopifyMarkPaidErrorResponse: {
    data: {
      orderUpdate: {
        order: null,
        userErrors: [{ field: ['financialStatus'], message: 'Invalid status' }],
      },
    },
  },

  sevdeskInvoiceResponse: {
    objects: [sevdeskInvoices.paid],
    total: 1,
  },

  sevdeskInvoicesEmptyResponse: {
    objects: [],
    total: 0,
  },

  sevdeskContactResponse: {
    objects: [sevdeskContacts.withEmail],
    total: 1,
  },
};
