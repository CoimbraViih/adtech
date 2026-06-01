-- ─────────────────────────────────────────────────────────────────────────────
-- M11: AI Traffic Manager — Campaign Diagnostics
-- Tables: campaign_benchmarks, ai_diagnostics
-- ─────────────────────────────────────────────────────────────────────────────

-- ── enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE diagnostic_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_status AS ENUM ('open', 'acknowledged', 'applied', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diagnostic_entity AS ENUM ('campaign', 'ad_set', 'ad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── campaign_benchmarks ───────────────────────────────────────────────────────
-- workspace_id NULL = global market default; NOT NULL = workspace override.
-- Effective value: workspace override beats global for the same (platform, objective, metric).
CREATE TABLE IF NOT EXISTS campaign_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform        campaign_platform NOT NULL,
  objective       campaign_objective NOT NULL,
  metric          TEXT NOT NULL,
  target_value    NUMERIC(14, 4) NOT NULL,
  comparator      TEXT NOT NULL DEFAULT 'gte' CHECK (comparator IN ('gte', 'lte')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_benchmarks_unique_idx
  ON campaign_benchmarks (
    COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    platform, objective, metric
  );

-- ── ai_diagnostics ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_diagnostics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type      diagnostic_entity NOT NULL,
  entity_id        UUID NOT NULL,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  skill_id         TEXT NOT NULL,
  severity         diagnostic_severity NOT NULL DEFAULT 'warning',
  status           diagnostic_status NOT NULL DEFAULT 'open',
  title            TEXT NOT NULL,
  rationale        TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_diagnostics_workspace_idx ON ai_diagnostics(workspace_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_campaign_idx  ON ai_diagnostics(campaign_id);
CREATE INDEX IF NOT EXISTS ai_diagnostics_status_idx    ON ai_diagnostics(status);
CREATE INDEX IF NOT EXISTS ai_diagnostics_workspace_status_idx
  ON ai_diagnostics(workspace_id, status);
-- prevents duplicate open diagnostics for same entity+skill
CREATE UNIQUE INDEX IF NOT EXISTS ai_diagnostics_open_unique_idx
  ON ai_diagnostics(entity_type, entity_id, skill_id)
  WHERE status = 'open';
-- unconditional unique key for upsert conflict resolution (PostgREST requires non-partial index)
ALTER TABLE ai_diagnostics ADD CONSTRAINT ai_diagnostics_entity_skill_unique
  UNIQUE (workspace_id, entity_type, entity_id, skill_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_campaign_benchmarks_updated_at ON campaign_benchmarks;
CREATE TRIGGER set_campaign_benchmarks_updated_at
  BEFORE UPDATE ON campaign_benchmarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_ai_diagnostics_updated_at ON ai_diagnostics;
CREATE TRIGGER set_ai_diagnostics_updated_at
  BEFORE UPDATE ON ai_diagnostics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diagnostics      ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_benchmarks_select ON campaign_benchmarks FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaign_benchmarks_write ON campaign_benchmarks FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

CREATE POLICY ai_diagnostics_select ON ai_diagnostics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY ai_diagnostics_write ON ai_diagnostics FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','member')));

-- ── seed market-default benchmarks ───────────────────────────────────────────
INSERT INTO campaign_benchmarks
  (workspace_id, platform, objective, metric, target_value, comparator)
VALUES
  (NULL, 'meta',   'sales', 'ctr',       0.0100, 'gte'),
  (NULL, 'meta',   'sales', 'frequency', 3.5000, 'lte'),
  (NULL, 'meta',   'sales', 'roas',      2.0000, 'gte'),
  (NULL, 'meta',   'sales', 'cpa',       50.000, 'lte'),
  (NULL, 'meta',   'leads', 'ctr',       0.0150, 'gte'),
  (NULL, 'meta',   'leads', 'cpa',       30.000, 'lte'),
  (NULL, 'google', 'sales', 'ctr',       0.0200, 'gte'),
  (NULL, 'google', 'sales', 'roas',      2.0000, 'gte'),
  (NULL, 'google', 'sales', 'cpa',       50.000, 'lte'),
  (NULL, 'google', 'leads', 'ctr',       0.0300, 'gte'),
  (NULL, 'google', 'leads', 'cpa',       30.000, 'lte')
ON CONFLICT DO NOTHING;
