# Implementation Plan: Shopify Integration

**Plan Type**: Implementation  
**Assigned to**: @backend-specialist  
**Branch**: feature/payment-notifications  
**Ticket**: payment-notifications  
**Date**: 2026-02-20  
**Status**: Ready for Implementation  
**Revision**: 1.0  
**Dependencies**: A2-plan.md (project foundation must be complete)

---

## Executive Summary

This plan implements the Shopify integration layer: finding orders by customer email, updating order status to "paid", and triggering customer emails. This builds on the polling infrastructure from A2-plan.md.

**Deliverables**:
- Shopify GraphQL client
- Order lookup by customer email
- Order financial status update
- Email notification triggering
- Complete payment notification flow

**Effort Estimate**: 4-5 hours  
**Blockers**: None

---

## Acceptance Criteria

- [ ] AC1: Shopify GraphQL client authenticates with access token
- [ ] AC2: Can query orders by customer email
- [ ] AC3: Can update order financial status to "paid"
- [ ] AC4: Payment notification flow works end-to-end
- [ ] AC5: Customer receives email when payment processed
- [ ] AC6: Notification recorded in notification_history table
- [ ] AC7: Duplicate notifications prevented (idempotency)
- [ ] AC8: All operations logged with context

---

## Implementation Tasks

### Task 1: Shopify GraphQL Client (1 hour)

**Description**: Create client for Shopify Admin GraphQL API.

**Checklist**:
- [ ] Create `src/types/shopify.ts` with TypeScript interfaces
- [ ] Create `src/clients/shopify.ts` with `ShopifyClient` class
- [ ] Implement GraphQL request helper:
  ```typescript
  async graphql<T>(query: string, variables?: object): Promise<T>
  ```
- [ ] Add authentication header: `X-Shopify-Access-Token`
- [ ] Add error handling for GraphQL errors
- [ ] Add request/response logging

**Types**:
```typescript
interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  displayFinancialStatus: string;
  totalPriceSet: {
    shopMoney: { amount: string; currencyCode: string };
  };
}

interface ShopifyGraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}
```

**Files to Create**:
- `src/types/shopify.ts`
- `src/clients/shopify.ts`
- `src/clients/shopify.test.ts`

---

### Task 2: Order Lookup (1 hour)

**Description**: Implement order search by customer email.

**Checklist**:
- [ ] Create GraphQL query for order lookup:
  ```graphql
  query GetOrdersByEmail($email: String!) {
    orders(first: 10, query: $email) {
      edges {
        node {
          id
          name
          email
          displayFinancialStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
        }
      }
    }
  }
  ```
- [ ] Implement `findOrderByEmail(email: string): Promise<ShopifyOrder | null>`
- [ ] Handle case where no order found
- [ ] Handle case where multiple orders found (return most recent)
- [ ] Add unit tests with mocked responses

**Files to Create**:
- `src/services/orderLookup.ts`
- `src/services/orderLookup.test.ts`

**Testing**:
```bash
# Manual test
npm run dev
# Trigger with test invoice, check logs for order lookup
```

---

### Task 3: Order Status Update (1 hour)

**Description**: Update Shopify order financial status to "paid".

**Checklist**:
- [ ] Create GraphQL mutation for order update:
  ```graphql
  mutation OrderMarkAsPaid($id: ID!) {
    orderMarkAsPaid(id: $id) {
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
  ```
- [ ] Implement `markOrderAsPaid(orderId: string): Promise<boolean>`
- [ ] Handle userErrors in response
- [ ] Add unit tests with mocked responses

**Alternative**: If `orderMarkAsPaid` not available, use:
```graphql
mutation OrderUpdate($id: ID!, $input: OrderInput!) {
  orderUpdate(id: $id, input: $input) {
    order { id displayFinancialStatus }
    userErrors { field message }
  }
}
# input: { financialStatus: "PAID" }
```

**Files to Create**:
- `src/services/orderUpdate.ts`
- `src/services/orderUpdate.test.ts`

---

### Task 4: Email Notification (45 min)

**Description**: Trigger customer email notification via Shopify.

