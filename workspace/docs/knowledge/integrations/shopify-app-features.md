# Shopify App Features and Integration Points

**Created**: 2026-02-27
**Source**: Shopify Developer Documentation (2026-01)
**Purpose**: Understand how to leverage Shopify app features for UI integration and automation

## Overview

Shopify apps can integrate with the platform through multiple surfaces and extension points. This document covers the key integration options for building a seamless app experience within Shopify admin.

---

## App Surfaces

Apps can add functionality to multiple areas of the Shopify platform:

| Surface | Description | Key Technologies |
|---------|-------------|------------------|
| **Shopify Admin** | Primary merchant interface | Embedded pages, UI extensions |
| **Checkout** | Payment flow customization | UI extensions, Functions |
| **Online Store** | Theme integration | Theme extensions, Web pixels |
| **Shopify Flow** | Automation workflows | Triggers, Actions |
| **Point of Sale** | In-person selling | POS UI extensions |

---

## Admin Integration

### 1. Embedded App Pages

The primary way merchants interact with your app. Your app renders inside an iframe (web) or WebView (mobile) within the Shopify admin.

**Tools**:
- **App Bridge** - Communication between app and Shopify admin
- **Polaris** - UI component library matching Shopify's design

**Architecture**:

```
+------------------------------------------+
|           Shopify Admin                   |
|  +------------------------------------+  |
|  | App Bridge Components              |  |
|  | (Navigation, Title Bar, Save Bar)  |  |
|  +------------------------------------+  |
|  | App Surface (iframe/WebView)       |  |
|  | +--------------------------------+  |  |
|  | | Your App (Polaris components)  |  |  |
|  | +--------------------------------+  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

**App Bridge Capabilities**:
- Navigation menu in left sidebar
- Title bar with primary/secondary actions
- Contextual save bar (prevents navigation with unsaved changes)
- Full-screen modals
- Toast notifications

### 2. Admin UI Extensions

Extensions that render directly in Shopify admin pages, outside your app's iframe.

#### Admin Actions

Modal workflows triggered from **More actions** menus on resource pages.

**Characteristics**:
- Launch as modals overlaying the page
- Page updates after modal closes
- Available on detail pages AND index tables (bulk operations)

**Available Targets**:

| Target | Location | Bulk Support |
|--------|----------|--------------|
| `admin.order-details.action.render` | Order detail page | No |
| `admin.order-index.action.render` | Orders list | No |
| `admin.order-index.selection-action.render` | Orders list | Yes (multi-select) |
| `admin.product-details.action.render` | Product detail page | No |
| `admin.product-index.action.render` | Products list | No |
| `admin.product-index.selection-action.render` | Products list | Yes (multi-select) |
| `admin.customer-details.action.render` | Customer detail page | No |
| `admin.customer-index.selection-action.render` | Customers list | Yes (multi-select) |
| `admin.discount-details.action.render` | Discount detail page | No |
| `admin.draft-order-details.action.render` | Draft order page | No |
| `admin.collection-details.action.render` | Collection page | No |
| `admin.company-details.action.render` | Company page | No |

**Use Cases for SevDesk Connector**:
- "Send to SevDesk" action on order detail page
- "Bulk export to SevDesk" on orders index (multi-select)
- "Create invoice" on order page
- "Sync customer" on customer page

#### Admin Blocks

Persistent cards that display contextual information on resource detail pages.

**Characteristics**:
- Always visible (not modal)
- Show information alongside resource data
- Allow editing app data in context
- Merchants must manually add blocks to pages
- Can launch admin actions from blocks

**Available Targets**:

| Target | Location |
|--------|----------|
| `admin.order-details.block.render` | Order detail page |
| `admin.product-details.block.render` | Product detail page |
| `admin.product-variant-details.block.render` | Variant page |
| `admin.customer-details.block.render` | Customer page |
| `admin.discount-details.function-settings.render` | Discount page |
| `admin.draft-order-details.block.render` | Draft order page |
| `admin.collection-details.block.render` | Collection page |
| `admin.company-details.block.render` | Company page |

**Use Cases for SevDesk Connector**:
- Invoice status block on order detail page
- SevDesk customer ID block on customer page
- Tax classification block on product page
- Sync status block showing last sync time

#### Admin Print Actions

Special extensions under the **Print** menu with document preview APIs.

**Available Targets**:
- `admin.order-details.print-action.render`
- `admin.product-details.print-action.render`
- `admin.order-index.selection-print-action.render` (bulk)
- `admin.product-index.selection-print-action.render` (bulk)

**Use Cases for SevDesk Connector**:
- Print invoice document
- Print credit note
- Export to PDF

### 3. Admin Link Extensions

Links from resource pages to your app's pages. Use sparingly - prefer admin actions for seamless workflows.

---

## Shopify Flow Integration

Shopify Flow is an automation platform. Your app can integrate as triggers (start workflows) or actions (receive workflow data).

### Flow Triggers

Events that START workflows in Flow.

**How it works**:
1. Your app detects an event
2. App calls `flowTriggerReceive` GraphQL mutation
3. Flow executes connected workflows
4. Workflow can use your app's actions

**Use Cases for SevDesk Connector**:
- "Invoice created in SevDesk" trigger
- "Payment received" trigger
- "Sync completed" trigger

### Flow Actions

Tasks executed when workflow conditions are met.

**How it works**:
1. Flow workflow reaches your action
2. Flow POSTs JSON payload to your app's endpoint
3. Your app processes the data
4. App responds with success/failure

**Implementation Steps**:

1. Generate extension:
   ```bash
   shopify app generate extension
   # Select: Flow Action
   ```

2. Configure TOML:
   ```toml
   [[extensions]]
   name = "Send to SevDesk"
   type = "flow_action"
   handle = "send-to-sevdesk"
   description = "Create invoice in SevDesk for order"
   runtime_url = "https://your-app.com/api/flow/action"

   [settings]
   [[settings.fields]]
   type = "order_reference"
   required = true

   [[settings.fields]]
   type = "number_decimal"
   key = "amount"
   name = "Invoice Amount"
   required = true

   [[settings.fields]]
   type = "single_line_text_field"
   key = "invoice_type"
   name = "Invoice Type"
   required = false
   ```

3. Implement action endpoint:
   ```typescript
   // /api/flow/action
   export async function POST(request: Request) {
     // Verify HMAC signature
     const hmac = request.headers.get('x-shopify-hmac-sha256');
     // ... verify signature ...

     const body = await request.json();
     
     // Verify action handle matches
     if (body.handle !== 'send-to-sevdesk') {
       return new Response('Invalid action', { status: 400 });
     }

     // Process the action
     const { orderId, amount, invoiceType } = body.properties;
     
     // Call SevDesk API to create invoice
     const invoice = await createSevDeskInvoice(orderId, amount);

     return Response.json({ success: true, invoiceId: invoice.id });
   }
   ```

**Use Cases for SevDesk Connector**:
- "Create SevDesk invoice" action
- "Update customer in SevDesk" action
- "Sync tax rates" action
- "Create credit note" action

### Flow Integration Benefits

- **Works with Flow badge** on App Store listing
- **App directory listing** in Flow connectors
- **Reach thousands of merchants** using Flow
- **No need for direct integrations** - Flow handles orchestration
- **Workflow templates** showcase your app's capabilities

---

## Custom Data (Metafields/Metaobjects)

Extend Shopify's data model with custom fields.

### Metafields

Add custom fields to existing Shopify resources (products, orders, customers, etc.)

**Use Cases for SevDesk Connector**:
- Store SevDesk invoice ID on order
- Store SevDesk customer ID on customer
- Store tax classification on product
- Store sync timestamps on resources

**Example**:
```typescript
// Store SevDesk invoice ID on order
const metafield = {
  namespace: 'sevdesk',
  key: 'invoice_id',
  value: invoice.id.toString(),
  type: 'number_integer'
};
```

### Metaobjects

Create custom data structures independent of Shopify resources.

**Use Cases for SevDesk Connector**:
- SevDesk configuration settings
- Tax mapping tables
- Sync logs/audit trail
- Custom field mappings

---

## Extension Development Workflow

### 1. Scaffold Extension

```bash
# Create new extension
shopify app generate extension

