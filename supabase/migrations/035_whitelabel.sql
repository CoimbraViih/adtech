-- workspace_branding: per-workspace white-label configuration
CREATE TABLE IF NOT EXISTS workspace_branding (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  logo_url      TEXT,
  primary_color TEXT NOT NULL DEFAULT '#E8390E'
                     CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  custom_domain TEXT,
  domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  cname_token   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by verified domain (used by middleware)
CREATE UNIQUE INDEX IF NOT EXISTS workspace_branding_domain_idx
  ON workspace_branding (custom_domain)
  WHERE custom_domain IS NOT NULL AND domain_verified = TRUE;

ALTER TABLE workspace_branding ENABLE ROW LEVEL SECURITY;

-- Workspace members can read branding (authenticated)
CREATE POLICY "workspace members read branding"
  ON workspace_branding FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Anon role can read verified custom domains (for middleware DNS resolution)
CREATE POLICY "anon reads verified domain branding"
  ON workspace_branding FOR SELECT
  TO anon
  USING (domain_verified = TRUE);

-- Only workspace owners/admins can write branding
CREATE POLICY "workspace admins write branding"
  ON workspace_branding FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE TRIGGER workspace_branding_updated_at
  BEFORE UPDATE ON workspace_branding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- reseller_billing: markup % the agency charges over AdFlow's base price
CREATE TABLE IF NOT EXISTS reseller_billing (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id  UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0
                 CHECK (markup_percent >= 0 AND markup_percent <= 500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reseller_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency owners read reseller billing"
  ON reseller_billing FOR SELECT
  USING (
    agency_org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "agency owners write reseller billing"
  ON reseller_billing FOR ALL
  USING (
    agency_org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    agency_org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE TRIGGER reseller_billing_updated_at
  BEFORE UPDATE ON reseller_billing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
