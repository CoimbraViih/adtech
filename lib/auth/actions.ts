"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function isRedirectError(err: unknown): boolean {
  return err instanceof Error && err.message === "NEXT_REDIRECT";
}

export async function loginWithPassword(
  email: string,
  password: string,
  nextPath = "/dashboard"
): Promise<{ error: string } | never> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "E-mail ou senha incorretos." };
    }
    redirect(nextPath);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Erro ao fazer login. Tente novamente." };
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const admin = createServiceClient();

    // Create user with email pre-confirmed so no confirmation email is required
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("user already exists")
      ) {
        return { error: "Este e-mail já está cadastrado." };
      }
      return { error: "Erro ao criar conta. Tente novamente." };
    }

    // Sign in immediately so the session cookies are set for the onboarding flow
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return { error: "Conta criada, mas não foi possível fazer login. Acesse /login." };
    }

    return { ok: true };
  } catch {
    return { error: "Erro ao criar conta. Tente novamente." };
  }
}

export async function completeOnboarding(input: {
  orgName: string;
  orgType: "agency" | "advertiser" | "freelancer";
  workspaceName: string;
  workspaceDescription?: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    // Use service client to bypass RLS — this is a trusted server action.
    // The anon client would block the org SELECT because the user isn't yet
    // in organization_members for the newly inserted row at read-back time.
    const { createServiceClient } = await import("@/lib/supabase/service");
    const db = createServiceClient();

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    // The handle_new_user() trigger already created an org for this user on signup.
    // Find it instead of creating a duplicate.
    const { data: membership, error: memberError } = await db
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    let orgId: string;

    if (memberError || !membership) {
      // Trigger didn't fire (edge case) — create the org manually.
      const { data: newOrg, error: orgError } = await db
        .from("organizations")
        .insert({ name: input.orgName, plan: "free" })
        .select("id")
        .single();
      if (orgError || !newOrg) return { error: "Erro ao criar organização." };

      orgId = newOrg.id;

      await db
        .from("organization_members")
        .insert({ organization_id: orgId, user_id: user.id, role: "owner" });
    } else {
      orgId = membership.organization_id;

      // Update the org name the user chose in the wizard.
      const { error: orgError } = await db
        .from("organizations")
        .update({ name: input.orgName })
        .eq("id", orgId);
      if (orgError) return { error: "Erro ao criar organização." };
    }

    // Find or create the workspace for this org.
    const { data: existingWs } = await db
      .from("workspaces")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .single();

    let wsId: string;

    if (existingWs) {
      // Update the default workspace with the user's chosen name.
      const { error: wsError } = await db
        .from("workspaces")
        .update({
          name: input.workspaceName,
          description: input.workspaceDescription ?? null,
        })
        .eq("id", existingWs.id);
      if (wsError) return { error: "Erro ao criar workspace." };
      wsId = existingWs.id;
    } else {
      const { data: newWs, error: wsError } = await db
        .from("workspaces")
        .insert({
          organization_id: orgId,
          name: input.workspaceName,
          description: input.workspaceDescription ?? null,
        })
        .select("id")
        .single();
      if (wsError || !newWs) return { error: "Erro ao criar workspace." };
      wsId = newWs.id;
    }

    // Ensure the user has a workspace_members entry (the trigger omits this).
    await db
      .from("workspace_members")
      .upsert(
        { workspace_id: wsId, user_id: user.id, role: "owner" },
        { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
      );

    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Erro ao configurar conta. Tente novamente." };
  }
}

export async function logout() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // best-effort signout
  }
  redirect("/login");
}
