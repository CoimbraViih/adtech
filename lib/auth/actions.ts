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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: input.orgName, plan: "free" })
      .select()
      .single();
    if (orgError || !org) return { error: "Erro ao criar organização." };

    await supabase
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        organization_id: org.id,
        name: input.workspaceName,
        description: input.workspaceDescription ?? null,
      })
      .select()
      .single();
    if (wsError || !ws) return { error: "Erro ao criar workspace." };

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

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
