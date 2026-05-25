-- ============================================================
-- Migration 011: Subscriptions
-- Depends on: 001_initial_schema.sql, 003_billing.sql
-- ============================================================

create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text not null unique,
  plan                    text not null default 'free'
                            check (plan in ('free', 'pro', 'agency')),
  status                  subscription_status not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index subscriptions_org_idx         on subscriptions(organization_id);
create index subscriptions_stripe_sub_idx  on subscriptions(stripe_subscription_id);
create index subscriptions_customer_idx    on subscriptions(stripe_customer_id);

create trigger set_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

create policy "subscriptions_select" on subscriptions for select
  using (
    is_superadmin()
    or current_user_org_role(organization_id) in ('owner', 'admin')
  );

create or replace function sync_org_plan()
returns trigger language plpgsql security definer as $$
begin
  update organizations
  set plan = NEW.plan, updated_at = now()
  where id = NEW.organization_id;
  return NEW;
end;
$$;

create trigger sync_org_plan_on_subscription
  after insert or update on subscriptions
  for each row execute function sync_org_plan();
