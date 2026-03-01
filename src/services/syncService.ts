import { upsertSyncStatus, markPending } from '../database/syncStatusRepository';
import type { OrderSyncStatus, SyncStatus } from '../types/syncStatus';

// Sync result interface
interface SyncResult {
  success: boolean;
  status: SyncStatus;
  sevdeskInvoiceId?: string;
  sevdeskInvoiceNumber?: string;
  invoiceType?: string;
  syncedAt?: Date | string;
  error?: string;
}

export async function getSyncStatusForOrder(shopifyOrderId: string): Promise<SyncResult> {
  try {
    const status = await upsertSyncStatus({
      shopifyOrderId,
      status: 'pending'
    });

    return {
      success: true,
      status: status.status,
      sevdeskInvoiceId: status.sevdeskInvoiceId,
      sevdeskInvoiceNumber: status.sevdeskInvoiceNumber,
      invoiceType: status.invoiceType,
      syncRequired: status.status !== 'synced'
    };
  } catch (error) {
    console.error('[Sync Service] Error fetching sync status:', error);
    throw {
      code: 'STATUS_FETCH_ERROR',
      message: 'Failed to fetch sync status',
      statusCode: 500
    };
  }
}

export async function triggerOrderSync(
  shopifyOrderId: string,
  shop: string,
  invoiceType?: string
): Promise<SyncResult> {
  try {
    // Validate shop domain
    if (!shop || typeof shop !== 'string') {
      throw {
        code: 'INVALID_SHOP',
        message: 'Shop domain is required',
        statusCode: 400
      };
    }

    // Mark order as pending before starting sync
    await markPending(shopifyOrderId);

    // Use provided invoiceType or default to 'invoice'
    const finalInvoiceType = invoiceType || 'invoice';

    // TODO: This is where the actual SevDesk integration would happen
    // For now, we simulate a sync process by marking as pending
    // The real implementation would:
    // 1. Fetch order details from Shopify
    // 2. Transform to SevDesk invoice format
    // 3. Call SevDesk API to create invoice
    // 4. Update sync status with result

    // Simulate a brief processing delay (in real implementation, this is async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return pending status for this phase
    return {
      success: true,
      status: 'pending' as SyncStatus,
      invoiceType: finalInvoiceType,
      syncRequired: false
    };
  } catch (error) {
    console.error('[Sync Service] Error triggering order sync:', {
      shopifyOrderId,
      shop,
      invoiceType,
      error: error instanceof Error ? error.message : String(error)
    });

    // Determine appropriate status code based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any).statusCode || 500;

    return {
      success: false,
      status: 'error' as SyncStatus,
      error: errorMessage,
      statusCode
    };
  }
}
