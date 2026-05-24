-- ─────────────────────────────────────────────────────────────────────────────
-- M5: Analytics & Attribution
-- Views: daily_event_counts, conversion_sessions
-- ─────────────────────────────────────────────────────────────────────────────

-- ── daily_event_counts ────────────────────────────────────────────────────────
-- Aggregates pixel_events by day + event_type for time-series charts.
-- Joins pixels → workspaces so callers can filter by workspace_id.

CREATE OR REPLACE VIEW daily_event_counts AS
SELECT
  p.workspace_id,
  p.id          AS pixel_id,
  p.name        AS pixel_name,
  DATE_TRUNC('day', pe.received_at) AS day,
  pe.event_type,
  COUNT(*)      AS event_count,
  SUM(COALESCE(pe.value, 0)) AS total_value
FROM pixel_events pe
JOIN pixels p ON p.id = pe.pixel_id
GROUP BY p.workspace_id, p.id, p.name, DATE_TRUNC('day', pe.received_at), pe.event_type;

-- ── conversion_sessions ───────────────────────────────────────────────────────
-- One row per session that contains at least one conversion event.
-- Includes the first page_view URL to represent acquisition channel.

CREATE OR REPLACE VIEW conversion_sessions AS
SELECT
  pe.session_id,
  p.workspace_id,
  p.id                         AS pixel_id,
  MIN(pe.received_at)          AS session_start,
  MAX(pe.received_at)          AS session_end,
  -- first touch URL (for channel extraction)
  (ARRAY_AGG(pe.url ORDER BY pe.received_at))[1]  AS first_touch_url,
  -- last touch URL
  (ARRAY_AGG(pe.url ORDER BY pe.received_at DESC))[1] AS last_touch_url,
  COUNT(*)                     AS total_events,
  SUM(CASE WHEN pe.event_type = 'purchase' THEN 1 ELSE 0 END) AS purchases,
  SUM(CASE WHEN pe.event_type IN ('purchase','lead','sign_up') THEN 1 ELSE 0 END) AS conversions,
  SUM(COALESCE(pe.value, 0))   AS revenue
FROM pixel_events pe
JOIN pixels p ON p.id = pe.pixel_id
WHERE pe.session_id IS NOT NULL
GROUP BY pe.session_id, p.workspace_id, p.id
HAVING SUM(CASE WHEN pe.event_type IN ('purchase','lead','sign_up') THEN 1 ELSE 0 END) > 0;

-- RLS: views inherit the security of their underlying tables (pixels + pixel_events),
-- both of which already have workspace-scoped SELECT policies via workspace_members.
-- No additional RLS policies needed on the views themselves.
