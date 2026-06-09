-- ============================================================
-- Migration 003: Billing Events
-- Depends on: 001_initial_schema.sql, 002_rbac.sql
-- ============================================================

-- ── billing_events ────────────────────────────────────────────────────────────
-- Append-only log of Stripe webhook events.
-- Idempotency: stripe_event_id is unique → safe to replay webhooks.

CREATE TABLE IF NOT EXISTS billing_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_event_id  TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL,          -- e.g. "invoice.payment_succeeded"
  payload          JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_events_org_idx        ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS billing_events_stripe_evt_idx ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS billing_events_type_idx       ON billing_events(type);

-- RLS: billing_events is write-only from service role (webhook handler).
-- App reads are allowed for org owners/admins.
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_events_select" ON billing_events;
CREATE POLICY "billing_events_select" ON billing_events FOR SELECT
  USING (
    is_superadmin()
    OR current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- INSERT is done by the Stripe webhook route handler using the service role key.
-- Service role bypasses RLS entirely — no INSERT policy needed.
