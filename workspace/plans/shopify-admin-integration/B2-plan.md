# Implementation Plan: Shopify Admin Order Integration (Phase 1)

**Plan Type**: Implementation
**Execution Mode**: Sequential (single agent)
**Assigned to**: @frontend-specialist (extensions) + @backend-specialist (API) coordination
**Branch**: feature/shopify-admin-integration-phase1
**Dependencies**: None (foundational work)
**Documentation**: 
- `workspace/docs/knowledge/integrations/shopify-deep-integration.md`
- `workspace/docs/Express Backend Rules.md`

## Context

Implement Shopify Admin UI Extensions for order-level SevDesk integration. This is Phase 1 of the deep integration roadmap, focusing on the order detail page with two extensions: a status block and a sync action.

## Scope

### In Scope
- Main App Page (dashboard + settings) using Remix + Polaris
- Order Status Block extension (admin.order-details.block.render)
- Send to SevDesk Action extension (admin.order-details.action.render)
- Backend API endpoints for settings, status lookup, and sync trigger
- Database schema for sync status and app settings tracking
- Error handling and loading states

### Out of Scope
- Bulk operations from orders list (Phase 2)
- Customer overview integration (Phase 3)
- Shopify Flow triggers (Phase 4)
- Theme app blocks

## Implementation Steps

### Step 1: Database Schema for Sync Status

**File**: `src/database/migrations/003_sync_status.sql`

```sql
CREATE TABLE IF NOT EXISTS order_sync_status (
  shopify_order_id VARCHAR(255) PRIMARY KEY,
  sevdesk_invoice_id VARCHAR(255),
  sevdesk_invoice_number VARCHAR(50),
  invoice_type VARCHAR(50) DEFAULT 'invoice',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_status ON order_sync_status(status);
CREATE INDEX idx_synced_at ON order_sync_status(synced_at);
```

**File**: `src/types/syncStatus.ts`

```typescript
export type SyncStatus = 'pending' | 'synced' | 'error' | 'never_synced';

export interface OrderSyncStatus {
  shopifyOrderId: string;
  sevdeskInvoiceId?: string;
  sevdeskInvoiceNumber?: string;
  invoiceType?: string;
  status: SyncStatus;
  errorMessage?: string;
  syncedAt?: Date;
}
```

**File**: `src/database/syncStatusRepository.ts`

```typescript
export async function getSyncStatus(shopifyOrderId: string): Promise<OrderSyncStatus | null>
export async function upsertSyncStatus(data: Partial<OrderSyncStatus>): Promise<OrderSyncStatus>
export async function markSynced(orderId: string, invoiceId: string, invoiceNumber: string): Promise<void>
export async function markError(orderId: string, errorMessage: string): Promise<void>
```

### Step 2: Backend API Routes

**File**: `src/routes/orders.ts`

```typescript
import { Router } from 'express';
import { getSyncStatus, triggerSync } from '../services/syncService';

const router = Router();

// GET /api/orders/:orderId/sevdesk-status
router.get('/:orderId/sevdesk-status', async (req, res) => {
  const { orderId } = req.params;
  const shop = req.headers['x-shopify-shop-domain'];
  
  // Verify Shopify session/auth
  // Return sync status from database
});

// POST /api/orders/:orderId/sync
router.post('/:orderId/sync', async (req, res) => {
  const { orderId } = req.params;
  const { invoiceType } = req.body;
  
  // Trigger sync via existing processor service
  // Return new status or error
});

export default router;
```

**File**: `src/services/syncService.ts`

```typescript
export async function getSyncStatusForOrder(shopifyOrderId: string): Promise<OrderSyncStatusResponse>
export async function triggerOrderSync(shopifyOrderId: string, invoiceType: string): Promise<SyncResult>
```

**Update**: `src/server.ts`

```typescript
import ordersRouter from './routes/orders';

app.use('/api/orders', ordersRouter);
```

### Step 3: Main App Page (Dashboard + Settings)

**File**: `app/routes/_index.tsx` (Dashboard)

```tsx
import { Page, Layout, Card, Text, BlockStack, InlineGrid, Badge, DataTable, Link } from '@shopify/polaris';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  const stats = await db.orderSyncStatus.aggregate({
    _count: { status: true },
    where: { shopId: session.shop }
  });
  
  const recentActivity = await db.syncLog.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  return json({ stats, recentActivity });
}

export default function Dashboard() {
  const { stats, recentActivity } = useLoaderData();
  
  return (
    <Page title="SevDesk Connector" subtitle="Dashboard">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={3} gap="400">
            <Card>
              <Text variant="headingMd" as="h2">Synced</Text>
              <Text variant="heading2xl">{stats.synced}</Text>
            </Card>
            <Card>
              <Text variant="headingMd" as="h2">Pending</Text>
              <Text variant="heading2xl">{stats.pending}</Text>
            </Card>
            <Card>
              <Text variant="headingMd" as="h2">Errors</Text>
              <Text variant="heading2xl">{stats.error}</Text>
            </Card>
          </InlineGrid>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Recent Activity</Text>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Order', 'Status', 'Invoice', 'Time']}
              rows={recentActivity.map(a => [
                `#${a.orderName}`,
                <Badge status={a.status === 'synced' ? 'success' : 'critical'}>{a.status}</Badge>,
                a.invoiceNumber || '-',
                new Date(a.createdAt).toLocaleString()
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

