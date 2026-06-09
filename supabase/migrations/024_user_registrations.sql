-- ============================================================
-- Migration 024: User Registrations
-- Tracks every new signup with metadata for analytics/funnel.
-- Populated automatically via handle_new_user() trigger.
-- ============================================================

-- ── user_registrations ────────────────────────────────────────────────────────
create table if not exists user_registrations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text,
  signup_method   text not null default 'email',   -- 'email' | 'google' | 'magic_link'
  plan_at_signup  text not null default 'free',
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referral_code   text,
  ip_address      text,
  user_agent      text,
  registered_at   timestamptz not null default now(),
  onboarding_completed_at timestamptz,
  unique (user_id)
);

create index if not exists user_registrations_user_id_idx    on user_registrations(user_id);
create index if not exists user_registrations_registered_at  on user_registrations(registered_at desc);
create index if not exists user_registrations_signup_method  on user_registrations(signup_method);

alter table user_registrations enable row level security;

-- Superadmin vê todos os registros
create policy "superadmin_all_registrations" on user_registrations
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and exists (
          select 1 from public.organization_members
          where organization_members.user_id = auth.uid()
            and organization_members.role = 'superadmin'
        )
    )
  );

-- Cada usuário vê apenas o próprio registro
create policy "user_own_registration" on user_registrations
  for select using (user_id = auth.uid());

-- ── Atualiza handle_new_user() para popular user_registrations ───────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_display_name text;
  v_signup_method text;
begin
  -- Resolve display_name: display_name explícito → full_name (Google) → local do email
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- Detecta método de signup
  v_signup_method := case
    when new.raw_app_meta_data->>'provider' = 'google' then 'google'
    when new.raw_app_meta_data->>'provider' = 'email'
      and (new.raw_user_meta_data->>'display_name' is null
           and new.raw_user_meta_data->>'full_name' is null) then 'magic_link'
    else 'email'
  end;

  -- Cria perfil 1:1
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url   = excluded.avatar_url;

  -- Registra o cadastro com metadados
  insert into public.user_registrations (
    user_id,
    email,
    display_name,
    signup_method,
    plan_at_signup
  )
  values (
    new.id,
    new.email,
    v_display_name,
    v_signup_method,
    'free'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Recria o trigger para garantir que usa a versão atualizada
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Backfill: registra usuários que já existem ────────────────────────────────
insert into public.user_registrations (user_id, email, display_name, signup_method, plan_at_signup, registered_at)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1)
  ),
  case
    when u.raw_app_meta_data->>'provider' = 'google' then 'google'
    else 'email'
  end,
  'free',
  u.created_at
from auth.users u
on conflict (user_id) do nothing;
