import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { generateCopyVariations } from "@/lib/ai/openai";
import { MOCK_COPY_VARIATIONS } from "@/lib/creatives/mock-data";
import { z } from "zod";

const schema = z.object({
  briefing: z.string().min(10).max(2000),
  count: z.number().int().min(1).max(6).optional().default(4),
});

export async function POST(req: NextRequest) {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
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

  // Use mock data when API key is not configured (dev mode)
  if (!process.env.OPENAI_API_KEY) {
    await new Promise((r) => setTimeout(r, 800)); // simulate latency
    return NextResponse.json({
      variations: MOCK_COPY_VARIATIONS.slice(0, parsed.data.count),
    });
  }

  try {
    const variations = await generateCopyVariations(parsed.data.briefing, parsed.data.count);
    return NextResponse.json({ variations });
  } catch (err) {
    console.error("[creatives/generate/copy]", err);
    return NextResponse.json(
      { error: "Erro ao gerar copy. Tente novamente." },
      { status: 502 }
    );
  }
}
