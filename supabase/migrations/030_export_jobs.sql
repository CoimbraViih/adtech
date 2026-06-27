-- ============================================================
-- Migration 030: Export Jobs & Destinations (M18 — Data Transparency)
-- ============================================================

-- ── export_destinations ────────────────────────────────────────────────────
-- Configured destinations per org/workspace for event exports
CREATE TABLE IF NOT EXISTS export_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('bigquery', 'snowflake', 's3', 'csv_download')),
  config JSONB NOT NULL DEFAULT '{}',
  schedule TEXT CHECK (schedule IN ('hourly', 'daily')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_destinations_org_ws
  ON export_destinations(organization_id, workspace_id);

-- ── export_runs ───────────────────────────────────────────────────────────
-- Append-only execution log of export jobs
CREATE TABLE IF NOT EXISTS export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES export_destinations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  rows_exported INT,
  error TEXT,
  output_path TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_runs_destination
  ON export_runs(destination_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_runs_ws_status
  ON export_runs(workspace_id, status);

-- ── Triggers ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_export_destinations_updated_at ON export_destinations;
CREATE TRIGGER set_export_destinations_updated_at
  BEFORE UPDATE ON export_destinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE export_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_runs ENABLE ROW LEVEL SECURITY;

-- export_destinations: org members can manage their own destinations
CREATE POLICY "org members manage export_destinations"
  ON export_destinations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- export_destinations: service role full access
CREATE POLICY "service role full access export_destinations"
  ON export_destinations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- export_runs: org members SELECT only (cron writes)
CREATE POLICY "org members read export_runs"
  ON export_runs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- export_runs: service role full access (cron inserts/updates)
CREATE POLICY "service role full access export_runs"
  ON export_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
