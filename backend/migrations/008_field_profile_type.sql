ALTER TABLE document_fields
  ADD COLUMN IF NOT EXISTS profile_type VARCHAR(80);
