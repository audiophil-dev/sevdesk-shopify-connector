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
