ALTER TABLE document_fields
  ADD COLUMN IF NOT EXISTS profile_types JSONB;

UPDATE document_fields
SET profile_types = jsonb_build_array(profile_type)
WHERE profile_type IS NOT NULL
  AND (profile_types IS NULL OR profile_types = '[]'::jsonb);
