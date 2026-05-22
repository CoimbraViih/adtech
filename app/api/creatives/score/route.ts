import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { scoreCreative } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  creative_id: z.string().optional(),
  type: z.enum(["copy", "banner", "video"]),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
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

  // Mock score when API key not configured
  if (!process.env.OPENAI_API_KEY) {
    await new Promise((r) => setTimeout(r, 600));
    const mockBreakdown = { clarity: 17, urgency: 15, cta_strength: 18, compliance: 16, relevance: 14 };
    return NextResponse.json({ score: 80, breakdown: mockBreakdown });
  }

  try {
    const result = await scoreCreative(parsed.data);

    // TODO(M3-backend): persist score to creatives table
    // if (parsed.data.creative_id) {
    //   await supabase.from("creatives").update({ score: result.score, score_breakdown: result.breakdown })
    //     .eq("id", parsed.data.creative_id);
    // }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[creatives/score]", err);
    return NextResponse.json(
      { error: "Erro ao calcular score. Tente novamente." },
      { status: 502 }
    );
  }
}
