-- ============================================================
-- Migration 003: Billing Events
-- Depends on: 001_initial_schema.sql
-- ============================================================

-- ── billing_events ────────────────────────────────────────────────────────────
-- Append-only log of Stripe webhook events.
-- Idempotency: stripe_event_id is unique → safe to replay webhooks.
create table billing_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  stripe_event_id  text not null unique,
  type             text not null,          -- e.g. "invoice.payment_succeeded"
  payload          jsonb not null,
  created_at       timestamptz not null default now()
);

create index billing_events_org_idx        on billing_events(organization_id);
create index billing_events_stripe_evt_idx on billing_events(stripe_event_id);
create index billing_events_type_idx       on billing_events(type);

-- RLS: billing_events is write-only from service role (webhook handler).
-- App reads are allowed for org owners/admins.
alter table billing_events enable row level security;

create policy "billing_events_select" on billing_events for select
  using (
    -- Superadmin sees all
    is_superadmin()
    -- Org owner/admin can read their own billing history
    or current_user_org_role(organization_id) in ('owner', 'admin')
  );

-- INSERT is done by the Stripe webhook route handler using the service role key.
-- No client-side insert policy needed; service role bypasses RLS.
