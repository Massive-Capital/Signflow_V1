ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS signed_file_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents (file_hash)
  WHERE file_hash IS NOT NULL;
