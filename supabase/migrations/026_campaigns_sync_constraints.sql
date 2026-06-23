-- Migration 026: Add UNIQUE constraints and defaults for external sync
--
-- sync.ts upserts campaigns/ad_sets/ads from external platforms.
-- These constraints enable onConflict-based upserts; the defaults allow
-- INSERT of synced campaigns without requiring fields only known to AdFlow
-- users (objective, start_date).

-- ── campaigns ─────────────────────────────────────────────────────────────────

ALTER TABLE campaigns
  ALTER COLUMN objective SET DEFAULT 'traffic',
  ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_workspace_external_unique
  UNIQUE (workspace_id, external_id);

-- ── ad_sets ───────────────────────────────────────────────────────────────────

ALTER TABLE ad_sets
  ADD CONSTRAINT ad_sets_workspace_external_unique
  UNIQUE (workspace_id, external_id);

-- ── ads ────────────────────────────────────────────────────────────────────────

ALTER TABLE ads
  ADD CONSTRAINT ads_workspace_external_unique
  UNIQUE (workspace_id, external_id);
