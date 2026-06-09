-- Fix handle_new_user() to support Google OAuth users.
--
-- Google OAuth sends `full_name` in raw_user_meta_data, not `display_name`.
-- The original trigger left display_name NULL for all Google sign-ins.
-- Fallback chain: explicit display_name → Google full_name → email local part.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
