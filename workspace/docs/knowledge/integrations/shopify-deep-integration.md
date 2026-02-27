# Deep Shopify Admin and Store Integration Patterns

**Created**: 2026-02-27
**Source**: Shopify Developer Documentation (2026-01)
**Purpose**: Understand how to integrate app features into Shopify admin and storefront like Shopify Flow

## Overview

Shopify Flow exemplifies deep platform integration. It appears throughout the admin panel and can be triggered from various surfaces. This document explains how to achieve similar integration for custom apps.

### How Flow Integrates

| Surface | Integration Type | User Experience |
|---------|-----------------|-----------------|
| Admin Navigation | App Bridge | Dedicated Flow section in sidebar |
| Order Pages | Admin Actions | "Run workflow" in More actions menu |
| Product Pages | Admin Actions | Automation triggers |
| Settings | Admin Block | Workflow configuration |
| Workflows Page | Embedded App | Full workflow builder UI |

The same patterns are available to all apps.

---

## Admin Integration Patterns

### 1. Admin Actions (Modal Workflows)

Actions appear in the **More actions** dropdown menu on resource pages. When clicked, they open a modal overlay.

#### When to Use

- On-demand operations (export, sync, transform)
- Quick workflows that don't need persistent visibility
- Operations that need user confirmation/input

#### Available Targets

**Single Resource Pages:**

| Target | Location |
|--------|----------|
| `admin.order-details.action.render` | Order detail page |
| `admin.product-details.action.render` | Product detail page |
| `admin.customer-details.action.render` | Customer detail page |
| `admin.collection-details.action.render` | Collection page |
| `admin.discount-details.action.render` | Discount page |
| `admin.draft-order-details.action.render` | Draft order page |
| `admin.gift-card-details.action.render` | Gift card page |
| `admin.company-details.action.render` | B2B company page |
| `admin.catalog-details.action.render` | Catalog page |
| `admin.customer-segment-details.action.render` | Segment page |
| `admin.abandoned-checkout-details.action.render` | Abandoned checkout |

**Index Pages (List Views):**

| Target | Location |
|--------|----------|
| `admin.order-index.action.render` | Orders list |
| `admin.product-index.action.render` | Products list |
| `admin.customer-index.action.render` | Customers list |
| `admin.collection-index.action.render` | Collections list |
| `admin.discount-index.action.render` | Discounts list |
| `admin.draft-order-index.action.render` | Draft orders list |

**Bulk Selection (Multi-Select):**

| Target | Location | Batch Support |
|--------|----------|---------------|
| `admin.order-index.selection-action.render` | Orders list | Yes |
| `admin.product-index.selection-action.render` | Products list | Yes |
| `admin.customer-index.selection-action.render` | Customers list | Yes |
| `admin.draft-order-index.selection-action.render` | Draft orders | Yes |

#### Implementation Example

**TOML Configuration:**

```toml
api_version = "2024-10"

[[extensions]]
type = "admin_ui_extension"
name = "Send to SevDesk"
handle = "send-to-sevdesk"
[[extensions.targeting]]
target = "admin.order-details.action.render"
[[extensions.targeting]]
target = "admin.order-index.selection-action.render"
```

**React Component:**

```jsx
// extensions/send-to-sevdesk/src/index.jsx
import { useState, useEffect } from 'react';
import {
  AdminAction,
  Button,
  BlockStack,
  Text,
  Select,
  Banner,
  Spinner,
} from '@shopify/ui-extensions-react/admin';

export default function SendToSevDeskAction() {
  const [invoiceType, setInvoiceType] = useState('RE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSendToSevDesk = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get selected resource(s) from extension context
      const response = await fetch('/api/sevdesk/invoice', {
        method: 'POST',
        body: JSON.stringify({ invoiceType }),
      });
      
      if (!response.ok) throw new Error('Failed to create invoice');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAction
      primaryAction={
        <Button
          variant="primary"
          onPress={handleSendToSevDesk}
          disabled={loading}
        >
          {loading ? <Spinner size="small" /> : 'Create Invoice'}
        </Button>
      }
    >
      <BlockStack gap="base">
        {error && <Banner status="critical">{error}</Banner>}
        {success && <Banner status="success">Invoice created successfully!</Banner>}
        
        <Text>Create a SevDesk invoice for this order.</Text>
        
        <Select
          label="Invoice Type"
          value={invoiceType}
          onChange={setInvoiceType}
          options={[
            { value: 'RE', label: 'Regular Invoice (RE)' },
            { value: 'GUT', label: 'Credit Note (GUT)' },
            { value: 'REK', label: 'Cancellation (REK)' },
          ]}
        />
      </BlockStack>
    </AdminAction>
  );
}
```

### 2. Admin Blocks (Persistent Cards)

Blocks are persistent UI cards that appear on resource detail pages. They're always visible (unlike modals).

#### When to Use

- Always-visible status information
- Data that should be seen alongside resource data
- Quick actions that don't need a modal workflow
- Configuration settings per resource

#### Available Targets

