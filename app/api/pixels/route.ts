import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

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

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pixels")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/pixels] GET error:", error);
    return NextResponse.json({ error: "Erro ao buscar pixels." }, { status: 500 });
  }

  return NextResponse.json(data);
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

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pixels")
    .insert({
      workspace_id: session.workspace.id,
      name: parsed.data.name,
      meta_pixel_id: parsed.data.meta_pixel_id ?? null,
      google_tag_id: parsed.data.google_tag_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/pixels] POST error:", error);
    return NextResponse.json({ error: "Erro ao criar pixel." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
