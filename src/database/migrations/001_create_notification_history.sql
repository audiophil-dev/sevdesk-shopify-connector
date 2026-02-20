-- notification_history: Track all customer notifications
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  sevdesk_invoice_id VARCHAR(50) NOT NULL,
  notification_type VARCHAR(30) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  shopify_order_id VARCHAR(50),
  sent_at TIMESTAMP DEFAULT NOW(),
  shopify_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT
);

CREATE INDEX idx_notification_invoice ON notification_history(sevdesk_invoice_id);
CREATE INDEX idx_notification_status ON notification_history(status);
CREATE INDEX idx_notification_type ON notification_history(notification_type);
