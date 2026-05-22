-- ─────────────────────────────────────────────────────────────────────────────
-- M4: Server-Side Pixel & Tracking
-- Tables: pixels, pixel_events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE pixel_event_type AS ENUM (
  'page_view',
  'add_to_cart',
  'purchase',
  'lead',
  'sign_up',
  'custom'
);

-- ── pixels ────────────────────────────────────────────────────────────────────

CREATE TABLE pixels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  meta_pixel_id   TEXT,          -- optional: link to a Meta Pixel for CAPI forwarding
  google_tag_id   TEXT,          -- optional: link to a Google Tag for EC forwarding
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pixels_updated_at
  BEFORE UPDATE ON pixels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pixels: workspace members can read"
  ON pixels FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can insert"
  ON pixels FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can update"
  ON pixels FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pixels: workspace members can delete"
  ON pixels FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ── pixel_events ─────────────────────────────────────────────────────────────

CREATE TABLE pixel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id      UUID NOT NULL REFERENCES pixels(id) ON DELETE CASCADE,
  event_type    pixel_event_type NOT NULL,
  event_name    TEXT,               -- populated for event_type = 'custom'
  url           TEXT,
  referrer      TEXT,
  ip            TEXT,
  user_agent    TEXT,
  session_id    TEXT,               -- anonymous session from cookie
  value         NUMERIC(12, 2),     -- monetary value for purchase events
  currency      CHAR(3),            -- ISO 4217 e.g. "BRL"
  properties    JSONB,              -- arbitrary key-value bag
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- no updated_at — events are immutable
);

CREATE INDEX pixel_events_pixel_id_idx ON pixel_events(pixel_id);
CREATE INDEX pixel_events_received_at_idx ON pixel_events(received_at DESC);

ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

-- pixel_events are written by the unauthenticated ingestion endpoint using the
-- service role key, so no auth.uid() policy is needed for INSERT.
-- Reads are scoped to workspace members via a join to pixels.
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
-- This explicit deny policy prevents silent failures if the anon key is used accidentally.
CREATE POLICY "pixel_events: deny direct insert"
  ON pixel_events FOR INSERT
  WITH CHECK (false);
