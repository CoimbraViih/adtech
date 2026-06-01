import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { createHash } from "crypto";

const optOutSchema = z.object({
  user_id: z.string().min(1).max(256),
});

const optOutLimiter = createRateLimiter("dmp-optout", 10, 60 * 60 * 1000);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (optOutLimiter(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (bodyText.length > 1024) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = optOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const userHash = createHash("sha256").update(parsed.data.user_id).digest("hex");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("dmp_optouts")
    .upsert({ user_hash: userHash }, { onConflict: "user_hash", ignoreDuplicates: true });

  if (error) {
    const _err = error as { code?: string };
    console.error("[dmp/optout] error code:", _err.code);
    return NextResponse.json({ error: "Failed to register opt-out." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
