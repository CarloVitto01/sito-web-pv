-- PostgreSQL: migrazione additiva per un database che contiene già le tabelle del backend.
-- Eseguire con backup verificato, prima di avviare questa versione in profilo prod.
BEGIN;
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS page_count INTEGER;
COMMIT;
