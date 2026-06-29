ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS email_attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
