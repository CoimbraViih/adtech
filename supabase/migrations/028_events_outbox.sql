-- Transactional outbox: pixel events buffered here before drain to ClickHouse
CREATE TABLE IF NOT EXISTS events_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  workspace_id    UUID NOT NULL,
  pixel_id        TEXT NOT NULL,
  payload         JSONB NOT NULL,
  attempts        INT  NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: consumer only scans unprocessed rows (critical for performance)
CREATE INDEX IF NOT EXISTS idx_events_outbox_pending
  ON events_outbox (created_at)
  WHERE processed_at IS NULL;

-- Index for monitoring/reconciliation queries
CREATE INDEX IF NOT EXISTS idx_events_outbox_org
  ON events_outbox (organization_id, created_at DESC);

-- RLS: only service role can read/write (pixel endpoint uses service client)
ALTER TABLE events_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON events_outbox
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
