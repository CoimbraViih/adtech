-- M3: AI Creative Studio
-- Tables: creatives, creative_versions
-- RLS: row-level security scoped to workspace_id

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE creative_type   AS ENUM ('copy', 'banner', 'video');
CREATE TYPE creative_status AS ENUM ('draft', 'approved', 'rejected', 'in_review');
CREATE TYPE banner_format   AS ENUM ('1:1', '16:9', '9:16', '4:5', '1.91:1');

-- ── creatives ────────────────────────────────────────────────────────────────

CREATE TABLE creatives (
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

CREATE INDEX creatives_workspace_id_idx ON creatives (workspace_id);
CREATE INDEX creatives_campaign_id_idx  ON creatives (campaign_id);
CREATE INDEX creatives_type_idx         ON creatives (workspace_id, type);
CREATE INDEX creatives_status_idx       ON creatives (workspace_id, status);
CREATE INDEX creatives_score_idx        ON creatives (workspace_id, score DESC);

-- ── creative_versions ────────────────────────────────────────────────────────

CREATE TABLE creative_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id  UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version      SMALLINT NOT NULL,
  snapshot     JSONB NOT NULL,   -- full creative row at time of snapshot
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creative_versions_creative_id_idx ON creative_versions (creative_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER creatives_updated_at
  BEFORE UPDATE ON creatives
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE creatives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_versions ENABLE ROW LEVEL SECURITY;

-- Helper: check workspace membership (reuses function from 002_rbac.sql)
-- get_my_workspace_role(workspace_id) returns OrgRole or null

-- creatives: read — workspace members (any role)
CREATE POLICY creatives_select ON creatives
  FOR SELECT USING (
    get_my_workspace_role(workspace_id) IS NOT NULL
  );

-- creatives: insert — workspace members with role member, admin, or owner
CREATE POLICY creatives_insert ON creatives
  FOR INSERT WITH CHECK (
    get_my_workspace_role(workspace_id) IN ('member', 'admin', 'owner')
  );

-- creatives: update — workspace members with role member, admin, or owner
CREATE POLICY creatives_update ON creatives
  FOR UPDATE USING (
    get_my_workspace_role(workspace_id) IN ('member', 'admin', 'owner')
  );

-- creatives: delete — workspace admin or owner only
CREATE POLICY creatives_delete ON creatives
  FOR DELETE USING (
    get_my_workspace_role(workspace_id) IN ('admin', 'owner')
  );

-- creative_versions: read — workspace members (any role)
CREATE POLICY creative_versions_select ON creative_versions
  FOR SELECT USING (
    get_my_workspace_role(workspace_id) IS NOT NULL
  );

-- creative_versions: insert — service role only (via API routes)
-- Versions are append-only; no UPDATE or DELETE policies
CREATE POLICY creative_versions_insert ON creative_versions
  FOR INSERT WITH CHECK (
    get_my_workspace_role(workspace_id) IN ('member', 'admin', 'owner')
  );