| Target | Location |
|--------|----------|
| `admin.order-details.block.render` | Order detail page |
| `admin.product-details.block.render` | Product detail page |
| `admin.product-variant-details.block.render` | Variant page |
| `admin.customer-details.block.render` | Customer page |
| `admin.collection-details.block.render` | Collection page |
| `admin.draft-order-details.block.render` | Draft order page |
| `admin.gift-card-details.block.render` | Gift card page |
| `admin.company-details.block.render` | B2B company page |
| `admin.company-location-details.block.render` | Company location |
| `admin.catalog-details.block.render` | Catalog page |
| `admin.abandoned-checkout-details.block.render` | Abandoned checkout |
| `admin.discount-details.function-settings.render` | Discount settings |

#### Implementation Example

**TOML Configuration:**

```toml
api_version = "2024-10"

[[extensions]]
type = "admin_ui_extension"
name = "SevDesk Status"
handle = "sevdesk-status-block"
[[extensions.targeting]]
target = "admin.order-details.block.render"
```

**React Component:**

```jsx
// extensions/sevdesk-status-block/src/index.jsx
import { useState, useEffect } from 'react';
import {
  AdminBlock,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Icon,
  Link,
  Spinner,
} from '@shopify/ui-extensions-react/admin';

export default function SevDeskStatusBlock() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch sync status from your API
    fetchSyncStatus().then(status => {
      setSyncStatus(status);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <AdminBlock>
        <Spinner size="small" />
      </AdminBlock>
    );
  }

  return (
    <AdminBlock
      title="SevDesk"
      action={
        <Button variant="plain" onPress={handleSync}>
          Sync Now
        </Button>
      }
    >
      <BlockStack gap="tight">
        <InlineStack gap="base" blockAlign="center">
          <Text variant="headingMd">Invoice Status</Text>
          <Badge status={syncStatus.synced ? 'success' : 'default'}>
            {syncStatus.synced ? 'Synced' : 'Not Synced'}
          </Badge>
        </InlineStack>
        
        {syncStatus.synced && (
          <BlockStack gap="extraTight">
            <Text variant="bodyMd" tone="subdued">
              Invoice: {syncStatus.invoiceNumber}
            </Text>
            <Text variant="bodyMd" tone="subdued">
              Synced: {syncStatus.syncedAt}
            </Text>
            <Link url={syncStatus.sevdeskUrl}>
              View in SevDesk
            </Link>
          </BlockStack>
        )}
        
        {!syncStatus.synced && (
          <Text variant="bodyMd" tone="subdued">
            This order has not been synced to SevDesk.
          </Text>
        )}
      </BlockStack>
    </AdminBlock>
  );
}
```

### 3. Admin Print Actions

Custom entries in the **Print** menu with document preview capabilities.

#### Available Targets

| Target | Location | Bulk |
|--------|----------|------|
| `admin.order-details.print-action.render` | Order detail page | No |
| `admin.product-details.print-action.render` | Product detail page | No |
| `admin.order-index.selection-print-action.render` | Orders list | Yes |
| `admin.product-index.selection-print-action.render` | Products list | Yes |

#### Use Cases for SevDesk Connector

- Print SevDesk invoice PDF
- Print credit note
- Export documents to PDF

### 4. Product Configuration Panels

Custom configuration panels on product/variant pages.

| Target | Location |
|--------|----------|
| `admin.product-details.configuration.render` | Product page |
| `admin.product-variant-details.configuration.render` | Variant page |

#### Use Cases for SevDesk Connector

- Tax classification settings
- Account mapping configuration
- Cost center assignment

---

## Storefront Integration (Theme App Extensions)

Theme app extensions add UI elements to the online store without modifying theme code.

### 1. App Blocks (Inline Content)

Inline blocks that merchants add via the theme editor in specific sections.

#### When to Use

- Product-specific widgets (reviews, ratings)
- Custom product information
- Interactive elements on product pages

#### Schema Configuration

```javascript
// blocks/product-sevdesk-info.liquid
{% schema %}
{
  "name": "SevDesk Product Info",
  "target": "section",
  "enabled_on": {
    "templates": ["product"],
    "groups": ["body"]
  },
  "settings": [
    {
      "type": "text",
      "id": "tax_hint",
      "label": "Tax Information Hint",
      "default": "VAT included"
    }
  ]
}
{% endschema %}
```

### 2. App Embed Blocks (Floating/Global)

Injected into `head` or `body` tags. Activated in Theme Settings > App embeds.

#### When to Use

- Global scripts (analytics, tracking)
- Floating widgets (chat, support)
- Overlays and popups
- Works with ALL themes (including vintage)

#### Target Options

| Target | Injection Point | Use Case |
|--------|-----------------|----------|
| `head` | Before `</head>` | Analytics, meta tags |
| `body` | Before `</body>` | Widgets, overlays |
| `compliance_head` | Very top of head | Cookie consent, privacy |

#### Schema Configuration

