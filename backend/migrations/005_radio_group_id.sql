ALTER TABLE document_fields
  ADD COLUMN IF NOT EXISTS radio_group_id VARCHAR(255);