**File**: `app/routes/app.settings.tsx` (Settings)

```tsx
import { Page, Layout, Card, FormLayout, TextField, Button, Select, ChoiceList, Banner, Frame } from '@shopify/polaris';
import { useState } from 'react';
import { useActionData, useNavigation, Form } from '@remix-run/react';

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const settings = await db.appSettings.findUnique({ 
    where: { shopId: session.shop } 
  });
  return json({ settings });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = await db.appSettings.upsert({
    where: { shopId: session.shop },
    update: {
      sevdeskApiKey: formData.get('apiKey'),
      syncMode: formData.get('syncMode'),
      defaultInvoiceType: formData.get('invoiceType'),
      revenueAccount: formData.get('revenueAccount'),
    },
    create: {
      shopId: session.shop,
      sevdeskApiKey: formData.get('apiKey'),
      syncMode: formData.get('syncMode'),
      defaultInvoiceType: formData.get('invoiceType'),
    }
  });
  
  return json({ success: true, settings });
}

export default function Settings() {
  const navigation = useNavigation();
  const actionData = useActionData();
  const [testingConnection, setTestingConnection] = useState(false);
  
  const handleTestConnection = async () => {
    setTestingConnection(true);
    const response = await fetch('/api/settings/test-connection', { method: 'POST' });
    // Show result
    setTestingConnection(false);
  };
  
  return (
    <Page title="Settings" backAction={{ content: 'Dashboard', url: '/app' }}>
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">Settings saved successfully</Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Form method="post">
            <Card>
              <FormLayout>
                <TextField
                  label="SevDesk API Key"
                  type="password"
                  name="apiKey"
                  helpText="Find your API key in SevDesk settings"
                />
                <Button onClick={handleTestConnection} loading={testingConnection}>
                  Test Connection
                </Button>
              </FormLayout>
            </Card>
            
            <Card title="Sync Settings">
              <FormLayout>
                <ChoiceList
                  name="syncMode"
                  title="Sync Mode"
                  choices={[
                    { label: 'Automatic - Sync new orders immediately', value: 'automatic' },
                    { label: 'Manual - Sync orders on demand', value: 'manual' },
                  ]}
                />
                <Select
                  label="Default Invoice Type"
                  name="invoiceType"
                  options={[
                    { label: 'Invoice (RE)', value: 'RE' },
                    { label: 'Credit Note (GUT)', value: 'GUT' },
                    { label: 'Cancellation (REK)', value: 'REK' },
                  ]}
                />
              </FormLayout>
            </Card>
            
            <Card title="Account Mapping">
              <FormLayout>
                <TextField
                  label="Revenue Account"
                  name="revenueAccount"
                  helpText="SevDesk account number for revenue"
                />
                <TextField
                  label="Tax Account"
                  name="taxAccount"
                  helpText="SevDesk account number for taxes"
                />
              </FormLayout>
            </Card>
            
            <Button submit primary loading={navigation.state === 'submitting'}>
              Save Settings
            </Button>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

**File**: `app/routes/app.tsx` (App layout with navigation)

```tsx
import { Outlet, useNavigation } from '@remix-run/react';
import { AppProvider } from '@shopify/shopify-app-remix/react';
import { NavigationMenu } from '@shopify/shopify-app-remix/react';
import { PolarisProvider } from '../components/PolarisProvider';

export default function App() {
  return (
    <PolarisProvider>
      <AppProvider>
        <NavigationMenu
          navigationLinks={[
            { label: 'Dashboard', destination: '/app' },
            { label: 'Settings', destination: '/app/settings' },
          ]}
        />
        <Outlet />
      </AppProvider>
    </PolarisProvider>
  );
}
```

### Step 4: Settings Backend API

**File**: `src/routes/settings.ts`

```typescript
import { Router } from 'express';
import { getSettings, upsertSettings, testSevDeskConnection } from '../services/settingsService';

const router = Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const settings = await getSettings(shop);
  res.json(settings);
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const settings = await upsertSettings(shop, req.body);
  res.json(settings);
});

