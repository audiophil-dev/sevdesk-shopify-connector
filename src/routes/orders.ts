import { Router } from 'express';
import { getSyncStatusForOrder, triggerOrderSync } from '../services/syncService';

const router = Router();

// GET /api/orders/:orderId/sevdesk-status
// Returns current sync status for a specific Shopify order
router.get('/:orderId/sevdesk-status', async (req, res) => {
  const { orderId } = req.params;
  const shop = req.headers['x-shopify-shop-domain'];

  // Validate shopify_order_id parameter
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({
      error: 'Invalid order ID parameter',
      code: 'INVALID_ORDER_ID'
    });
  }

  try {
    // Get sync status from database
    const result = await getSyncStatusForOrder(orderId);

    if (!result) {
      return res.status(404).json({
        error: 'Sync status not found for this order',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: result.status,
      sevdeskInvoiceId: result.sevdeskInvoiceId,
      sevdeskInvoiceNumber: result.sevdeskInvoiceNumber,
      invoiceType: result.invoiceType,
      syncedAt: result.syncedAt,
      errorMessage: result.error,
      shopifyOrderId: orderId
    });
  } catch (error) {
    console.error('[Orders API] Error fetching sync status:', {
      orderId,
      shop,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to fetch sync status',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// POST /api/orders/:orderId/sync
// Triggers manual sync for a specific Shopify order to SevDesk
router.post('/:orderId/sync', async (req, res) => {
  const { orderId } = req.params;
  const shop = req.headers['x-shopify-shop-domain'];
  const { invoiceType } = req.body;

  // Validate shopify_order_id parameter
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({
      error: 'Invalid order ID parameter',
      code: 'INVALID_ORDER_ID'
    });
  }

  try {
    // Trigger sync via sync service
    const result = await triggerOrderSync(orderId, shop, invoiceType);

    res.json({
      success: true,
      orderId: orderId,
      shopifyOrderId: orderId,
      status: result.status,
      sevdeskInvoiceId: result.sevdeskInvoiceId,
      sevdeskInvoiceNumber: result.sevdeskInvoiceNumber,
      invoiceType: invoiceType || result.invoiceType,
      syncedAt: result.syncedAt,
      message: 'Sync initiated successfully'
    });
  } catch (error) {
    console.error('[Orders API] Error triggering sync:', {
      orderId,
      shop,
      invoiceType,
      error: error instanceof Error ? error.message : String(error)
    });

    // Determine appropriate status code based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any).statusCode || 500;

    res.status(statusCode).json({
      error: 'Failed to trigger sync',
      code: (error as any).code || 'SYNC_ERROR',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

export default router;
