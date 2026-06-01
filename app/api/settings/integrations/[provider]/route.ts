import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageIntegrations } from "@/lib/auth/roles";
import { upsertCredentials, deleteCredentials } from "@/lib/integrations/credentials";
import { PROVIDERS } from "@/lib/integrations/providers";

type RouteContext = { params: Promise<{ provider: string }> };

// POST /api/settings/integrations/[provider]  — save credentials
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Apenas owners e admins podem configurar integrações." }, { status: 403 });
  }

  const providerDef = PROVIDERS[provider];
  if (!providerDef) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  // Build a dynamic Zod schema from the provider's field definitions
  const shape: Record<string, z.ZodString> = {};
  for (const field of providerDef.fields) {
    shape[field.key] = z.string().min(1, `${field.label} é obrigatório.`);
  }
  const schema = z.object(shape);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first.message }, { status: 422 });
  }

  try {
    await upsertCredentials(session.organization.id, provider, parsed.data);
  } catch (err) {
    console.error("[integrations/save]", (err as Error).message);
    return NextResponse.json({ error: "Erro ao salvar credenciais." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/settings/integrations/[provider]  — remove credentials
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Apenas owners e admins podem remover integrações." }, { status: 403 });
  }

  if (!PROVIDERS[provider]) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  try {
    await deleteCredentials(session.organization.id, provider);
  } catch (err) {
    console.error("[integrations/delete]", (err as Error).message);
    return NextResponse.json({ error: "Erro ao remover credenciais." }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
