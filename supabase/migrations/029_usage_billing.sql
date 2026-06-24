-- ============================================================
-- Migration 029: Usage Billing Schema (M22 — Monetização para Go-Live)
-- Depends on: 001_initial_schema.sql, 002_rbac.sql
-- ============================================================

-- ── ALTER organizations: add billing_status ──────────────────────────────────
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'active'
CHECK (billing_status IN ('active', 'past_due', 'suspended'));

-- ── billing_periods: track invoicing cycles per organization ─────────────────
CREATE TABLE IF NOT EXISTS billing_periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'past_due')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_billing_periods_org_status
  ON billing_periods (organization_id, status);

DROP TRIGGER IF EXISTS set_billing_periods_updated_at ON billing_periods;
CREATE TRIGGER set_billing_periods_updated_at
  BEFORE UPDATE ON billing_periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE billing_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_periods: superadmin and org owners/admins can read" ON billing_periods;
CREATE POLICY "billing_periods: superadmin and org owners/admins can read" ON billing_periods FOR SELECT
  USING (
    is_superadmin()
    OR current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- INSERT / UPDATE / DELETE done by backend service via service role (bypasses RLS).

-- ── usage_records: daily spend tracking per organization per period ──────────
CREATE TABLE IF NOT EXISTS usage_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_period_id   UUID NOT NULL REFERENCES billing_periods(id) ON DELETE CASCADE,
  record_date         DATE NOT NULL,
  spend_brl           NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_period
  ON usage_records (billing_period_id);

CREATE INDEX IF NOT EXISTS idx_usage_records_org_date
  ON usage_records (organization_id, record_date DESC);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_records: superadmin and org owners/admins can read" ON usage_records;
CREATE POLICY "usage_records: superadmin and org owners/admins can read" ON usage_records FOR SELECT
  USING (
    is_superadmin()
    OR current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- INSERT done by backend service via service role (bypasses RLS).

-- ── invoices: Stripe invoice log and billing status ───────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_period_id   UUID NOT NULL REFERENCES billing_periods(id) ON DELETE CASCADE,
  stripe_invoice_id   TEXT UNIQUE,
  amount_brl          NUMERIC(10,2) NOT NULL,
  spend_brl           NUMERIC(14,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'paid', 'uncollectible', 'void')),
  stripe_hosted_url   TEXT,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_created
  ON invoices (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id
  ON invoices (stripe_invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_period
  ON invoices (billing_period_id);

DROP TRIGGER IF EXISTS set_invoices_updated_at ON invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices: superadmin and org owners/admins can read" ON invoices;
CREATE POLICY "invoices: superadmin and org owners/admins can read" ON invoices FOR SELECT
  USING (
    is_superadmin()
    OR current_user_org_role(organization_id) IN ('owner', 'admin')
  );

-- INSERT / UPDATE done by Stripe webhook handler via service role (bypasses RLS).
