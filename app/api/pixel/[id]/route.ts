import { NextRequest, NextResponse } from "next/server";
import { parsePixelEvent } from "@/lib/pixel/validate";
import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { createServiceClient } from "@/lib/supabase/service";
import { maskIp } from "@/lib/security/ip";
import { createRateLimiter } from "@/lib/security/rate-limit";
import type { Pixel, PixelEventInsert } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// 1000 events/min per IP, 10 000 events/min per pixel_id
const ipLimiter = createRateLimiter("pixel-ip", 1000, 60_000);
const pixelLimiter = createRateLimiter("pixel-id", 10_000, 60_000);

const PIXEL_PAYLOAD_LIMIT = 10 * 1024; // 10 KB

function corsHeaders(origin: string | null, allowedDomain: string | null) {
  const allowOrigin =
    !allowedDomain || origin === allowedDomain ? (origin ?? "*") : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  const { id: pixelId } = await ctx.params;
  const origin = req.headers.get("origin");

  const supabase = createServiceClient();
  type PixelQuery = {
    select: (cols?: string) => PixelQuery;
    eq: (col: string, val: unknown) => PixelQuery;
    single: () => Promise<{ data: Pixel | null; error: unknown }>;
  };
  const { data: pixel } = await (supabase.from("pixels") as unknown as PixelQuery)
    .select("id, domain")
    .eq("id", pixelId)
    .single();

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, pixel?.domain ?? null),
  });
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: pixelId } = await ctx.params;
  const origin = req.headers.get("origin");

  // 1. Payload size guard (reads raw bytes — not bypassable by omitting Content-Length)
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (bodyText.length > PIXEL_PAYLOAD_LIMIT) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  // 2. IP-based rate limit
  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (ipLimiter(rawIp)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // 3. Pixel-id-based rate limit
  if (pixelLimiter(pixelId)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // 4. Parse body (already read as text above)
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parsePixelEvent(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "body"}: ${first.message}` },
      { status: 400 }
    );
  }

  // 5. Fetch pixel + CORS check
  const supabase = createServiceClient();

  type PixelQueryChain = {
    select: (cols?: string) => PixelQueryChain;
    eq: (col: string, val: unknown) => PixelQueryChain;
    insert: (row: unknown) => PixelQueryChain;
    single: () => Promise<{ data: Pixel | null; error: unknown }>;
  };
  type EventQueryChain = {
    select: (cols?: string) => EventQueryChain;
    eq: (col: string, val: unknown) => EventQueryChain;
    insert: (row: unknown) => EventQueryChain;
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
  type WorkspaceQueryChain = {
    select: (cols?: string) => WorkspaceQueryChain;
    eq: (col: string, val: unknown) => WorkspaceQueryChain;
    single: () => Promise<{ data: { organization_id: string } | null; error: unknown }>;
  };

  const { data: pixel, error: pixelError } = await (supabase.from("pixels") as unknown as PixelQueryChain)
    .select("id, workspace_id, name, meta_pixel_id, google_tag_id, domain, created_at, updated_at")
    .eq("id", pixelId)
    .single();

  if (pixelError || !pixel) {
    return NextResponse.json({ error: "Pixel not found." }, { status: 404 });
  }

  // CORS: reject if pixel has a registered domain and origin doesn't match
  if (pixel.domain && origin !== pixel.domain) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  // 6. Store event with masked IP (LGPD)
  const maskedIp = maskIp(rawIp === "unknown" ? null : rawIp);

  const eventInsert: PixelEventInsert = {
    pixel_id: pixelId,
    event_type: parsed.data.event_type,
    event_name: parsed.data.event_name ?? null,
    url: parsed.data.url ?? null,
    referrer: parsed.data.referrer ?? null,
    ip: maskedIp,
    user_agent: req.headers.get("user-agent") ?? null,
    session_id: parsed.data.session_id ?? null,
    value: parsed.data.value ?? null,
    currency: parsed.data.currency ?? null,
    properties: (parsed.data.properties as Record<string, unknown>) ?? null,
  };

  const { data: savedEvent, error: insertError } = await (supabase.from("pixel_events") as unknown as EventQueryChain)
    .insert(eventInsert)
    .select()
    .single();

  if (insertError || !savedEvent) {
    console.error("[pixel/ingest] insert error code:", (insertError as { code?: string })?.code);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  // Best-effort: look up organizationId from workspace; fall back to "" on failure
  const { data: workspace } = await (supabase.from("workspaces") as unknown as WorkspaceQueryChain)
    .select("organization_id")
    .eq("id", pixel.workspace_id)
    .single();

  const organizationId = workspace?.organization_id ?? "";

  fanoutToPlatforms(savedEvent as Parameters<typeof fanoutToPlatforms>[0], pixel, organizationId).catch(
    (err) => console.error("[pixel/ingest] fanout error:", (err as Error).message)
  );

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, pixel.domain),
  });
}
