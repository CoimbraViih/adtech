/**
 * Dev-only: GET /api/auth/dev-signup  → HTML form
 *           POST /api/auth/dev-signup → admin.createUser (email pre-confirmed), redirect to dev-login
 *
 * Uses service-role admin API to bypass email confirmation — dev/testing only.
 * Guarded by ENABLE_DEV_LOGIN=true in .env.local.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const isEnabled = () => process.env.ENABLE_DEV_LOGIN === "true";

const FORM_HTML = (defaultEmail: string, error?: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>AdFlow — Dev Signup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: 'JetBrains Mono', monospace; background: #080810; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #13131F; border: 1px solid #1E1E2E; border-radius: 10px; padding: 2rem; width: 380px; }
    .badge { display: inline-block; background: #E8390E22; color: #E8390E; font-size: 0.65rem;
             letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;
             margin-bottom: 1.25rem; }
    h2 { margin: 0 0 0.25rem; font-size: 1.1rem; color: #fff; }
    p.sub { margin: 0 0 1.5rem; font-size: 0.75rem; color: #6B7280; }
    label { display: block; font-size: 0.7rem; color: #6B7280; margin-bottom: 4px; letter-spacing: .05em; text-transform: uppercase; }
    input { display: block; width: 100%; background: #0D0D1A; border: 1px solid #1E1E2E; color: #e2e8f0;
            padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.875rem; font-family: inherit;
            outline: none; margin-bottom: 1rem; }
    input:focus { border-color: #00d4ff; }
    button { width: 100%; background: #00d4ff22; color: #00d4ff; border: 1px solid #00d4ff44; border-radius: 6px;
             padding: 0.65rem; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
    button:hover { background: #00d4ff33; }
    .alt { margin-top: 1rem; text-align: center; font-size: 0.75rem; color: #6B7280; }
    .alt a { color: #E8390E; text-decoration: none; }
    .error { background: #EF444422; border: 1px solid #EF4444; color: #EF4444;
             border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem; margin-bottom: 1rem; }
    .note { background: #00d4ff11; border: 1px solid #00d4ff33; color: #00d4ff;
            border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem; margin-bottom: 1.25rem; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">⚠ Dev Only</span>
    <h2>Criar Usuário de Teste</h2>
    <p class="sub">Email confirmado automaticamente — sem verificação por e-mail.</p>
    <div class="note">ℹ️ Senha mínima: 6 caracteres</div>
    ${error ? `<div class="error">❌ ${error}</div>` : ""}
    <form method="POST">
      <label>Nome</label>
      <input name="name" type="text" placeholder="Ex: Victor Coimbra" required />
      <label>Email</label>
      <input name="email" type="email" value="${defaultEmail}" required autocomplete="email" />
      <label>Senha</label>
      <input name="password" type="password" placeholder="Mínimo 6 caracteres" required autocomplete="new-password" />
      <button type="submit">Criar Conta →</button>
    </form>
    <p class="alt">Já tem conta? <a href="/api/auth/dev-login">Fazer login</a></p>
  </div>
</body>
</html>`;

export async function GET(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return new NextResponse(FORM_HTML(""), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let name: string | undefined;
  let email: string | undefined;
  let password: string | undefined;

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({})) as Record<string, string>;
    name = body.name;
    email = body.email;
    password = body.password;
  } else {
    const form = await request.formData().catch(() => null);
    name = form?.get("name") as string | undefined;
    email = form?.get("email") as string | undefined;
    password = form?.get("password") as string | undefined;
  }

  if (!email || !password) {
    const html = FORM_HTML(email ?? "", "email e password são obrigatórios");
    return new NextResponse(html, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const serviceClient = createServiceClient();

  // Use admin API to create a confirmed user (skips email verification)
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name ?? email.split("@")[0],
    },
  });

  if (error) {
    if (ct.includes("application/json")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const html = FORM_HTML(email, error.message);
    return new NextResponse(html, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (ct.includes("application/json")) {
    return NextResponse.json({
      ok: true,
      user_id: data.user.id,
      email: data.user.email,
      message: "Usuário criado. Faça login em /api/auth/dev-login",
    });
  }

  // Redirect to dev-login pre-filled with the new email
  const loginUrl = new URL("/api/auth/dev-login", request.url);
  loginUrl.searchParams.set("email", email);
  return NextResponse.redirect(loginUrl);
}
