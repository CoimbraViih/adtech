/**
 * Dev-only: GET /api/auth/dev-login  → HTML form
 *           POST /api/auth/dev-login → signInWithPassword, redirect to /onboarding or /dashboard
 *
 * Guarded by ENABLE_DEV_LOGIN=true in .env.local — never active in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const isEnabled = () => process.env.ENABLE_DEV_LOGIN === "true";

const FORM_HTML = (defaultEmail: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>AdFlow — Dev Login</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: 'JetBrains Mono', monospace; background: #080810; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #13131F; border: 1px solid #1E1E2E; border-radius: 10px; padding: 2rem; width: 360px; }
    .badge { display: inline-block; background: #E8390E22; color: #E8390E; font-size: 0.65rem;
             letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;
             margin-bottom: 1.25rem; }
    h2 { margin: 0 0 1.5rem; font-size: 1.1rem; color: #fff; }
    label { display: block; font-size: 0.7rem; color: #6B7280; margin-bottom: 4px; letter-spacing: .05em; text-transform: uppercase; }
    input { display: block; width: 100%; background: #0D0D1A; border: 1px solid #1E1E2E; color: #e2e8f0;
            padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.875rem; font-family: inherit;
            outline: none; margin-bottom: 1rem; }
    input:focus { border-color: #E8390E; }
    button { width: 100%; background: #E8390E; color: #fff; border: none; border-radius: 6px;
             padding: 0.65rem; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
    button:hover { background: #c73009; }
    .alt { margin-top: 1rem; text-align: center; font-size: 0.75rem; color: #6B7280; }
    .alt a { color: #00d4ff; text-decoration: none; }
    .error { background: #EF444422; border: 1px solid #EF4444; color: #EF4444;
             border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">⚠ Dev Only</span>
    <h2>AdFlow — Dev Login</h2>
    <form method="POST">
      <label>Email</label>
      <input name="email" type="email" value="${defaultEmail}" required autocomplete="email" />
      <label>Senha</label>
      <input name="password" type="password" required autocomplete="current-password" />
      <button type="submit">Entrar →</button>
    </form>
    <p class="alt">Não tem conta? <a href="/api/auth/dev-signup">Criar usuário de teste</a></p>
  </div>
</body>
</html>`;

export async function GET(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  // Allow ?email= from dev-signup redirect to pre-fill the form
  const defaultEmail =
    request.nextUrl.searchParams.get("email") ??
    process.env.DEV_LOGIN_EMAIL ??
    "";
  return new NextResponse(FORM_HTML(defaultEmail), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // Accept both form-data (browser form) and JSON (API clients)
  let email: string | undefined;
  let password: string | undefined;

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({})) as Record<string, string>;
    email = body.email;
    password = body.password;
  } else {
    const form = await request.formData().catch(() => null);
    email = form?.get("email") as string | undefined;
    password = form?.get("password") as string | undefined;
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "email e password são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (ct.includes("application/json")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Redisplay form with error
    const html = FORM_HTML(email).replace(
      "<form",
      `<div class="error">❌ ${error.message}</div><form`
    );
    return new NextResponse(html, {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Check if this user already completed onboarding (has an org)
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .limit(1)
    .single();

  const destination = membership ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(destination, request.url));
}
