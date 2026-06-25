ALTER TABLE document_fields
  ADD COLUMN IF NOT EXISTS page_hash VARCHAR(32),
  ADD COLUMN IF NOT EXISTS template_page INTEGER;

UPDATE document_fields
SET template_page = page
WHERE template_page IS NULL;
