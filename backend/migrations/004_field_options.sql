ALTER TABLE document_fields
  ADD COLUMN IF NOT EXISTS options JSONB;
