-- ─────────────────────────────────────────────────────────────────────────────
-- M8: Automation & Alerts
-- Tables: alert_rules, alert_notifications
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE alert_condition AS ENUM (
    'roas_below', 'cpa_above', 'spend_above', 'ctr_below', 'conversions_below'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── alert_rules ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id       UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  condition         alert_condition NOT NULL,
  threshold         NUMERIC(12, 4) NOT NULL,
  status            alert_status NOT NULL DEFAULT 'active',
  cooldown_minutes  INTEGER NOT NULL DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS alert_rules_updated_at ON alert_rules;
CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_rules: workspace members can read" ON alert_rules;
CREATE POLICY "alert_rules: workspace members can read"
  ON alert_rules FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alert_rules: workspace members can insert" ON alert_rules;
CREATE POLICY "alert_rules: workspace members can insert"
  ON alert_rules FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alert_rules: workspace members can update" ON alert_rules;
CREATE POLICY "alert_rules: workspace members can update"
  ON alert_rules FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alert_rules: workspace members can delete" ON alert_rules;
CREATE POLICY "alert_rules: workspace members can delete"
  ON alert_rules FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── alert_notifications ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id      UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  metric_value NUMERIC(12, 4) NOT NULL,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  emailed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_notifications: workspace members can read" ON alert_notifications;
CREATE POLICY "alert_notifications: workspace members can read"
  ON alert_notifications FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alert_notifications: workspace members can update" ON alert_notifications;
CREATE POLICY "alert_notifications: workspace members can update"
  ON alert_notifications FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT is performed exclusively by the service role (bypasses RLS).
-- No INSERT policy needed — an explicit permissive policy would allow
-- any authenticated user to insert, which is a security hole.
