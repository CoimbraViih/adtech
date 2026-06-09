"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function sendMagicLink(
  email: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/callback` },
  });

  if (error) return { error: translateAuthError(error.message) };
  return { ok: true };
}

function translateAuthError(message: string): string {
  if (message.includes("rate limit") || message.includes("over_email_send_rate_limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (message.includes("already registered") || message.includes("User already registered"))
    return "Este e-mail já está cadastrado. Tente fazer login.";
  if (message.includes("invalid email") || message.includes("Invalid email"))
    return "E-mail inválido.";
  if (message.includes("Password should be"))
    return "A senha deve ter no mínimo 6 caracteres.";
  if (message.includes("Email not confirmed"))
    return "E-mail não confirmado. Verifique sua caixa de entrada.";
  return "Erro ao criar conta. Tente novamente.";
}

export async function signUpWithPassword(
  name: string,
  email: string,
  password: string
): Promise<{ ok: true; needsConfirmation: boolean } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${appUrl}/callback?onboarding=1`,
    },
  });

  if (error) return { error: translateAuthError(error.message) };

  // session is non-null when email confirmation is disabled (auto-confirmed)
  const needsConfirmation = !data.session;
  return { ok: true, needsConfirmation };
}

type OnboardingInput = {
  orgName: string;
  orgType: "agency" | "advertiser" | "freelancer";
  workspaceName: string;
  workspaceDescription?: string;
  existingOrgId?: string;
};

export async function completeOnboarding(
  input: OnboardingInput
): Promise<{ ok: true } | { error: string }> {
  // Verify user identity via the user-scoped client
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  // Use service role for DB operations to avoid the RLS bootstrap chicken-and-egg:
  // org_select requires org membership, but we can't add membership until org exists.
  const db = createServiceClient();

  let orgId: string;

  if (input.existingOrgId) {
    orgId = input.existingOrgId;
  } else {
    // 1. Criar organização
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: input.orgName, plan: "free" })
      .select("id")
      .single();

    if (orgError || !org) return { error: "Erro ao criar organização." };
    orgId = org.id as string;

    // 2. Adicionar usuário como owner da org
    const { error: omError } = await db.from("organization_members").insert({
      organization_id: orgId,
      user_id: user.id,
      role: "owner",
    });

    if (omError) return { error: "Erro ao configurar organização." };
  }

  // 3. Criar workspace
  const { data: ws, error: wsError } = await db
    .from("workspaces")
    .insert({
      organization_id: orgId,
      name: input.workspaceName,
      description: input.workspaceDescription ?? null,
    })
    .select("id")
    .single();

  if (wsError || !ws) return { error: "Erro ao criar workspace." };

  // 4. Adicionar usuário como owner do workspace
  const { error: wmError } = await db.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: "owner",
  });

  if (wmError) return { error: "Erro ao configurar workspace." };

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
