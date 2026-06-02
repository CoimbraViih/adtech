-- supabase/migrations/021_sync_runs.sql
-- Onda 1B (M-ADS Fase 2): audit log for platform campaign-sync operations.
--
-- Each row records one sync attempt (per workspace, per platform), its
-- outcome, and how many campaigns were processed.  The sync worker runs
-- server-side with the service role and is the only writer; workspace
-- members can read their own rows to display sync status in the UI;
-- owners / admins can delete stale history.

CREATE TABLE IF NOT EXISTS sync_runs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Platform that was synced in this run.
  platform         TEXT        NOT NULL
                   CHECK (platform IN ('meta', 'google', 'tiktok', 'linkedin')),
  -- Outcome of the sync attempt.
  status           TEXT        NOT NULL
                   CHECK (status IN ('success', 'error', 'partial')),
  -- Number of campaigns that were successfully created-or-updated in this run.
  campaigns_synced INT         NOT NULL DEFAULT 0,
  -- Human-readable error detail when status IN ('error', 'partial').
  error_message    TEXT,
  -- Wall-clock times for the sync window (useful for latency monitoring).
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index: the most common query pattern is
--   "latest sync run for workspace W on platform P"
-- DESC on started_at means the most recent row is always at the top of
-- the index range scan, making that query an index-scan rather than a
-- sequential scan + sort.
CREATE INDEX IF NOT EXISTS idx_sync_runs_workspace_platform
  ON sync_runs (workspace_id, platform, started_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

-- Workspace members can see sync history for workspaces they belong to.
DROP POLICY IF EXISTS "sync_runs: workspace members can read" ON sync_runs;
CREATE POLICY "sync_runs: workspace members can read"
  ON sync_runs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- The sync worker runs with the Supabase service role which bypasses RLS,
-- so no explicit INSERT/UPDATE policy is needed for it.  We add a
-- belt-and-suspenders policy for any future server-side role that runs
-- under a JWT with elevated claims rather than the raw service role.
DROP POLICY IF EXISTS "sync_runs: service role can insert" ON sync_runs;
CREATE POLICY "sync_runs: service role can insert"
  ON sync_runs FOR INSERT
  WITH CHECK (
    -- auth.role() returns 'service_role' when the service-role key is used.
    auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "sync_runs: service role can update" ON sync_runs;
CREATE POLICY "sync_runs: service role can update"
  ON sync_runs FOR UPDATE
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Owners and admins of the parent organisation can purge old sync history.
DROP POLICY IF EXISTS "sync_runs: owners and admins can delete" ON sync_runs;
CREATE POLICY "sync_runs: owners and admins can delete"
  ON sync_runs FOR DELETE
  USING (
    workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN organization_members om
        ON om.organization_id = w.organization_id
       AND om.user_id = auth.uid()
       AND om.role IN ('owner', 'admin')
    )
  );
