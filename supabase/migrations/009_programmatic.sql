-- M8: Programático DSP/SSP
-- Tables: rtb_campaigns, bid_requests_log, audiences, audience_segments
-- Scoped by workspace_id; RLS enabled on all tables.

DO $$ BEGIN
  CREATE TYPE deal_type AS ENUM ('open', 'private', 'preferred', 'guaranteed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bid_outcome AS ENUM ('win', 'loss', 'no_bid', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audience_type AS ENUM ('behavioral', 'lookalike', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── rtb_campaigns ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rtb_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id          UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'draft', 'archived')),
  deal_type            deal_type NOT NULL DEFAULT 'open',
  deal_id              TEXT,
  floor_cpm            NUMERIC(10,4) NOT NULL DEFAULT 0,
  max_cpm              NUMERIC(10,4) NOT NULL,
  daily_budget         NUMERIC(10,2) NOT NULL,
  total_budget         NUMERIC(10,2),
  pacing               TEXT NOT NULL DEFAULT 'even' CHECK (pacing IN ('even', 'asap')),
  frequency_cap        INTEGER DEFAULT 3,
  frequency_cap_hours  INTEGER DEFAULT 24,
  creative_id          UUID REFERENCES creatives(id) ON DELETE SET NULL,
  audience_id          UUID,
  targeting            JSONB NOT NULL DEFAULT '{}',
  start_date           DATE NOT NULL,
  end_date             DATE,
  impressions          BIGINT NOT NULL DEFAULT 0,
  wins                 BIGINT NOT NULL DEFAULT 0,
  spend                NUMERIC(10,2) NOT NULL DEFAULT 0,
  win_rate             NUMERIC(5,4),
  avg_cpm              NUMERIC(10,4),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── bid_requests_log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bid_requests_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rtb_campaign_id  UUID REFERENCES rtb_campaigns(id) ON DELETE SET NULL,
  ssp_id           TEXT NOT NULL,
  auction_id       TEXT NOT NULL,
  user_id_hash     TEXT,
  domain           TEXT,
  floor_cpm        NUMERIC(10,4),
  bid_cpm          NUMERIC(10,4),
  outcome          bid_outcome NOT NULL,
  response_ms      INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audiences ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audiences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                audience_type NOT NULL DEFAULT 'behavioral',
  description         TEXT,
  rules               JSONB NOT NULL DEFAULT '[]',
  lookalike_source_id UUID,
  size_estimate       INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audience_segments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audience_segments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id  UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  user_id_hash TEXT NOT NULL,
  matched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  UNIQUE(audience_id, user_id_hash)
);

-- ── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_updated_at_rtb_campaigns ON rtb_campaigns;
CREATE TRIGGER set_updated_at_rtb_campaigns
  BEFORE UPDATE ON rtb_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_audiences ON audiences;
CREATE TRIGGER set_updated_at_audiences
  BEFORE UPDATE ON audiences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rtb_campaigns_workspace    ON rtb_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rtb_campaigns_status       ON rtb_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bid_requests_log_workspace ON bid_requests_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bid_requests_log_campaign  ON bid_requests_log(rtb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_bid_requests_log_created   ON bid_requests_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audiences_workspace        ON audiences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audience_segments_audience ON audience_segments(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_segments_user     ON audience_segments(user_id_hash);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE rtb_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_requests_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

-- rtb_campaigns

DROP POLICY IF EXISTS "rtb_campaigns_select" ON rtb_campaigns;
CREATE POLICY "rtb_campaigns_select" ON rtb_campaigns FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "rtb_campaigns_insert" ON rtb_campaigns;
CREATE POLICY "rtb_campaigns_insert" ON rtb_campaigns FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "rtb_campaigns_update" ON rtb_campaigns;
CREATE POLICY "rtb_campaigns_update" ON rtb_campaigns FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "rtb_campaigns_delete" ON rtb_campaigns;
CREATE POLICY "rtb_campaigns_delete" ON rtb_campaigns FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- bid_requests_log: read by workspace members; inserts by service role only (bypasses RLS)

DROP POLICY IF EXISTS "workspace members can read bid logs" ON bid_requests_log;
CREATE POLICY "workspace members can read bid logs"
  ON bid_requests_log FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- audiences

DROP POLICY IF EXISTS "audiences_select" ON audiences;
CREATE POLICY "audiences_select" ON audiences FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "audiences_insert" ON audiences;
CREATE POLICY "audiences_insert" ON audiences FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "audiences_update" ON audiences;
CREATE POLICY "audiences_update" ON audiences FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "audiences_delete" ON audiences;
CREATE POLICY "audiences_delete" ON audiences FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- audience_segments: read by workspace members; inserts by service role only (bypasses RLS)

DROP POLICY IF EXISTS "workspace members can read segments" ON audience_segments;
CREATE POLICY "workspace members can read segments"
  ON audience_segments FOR SELECT
  USING (audience_id IN (
    SELECT id FROM audiences WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
