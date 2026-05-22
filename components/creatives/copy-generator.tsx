"use client";

import { useState } from "react";
import { Wand2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyVariation } from "@/types/database";

type CopyGeneratorProps = {
  onSelect: (variation: CopyVariation) => void;
};

function VariationCard({
  variation,
  onSelect,
}: {
  variation: CopyVariation;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(
      `${variation.headline}\n\n${variation.description}\n\n${variation.cta}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[color:var(--adflow-fg)] leading-snug">
          {variation.headline}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1 rounded hover:bg-[color:var(--adflow-border)] transition-colors"
          title="Copiar"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[color:var(--adflow-success)]" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          )}
        </button>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Ocultar" : "Ver descrição"}
      </button>

      {expanded && (
        <p className="text-xs text-[color:var(--adflow-fg-muted)] leading-relaxed">
          {variation.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded border border-[color:var(--adflow-data)]/30 bg-[color:var(--adflow-data)]/10 text-xs text-[color:var(--adflow-data)]">
          {variation.cta}
        </span>
        <button
          onClick={onSelect}
          className="text-xs font-medium text-[color:var(--adflow-accent)] hover:underline"
        >
          Usar esta variação
        </button>
      </div>
    </div>
  );
}

export function CopyGenerator({ onSelect }: CopyGeneratorProps) {
  const [briefing, setBriefing] = useState("");
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!briefing.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/creatives/generate/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing, count: 4 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar copy.");
      setVariations(data.variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Briefing */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Briefing
        </label>
        <textarea
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          placeholder="Descreva o produto/serviço, público-alvo, objetivo e tom desejado. Ex: Copy para Black Friday de loja de calçados, público 25-40 anos, foco em urgência e economia."
          rows={4}
          className={cn(
            "w-full rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]",
            "px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)]",
            "focus:outline-none focus:border-[color:var(--adflow-accent)] resize-none"
          )}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !briefing.trim()}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg transition-colors",
          "bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Wand2 className={cn("w-4 h-4", loading && "animate-spin")} />
        {loading ? "Gerando variações..." : "Gerar com IA"}
      </button>

      {error && (
        <p className="text-xs text-[color:var(--adflow-danger)] bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {variations.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
            {variations.length} variações geradas
          </p>
          {variations.map((v, i) => (
            <VariationCard key={i} variation={v} onSelect={() => onSelect(v)} />
          ))}
        </div>
      )}
    </div>
  );
}
