import { describe, it, expect } from "vitest";
import {
  isSuperAdmin,
  canManageOrg,
  canManageCampaigns,
  canManageCreatives,
  canViewOnly,
  canAccessBilling,
  canManageMembers,
  canManageWorkspaces,
  roleLabel,
} from "@/lib/auth/roles";
import type { SessionContext, OrgRole } from "@/types/database";
import { FAKE_SESSION } from "@/lib/auth/session";

function session(role: OrgRole): SessionContext {
  return { ...FAKE_SESSION, role };
}

// ── isSuperAdmin ──────────────────────────────────────────────────────────────
describe("isSuperAdmin", () => {
  it("returns true only for superadmin", () => {
    expect(isSuperAdmin(session("superadmin"))).toBe(true);
  });
  it.each(["owner", "admin", "member", "viewer"] as OrgRole[])(
    "returns false for %s",
    (role) => {
      expect(isSuperAdmin(session(role))).toBe(false);
    }
  );
});

// ── canManageOrg ──────────────────────────────────────────────────────────────
describe("canManageOrg", () => {
  it.each(["superadmin", "owner", "admin"] as OrgRole[])(
    "allows %s",
    (role) => expect(canManageOrg(session(role))).toBe(true)
  );
  it.each(["member", "viewer"] as OrgRole[])(
    "denies %s",
    (role) => expect(canManageOrg(session(role))).toBe(false)
  );
});

// ── canManageCampaigns ────────────────────────────────────────────────────────
describe("canManageCampaigns", () => {
  it.each(["superadmin", "owner", "admin", "member"] as OrgRole[])(
    "allows %s",
    (role) => expect(canManageCampaigns(session(role))).toBe(true)
  );
  it("denies viewer", () => {
    expect(canManageCampaigns(session("viewer"))).toBe(false);
  });
});

// ── canManageCreatives ────────────────────────────────────────────────────────
describe("canManageCreatives", () => {
  it.each(["superadmin", "owner", "admin", "member"] as OrgRole[])(
    "allows %s",
    (role) => expect(canManageCreatives(session(role))).toBe(true)
  );
  it("denies viewer", () => {
    expect(canManageCreatives(session("viewer"))).toBe(false);
  });
});

// ── canViewOnly ───────────────────────────────────────────────────────────────
describe("canViewOnly", () => {
  it.each(["superadmin", "owner", "admin", "member", "viewer"] as OrgRole[])(
    "allows %s",
    (role) => expect(canViewOnly(session(role))).toBe(true)
  );
});

// ── canAccessBilling ──────────────────────────────────────────────────────────
describe("canAccessBilling", () => {
  it.each(["owner", "superadmin"] as OrgRole[])(
    "allows %s",
    (role) => expect(canAccessBilling(session(role))).toBe(true)
  );
  it.each(["admin", "member", "viewer"] as OrgRole[])(
    "denies %s",
    (role) => expect(canAccessBilling(session(role))).toBe(false)
  );
});

// ── canManageMembers ──────────────────────────────────────────────────────────
describe("canManageMembers", () => {
  it.each(["superadmin", "owner", "admin"] as OrgRole[])(
    "allows %s",
    (role) => expect(canManageMembers(session(role))).toBe(true)
  );
  it.each(["member", "viewer"] as OrgRole[])(
    "denies %s",
    (role) => expect(canManageMembers(session(role))).toBe(false)
  );
});

// ── canManageWorkspaces ───────────────────────────────────────────────────────
describe("canManageWorkspaces", () => {
  it.each(["superadmin", "owner", "admin"] as OrgRole[])(
    "allows %s",
    (role) => expect(canManageWorkspaces(session(role))).toBe(true)
  );
  it.each(["member", "viewer"] as OrgRole[])(
    "denies %s",
    (role) => expect(canManageWorkspaces(session(role))).toBe(false)
  );
});

// ── roleLabel ─────────────────────────────────────────────────────────────────
describe("roleLabel", () => {
  it("returns Portuguese labels for all roles", () => {
    expect(roleLabel("superadmin")).toBe("Super Admin");
    expect(roleLabel("owner")).toBe("Proprietário");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("member")).toBe("Membro");
    expect(roleLabel("viewer")).toBe("Visualizador");
  });
});