# Options:
# - Admin action
# - Admin block
# - Admin print action
# - Flow trigger
# - Flow action
# - Theme app extension
# - Checkout UI extension
```

### 2. Project Structure

```
app/
├── extensions/
│   ├── send-to-sevdesk-action/      # Admin action
│   │   ├── shopify.extension.toml
│   │   └── src/
│   │       └── index.jsx
│   ├── sevdesk-order-block/         # Admin block
│   │   ├── shopify.extension.toml
│   │   └── src/
│   │       └── index.jsx
│   └── flow-sevdesk-action/         # Flow action
│       └── shopify.extension.toml
├── web/
│   └── frontend/                    # Main app
│       └── app/
│           └── routes/
│               └── app._index.jsx
└── server/
    └── index.js                     # Backend API
```

### 3. Extension Configuration (TOML)

```toml
# shopify.extension.toml
api_version = "2024-10"

[[extensions]]
type = "admin_action"
name = "Send to SevDesk"
handle = "send-to-sevdesk"

[[extensions.targeting]]
target = "admin.order-details.action.render"
```

### 4. Extension UI (React)

```jsx
// extensions/send-to-sevdesk-action/src/index.jsx
import { useState } from 'react';
import {
  BlockStack,
  Button,
  Text,
  TextField,
} from '@shopify/ui-extensions-react/admin';

