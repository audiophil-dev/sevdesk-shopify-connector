# Transfer Prompt: Deep Shopify Admin and Store Integration

**From**: @research-coordinator
**To**: @planning-collaborator
**Date**: 2026-02-27
**Research Document**: `workspace/docs/knowledge/integrations/shopify-deep-integration.md`

---

## Context

The user wants to integrate their SevDesk connector app deeply into the Shopify admin panel and storefront, similar to how Shopify Flow appears throughout the interface with actions, blocks, and other UI elements.

## Research Summary

### How Flow Integrates (Pattern to Follow)

Flow appears in multiple places:
- Admin navigation (dedicated section)
- Order pages (actions in "More actions" menu)
- Product pages (automation triggers)
- Settings (workflow configuration)
- Full workflow builder (embedded app)

All these patterns are available to custom apps.

### Key Integration Points

| Surface | Extension Type | Trigger | Use Case for SevDesk |
|---------|---------------|---------|----------------------|
| Order detail page | **Block** | Always visible | Invoice status card |
| Order detail page | **Action** | More actions menu | "Send to SevDesk" modal |
| Orders list | **Selection Action** | Multi-select | Bulk export 50 orders |
| Order page | **Print Action** | Print menu | Download invoice PDF |
| Customer page | **Block** | Always visible | Customer ID, sync status |
| Product page | **Configuration** | Settings panel | Tax classification |
| Online store | **Theme Embed** | After checkout | Invoice link |

### Available Admin Extension Targets

**Actions (Modal Workflows):**
- Order pages: `admin.order-details.action.render`, `admin.order-index.selection-action.render`
- Product pages: `admin.product-details.action.render`, `admin.product-index.selection-action.render`
- Customer pages: `admin.customer-details.action.render`, `admin.customer-index.selection-action.render`
- Plus: discounts, draft orders, collections, gift cards, companies, catalogs

**Blocks (Persistent Cards):**
- Order: `admin.order-details.block.render`
- Product: `admin.product-details.block.render`, `admin.product-variant-details.block.render`
- Customer: `admin.customer-details.block.render`
- Plus: collections, draft orders, gift cards, companies, catalogs

**Print Actions:**
- `admin.order-details.print-action.render`
- `admin.order-index.selection-print-action.render` (bulk)

**Configuration Panels:**
- `admin.product-details.configuration.render`
- `admin.product-variant-details.configuration.render`

### Theme App Extensions

**App Blocks (Inline):**
- Added by merchants via theme editor
- Target: `section`
- Example: Product-specific widgets

**App Embed Blocks (Floating):**
- Activated in Theme Settings > App embeds
- Targets: `head`, `body`, `compliance_head`
- Works with ALL themes
- Example: Post-checkout widgets, tracking

---

## Technical Implementation

### Extension File Structure

```
extensions/
├── sevdesk-order-block/
│   ├── shopify.extension.toml
│   └── src/index.jsx
├── send-to-sevdesk-action/
│   ├── shopify.extension.toml
│   └── src/index.jsx
├── bulk-sevdesk-action/
│   ├── shopify.extension.toml
│   └── src/index.jsx
├── flow-sevdesk-invoice/
│   └── shopify.extension.toml
└── theme-sevdesk-extension/
    ├── blocks/order-confirmation.liquid
    ├── assets/order-sync.js
    └── shopify.extension.toml
```

### TOML Configuration Pattern

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

### React Component Pattern

```jsx
import { AdminAction, Button, BlockStack, Text, Select } from '@shopify/ui-extensions-react/admin';

export default function SendToSevDeskAction() {
  return (
    <AdminAction
      primaryAction={<Button variant="primary" onPress={handleSend}>Create Invoice</Button>}
    >
      <BlockStack gap="base">
        <Text>Create a SevDesk invoice for this order.</Text>
        <Select label="Invoice Type" options={[...]} />
      </BlockStack>
    </AdminAction>
  );
}
```

---

## Implementation Planning Considerations

### Priority Questions

1. **MVP Scope**: Which extensions are essential for first release?
   - Order block + action (minimum)
   - Add bulk action (recommended)
   - Add Flow integration (valuable)

2. **Data Storage**: Where to store sync state?
   - Shopify metafields (visible to merchants)
   - External database (more control)

3. **Error Handling**: How to surface errors?
   - In-extension error banners
   - Toast notifications
   - Email notifications

4. **User Experience**:
   - Should block be collapsible?
   - What actions in modal vs direct?
   - Confirmation flows?

### Suggested Implementation Phases

**Phase 1: Order Integration (MVP)**
- Order status block on detail page
- Single order "Send to SevDesk" action
- Metafields for sync state

**Phase 2: Bulk Operations**
- Multi-select action on orders index
- Progress tracking
- Summary report

**Phase 3: Print and Export**
- Print action for invoice PDF
- Document download

**Phase 4: Extended Features**
- Customer block
- Product configuration panel
- Flow action integration
- Theme extension for order confirmation

### Technical Decisions Needed

1. **UI Library**: Use Polaris web components or React wrapper?
2. **State Management**: Local state vs shared context?
3. **API Pattern**: REST or GraphQL for extension backend?
4. **Authentication**: How to verify requests from extensions?

---

## Key Files to Review

| File | Purpose |
|------|---------|
| `workspace/docs/knowledge/integrations/shopify-deep-integration.md` | Complete documentation with all targets and examples |
| `workspace/docs/knowledge/integrations/shopify-app-features.md` | Broader app features overview |
| `workspace/memory/core/project.md` | Project architecture context |

---

## Questions for User

Before detailed planning, clarify:

1. **Priority**: Which integration point is most valuable for first release?
   - Order sync (primary accounting use case)
   - Customer sync
   - Product/tax configuration

2. **Bulk Operations**: Is bulk export a requirement?
   - Adds complexity (progress tracking, partial failures)
   - Very valuable for merchants with many orders

3. **Flow Integration**: Should we support Shopify Flow?
   - Increases app store appeal
   - Enables merchant automation
   - Adds development complexity

4. **Theme Extension**: Do we need storefront integration?
   - Post-checkout invoice link
   - Customer-facing sync status
   - Adds theme compatibility concerns

5. **Configuration**: Where should settings live?
   - Per-resource (on each order/product)
   - Global settings page
   - Both

---

## Usage

Copy this prompt to start planning:

```
@planning-collaborator

I need to plan the implementation of deep Shopify admin integration for the SevDesk connector, similar to how Shopify Flow integrates.

## Context
We want to add UI elements throughout the Shopify admin: blocks, actions, print actions, and theme extensions.

## Research Already Done
See: workspace/docs/knowledge/integrations/shopify-deep-integration.md

This document covers:
- All admin extension targets (actions, blocks, print actions)
- Theme app extensions (inline blocks, embed blocks)
- Polaris web components reference
- Complete implementation examples
- Recommended extension portfolio

## Your Task
1. Read the research document
2. Ask clarifying questions (see "Questions for User" section)
3. Create a specification and implementation plan

## Constraints
- Focus on Phase 1 (order integration) as MVP
- Follow existing project patterns
- Must work with existing SevDesk API integration
```
