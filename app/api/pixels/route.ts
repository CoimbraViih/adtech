import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { z } from "zod";
import type { Pixel } from "@/types/database";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  meta_pixel_id: z.string().max(50).nullable().optional(),
  google_tag_id: z.string().max(50).nullable().optional(),
});

// GET /api/pixels — list pixels for the current workspace
export async function GET(_req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // TODO(M4-backend): replace with Supabase query
  const pixels: Pixel[] = [];
  void session;

  return NextResponse.json(pixels);
}

// POST /api/pixels — create a new pixel
export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".")}: ${first.message}` },
      { status: 422 }
    );
  }

  // TODO(M4-backend): replace with Supabase insert
  const newPixel: Pixel = {
    id: `px_${Date.now()}`,
    workspace_id: session.workspace.id,
    name: parsed.data.name,
    meta_pixel_id: parsed.data.meta_pixel_id ?? null,
    google_tag_id: parsed.data.google_tag_id ?? null,
    domain: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(newPixel, { status: 201 });
}
