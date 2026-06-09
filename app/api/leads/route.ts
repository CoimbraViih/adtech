import { NextRequest, NextResponse } from "next/server";
import { parseLeadInput } from "@/lib/leads/schema";
import { createServiceClient } from "@/lib/supabase/service";

const LEAD_PAYLOAD_LIMIT = 5 * 1024;

// In-memory rate limit: IP → { count, resetAt }
// 10 requests per IP per hour — sufficient for MVP (single-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read body as text first so we can check its actual byte length,
  // regardless of whether Content-Length header is present (chunked encoding).
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Falha ao ler body." }, { status: 400 });
  }

  if (bodyText.length > LEAD_PAYLOAD_LIMIT) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 1 hora." },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parseLeadInput(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first.message }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Upsert: idempotent — duplicate email is silently ignored
  const { error: dbError } = await supabase
    .from("leads")
    .upsert(
      {
        name: parsed.data.name,
        email: parsed.data.email,
        agency_size: parsed.data.agency_size,
        source: "waitlist",
      },
      { onConflict: "email", ignoreDuplicates: true }
    );

  if (dbError) {
    const _err = dbError as { code?: string };
    console.error("[leads/POST] db error code:", _err.code);
    return NextResponse.json({ error: "Erro ao salvar. Tente novamente." }, { status: 500 });
  }

  // TODO(M6-email): send welcome email via Resend when RESEND_API_KEY is configured

  return NextResponse.json({ ok: true }, { status: 201 });
}
