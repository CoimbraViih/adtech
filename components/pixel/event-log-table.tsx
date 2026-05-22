"use client";

import type { PixelEvent } from "@/types/database";

const EVENT_COLORS: Record<string, string> = {
  page_view: "text-data",
  purchase: "text-success",
  add_to_cart: "text-warning",
  lead: "text-accent",
  sign_up: "text-success",
  custom: "text-muted",
};

function safePathname(url: string | null): string {
  if (!url) return "—";
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

type Props = { events: PixelEvent[] };

export function EventLogTable({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhum evento registrado ainda. Instale o pixel no seu site e aguarde os primeiros eventos.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm font-mono">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Tipo</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Nome</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">URL</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Valor</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Session</th>
            <th className="px-4 py-3 text-left text-muted font-medium font-sans">Recebido em</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={ev.id} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className={`px-4 py-2 ${EVENT_COLORS[ev.event_type] ?? "text-muted"}`}>
                {ev.event_type}
              </td>
              <td className="px-4 py-2 text-muted">{ev.event_name ?? "—"}</td>
              <td className="px-4 py-2 text-muted text-xs truncate max-w-[220px]" title={ev.url ?? ""}>
                {safePathname(ev.url)}
              </td>
              <td className="px-4 py-2 text-white">
                {ev.value != null
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: ev.currency ?? "BRL" }).format(ev.value)
                  : "—"}
              </td>
              <td className="px-4 py-2 text-muted text-xs">{ev.session_id ?? "—"}</td>
              <td className="px-4 py-2 text-muted text-xs">
                {new Date(ev.received_at).toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
