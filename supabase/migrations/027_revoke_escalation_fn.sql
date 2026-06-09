-- ─────────────────────────────────────────────────────────────────────────────
-- 027: Revoke EXECUTE on prevent_org_member_self_escalation (trigger-only fn)
-- This function was created in 025 AFTER the REVOKE statements in 026,
-- so it received a fresh PUBLIC grant. Explicitly revoke it here.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION prevent_org_member_self_escalation()
  FROM PUBLIC, anon, authenticated;
