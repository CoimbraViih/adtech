-- supabase/migrations/014_api_credentials.sql
-- API credentials per organization, encrypted at rest.
-- credentials column is an AES-256-GCM blob: "iv:authTag:ciphertext" (hex).
-- Never store plaintext here.

CREATE TABLE IF NOT EXISTS org_api_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  credentials     TEXT NOT NULL,
  last_tested_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

DROP TRIGGER IF EXISTS org_api_credentials_updated_at ON org_api_credentials;
CREATE TRIGGER org_api_credentials_updated_at
  BEFORE UPDATE ON org_api_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE org_api_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_creds: owners and admins can read" ON org_api_credentials;
CREATE POLICY "api_creds: owners and admins can read"
  ON org_api_credentials FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "api_creds: owners and admins can write" ON org_api_credentials;
CREATE POLICY "api_creds: owners and admins can write"
  ON org_api_credentials FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "api_creds: owners and admins can update" ON org_api_credentials;
CREATE POLICY "api_creds: owners and admins can update"
  ON org_api_credentials FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "api_creds: owners and admins can delete" ON org_api_credentials;
CREATE POLICY "api_creds: owners and admins can delete"
  ON org_api_credentials FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
