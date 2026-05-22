-- ============================================================
-- Migration 001: Initial Schema (M1 — Auth & Shell)
-- Run: supabase db push  OR  supabase migration up
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enum types ────────────────────────────────────────────────────────────────
create type org_plan as enum ('free', 'pro', 'agency');
create type org_role as enum ('superadmin', 'owner', 'admin', 'member', 'viewer');

-- ── Updated-at trigger helper ─────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── organizations ─────────────────────────────────────────────────────────────
create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  plan              org_plan not null default 'free',
  stripe_customer_id text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- ── workspaces ────────────────────────────────────────────────────────────────
create table workspaces (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  description      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index workspaces_organization_id_idx on workspaces(organization_id);

create trigger workspaces_updated_at
  before update on workspaces
  for each row execute function set_updated_at();

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users (1:1). id matches auth.users.id exactly.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── organization_members ──────────────────────────────────────────────────────
create table organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            org_role not null default 'member',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index org_members_user_id_idx on organization_members(user_id);
create index org_members_org_id_idx  on organization_members(organization_id);

-- ── workspace_members ────────────────────────────────────────────────────────
create table workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         org_role not null default 'member',
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index ws_members_user_id_idx on workspace_members(user_id);
create index ws_members_ws_id_idx   on workspace_members(workspace_id);

-- ── Enable RLS on all tables ──────────────────────────────────────────────────
alter table organizations      enable row level security;
alter table workspaces         enable row level security;
alter table profiles           enable row level security;
alter table organization_members enable row level security;
alter table workspace_members  enable row level security;