```javascript
// blocks/sevdesk-tracking.liquid
{% schema %}
{
  "name": "SevDesk Order Tracking",
  "target": "body",
  "stylesheet": "tracking.css",
  "javascript": "tracking.js",
  "settings": [
    {
      "type": "checkbox",
      "id": "enable_tracking",
      "label": "Enable order tracking",
      "default": true
    }
  ]
}
{% endschema %}
```

### 3. Deep Linking for Activation

Post-installation links that help merchants activate extensions:

**App Block (inline):**

```
https://{shop}.myshopify.com/admin/themes/current/editor?template=product&addAppBlockId={api_key}/product-sevdesk-info&target=newAppsSection
```

**App Embed (floating):**

```
https://{shop}.myshopify.com/admin/themes/current/editor?context=apps&template=index&activateAppId={api_key}/sevdesk-tracking
```

---

## Polaris Web Components Reference

Admin extensions use web components (not React) for native rendering:

### Actions

| Component | Purpose |
|-----------|---------|
| `s-button` | Trigger actions |
| `s-buttongroup` | Multiple buttons |
| `s-clickable` | Interactive container |
| `s-link` | Navigation |

### Feedback

| Component | Purpose |
|-----------|---------|
| `s-badge` | Status indicators |
| `s-banner` | Important messages |
| `s-spinner` | Loading state |

### Forms

| Component | Purpose |
|-----------|---------|
| `s-textfield`, `s-textarea` | Text input |
| `s-select` | Dropdown selection |
| `s-checkbox`, `s-switch` | Boolean input |
| `s-numberfield`, `s-moneyfield` | Numeric input |
| `s-datefield`, `s-datepicker` | Date input |
| `s-dropzone` | File upload |

### Layout

| Component | Purpose |
|-----------|---------|
| `s-box` | Generic container |
| `s-stack`, `s-grid` | Layout containers |
| `s-section`, `s-divider` | Sectioning |
| `s-table` | Data display |

### Typography

| Component | Purpose |
|-----------|---------|
| `s-heading` | Headings |
| `s-text` | Body text |
| `s-chip` | Labels/tags |

---

## Complete Integration Architecture

### Recommended Extension Portfolio for SevDesk Connector

```
extensions/
├── sevdesk-order-block/           # Order status block
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── send-to-sevdesk-action/        # Single order action
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── bulk-sevdesk-action/           # Bulk order action
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── sevdesk-customer-block/        # Customer info block
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── sevdesk-product-config/        # Product config panel
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── sevdesk-print-action/          # Print invoice action
│   ├── shopify.extension.toml
│   └── src/index.jsx
│
├── flow-sevdesk-invoice/          # Flow action
│   └── shopify.extension.toml
│
└── theme-sevdesk-extension/       # Theme app extension
    ├── blocks/
    │   └── order-confirmation.liquid
    ├── assets/
    │   └── order-sync.js
    ├── locales/
    │   └── en.default.json
    └── shopify.extension.toml
```

### Integration Points Summary

| Surface | Extension Type | User Action | SevDesk Use Case |
|---------|---------------|-------------|------------------|
| Order detail page | Block | Always visible | Invoice status, sync button |
| Order detail page | Action | More actions > Send to SevDesk | Create invoice |
| Orders list | Selection action | Select > Send to SevDesk | Bulk export |
| Order detail page | Print action | Print > SevDesk Invoice | PDF download |
| Customer page | Block | Always visible | Customer ID, sync status |
| Product page | Configuration | Settings panel | Tax classification |
| Flow workflow | Flow action | Workflow step | Automated invoicing |
| Online store | Theme embed | After checkout | Order confirmation |

---

## Implementation Roadmap

### Phase 1: Core Order Integration

1. **Order Status Block** (`admin.order-details.block.render`)
   - Show SevDesk invoice status
   - Display invoice number and link
   - Quick "Sync now" button

2. **Send to SevDesk Action** (`admin.order-details.action.render`)
   - Modal with invoice type selection
   - Preview of order data
   - Success/error feedback

### Phase 2: Bulk Operations

1. **Bulk Send Action** (`admin.order-index.selection-action.render`)
   - Multi-select orders
   - Batch export to SevDesk
   - Progress indicator
   - Summary report

2. **Print Invoice Action** (`admin.order-details.print-action.render`)
   - Generate SevDesk PDF
   - Download or print

### Phase 3: Extended Admin Integration

1. **Customer Block** (`admin.customer-details.block.render`)
   - SevDesk customer ID
   - Contact sync status
   - Last sync timestamp

2. **Product Configuration** (`admin.product-details.configuration.render`)
   - Tax classification
   - Account mapping
   - Cost center

### Phase 4: Flow and Theme Integration

1. **Flow Action** (`flow_action`)
   - "Create SevDesk invoice" workflow step
   - Automated invoicing

2. **Theme Extension** (`theme_app_extension`)
   - Order confirmation widget
   - Invoice download link

---

## References

- [Admin Extension Targets](https://shopify.dev/docs/api/admin-extensions/latest/targets)
- [Polaris Web Components](https://shopify.dev/docs/api/admin-extensions/latest/components)
- [Theme App Extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)
- [App Scaffolding](https://shopify.dev/docs/apps/build/scaffold-app)
