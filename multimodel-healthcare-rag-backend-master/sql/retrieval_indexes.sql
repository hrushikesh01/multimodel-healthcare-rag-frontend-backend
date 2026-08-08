-- Speed up chat keyword retrieval (ILIKE '%word%') and recent-chunk fallback.
-- Run once against your Postgres/Neon DB (same DATABASE_URL as the app):
--   python apply_retrieval_indexes.py
-- Or paste into the Neon SQL editor.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Substring / ILIKE on content (requires pg_trgm)
CREATE INDEX IF NOT EXISTS ix_document_chunks_content_trgm
  ON document_chunks USING gin (content gin_trgm_ops);

-- WHERE patient_id = ? ORDER BY id DESC LIMIT n (empty-query path)
CREATE INDEX IF NOT EXISTS ix_document_chunks_patient_id_id_desc
  ON document_chunks (patient_id, id DESC);
