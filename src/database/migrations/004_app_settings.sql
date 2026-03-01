-- Migration 004: Create app_settings table for Shopify app configuration
-- Purpose: Store SevDesk API keys, sync settings, and account mappings
-- Created: 2026-03-01 for Phase 1 Shopify Admin Integration

CREATE TABLE IF NOT EXISTS app_settings (
  shop_id VARCHAR(255) PRIMARY KEY,
  sevdesk_api_key VARCHAR(255),
  sync_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  default_invoice_type VARCHAR(50) DEFAULT 'RE',
  revenue_account VARCHAR(50),
  tax_account VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_settings_shop ON app_settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_settings_sync_mode ON app_settings(sync_mode);

-- Add comments for documentation
COMMENT ON TABLE app_settings IS 'Stores Shopify app configuration for SevDesk integration';
COMMENT ON COLUMN app_settings.shop_id IS 'Primary key - Shopify shop domain';
COMMENT ON COLUMN app_settings.sevdesk_api_key IS 'Encrypted SevDesk API key for authentication';
COMMENT ON COLUMN app_settings.sync_mode IS 'automatic or manual sync mode';
COMMENT ON COLUMN app_settings.default_invoice_type IS 'Default SevDesk invoice type (RE, GUT, REK)';
COMMENT ON COLUMN app_settings.revenue_account IS 'SevDesk account number for revenue posting';
COMMENT ON COLUMN app_settings.tax_account IS 'SevDesk account number for tax posting';
