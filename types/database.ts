/**
 * Supabase-generated database types.
 * TODO(M1-backend): replace with `supabase gen types typescript --project-id <id>`
 */

export type OrgPlan = "free" | "pro" | "agency";
export type OrgRole = "owner" | "admin" | "member" | "viewer" | "superadmin";

export type Organization = {
  id: string;
  name: string;
  plan: OrgPlan;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string; // matches auth.users.id
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type BillingEvent = {
  id: string;
  organization_id: string;
  stripe_event_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

// Session shape returned by getUser() / fake auth
export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Full session context passed through the app
export type SessionContext = {
  user: AuthUser;
  organization: Organization;
  workspace: Workspace;
  role: OrgRole;
};
