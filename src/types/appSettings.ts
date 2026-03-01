export interface AppSettings {
  shopId: string;
  sevdeskApiKey?: string;
  syncMode: 'automatic' | 'manual';
  defaultInvoiceType: string;
  revenueAccount?: string;
  taxAccount?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SyncMode = 'automatic' | 'manual';
