"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PixelTable } from "@/components/pixel/pixel-table";
import type { Pixel } from "@/types/database";

type Filter = "all" | "meta" | "google" | "unconnected";

type Props = { pixels: Pixel[] };

export function PixelListClient({ pixels }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pixels.filter((px) => {
      const matchesQuery =
        q === "" ||
        px.name.toLowerCase().includes(q) ||
        px.id.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "meta" && px.meta_pixel_id !== null) ||
        (filter === "google" && px.google_tag_id !== null) ||
        (filter === "unconnected" && px.meta_pixel_id === null && px.google_tag_id === null);

      return matchesQuery && matchesFilter;
    });
  }, [pixels, query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "meta", label: "Meta" },
    { value: "google", label: "Google" },
    { value: "unconnected", label: "Sem plataforma" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou ID..."
            className="pl-9 bg-base border-border"
            aria-label="Buscar pixel"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={[
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-muted hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && pixels.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
          Nenhum pixel encontrado para a busca atual.
        </div>
      ) : (
        <PixelTable pixels={filtered} />
      )}
    </div>
  );
}
