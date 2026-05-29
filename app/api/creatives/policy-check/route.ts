import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { checkPolicy } from "@/lib/ai/openai";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { z } from "zod";

const policyLimiter = createRateLimiter("ai-policy", 30, 60 * 60 * 1000);

const schema = z.object({
  creative_id: z.string().optional(),
  type: z.enum(["copy", "banner", "video"]),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (policyLimiter(session.workspace.id)) {
    return NextResponse.json(
      { error: "Limite de verificações atingido. Tente novamente em 1 hora." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  // Mock policy check when API key not configured
  if (!process.env.OPENAI_API_KEY) {
    await new Promise((r) => setTimeout(r, 600));
    const mockItems = [
      { rule: "Sem afirmações enganosas", passed: true, detail: null },
      { rule: "CTA claro e direto", passed: true, detail: null },
      { rule: "Sem linguagem proibida Meta", passed: true, detail: null },
      { rule: "Headline dentro de 30 chars (Google)", passed: true, detail: null },
      { rule: "Sem pressão excessiva", passed: true, detail: null },
    ];
    return NextResponse.json({ items: mockItems, passed: true });
  }

  try {
    const result = await checkPolicy(parsed.data);

    // TODO(M3-backend): persist policy result to creatives table
    // if (parsed.data.creative_id) {
    //   await supabase.from("creatives")
    //     .update({ policy_items: result.items, policy_passed: result.passed })
    //     .eq("id", parsed.data.creative_id);
    // }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[creatives/policy-check]", (err as Error).message);
    return NextResponse.json(
      { error: "Erro ao verificar políticas. Tente novamente." },
      { status: 502 }
    );
  }
}
