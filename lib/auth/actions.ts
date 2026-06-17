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
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?onboarding=1`,
      },
    });
    if (error) {
      if (error.message.includes("already registered")) {
        return { error: "Este e-mail já está cadastrado." };
      }
      return { error: "Erro ao criar conta. Tente novamente." };
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
