"use client";

import Link from "next/link";
import type { Pixel } from "@/types/database";

type Props = { pixels: Pixel[] };

export function PixelTable({ pixels }: Props) {
  if (pixels.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhum pixel criado ainda. Crie o seu primeiro pixel acima.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium">Nome</th>
            <th className="px-4 py-3 text-left text-muted font-medium">ID</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Meta Pixel</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Google Tag</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Criado em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {pixels.map((px, i) => (
            <tr key={px.id} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className="px-4 py-3 font-medium text-white">{px.name}</td>
              <td className="px-4 py-3 font-mono text-muted text-xs">{px.id}</td>
              <td className="px-4 py-3 text-muted">{px.meta_pixel_id ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{px.google_tag_id ?? "—"}</td>
              <td className="px-4 py-3 text-muted">
                {new Date(px.created_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/pixel/${px.id}`}
                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-[0.8rem] font-medium text-muted hover:bg-muted hover:text-foreground transition-colors"
                >
                  Ver eventos
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
