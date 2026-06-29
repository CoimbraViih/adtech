-- supabase/migrations/036_assistant.sql

-- Conversation history per user per workspace
CREATE TABLE assistant_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id     UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_sessions_org_member" ON assistant_sessions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Audit log for every write action the assistant proposes or executes
CREATE TABLE assistant_action_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id     UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES assistant_sessions(id) ON DELETE SET NULL,
  action_type      TEXT NOT NULL,          -- 'pause_campaign' | 'resume_campaign'
  action_payload   JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|executed|failed
  error_message    TEXT,
  executed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assistant_action_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own action log entries
CREATE POLICY "assistant_action_log_select_own" ON assistant_action_log
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own entries scoped to their org
CREATE POLICY "assistant_action_log_insert_own" ON assistant_action_log
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Per-user onboarding checklist progress
CREATE TABLE onboarding_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step             TEXT NOT NULL,
  completed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, step)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_progress_own" ON onboarding_progress
  FOR ALL USING (user_id = auth.uid());

-- Trigger updated_at on assistant_sessions
CREATE TRIGGER set_updated_at_assistant_sessions
  BEFORE UPDATE ON assistant_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
