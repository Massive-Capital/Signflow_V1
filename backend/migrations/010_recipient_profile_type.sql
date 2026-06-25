ALTER TABLE document_recipients
  ADD COLUMN IF NOT EXISTS profile_type VARCHAR(80);
