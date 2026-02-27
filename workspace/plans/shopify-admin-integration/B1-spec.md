# Specification: Shopify Admin Order Integration (Phase 1)

**Created**: 2026-02-27
**Ticket**: SHOPADMIN-1
**Status**: Draft

## Problem Statement

Shopify merchants using the SevDesk connector currently have no visibility into invoice synchronization status from within the Shopify admin interface. They must switch between Shopify and SevDesk to:
- Check if an order has been synced to SevDesk
- Find the corresponding SevDesk invoice number
- Manually trigger sync for specific orders

This creates friction and reduces adoption of automated accounting workflows.

## Current State

The connector processes orders via polling and syncs them to SevDesk, but:
- No Shopify Admin UI extensions exist
- Merchants cannot see sync status on order detail pages
- No way to manually trigger sync from Shopify admin
- Invoice numbers are only visible in SevDesk

## Proposed Solution

Implement Shopify Admin UI Extensions for Phase 1 (Order Integration):

1. **Order Status Block** - Persistent sidebar card on order detail page showing:
   - SevDesk sync status (synced/pending/error)
   - Invoice number with direct link to SevDesk
   - "Sync now" button for manual re-sync

2. **Send to SevDesk Action** - Action in the order "More actions" menu that:
   - Opens a modal with order preview
   - Allows invoice type selection (invoice, credit note, etc.)
   - Triggers sync with user confirmation
   - Shows success/error feedback

## Technical Requirements

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Main App Page | Remix + Polaris | Configuration dashboard and settings |
| Order Status Block | Admin UI Extension | Display sync status on order detail page |
| Send to SevDesk Action | Admin UI Extension | Modal action for manual sync |
| Backend API Endpoint | Express route | Handle extension data requests and sync triggers |
| Database Schema | PostgreSQL | Track sync status per order |
| Shopify App Bridge | @shopify/ui-extensions-react | Admin extension framework |

### Extension Targets

```
app/                                    # Main embedded app (Remix)
  routes/
    _index.tsx                          # App home - dashboard
    app.settings.tsx                    # Settings page
  
extensions/
  sevdesk-order-block/
    shopify.extension.toml
    src/index.jsx           # target: admin.order-details.block.render
  
  send-to-sevdesk-action/
    shopify.extension.toml
    src/index.jsx           # target: admin.order-details.action.render
```

### Main App Page Sections

| Section | Purpose |
|---------|---------|
| Dashboard | Overview of sync activity, recent orders, error count |
| SevDesk Connection | API key management, connection test, status indicator |
| Sync Settings | Auto/manual toggle, default invoice type, order filters |
| Account Mapping | Revenue accounts, tax accounts, payment method mapping |
| Recent Activity | Log of sync attempts, success/failure status |

### Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings` | GET | Get current app settings |
| `/api/settings` | PUT | Update app settings |
| `/api/settings/test-connection` | POST | Test SevDesk API credentials |
| `/api/orders/:orderId/sevdesk-status` | GET | Get sync status for order |
| `/api/orders/:orderId/sync` | POST | Trigger manual sync |
| `/api/activity` | GET | Get recent sync activity |
| `/api/orders/bulk-sync` | POST | Bulk sync selected orders (future Phase 2) |

### Workflows

**App Dashboard Workflow:**
1. Merchant opens app from Shopify admin navigation
2. Dashboard loads with sync statistics (synced/pending/errors)
3. Recent activity list shows last 20 sync attempts
4. Quick actions: "Sync pending orders", "View errors"
5. Links to settings page for configuration

**Settings Configuration Workflow:**
1. Merchant navigates to Settings tab
2. SevDesk API key input (masked, with show/hide toggle)
3. "Test connection" button validates credentials
4. Sync mode toggle: Automatic vs Manual
5. Default invoice type dropdown
6. Account mapping section (revenue, tax accounts)
7. Save button persists settings to database

**Order Status Block Workflow:**
1. Merchant opens order detail page
2. Extension loads, calls backend API for order sync status
3. Block displays current status, invoice link if synced
4. "Sync now" button triggers POST to sync endpoint
5. Block updates with new status

**Send to SevDesk Action Workflow:**
1. Merchant clicks "Send to SevDesk" from More actions menu
2. Modal opens showing order preview (customer, total, line items)
3. User selects invoice type
4. User confirms by clicking "Send to SevDesk"
5. Backend processes sync, returns result
6. Modal shows success banner or error message
7. Order status block auto-refreshes

## Error Handling

| Error Scenario | User Feedback | Recovery |
|----------------|---------------|----------|
| SevDesk API unavailable | "SevDesk is temporarily unavailable. Please try again." | Retry button |
| Invalid API credentials | "SevDesk connection error. Check your credentials in app settings." | Link to settings |
| Order already synced | "This order is already synced. Do you want to re-sync?" | Confirmation dialog |
| Network timeout | "Request timed out. Please check your connection." | Retry button |
| Rate limited | "Too many requests. Please wait a moment." | Auto-retry with backoff |

## Configuration

| Setting | Location | Description |
|---------|----------|-------------|
| SEVDESK_API_KEY | Environment | SevDesk API authentication |
| SHOPIFY_API_SECRET | Environment | Shopify app secret for signature verification |
| SYNC_ENABLED | App settings | Toggle for automatic vs manual sync |
| DEFAULT_INVOICE_TYPE | App settings | Default invoice type for sync |

## Output

1. Two Shopify Admin UI extensions deployable via Shopify CLI
2. Three new backend API endpoints
3. Database migration for sync status tracking
4. Updated documentation for merchant-facing features

## Constraints

| Constraint | Rationale |
|------------|-----------|
| Must work with existing polling infrastructure | Preserve current sync behavior |
| Extensions must handle offline gracefully | SevDesk may be temporarily unavailable |
| Response time under 2 seconds for status lookup | Good UX in admin interface |
| Must support Shopify API version 2024-01+ | Current supported version |

## Acceptance Criteria

1. Order Status Block displays on all order detail pages
2. Block shows correct sync status (synced/pending/error/never synced)
3. Invoice number links to correct SevDesk invoice when synced
4. "Sync now" button triggers sync and updates status
5. "Send to SevDesk" action appears in order More actions menu
6. Modal shows order preview with customer and line items
7. Invoice type selection works correctly
8. Success message confirms sync completion
9. Error messages display for all failure scenarios
10. Extensions pass Shopify app review requirements

## Related Documentation

- `workspace/docs/knowledge/integrations/shopify-deep-integration.md` - Full integration roadmap
- `workspace/plans/shopify-order-import/A1-spec.md` - Bulk order import (Phase 2 dependency)
- `workspace/docs/Express Backend Rules.md` - Backend implementation patterns

## Out of Scope

- Bulk operations from orders list (Phase 2)
- Customer overview integration (Phase 3)
- Shopify Flow triggers (Phase 4)
- Theme app blocks (Phase 4)
- Multi-store support (future)
