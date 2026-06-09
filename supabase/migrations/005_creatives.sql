-- M3: AI Creative Studio
-- Tables: creatives, creative_versions
-- RLS: row-level security scoped to workspace_id

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE creative_type AS ENUM ('copy', 'banner', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE creative_status AS ENUM ('draft', 'approved', 'rejected', 'in_review');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE banner_format AS ENUM ('1:1', '16:9', '9:16', '4:5', '1.91:1');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── creatives ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creatives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  type            creative_type   NOT NULL,
  status          creative_status NOT NULL DEFAULT 'draft',
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),

  -- copy fields
  headline        TEXT,
  description     TEXT,
  cta             TEXT,

  -- banner / video fields
  asset_url       TEXT,
  thumbnail_url   TEXT,
  format          banner_format,

  -- AI metadata
  prompt          TEXT,
  model_used      TEXT,

  -- quality
  score           SMALLINT CHECK (score BETWEEN 0 AND 100),
  score_breakdown JSONB,      -- ScoreBreakdown shape
  policy_items    JSONB,      -- PolicyItem[] shape
  policy_passed   BOOLEAN,

  -- versioning
  version         SMALLINT NOT NULL DEFAULT 1,
  parent_id       UUID REFERENCES creatives(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creatives_workspace_id_idx ON creatives (workspace_id);
CREATE INDEX IF NOT EXISTS creatives_campaign_id_idx  ON creatives (campaign_id);
CREATE INDEX IF NOT EXISTS creatives_type_idx         ON creatives (workspace_id, type);
CREATE INDEX IF NOT EXISTS creatives_status_idx       ON creatives (workspace_id, status);
CREATE INDEX IF NOT EXISTS creatives_score_idx        ON creatives (workspace_id, score DESC);

-- ── creative_versions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creative_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id  UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version      SMALLINT NOT NULL,
  snapshot     JSONB NOT NULL,   -- full creative row at time of snapshot
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_versions_creative_id_idx ON creative_versions (creative_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Uses set_updated_at() defined in 001_initial_schema.sql

DROP TRIGGER IF EXISTS creatives_updated_at ON creatives;
CREATE TRIGGER creatives_updated_at
  BEFORE UPDATE ON creatives
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE creatives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_versions ENABLE ROW LEVEL SECURITY;

-- Uses current_user_ws_role(ws_id) defined in 002_rbac.sql

DROP POLICY IF EXISTS creatives_select ON creatives;
CREATE POLICY creatives_select ON creatives
  FOR SELECT USING (
    current_user_ws_role(workspace_id) IS NOT NULL
  );

DROP POLICY IF EXISTS creatives_insert ON creatives;
CREATE POLICY creatives_insert ON creatives
  FOR INSERT WITH CHECK (
    current_user_ws_role(workspace_id) IN ('member', 'admin', 'owner')
  );

DROP POLICY IF EXISTS creatives_update ON creatives;
CREATE POLICY creatives_update ON creatives
  FOR UPDATE USING (
    current_user_ws_role(workspace_id) IN ('member', 'admin', 'owner')
  );

DROP POLICY IF EXISTS creatives_delete ON creatives;
CREATE POLICY creatives_delete ON creatives
  FOR DELETE USING (
    current_user_ws_role(workspace_id) IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS creative_versions_select ON creative_versions;
CREATE POLICY creative_versions_select ON creative_versions
  FOR SELECT USING (
    current_user_ws_role(workspace_id) IS NOT NULL
  );

-- Versions are append-only; no UPDATE or DELETE policies
DROP POLICY IF EXISTS creative_versions_insert ON creative_versions;
CREATE POLICY creative_versions_insert ON creative_versions
  FOR INSERT WITH CHECK (
    current_user_ws_role(workspace_id) IN ('member', 'admin', 'owner')
  );
