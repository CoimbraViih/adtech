/**
 * RBAC helpers.
 * These functions operate on the OrgRole type and contain no Supabase calls —
 * they will work identically with real auth once SessionContext is populated
 * from a real Supabase getUser() response.
 */

import type { OrgRole, SessionContext } from "@/types/database";

// ── Role hierarchy ────────────────────────────────────────────────────────────

const ROLE_RANK: Record<OrgRole, number> = {
  superadmin: 100,
  owner:      80,
  admin:      60,
  member:     40,
  viewer:     20,
};

function hasMinRole(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// ── Permission helpers ────────────────────────────────────────────────────────

/** Full platform access — AdFlow staff only. Assigned via DB migration, never user input. */
export function isSuperAdmin(session: SessionContext): boolean {
  return session.role === "superadmin";
}

/** Owner or admin of the organization */
export function canManageOrg(session: SessionContext): boolean {
  return hasMinRole(session.role, "admin");
}

/** Can create / edit / pause campaigns */
export function canManageCampaigns(session: SessionContext): boolean {
  return hasMinRole(session.role, "member");
}

/** Can create / edit creatives */
export function canManageCreatives(session: SessionContext): boolean {
  return hasMinRole(session.role, "member");
}

/** Read-only access (viewer or above) */
export function canViewOnly(session: SessionContext): boolean {
  return hasMinRole(session.role, "viewer");
}

/** Access to billing / Stripe portal */
export function canAccessBilling(session: SessionContext): boolean {
  return session.role === "owner" || session.role === "superadmin";
}

/** Can manage workspace members */
export function canManageMembers(session: SessionContext): boolean {
  return hasMinRole(session.role, "admin");
}

/** Can create/delete workspaces within an org */
export function canManageWorkspaces(session: SessionContext): boolean {
  return hasMinRole(session.role, "admin");
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Human-readable label for a role — use in UI badges */
export function roleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    superadmin: "Super Admin",
    owner:      "Proprietário",
    admin:      "Admin",
    member:     "Membro",
    viewer:     "Visualizador",
  };
  return labels[role];
}
