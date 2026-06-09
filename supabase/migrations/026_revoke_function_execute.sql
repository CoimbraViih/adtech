-- ─────────────────────────────────────────────────────────────────────────────
-- 026: Revoke EXECUTE from PUBLIC on SECURITY DEFINER functions
-- Fixes: anon role inheriting PUBLIC grant; only authenticated + service_role
-- may call RLS helper functions.
-- ─────────────────────────────────────────────────────────────────────────────

-- RLS helpers — authenticated must call these (policies use them)
REVOKE EXECUTE ON FUNCTION current_user_org_role(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION current_user_org_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION current_user_ws_role(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION current_user_ws_role(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION is_superadmin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION is_superadmin() TO authenticated, service_role;

-- Trigger-only functions — no role needs to call these directly
REVOKE EXECUTE ON FUNCTION handle_new_user()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sync_org_plan()      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_updated_at()     FROM PUBLIC;
