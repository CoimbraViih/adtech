-- supabase/migrations/034_optimization_actions.sql
-- M19: Predictive & Autonomous Optimization
-- optimization_actions: log de ações sugeridas/executadas com snapshot antes/depois e resultado D+7
-- optimization_guardrails: config de guardrails por workspace

-- ─── optimization_guardrails ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS optimization_guardrails (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID          NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  kill_switch               BOOLEAN       NOT NULL DEFAULT false,
  max_budget_change_pct     NUMERIC(5,2)  NOT NULL DEFAULT 20.0,
  max_daily_actions         INTEGER       NOT NULL DEFAULT 5,
  blacklisted_campaign_ids  TEXT[]        NOT NULL DEFAULT '{}',
  autonomous_mode           BOOLEAN       NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_optimization_guardrails_updated_at
  BEFORE UPDATE ON optimization_guardrails
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE optimization_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "og: workspace members read"
  ON optimization_guardrails FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "og: owners and admins write"
  ON optimization_guardrails FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN organization_members om
        ON om.organization_id = w.organization_id
       AND om.user_id = auth.uid()
       AND om.role IN ('owner', 'admin')
    )
  );

-- ─── optimization_actions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS optimization_actions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id           UUID          REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_external_id  TEXT          NOT NULL,
  platform              TEXT          NOT NULL,
  action_type           TEXT          NOT NULL, -- 'pause' | 'resume' | 'budget_increase' | 'budget_decrease'
  status                TEXT          NOT NULL DEFAULT 'suggested', -- 'suggested' | 'approved' | 'rejected' | 'executed' | 'failed' | 'outcome_measured'
  mode                  TEXT          NOT NULL DEFAULT 'suggest', -- 'suggest' | 'autonomous'
  rationale             TEXT          NOT NULL,
  before_snapshot       JSONB         NOT NULL DEFAULT '{}',
  after_snapshot        JSONB,
  outcome_d7            JSONB,
  guardrail_checks      JSONB         NOT NULL DEFAULT '{}',
  budget_before         NUMERIC(14,2),
  budget_after          NUMERIC(14,2),
  approved_by           UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message         TEXT,
  executed_at           TIMESTAMPTZ,
  outcome_measured_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT oa_action_type_check CHECK (
    action_type IN ('pause', 'resume', 'budget_increase', 'budget_decrease')
  ),
  CONSTRAINT oa_status_check CHECK (
    status IN ('suggested', 'approved', 'rejected', 'executed', 'failed', 'outcome_measured')
  ),
  CONSTRAINT oa_mode_check CHECK (mode IN ('suggest', 'autonomous'))
);

CREATE INDEX IF NOT EXISTS idx_oa_workspace_status
  ON optimization_actions (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oa_campaign_external
  ON optimization_actions (workspace_id, campaign_external_id, platform);

CREATE INDEX IF NOT EXISTS idx_oa_executed_outcome
  ON optimization_actions (executed_at)
  WHERE status = 'executed' AND outcome_measured_at IS NULL;

CREATE OR REPLACE TRIGGER set_optimization_actions_updated_at
  BEFORE UPDATE ON optimization_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oa: workspace members read"
  ON optimization_actions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "oa: service role write"
  ON optimization_actions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "oa: owners and admins approve/reject"
  ON optimization_actions FOR UPDATE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN organization_members om
        ON om.organization_id = w.organization_id
       AND om.user_id = auth.uid()
       AND om.role IN ('owner', 'admin')
    )
  );
