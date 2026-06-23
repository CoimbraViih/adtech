import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EventLogTable } from "@/components/pixel/event-log-table";
import { PixelSnippet } from "@/components/pixel/pixel-snippet";

type Props = { params: Promise<{ id: string }> };

export default async function PixelDetailPage({ params }: Props) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: pixel, error: pixelError } = await supabase
    .from("pixels")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .single();

  if (pixelError || !pixel) notFound();

  const { data: events } = await supabase
    .from("pixel_events")
    .select("*")
    .eq("pixel_id", id)
    .order("received_at", { ascending: false })
    .limit(200);

  const safeEvents = events ?? [];
  const purchases = safeEvents.filter((e) => e.event_type === "purchase");
  const revenue = purchases.reduce((sum, e) => sum + (e.value ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{pixel.name}</h1>
        <p className="text-sm text-muted font-mono mt-1">{pixel.id}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Total de Eventos</p>
          <p className="text-2xl font-bold text-white mt-1">{safeEvents.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Compras</p>
          <p className="text-2xl font-bold text-success mt-1">{purchases.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Receita Rastreada</p>
          <p className="text-2xl font-bold text-data mt-1">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenue)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-medium text-white mb-2">Código de instalação</h2>
        <PixelSnippet pixelId={pixel.id} />
      </div>

      <div>
        <h2 className="text-base font-medium text-white mb-2">Log de Eventos</h2>
        <EventLogTable events={safeEvents} />
      </div>
    </div>
  );
}
