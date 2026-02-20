-- sync_state: Track Shopify→Sevdesk sync
CREATE TABLE sync_state (
  id SERIAL PRIMARY KEY,
  shopify_order_id VARCHAR(50) NOT NULL UNIQUE,
  sevdesk_invoice_id VARCHAR(50),
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_order ON sync_state(shopify_order_id);
CREATE INDEX idx_sync_status ON sync_state(sync_status);
