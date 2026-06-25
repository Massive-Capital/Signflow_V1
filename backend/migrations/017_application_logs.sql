CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  os_name VARCHAR(100),
  os_version VARCHAR(50),
  device_type VARCHAR(50),
  method VARCHAR(10),
  path VARCHAR(2000),
  status_code INTEGER,
  duration_ms INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  auth_type VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs (level);
CREATE INDEX IF NOT EXISTS idx_application_logs_organization_id ON application_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_ip_address ON application_logs (ip_address);