export default function SendToSevDeskAction() {
  const [invoiceType, setInvoiceType] = useState('RE');

  return (
    <BlockStack>
      <Text>Send this order to SevDesk?</Text>
      <TextField
        label="Invoice Type"
        value={invoiceType}
        onChange={setInvoiceType}
      />
      <Button
        variant="primary"
        onPress={handleSendToSevDesk}
      >
        Create Invoice
      </Button>
    </BlockStack>
  );
}
```

### 5. Deploy

```bash
# Development
shopify app dev

# Deploy to production
shopify app deploy
```

---

## Recommended Implementation for SevDesk Connector

### Phase 1: Core Admin Integration

1. **Admin Block on Order Detail Page**
   - Show SevDesk invoice status
   - Display invoice number and link
   - Show sync timestamp
   - Provide "Sync now" button

2. **Admin Action on Order Detail Page**
   - "Send to SevDesk" action
   - Modal with invoice type selection
   - Preview of data to be sent
   - Success/error feedback

3. **Bulk Action on Orders Index**
   - Select multiple orders
   - Bulk send to SevDesk
   - Progress indicator
   - Summary report

### Phase 2: Flow Integration

1. **Flow Trigger: Order Created**
   - Trigger when SevDesk invoice is created
   - Trigger when payment is synced

2. **Flow Actions**
   - "Create SevDesk invoice"
   - "Create credit note"
   - "Update customer in SevDesk"

### Phase 3: Extended Integration

1. **Customer Page Block**
   - SevDesk customer ID
   - Contact sync status
   - Last sync time

2. **Product Page Block**
   - Tax classification
   - Account mapping
   - Sync status

3. **Settings Page**
   - SevDesk API credentials
   - Default invoice type
   - Tax rate mappings
   - Sync schedule

---

## Hosting Model

| Component | Hosted By | Notes |
|-----------|-----------|-------|
| Embedded app pages | Developer | Your server/infrastructure |
| Admin UI extensions | Shopify | Hosted by Shopify |
| Flow triggers/actions | Developer | Your server receives webhooks |
| Checkout UI extensions | Shopify | Hosted by Shopify |
| Theme app extensions | Shopify | Hosted by Shopify |

---

## References

- [App Surfaces Overview](https://shopify.dev/docs/apps/build/app-surfaces)
- [Admin Actions and Blocks](https://shopify.dev/docs/apps/build/admin/actions-blocks)
- [Extension Targets](https://shopify.dev/docs/api/admin-extensions/latest/targets)
- [Shopify Flow Actions](https://shopify.dev/docs/apps/build/flow/actions)
- [Shopify Flow Triggers](https://shopify.dev/docs/apps/build/flow/triggers)
- [App Bridge](https://shopify.dev/docs/api/app-bridge)
- [Polaris Design System](https://polaris.shopify.com/)
