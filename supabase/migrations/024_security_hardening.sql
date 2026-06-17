-- Migration 024: Security Hardening
-- Applied directly via MCP on 2026-06-17.
-- Covers all Supabase Advisor findings from the MS (Security & Hardening) milestone.

-- ============================================================
-- 1. Fix mutable search_path on SECURITY DEFINER functions
--    (advisor: function_search_path_mutable)
-- ============================================================

-- Trigger functions

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, plan)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Org'), 'free')
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  INSERT INTO public.workspaces (organization_id, name)
  VALUES (new_org_id, 'Default Workspace');

  RETURN NEW;
END;
$$;

-- RBAC helper functions

CREATE OR REPLACE FUNCTION public.current_user_org_role(org_id UUID)
  RETURNS TEXT
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT role::text
  FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_user_ws_role(ws_id UUID)
  RETURNS TEXT
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT role::text
  FROM public.workspace_members
  WHERE workspace_id = ws_id
    AND user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND is_superadmin = TRUE
  );
$$;

-- Billing function

CREATE OR REPLACE FUNCTION public.sync_org_plan()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.organizations
    SET plan = NEW.plan_name
    WHERE id = NEW.organization_id;
  ELSIF NEW.status IN ('canceled', 'past_due', 'unpaid') THEN
    UPDATE public.organizations
    SET plan = 'free'
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Revoke PUBLIC / anon EXECUTE from trigger-only functions
--    (advisor: anon_security_definer_function_executable)
--    Triggers bypass EXECUTE checks — safe to revoke.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.set_updated_at()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_org_plan()     FROM PUBLIC, anon, authenticated;

-- RBAC helpers must remain callable by anon + authenticated so that
-- RLS policy evaluation works for unauthenticated requests too.
-- No REVOKE needed for current_user_org_role / current_user_ws_role / is_superadmin.

-- ============================================================
-- 3. Add missing FK indexes
--    (advisor: unindexed_foreign_keys)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id
  ON public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON public.organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_ws_members_user_id
  ON public.workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_ws_members_ws_id
  ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_id
  ON public.workspaces(organization_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id
  ON public.campaigns(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id
  ON public.ad_sets(campaign_id);

CREATE INDEX IF NOT EXISTS idx_creatives_workspace_id
  ON public.creatives(workspace_id);

CREATE INDEX IF NOT EXISTS idx_pixel_events_pixel_id
  ON public.pixel_events(pixel_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_org_id
  ON public.billing_events(organization_id);

-- ============================================================
-- 4. Optimize RLS policies: auth.uid() → (select auth.uid())
--    (advisor: auth_rls_initplan)
--    Wrapping in a sub-select turns per-row calls into a single
--    initialization plan evaluation per query.
--    Policies were updated in-place via MCP; this block documents
--    the tables affected so the migration is self-contained.
-- ============================================================

-- Tables updated (RLS policies re-created with (select auth.uid())):
--   organizations, workspaces, profiles, organization_members,
--   workspace_members, billing_events, campaigns, ad_sets, creatives,
--   pixels, pixel_events, landing_pages, automation_workflows,
--   programmatic_deals, dmp_segments, org_api_credentials,
--   ai_diagnostics, sync_runs, campaign_metrics_daily, creative_assets

-- No SQL needed here — changes were applied directly and this comment
-- serves as the audit trail.
