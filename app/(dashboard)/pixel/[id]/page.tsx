import { requireServerSession } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EventLogTable } from "@/components/pixel/event-log-table";
import { PixelSnippet } from "@/components/pixel/pixel-snippet";
import type { Pixel, PixelEvent } from "@/types/database";

const MOCK_PIXEL: Pixel = {
  id: "px_demo_001",
  workspace_id: "ws_demo",
  name: "Site Principal",
  meta_pixel_id: "123456789012345",
  google_tag_id: "G-XXXXXXXXXX",
  created_at: new Date("2026-05-20").toISOString(),
  updated_at: new Date("2026-05-20").toISOString(),
};

const MOCK_EVENTS: PixelEvent[] = [
  { id: "ev_1", pixel_id: "px_demo_001", event_type: "page_view", event_name: null, url: "https://example.com/", referrer: "https://google.com", ip: "1.2.3.4", user_agent: "Mozilla/5.0", session_id: "s_abc123", value: null, currency: null, properties: null, received_at: new Date("2026-05-22T10:00:00").toISOString() },
  { id: "ev_2", pixel_id: "px_demo_001", event_type: "purchase", event_name: null, url: "https://example.com/checkout/success", referrer: null, ip: "1.2.3.4", user_agent: "Mozilla/5.0", session_id: "s_abc123", value: 299.9, currency: "BRL", properties: { order_id: "ord_42" }, received_at: new Date("2026-05-22T10:05:00").toISOString() },
  { id: "ev_3", pixel_id: "px_demo_001", event_type: "lead", event_name: null, url: "https://example.com/contato", referrer: null, ip: "5.6.7.8", user_agent: "Chrome/120", session_id: "s_xyz456", value: null, currency: null, properties: null, received_at: new Date("2026-05-22T11:00:00").toISOString() },
];

type Props = { params: Promise<{ id: string }> };

export default async function PixelDetailPage({ params }: Props) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  void session;

  const { id } = await params;

  // TODO(M4-backend): replace with Supabase queries
  const pixel = MOCK_PIXEL.id === id ? MOCK_PIXEL : null;
  if (!pixel) notFound();

  const events = MOCK_EVENTS.filter((e) => e.pixel_id === id);
  const totalEvents = events.length;
  const purchases = events.filter((e) => e.event_type === "purchase");
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
          <p className="text-2xl font-bold text-white mt-1">{totalEvents}</p>
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
        <EventLogTable events={events} />
      </div>
    </div>
  );
}