// POST /api/settings/test-connection
router.post('/test-connection', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  try {
    const result = await testSevDeskConnection(shop);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
```

**File**: `src/database/settingsRepository.ts`

```typescript
export interface AppSettings {
  shopId: string;
  sevdeskApiKey?: string;
  syncMode: 'automatic' | 'manual';
  defaultInvoiceType: string;
  revenueAccount?: string;
  taxAccount?: string;
}

export async function getSettings(shopId: string): Promise<AppSettings | null>
export async function upsertSettings(shopId: string, data: Partial<AppSettings>): Promise<AppSettings>
```

### Step 5: Shopify App Configuration

**File**: `shopify.app.toml` (root)

```toml
name = "sevdesk-connector"
client_id = "${SHOPIFY_CLIENT_ID}"
application_url = "${APP_URL}/"
embedded = true

[access_scopes]
scopes = "read_orders,write_orders"

[auth]
redirect_urls = [
  "${APP_URL}/auth/callback"
]

[webhooks]
api_version = "2024-01"
```

### Step 6: Order Status Block Extension

**File**: `extensions/sevdesk-order-block/shopify.extension.toml`

```toml
api_version = "2024-01"
type = "admin_ui_extension"
name = "SevDesk Order Status"
handle = "sevdesk-order-block"

[[extensions.targeting]]
target = "admin.order-details.block.render"
```

**File**: `extensions/sevdesk-order-block/src/index.jsx`

```jsx
import { AdminBlock, Button, Text, BlockStack, Badge, Spinner, Banner, Link } from '@shopify/ui-extensions-react/admin';
import { useState, useEffect } from 'react';

export default function SevDeskOrderBlock() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderStatus();
  }, []);

  const fetchOrderStatus = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/sevdesk-status`);
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/orders/${orderId}/sync`, { method: 'POST' });
      await fetchOrderStatus();
    } catch (err) {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <AdminBlock title="SevDesk">
      <BlockStack gap="base">
        {error && <Banner status="critical">{error}</Banner>}
        
        {status?.status === 'synced' && (
          <>
            <Badge status="success">Synced</Badge>
            <Text>Invoice: {status.invoiceNumber}</Text>
            <Link url={status.sevdeskUrl}>View in SevDesk</Link>
          </>
        )}
        
        {status?.status === 'pending' && (
          <Badge status="info">Pending sync</Badge>
        )}
        
        {status?.status === 'error' && (
          <>
            <Badge status="critical">Error</Badge>
            <Text>{status.errorMessage}</Text>
          </>
        )}
        
        {status?.status === 'never_synced' && (
          <Badge>Not synced</Badge>
        )}
        
        <Button onPress={handleSync} loading={syncing}>
          Sync now
        </Button>
      </BlockStack>
    </AdminBlock>
  );
}
```

### Step 7: Send to SevDesk Action Extension

**File**: `extensions/send-to-sevdesk-action/shopify.extension.toml`

```toml
api_version = "2024-01"
type = "admin_ui_extension"
name = "Send to SevDesk"
handle = "send-to-sevdesk-action"

[[extensions.targeting]]
target = "admin.order-details.action.render"
```

**File**: `extensions/send-to-sevdesk-action/src/index.jsx`

```jsx
import { AdminAction, Button, Text, BlockStack, Select, Banner, Spinner, Divider } from '@shopify/ui-extensions-react/admin';
import { useState, useEffect } from 'react';

const INVOICE_TYPES = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Credit Note', value: 'credit_note' },
  { label: 'Proforma', value: 'proforma' },
];

