ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sent_content_hash VARCHAR(64);
