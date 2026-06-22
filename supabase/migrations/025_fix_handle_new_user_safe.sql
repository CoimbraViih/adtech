-- Migration 025: Make handle_new_user() safe
--
-- Migration 024 rewrote handle_new_user() to also create an org, workspace,
-- and membership rows. If any of those inserts fail (e.g. RLS timing, type
-- cast, constraint), the entire auth.users INSERT rolls back — the user is
-- never created. This was causing sign-ups to silently fail.
--
-- Fix: revert the trigger to profile-only (as in migration 016), keeping the
-- security improvements from 024 (SECURITY DEFINER + fixed search_path).
-- Org/workspace/members are created in application code (completeOnboarding)
-- where failures can be surfaced to the user without blocking account creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation because of a profile insert failure.
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