**Checklist**:
- [ ] Research Shopify email triggering options:
  - Option A: Order confirmation email (triggered on status change)
  - Option B: Use Shopify Email API (if available)
  - Option C: Transactional email via SendGrid (fallback)
- [ ] Implement `sendPaymentEmail(order: ShopifyOrder): Promise<void>`
- [ ] For Option A: Verify order status change triggers email
- [ ] For Option C: Integrate SendGrid client

**Note**: Shopify may automatically send order confirmation email when financial status changes to "paid". Test this first.

**Files to Create**:
- `src/services/emailSender.ts`
- `src/services/emailSender.test.ts`

---

### Task 5: Payment Processor Integration (1 hour)

**Description**: Connect all pieces into complete payment notification flow.

**Checklist**:
- [ ] Update `src/services/processor.ts` from A2-plan:
  ```typescript
  async function processPaidInvoice(invoice: SevdeskInvoice): Promise<void> {
    // 1. Check if already processed (idempotency)
    const existing = await db.getNotification(invoice.id, 'payment_received');
    if (existing) {
      logger.info('Already processed', { invoiceId: invoice.id });
      return;
    }

    // 2. Find Shopify order by customer email
    const order = await shopify.findOrderByEmail(invoice.customerEmail);
    if (!order) {
      logger.warn('No Shopify order found', { email: invoice.customerEmail });
      return;
    }

    // 3. Update order status
    await shopify.markOrderAsPaid(order.id);

    // 4. Send email (if not automatic)
    await emailSender.sendPaymentEmail(order);

    // 5. Record notification
    await db.insertNotification({
      sevdeskInvoiceId: invoice.id,
      notificationType: 'payment_received',
      customerEmail: invoice.customerEmail,
      shopifyOrderId: order.id,
      status: 'sent'
    });
  }
  ```
- [ ] Add error handling for each step
- [ ] Add logging for each step
- [ ] Add retry logic for transient failures

**Files to Update**:
- `src/services/processor.ts`
- `src/services/processor.test.ts`

---

### Task 6: Idempotency (30 min)

**Description**: Ensure no duplicate notifications.

**Checklist**:
- [ ] Check notification_history before processing
- [ ] Use database unique constraint as safety net
- [ ] Log when duplicate detected

**Implementation**:
```typescript
async function isAlreadyProcessed(invoiceId: string): Promise<boolean> {
  const result = await db.query(
    'SELECT id FROM notification_history WHERE sevdesk_invoice_id = $1 AND notification_type = $2',
    [invoiceId, 'payment_received']
  );
  return result.rows.length > 0;
}
```

---

## Effort Breakdown

| Task | Time | Status |
|------|------|--------|
| 1. Shopify GraphQL Client | 1 hour | Not Started |
| 2. Order Lookup | 1 hour | Not Started |
| 3. Order Status Update | 1 hour | Not Started |
| 4. Email Notification | 45 min | Not Started |
| 5. Payment Processor Integration | 1 hour | Not Started |
| 6. Idempotency | 30 min | Not Started |
| **Total** | **5-5.5 hours** | - |

---

## Success Criteria

After completing this plan:
- [ ] Can find Shopify order by customer email
- [ ] Can update order status to "paid"
- [ ] Customer receives email notification
- [ ] No duplicate notifications
- [ ] All operations logged
- [ ] Ready for A4-plan.md (testing & documentation)

---

## Testing Checklist

### Unit Tests
- [ ] Shopify client GraphQL request
- [ ] Order lookup by email
- [ ] Order status update
- [ ] Idempotency check

### Integration Test
- [ ] Create test order in Shopify (pending payment)
- [ ] Create test invoice in Sevdesk (unpaid)
- [ ] Mark Sevdesk invoice as paid
- [ ] Verify Shopify order updated to "paid"
- [ ] Verify customer received email
- [ ] Verify notification_history record created

---

## Next Plan

**A4-plan.md**: Testing & Documentation
- Comprehensive unit tests
- Integration tests
- Setup documentation
- Deployment guide

---

**Plan Version**: 1.0  
**Created**: 2026-02-20
