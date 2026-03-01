-- Migration 003: Create order_sync_status table for tracking SevDesk invoice sync state
-- Purpose: Track sync status for each Shopify order to SevDesk integration
-- Created: 2026-03-01 for Phase 1 Shopify Admin Integration

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

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_status ON order_sync_status(status);
CREATE INDEX IF NOT EXISTS idx_synced_at ON order_sync_status(synced_at);
CREATE INDEX IF NOT EXISTS idx_shopify_order_id ON order_sync_status(shopify_order_id);

-- Add comments for documentation
COMMENT ON TABLE order_sync_status IS 'Tracks sync status between Shopify orders and SevDesk invoices';
COMMENT ON COLUMN order_sync_status.shopify_order_id IS 'Primary key - Shopify order ID';
COMMENT ON COLUMN order_sync_status.sevdesk_invoice_id IS 'Foreign key - SevDesk invoice ID when synced';
COMMENT ON COLUMN order_sync_status.status IS 'pending | synced | error | never_synced';
