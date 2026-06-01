-- ────────────────────────────────────────────────────────────────────────────
-- M2: Campaign management schema
-- Tables: campaigns, ad_sets, ads
-- All tables scoped by workspace_id with RLS.
-- ────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE campaign_platform AS ENUM ('meta', 'google', 'tiktok', 'linkedin', 'programmatic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'draft', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_objective AS ENUM (
    'awareness', 'traffic', 'engagement', 'leads', 'sales', 'app_promotion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_set_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_status AS ENUM ('active', 'paused', 'archived', 'in_review', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── campaigns ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  platform        campaign_platform NOT NULL,
  status          campaign_status NOT NULL DEFAULT 'draft',
  objective       campaign_objective NOT NULL,
  daily_budget    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lifetime_budget NUMERIC(12, 2),
  start_date      DATE NOT NULL,
  end_date        DATE,
  external_id     TEXT,

  -- denormalized metrics — refreshed by sync job
  spend           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  conversions     INTEGER NOT NULL DEFAULT 0,
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cpa             NUMERIC(10, 2),
  roas            NUMERIC(8, 4),
  ctr             NUMERIC(8, 4),
  cpc             NUMERIC(10, 4),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_workspace_id_idx ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx       ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_platform_idx     ON campaigns(platform);
CREATE INDEX IF NOT EXISTS campaigns_external_id_idx  ON campaigns(platform, external_id) WHERE external_id IS NOT NULL;

-- ── ad_sets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          ad_set_status NOT NULL DEFAULT 'active',
  daily_budget    NUMERIC(12, 2),
  bid_amount      NUMERIC(10, 4),
  targeting       JSONB NOT NULL DEFAULT '{}',
  external_id     TEXT,

  spend           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  conversions     INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ad_sets_campaign_id_idx  ON ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS ad_sets_workspace_id_idx ON ad_sets(workspace_id);

-- ── ads ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id        UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  status           ad_status NOT NULL DEFAULT 'active',
  creative_id      UUID,
  headline         TEXT,
  description      TEXT,
  cta              TEXT,
  destination_url  TEXT,
  external_id      TEXT,

  impressions      BIGINT NOT NULL DEFAULT 0,
  clicks           BIGINT NOT NULL DEFAULT 0,
  conversions      INTEGER NOT NULL DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ads_ad_set_id_idx    ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS ads_workspace_id_idx ON ads(workspace_id);

-- ── updated_at triggers ────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_sets_updated_at ON ad_sets;
CREATE TRIGGER ad_sets_updated_at
  BEFORE UPDATE ON ad_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ads_updated_at ON ads;
CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads       ENABLE ROW LEVEL SECURITY;

-- campaigns

DROP POLICY IF EXISTS campaigns_select ON campaigns;
CREATE POLICY campaigns_select ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS campaigns_insert ON campaigns;
CREATE POLICY campaigns_insert ON campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS campaigns_update ON campaigns;
CREATE POLICY campaigns_update ON campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS campaigns_delete ON campaigns;
CREATE POLICY campaigns_delete ON campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaigns.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ad_sets

DROP POLICY IF EXISTS ad_sets_select ON ad_sets;
CREATE POLICY ad_sets_select ON ad_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ad_sets.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ad_sets_insert ON ad_sets;
CREATE POLICY ad_sets_insert ON ad_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ad_sets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS ad_sets_update ON ad_sets;
CREATE POLICY ad_sets_update ON ad_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ad_sets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS ad_sets_delete ON ad_sets;
CREATE POLICY ad_sets_delete ON ad_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ad_sets.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- ads

DROP POLICY IF EXISTS ads_select ON ads;
CREATE POLICY ads_select ON ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ads.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ads_insert ON ads;
CREATE POLICY ads_insert ON ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ads.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS ads_update ON ads;
CREATE POLICY ads_update ON ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ads.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS ads_delete ON ads;
CREATE POLICY ads_delete ON ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ads.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
