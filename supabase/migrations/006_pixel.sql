-- ─────────────────────────────────────────────────────────────────────────────
-- M4: Server-Side Pixel & Tracking
-- Tables: pixels, pixel_events
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pixel_event_type AS ENUM (
    'page_view', 'add_to_cart', 'purchase', 'lead', 'sign_up', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── pixels ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pixels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  meta_pixel_id   TEXT,
  google_tag_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS pixels_updated_at ON pixels;
CREATE TRIGGER pixels_updated_at
  BEFORE UPDATE ON pixels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pixels: workspace members can read" ON pixels;
CREATE POLICY "pixels: workspace members can read"
  ON pixels FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pixels: workspace members can insert" ON pixels;
CREATE POLICY "pixels: workspace members can insert"
  ON pixels FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pixels: workspace members can update" ON pixels;
CREATE POLICY "pixels: workspace members can update"
  ON pixels FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pixels: workspace members can delete" ON pixels;
CREATE POLICY "pixels: workspace members can delete"
  ON pixels FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── pixel_events ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pixel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id      UUID NOT NULL REFERENCES pixels(id) ON DELETE CASCADE,
  event_type    pixel_event_type NOT NULL,
  event_name    TEXT,
  url           TEXT,
  referrer      TEXT,
  ip            TEXT,
  user_agent    TEXT,
  session_id    TEXT,
  value         NUMERIC(12, 2),
  currency      CHAR(3),
  properties    JSONB,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- no updated_at — events are immutable
);

CREATE INDEX IF NOT EXISTS pixel_events_pixel_id_idx    ON pixel_events(pixel_id);
CREATE INDEX IF NOT EXISTS pixel_events_received_at_idx ON pixel_events(received_at DESC);

ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

-- Reads are scoped to workspace members via a join to pixels.
DROP POLICY IF EXISTS "pixel_events: workspace members can read" ON pixel_events;
CREATE POLICY "pixel_events: workspace members can read"
  ON pixel_events FOR SELECT
  USING (
    pixel_id IN (
      SELECT p.id FROM pixels p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Inserts are performed exclusively via the service role (bypasses RLS).
-- No INSERT policy is needed; the explicit deny below prevents accidental
-- inserts via the anon or authenticated key.
DROP POLICY IF EXISTS "pixel_events: deny direct insert" ON pixel_events;
CREATE POLICY "pixel_events: deny direct insert"
  ON pixel_events FOR INSERT
  WITH CHECK (false);
