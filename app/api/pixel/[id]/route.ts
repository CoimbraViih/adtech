import { NextRequest, NextResponse } from "next/server";
import { parsePixelEvent } from "@/lib/pixel/validate";
import { fanoutToPlatforms } from "@/lib/pixel/fanout";
import { createServiceClient } from "@/lib/supabase/service";
import type { Pixel, PixelEventInsert } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { id: pixelId } = await ctx.params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
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

  const { data: pixel, error: pixelError } = await (supabase.from("pixels") as unknown as PixelQueryChain)
    .select("id, workspace_id, name, meta_pixel_id, google_tag_id, created_at, updated_at")
    .eq("id", pixelId)
    .single();

  if (pixelError || !pixel) {
    return NextResponse.json({ error: "Pixel not found." }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const eventInsert: PixelEventInsert = {
    pixel_id: pixelId,
    event_type: parsed.data.event_type,
    event_name: parsed.data.event_name ?? null,
    url: parsed.data.url ?? null,
    referrer: parsed.data.referrer ?? null,
    ip,
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
    console.error("[pixel/ingest] insert error:", insertError);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  fanoutToPlatforms(savedEvent as Parameters<typeof fanoutToPlatforms>[0], pixel).catch(
    (err) => console.error("[pixel/ingest] fanout error:", err)
  );

  return new NextResponse(null, { status: 204 });
}
