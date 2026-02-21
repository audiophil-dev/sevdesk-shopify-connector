import { SevdeskInvoice } from '../types/sevdesk';
import { shopifyClient } from '../clients/shopify';
import { query, queryOne } from '../database/connection';
import { sendPaymentEmail } from './emailSender';

/**
 * Extract Shopify order number from Sevdesk invoice header.
 * Examples:
 *   "Rechnung zum Auftrag #PE4994" → "PE4994"
 *   "Rechnung zum Auftrag #1001" → "1001"
 * Returns null for cancellation invoices or if no order number found.
 */
function extractOrderNumber(header: string | null): string | null {
  if (!header) {
    return null;
  }
  
  // Skip cancellation invoices (Stornorechnung)
  if (header.toLowerCase().includes('stornorechnung')) {
    console.log(`[processor] Skipping cancellation invoice: ${header}`);
    return null;
  }
  
  // Extract order number after # sign
  const match = header.match(/#([A-Z0-9]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  
  return null;
}

interface NotificationRecord {
  id: number;
  sevdesk_invoice_id: string;
  notification_type: string;
  customer_email: string;
  shopify_order_id: string | null;
  sent_at: Date;
  status: string;
}

/**
 * Check if a notification has already been processed (idempotency).
 * Returns the existing notification record if found, null otherwise.
 */
async function isAlreadyProcessed(invoiceId: string, notificationType: string): Promise<NotificationRecord | null> {
  const result = await queryOne<NotificationRecord>(
    `SELECT * FROM notification_history 
     WHERE sevdesk_invoice_id = $1 AND notification_type = $2 AND status = 'sent'`,
    [invoiceId, notificationType]
  );
  return result;
}

/**
 * Record a notification in the database.
 */
async function recordNotification(
  invoiceId: string,
  notificationType: string,
  customerEmail: string,
  shopifyOrderId: string | null,
  status: string,
  errorMessage?: string
): Promise<void> {
  await query(
    `INSERT INTO notification_history 
     (sevdesk_invoice_id, notification_type, customer_email, shopify_order_id, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [invoiceId, notificationType, customerEmail, shopifyOrderId, status, errorMessage || null]
  );
  console.log(`[processor] Recorded notification: ${notificationType} for invoice ${invoiceId}`);
}

/**
 * Process a paid invoice from Sevdesk.
 * This function:
 * 1. Checks for duplicates (idempotency)
 * 2. Finds the matching Shopify order by customer email
 * 3. Updates the order status to "paid"
 * 4. Sends payment notification email
 * 5. Records the notification in the database
 */
export async function processPaidInvoice(invoice: SevdeskInvoice): Promise<void> {
  const NOTIFICATION_TYPE = 'payment_received';
  
  console.log(`[processor] Processing invoice ${invoice.invoiceNumber} (ID: ${invoice.id})`);
  
  try {
    // Step 1: Check idempotency - don't process if already notified
    const existingNotification = await isAlreadyProcessed(invoice.id, NOTIFICATION_TYPE);
    if (existingNotification) {
      console.log(`[processor] Already processed invoice ${invoice.invoiceNumber}, skipping`);
      return;
    }

    // Step 2: Extract Shopify order number from invoice header
    const orderNumber = extractOrderNumber(invoice.header ?? null);
    
    if (!orderNumber) {
      console.log(`[processor] No Shopify order number found in invoice header: ${invoice.header || 'null'}`);
      await recordNotification(
        invoice.id,
        NOTIFICATION_TYPE,
        '',
        null,
        'skipped',
        'No Shopify order number in invoice header (may be cancellation or manual invoice)'
      );
      return;
    }
    
    console.log(`[processor] Extracted order number: ${orderNumber} from invoice header`);
    
    // Step 3: Find matching Shopify order by order number
    const order = await shopifyClient.findOrderByOrderName(orderNumber);
    
    if (!order) {
      console.log(`[processor] No Shopify order found for order number ${orderNumber}`);
      await recordNotification(
        invoice.id,
        NOTIFICATION_TYPE,
        '',
        null,
        'failed',
        `No matching Shopify order found for order number ${orderNumber}`
      );
      return;
    }
    
    const customerEmail = order.email || '';
    console.log(`[processor] Found Shopify order: ${order.name} (${order.id}), customer: ${customerEmail || 'no email'}`);
    console.log(`[processor] Current order status: ${order.displayFinancialStatus}`);
    
    // Check if running in dry-run mode
    const dryRun = process.env.DRY_RUN === 'true';
    if (dryRun) {
      console.log(`[processor] [DRY RUN] Would mark order ${order.name} as paid (no actual changes)`);
      console.log(`[processor] [DRY RUN] Would send payment notification email to ${customerEmail}`);
      console.log(`[processor] [DRY RUN] Would record successful notification in database`);
      
      // Record dry-run notification (so we can track what would have happened)
      await recordNotification(
        invoice.id,
        NOTIFICATION_TYPE,
        customerEmail,
        order.id,
        'dry-run',
        'Dry run mode - no actual changes made'
      );
      return;
    }
    
    // Step 4: Update order status to "paid"
    try {
      await shopifyClient.markOrderAsPaid(order.id);
      console.log(`[processor] Order ${order.name} marked as paid`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[processor] Failed to mark order as paid: ${errorMessage}`);
      await recordNotification(
        invoice.id,
        NOTIFICATION_TYPE,
        customerEmail,
        order.id,
        'failed',
        `Failed to mark order as paid: ${errorMessage}`
      );
      return;
    }
    
    // Step 5: Send payment notification email
    // Note: Shopify automatically sends order confirmation when status changes to "paid"
    // This function is for custom email logic if needed in Phase 2
    try {
      await sendPaymentEmail(order);
      console.log(`[processor] Payment notification sent for order ${order.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[processor] Failed to send email: ${errorMessage}`);
      // Continue - email is optional, order is already marked as paid
    }
    
    // Step 6: Record successful notification
    await recordNotification(
      invoice.id,
      NOTIFICATION_TYPE,
      customerEmail,
      order.id,
      'sent'
    );
    
    console.log(`[processor] Successfully processed invoice ${invoice.invoiceNumber}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[processor] Error processing invoice ${invoice.invoiceNumber}:`, errorMessage);
    
    // Record failed notification
    try {
      await recordNotification(
        invoice.id,
        NOTIFICATION_TYPE,
        '',
        null,
        'failed',
        errorMessage
      );
    } catch (dbError) {
      console.error(`[processor] Failed to record error notification:`, dbError);
    }
  }
}
