import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { generateCopyVariations } from "@/lib/ai/openai";
import { sanitizeBriefing } from "@/lib/security/sanitize";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { z } from "zod";

const schema = z.object({
  briefing: z.string().min(10).max(2000),
  count: z.number().int().min(1).max(6).optional().default(4),
});

// 20 generations per workspace per hour (GPT-4o is expensive)
const genLimiter = createRateLimiter("ai-copy-gen", 20, 60 * 60 * 1000);

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (genLimiter(session.workspace.id)) {
    return NextResponse.json(
      { error: "Limite de gerações atingido. Tente novamente em 1 hora." },
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

  // Sanitize briefing before sending to OpenAI
  const safeBriefing = sanitizeBriefing(parsed.data.briefing);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada." },
      { status: 503 }
    );
  }

  try {
    const variations = await generateCopyVariations(session.organization.id, safeBriefing, parsed.data.count);
    return NextResponse.json({ variations });
  } catch (err) {
    console.error("[creatives/generate/copy]", (err as Error).message);
    return NextResponse.json(
      { error: "Erro ao gerar copy. Tente novamente." },
      { status: 502 }
    );
  }
}
