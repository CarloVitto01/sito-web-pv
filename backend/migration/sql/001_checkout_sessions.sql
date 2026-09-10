-- PostgreSQL: migrazione additiva per un database che contiene già le tabelle del backend.
-- Eseguire con backup verificato, prima di avviare questa versione in profilo prod.
BEGIN;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS token_version BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS orders_request_id_unique ON orders (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_order_id_unique ON orders (paypal_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_capture_id_unique ON orders (paypal_capture_id);
CREATE INDEX IF NOT EXISTS upload_sessions_owner_created ON upload_sessions (user_id, created_at);
CREATE INDEX IF NOT EXISTS upload_sessions_final_path ON upload_sessions (final_storage_path);
COMMIT;
