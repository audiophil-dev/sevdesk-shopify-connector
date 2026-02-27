# Transfer Prompt: Shopify App Features Implementation

**From**: @research-coordinator
**To**: @planning-collaborator
**Date**: 2026-02-27
**Research Document**: `workspace/docs/knowledge/integrations/shopify-app-features.md`

---

## Context

The user wants to understand how to leverage Shopify app features to integrate their SevDesk connector app into the Shopify admin UI, similar to how Shopify Flow provides GUI elements across the admin panel.

## Research Summary

### Key Findings

1. **Admin UI Extensions** - Three types:
   - **Actions**: Modal workflows from "More actions" menus (single + bulk)
   - **Blocks**: Persistent cards on resource detail pages
   - **Print Actions**: Custom print menu entries

2. **Shopify Flow Integration**:
   - **Triggers**: Start workflows when your app events occur
   - **Actions**: Receive data when Flow workflows execute
   - Benefits: "Works with Flow" badge, app store visibility

3. **App Bridge + Polaris**:
   - Embedded app pages with native Shopify look/feel
   - Navigation, title bar, save bar components
   - React-based UI components

### Recommended Integration Points for SevDesk Connector

| Feature | Target | Use Case |
|---------|--------|----------|
| Admin Block | Order detail page | Show invoice status, sync button |
| Admin Action | Order detail page | "Send to SevDesk" modal workflow |
| Admin Action (bulk) | Orders index | Multi-select bulk export |
| Flow Action | Flow workflow | "Create SevDesk invoice" task |
| Admin Block | Customer page | SevDesk customer ID, sync status |
| Admin Block | Product page | Tax classification, account mapping |

---

## Implementation Planning Considerations

### Architecture Decisions

1. **Extension Priority** - Which to build first?
   - Order integration (most valuable for accounting)
   - Customer integration (for contact sync)
   - Product integration (for tax mapping)

2. **Flow vs Direct Actions**:
   - Flow integration: More flexibility for merchants, but requires Flow subscription
   - Direct actions: Always available, but less customizable

3. **Block vs Action**:
   - Block: Always visible, passive information
   - Action: On-demand, active workflow

4. **Bulk vs Single**:
   - Bulk: Efficiency for merchants with many orders
   - Single: More control, per-order decisions

### Technical Decisions Needed

1. **State Management**:
   - Where to store sync status? (metafields vs external database)
   - How to handle concurrent syncs?
   - Error state recovery?

2. **UI/UX**:
   - What information in the block?
   - What options in the action modal?
   - Success/error feedback mechanism?

3. **Permissions**:
   - What scopes are needed?
   - How to handle missing permissions?

4. **Error Handling**:
   - Retry logic for failed syncs?
   - User notification for errors?
   - Fallback behavior?

### Suggested Implementation Phases

**Phase 1: Order Integration**
- Admin block on order detail page (read-only status)
- Admin action for single order sync
- Metafields for storing SevDesk IDs

**Phase 2: Bulk Operations**
- Bulk action on orders index
- Progress tracking
- Summary report

**Phase 3: Flow Integration**
- Flow action "Create SevDesk invoice"
- Flow trigger "Invoice created"
- Workflow templates

**Phase 4: Extended Features**
- Customer page block
- Product page block
- Settings/configuration page

---

## Extension File Structure

```
app/
├── extensions/
│   ├── sevdesk-order-block/          # Order status block
│   │   ├── shopify.extension.toml
│   │   └── src/index.jsx
│   ├── send-to-sevdesk-action/       # Single order action
│   │   ├── shopify.extension.toml
│   │   └── src/index.jsx
│   ├── bulk-sevdesk-action/          # Bulk order action
│   │   ├── shopify.extension.toml
│   │   └── src/index.jsx
│   └── flow-sevdesk-invoice/         # Flow action
│       └── shopify.extension.toml
└── web/
    └── frontend/
        └── app/
            └── routes/
                ├── app._index.jsx    # Dashboard
                └── app.settings.jsx  # Configuration
```

---

## Key Files to Review

| File | Purpose |
|------|---------|
| `workspace/docs/knowledge/integrations/shopify-app-features.md` | Complete documentation with examples |
| `workspace/memory/core/project.md` | Project architecture context |
| Existing app structure | Current implementation patterns |

---

## Questions for User

Before detailed planning, clarify:

1. **Priority**: Which integration point is most valuable?
   - Order sync (primary use case?)
   - Customer sync
   - Product/tax integration

2. **Flow vs Direct**: Should we support both, or focus on one?
   - Flow adds complexity but increases app store appeal
   - Direct actions are simpler but less flexible

3. **Data Storage**: Where should sync state live?
   - Shopify metafields (simpler, visible to merchants)
   - External database (more control, complex queries)

4. **Bulk Operations**: Is bulk sync a requirement?
   - Adds complexity (progress tracking, partial failures)
   - Very valuable for merchants with many orders

5. **Configuration**: How should settings be managed?
   - In-app settings page
   - Per-resource configuration
   - Global defaults with overrides

---

## Usage

Copy this prompt to start planning:

```
@planning-collaborator

I need to plan the implementation of Shopify app features for the SevDesk connector.

## Context
We want to add UI elements to the Shopify admin (like blocks, actions) and integrate with Shopify Flow.

## Research Already Done
See: workspace/docs/knowledge/integrations/shopify-app-features.md

This document covers:
- Admin UI extensions (actions, blocks, print actions)
- Shopify Flow integration (triggers, actions)
- App Bridge and Polaris
- Recommended integration points for SevDesk

## Your Task
1. Read the research document
2. Ask clarifying questions (see "Questions for User" section)
3. Create a specification and implementation plan for the UI extensions

## Constraints
- Follow existing project patterns
- Consider Phase 1 as MVP (order integration only)
- Must work with existing SevDesk API integration
```
