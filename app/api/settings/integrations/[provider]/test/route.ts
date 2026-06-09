import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { canManageIntegrations } from "@/lib/auth/roles";
import { getCredentials, markTested } from "@/lib/integrations/credentials";
import { PROVIDERS } from "@/lib/integrations/providers";

type RouteContext = { params: Promise<{ provider: string }> };

// POST /api/settings/integrations/[provider]/test  — test live connection
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { provider } = await ctx.params;

  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!canManageIntegrations(session)) {
    return NextResponse.json({ error: "Permissão insuficiente." }, { status: 403 });
  }

  const providerDef = PROVIDERS[provider];
  if (!providerDef) {
    return NextResponse.json({ error: "Provedor não encontrado." }, { status: 404 });
  }

  const creds = await getCredentials(session.organization.id, provider);
  if (!creds) {
    return NextResponse.json({ ok: false, message: "Integração não configurada. Salve as credenciais primeiro." });
  }

  try {
    const result = await providerDef.testConnection(creds);
    if (result.ok) {
      await markTested(session.organization.id, provider);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[integrations/test/${provider}]`, (err as Error).message);
    return NextResponse.json({ ok: false, message: "Erro ao testar conexão. Verifique as credenciais." });
  }
}