export default function SendToSevDeskAction() {
  const [order, setOrder] = useState(null);
  const [invoiceType, setInvoiceType] = useState('invoice');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/sync`, {
        method: 'POST',
        body: JSON.stringify({ invoiceType }),
      });
      const data = await response.json();
      setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <AdminAction title="Send to SevDesk">
        <Banner status="success">
          Order sent to SevDesk successfully!
        </Banner>
        <Text>Invoice: {result.data.invoiceNumber}</Text>
      </AdminAction>
    );
  }

  return (
    <AdminAction
      title="Send to SevDesk"
      primaryAction={
        <Button onPress={handleSubmit} loading={submitting}>
          Send to SevDesk
        </Button>
      }
    >
      <BlockStack gap="base">
        {result?.error && <Banner status="critical">{result.error}</Banner>}
        
        <Text variant="headingMd">Order Preview</Text>
        <Text>Customer: {order?.customer?.displayName}</Text>
        <Text>Total: {order?.totalPrice}</Text>
        <Text>Items: {order?.lineItems?.length}</Text>
        
        <Divider />
        
        <Select
          label="Invoice Type"
          options={INVOICE_TYPES}
          value={invoiceType}
          onChange={setInvoiceType}
        />
      </BlockStack>
    </AdminAction>
  );
}
```

### Step 8: Update Existing Processor

**File**: `src/services/processor.ts` (modify)

Add sync status tracking when processing orders:

```typescript
import { markSynced, markError } from '../database/syncStatusRepository';

// After successful SevDesk invoice creation:
await markSynced(order.id, invoice.id, invoice.invoiceNumber);

// On error:
await markError(order.id, error.message);
```

### Step 9: Add Shopify CLI Scripts

**File**: `package.json` (add scripts)

```json
{
  "scripts": {
    "shopify:dev": "shopify app dev",
    "shopify:deploy": "shopify app deploy",
    "shopify:build": "shopify app build"
  }
}
```

## Validation Criteria

- [ ] Database migration runs successfully
- [ ] App settings table created with correct schema
- [ ] `/api/settings` returns current settings
- [ ] `/api/settings` updates settings correctly
- [ ] `/api/settings/test-connection` validates SevDesk credentials
- [ ] `/api/orders/:orderId/sevdesk-status` returns correct status
- [ ] `/api/orders/:orderId/sync` triggers sync and returns result
- [ ] Dashboard shows sync statistics (synced/pending/error counts)
- [ ] Dashboard shows recent activity list
- [ ] Settings page shows current configuration
- [ ] Settings page saves configuration correctly
- [ ] Connection test shows success/failure feedback
- [ ] Navigation menu shows Dashboard and Settings
- [ ] Order Status Block appears on order detail page
- [ ] Block shows correct status (synced/pending/error/never_synced)
- [ ] Invoice link opens correct SevDesk invoice
- [ ] "Sync now" button triggers sync and updates status
- [ ] "Send to SevDesk" action appears in More actions menu
- [ ] Modal shows order preview with customer and line items
- [ ] Invoice type selection persists to sync
- [ ] Success banner appears after successful sync
- [ ] Error messages display for all failure scenarios
- [ ] Loading states show during async operations
- [ ] Extensions pass `shopify app build` without errors

## Test Strategy

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| `settingsRepository.ts` | CRUD operations, default values |
| `settingsService.ts` | Connection test, validation |
| `syncStatusRepository.ts` | CRUD operations, status transitions |
| `syncService.ts` | Status lookup, sync trigger logic |
| `orders.ts` routes | Request validation, response format |
| `settings.ts` routes | Auth, input validation |

### Integration Tests

| Scenario | Verification |
|----------|--------------|
| Full sync flow | Order -> Processor -> SevDesk -> Status update |
| API endpoint auth | Reject unauthorized requests |
| Extension data flow | Backend returns data extension can render |
| Settings persistence | Settings saved to database, loaded correctly |
| Connection test | Valid/invalid credentials handled |

### Manual Testing

1. Deploy app to development store
2. Open app from admin navigation, verify dashboard loads
3. Navigate to Settings, enter API key, test connection
4. Save settings, reload page, verify persistence
5. Open order detail page, verify block appears
6. Click "Sync now", verify status updates
7. Click "Send to SevDesk", verify modal opens
8. Select invoice type, submit, verify success
9. Test error scenarios (disconnect SevDesk, network failure)
10. Verify invoice link opens correct SevDesk page

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shopify API changes | Low | Medium | Pin to API version 2024-01 |
| SevDesk API limits | Medium | Medium | Implement request queuing |
| Extension review delays | Medium | Low | Follow Shopify design guidelines |
| Auth token expiration | Low | High | Implement token refresh |

## Estimated Effort

| Task | Effort | Agent |
|------|--------|-------|
| Database schema + repositories | 3h | @backend-specialist |
| Settings API routes | 2h | @backend-specialist |
| Order API routes | 3h | @backend-specialist |
| Shopify app config + Remix setup | 2h | @frontend-specialist |
| Dashboard page | 4h | @frontend-specialist |
| Settings page | 4h | @frontend-specialist |
| Order Status Block extension | 3h | @frontend-specialist |
| Send to SevDesk Action extension | 4h | @frontend-specialist |
| Processor integration | 2h | @backend-specialist |
| Testing | 5h | Both |
| **Total** | **32h** | |

## Execution Notes

### Recommended Execution Order

1. **Foundation**: Database schema + settings repository
2. **Settings API**: Settings endpoints + connection test
3. **Main App Pages**: Dashboard + Settings UI (Remix + Polaris)
4. **Order API**: Status lookup + sync trigger endpoints
5. **Order Status Block** (simpler, provides foundation)
6. **Action extension** (reuses API, adds modal complexity)
7. **Processor integration** (tie into existing sync flow)
8. **End-to-end testing** in development store

### Coordination Points

- Settings API must be ready before Settings page
- Order API must be deployed before testing extensions
- Processor changes must sync with API contract
- Both agents need shared understanding of `OrderSyncStatus` and `AppSettings` types

### Dependencies

- Remix app scaffolding (via Shopify CLI)
- Polaris components for admin UI
- Shopify App Bridge authentication
