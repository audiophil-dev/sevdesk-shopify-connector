import { pool } from '../config/database';
import type { OrderSyncStatus, SyncStatus } from '../types/syncStatus';

export async function getSyncStatus(shopifyOrderId: string): Promise<OrderSyncStatus | null> {
  const result = await pool.query(`
    SELECT 
      shopify_order_id as "shopifyOrderId",
      sevdesk_invoice_id as "sevdeskInvoiceId",
      sevdesk_invoice_number as "sevdeskInvoiceNumber",
      invoice_type as "invoiceType",
      status as "status",
      error_message as "errorMessage",
      synced_at as "syncedAt"
    FROM order_sync_status
    WHERE shopify_order_id = $1
  `, [shopifyOrderId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as OrderSyncStatus;
}

export async function upsertSyncStatus(data: Partial<OrderSyncStatus>): Promise<OrderSyncStatus> {
  const {
    shopifyOrderId,
    sevdeskInvoiceId,
    sevdeskInvoiceNumber,
    invoiceType,
    status,
    errorMessage
  } = data;

  const now = new Date().toISOString();

  const result = await pool.query(`
    INSERT INTO order_sync_status (
      shopify_order_id,
      sevdesk_invoice_id,
      sevdesk_invoice_number,
      invoice_type,
      status,
      error_message,
      synced_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    ON CONFLICT (shopify_order_id) DO UPDATE SET
      sevdesk_invoice_id = EXCLUDED.sevdesk_invoice_id,
      sevdesk_invoice_number = EXCLUDED.sevdesk_invoice_number,
      invoice_type = EXCLUDED.invoice_type,
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      synced_at = EXCLUDED.synced_at,
      updated_at = $8
    RETURNING *
  `, [
    shopifyOrderId,
    sevdeskInvoiceId || null,
    sevdeskInvoiceNumber || null,
    invoiceType || 'invoice',
    status || 'pending',
    errorMessage || null,
    null,
    now
  ]);

  return result.rows[0] as OrderSyncStatus;
}

export async function markSynced(
  orderId: string,
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  const now = new Date().toISOString();

  await pool.query(`
    UPDATE order_sync_status
    SET 
      sevdesk_invoice_id = $1,
      sevdesk_invoice_number = $2,
      status = 'synced',
      synced_at = $3,
      error_message = NULL,
      updated_at = $4
    WHERE shopify_order_id = $5
  `, [invoiceId, invoiceNumber, now, now, orderId]);
}

export async function markError(orderId: string, errorMessage: string): Promise<void> {
  const now = new Date().toISOString();

  await pool.query(`
    UPDATE order_sync_status
    SET 
      status = 'error',
      error_message = $1,
      updated_at = $2
    WHERE shopify_order_id = $3
  `, [errorMessage, now, orderId]);
}

export async function markPending(orderId: string): Promise<void> {
  const now = new Date().toISOString();

  await pool.query(`
    UPDATE order_sync_status
    SET 
      status = 'pending',
      error_message = NULL,
      updated_at = $1
    WHERE shopify_order_id = $2
  `, [now, orderId]);
}
