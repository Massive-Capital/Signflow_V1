ALTER TABLE signing_sessions
  ADD COLUMN IF NOT EXISTS investor_recipient_id UUID REFERENCES document_recipients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_signing_sessions_investor_recipient_id
  ON signing_sessions (investor_recipient_id);
