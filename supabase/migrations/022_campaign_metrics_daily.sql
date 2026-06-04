-- supabase/migrations/022_campaign_metrics_daily.sql
-- M-ADS Fase 4: daily metrics snapshot per campaign per platform.
--
-- One row per (workspace_id, campaign_external_id, platform, date).
-- Populated by lib/campaigns/sync.ts after each platform sync run.
-- pixel_conversions is updated by the pixel fanout adapter (initially 0,
-- incremented when a purchase/lead pixel event arrives for the campaign).
--
-- Using campaign_external_id (the platform's own campaign ID) rather than a
-- campaigns.id FK because campaign upserts are still stubbed TODO(M-ADS-backend)
-- and rows may arrive before the campaigns table row exists.

CREATE TABLE IF NOT EXISTS campaign_metrics_daily (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_external_id  TEXT          NOT NULL,
  platform              TEXT          NOT NULL,
  date                  DATE          NOT NULL,
  spend                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions           BIGINT        NOT NULL DEFAULT 0,
  clicks                BIGINT        NOT NULL DEFAULT 0,
  conversions           INTEGER       NOT NULL DEFAULT 0,
  revenue               NUMERIC(14,2) NOT NULL DEFAULT 0,
  roas                  NUMERIC(8,4),
  cpa                   NUMERIC(10,2),
  pixel_conversions     INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cmd_campaign_platform_date
  ON campaign_metrics_daily (workspace_id, campaign_external_id, platform, date);

CREATE INDEX IF NOT EXISTS idx_cmd_workspace_date
  ON campaign_metrics_daily (workspace_id, date DESC);

CREATE OR REPLACE TRIGGER set_campaign_metrics_daily_updated_at
  BEFORE UPDATE ON campaign_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE campaign_metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cmd: workspace members can read" ON campaign_metrics_daily;
CREATE POLICY "cmd: workspace members can read"
  ON campaign_metrics_daily FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cmd: service role can write" ON campaign_metrics_daily;
CREATE POLICY "cmd: service role can write"
  ON campaign_metrics_daily FOR ALL
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "cmd: owners and admins can delete" ON campaign_metrics_daily;
CREATE POLICY "cmd: owners and admins can delete"
  ON campaign_metrics_daily FOR DELETE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN organization_members om
        ON om.organization_id = w.organization_id
       AND om.user_id = auth.uid()
       AND om.role IN ('owner', 'admin')
    )
  );
