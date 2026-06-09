-- ============================================================
-- Migration 002: RLS Policies (RBAC)
-- Depends on: 001_initial_schema.sql
-- ============================================================

-- ── Helper: get current user's role in an org ─────────────────────────────────
create or replace function current_user_org_role(org_id uuid)
returns org_role language sql security definer stable as $$
  select role from organization_members
  where organization_id = org_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ── Helper: get current user's role in a workspace ───────────────────────────
create or replace function current_user_ws_role(ws_id uuid)
returns org_role language sql security definer stable as $$
  select role from workspace_members
  where workspace_id = ws_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ── Helper: is superadmin ────────────────────────────────────────────────────
-- Superadmin role can only be assigned via this migration, never via user input.
create or replace function is_superadmin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid() and role = 'superadmin'
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- organizations policies
-- ══════════════════════════════════════════════════════════════

drop policy if exists "org_select" on organizations;
create policy "org_select" on organizations for select
  using (
    is_superadmin()
    or exists (
      select 1 from organization_members
      where organization_id = id and user_id = auth.uid()
    )
  );

drop policy if exists "org_insert" on organizations;
create policy "org_insert" on organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "org_update" on organizations;
create policy "org_update" on organizations for update
  using (current_user_org_role(id) in ('owner', 'admin', 'superadmin'));

drop policy if exists "org_delete" on organizations;
create policy "org_delete" on organizations for delete
  using (current_user_org_role(id) in ('owner', 'superadmin'));

-- ══════════════════════════════════════════════════════════════
-- workspaces policies
-- ══════════════════════════════════════════════════════════════

drop policy if exists "ws_select" on workspaces;
create policy "ws_select" on workspaces for select
  using (
    is_superadmin()
    or exists (
      select 1 from workspace_members
      where workspace_id = id and user_id = auth.uid()
    )
  );

drop policy if exists "ws_insert" on workspaces;
create policy "ws_insert" on workspaces for insert
  with check (
    current_user_org_role(organization_id) in ('owner', 'admin', 'superadmin')
  );

drop policy if exists "ws_update" on workspaces;
create policy "ws_update" on workspaces for update
  using (
    current_user_org_role(organization_id) in ('owner', 'admin', 'superadmin')
  );

drop policy if exists "ws_delete" on workspaces;
create policy "ws_delete" on workspaces for delete
  using (
    current_user_org_role(organization_id) in ('owner', 'superadmin')
  );

-- ══════════════════════════════════════════════════════════════
-- profiles policies
-- ══════════════════════════════════════════════════════════════

drop policy if exists "profile_select" on profiles;
create policy "profile_select" on profiles for select
  using (id = auth.uid() or is_superadmin());

drop policy if exists "profile_update" on profiles;
create policy "profile_update" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- INSERT is handled by the handle_new_user() trigger (security definer)

-- ══════════════════════════════════════════════════════════════
-- organization_members policies
-- ══════════════════════════════════════════════════════════════

drop policy if exists "org_members_select" on organization_members;
create policy "org_members_select" on organization_members for select
  using (
    is_superadmin()
    or user_id = auth.uid()
    or current_user_org_role(organization_id) in ('owner', 'admin')
  );

drop policy if exists "org_members_insert" on organization_members;
create policy "org_members_insert" on organization_members for insert
  with check (
    -- Prevent privilege escalation regardless of path
    role != 'superadmin'
    and (
      -- Existing members with sufficient role can add others
      current_user_org_role(organization_id) in ('owner', 'admin', 'superadmin')
      -- Bootstrap: the org creator adds themselves as owner when the org has no members yet.
      -- Unqualified `organization_id` = new row value; aliased `om` = existing rows.
      or (
        user_id = auth.uid()
        and role = 'owner'
        and not exists (
          select 1 from organization_members om where om.organization_id = organization_id
        )
      )
    )
  );

drop policy if exists "org_members_update" on organization_members;
create policy "org_members_update" on organization_members for update
  using (
    current_user_org_role(organization_id) in ('owner', 'admin', 'superadmin')
  )
  -- Prevent privilege escalation: admins cannot promote anyone to superadmin
  with check (
    role != 'superadmin'
    or is_superadmin()
  );

drop policy if exists "org_members_delete" on organization_members;
create policy "org_members_delete" on organization_members for delete
  using (
    current_user_org_role(organization_id) in ('owner', 'superadmin')
  );

-- ══════════════════════════════════════════════════════════════
-- workspace_members policies
-- ══════════════════════════════════════════════════════════════

drop policy if exists "ws_members_select" on workspace_members;
create policy "ws_members_select" on workspace_members for select
  using (
    is_superadmin()
    or user_id = auth.uid()
    or current_user_ws_role(workspace_id) in ('owner', 'admin')
  );

drop policy if exists "ws_members_insert" on workspace_members;
create policy "ws_members_insert" on workspace_members for insert
  with check (
    is_superadmin()
    or current_user_ws_role(workspace_id) in ('owner', 'admin')
  );

drop policy if exists "ws_members_update" on workspace_members;
create policy "ws_members_update" on workspace_members for update
  using (
    is_superadmin()
    or current_user_ws_role(workspace_id) in ('owner', 'admin')
  );

drop policy if exists "ws_members_delete" on workspace_members;
create policy "ws_members_delete" on workspace_members for delete
  using (
    is_superadmin()
    or current_user_ws_role(workspace_id) in ('owner', 'admin')
  );
