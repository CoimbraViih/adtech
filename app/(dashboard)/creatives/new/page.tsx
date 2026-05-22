"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyGenerator } from "@/components/creatives/copy-generator";
import type { CopyVariation } from "@/types/database";

// ── Save panel ────────────────────────────────────────────────────────────────

type SavePanelProps = {
  headline: string;
  description: string;
  cta: string;
  onHeadlineChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onCtaChange: (v: string) => void;
};

function SavePanel({
  headline,
  description,
  cta,
  onHeadlineChange,
  onDescriptionChange,
  onCtaChange,
}: SavePanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Dê um nome ao criativo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "copy",
          name,
          headline: headline || null,
          description: description || null,
          cta: cta || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      router.push(`/creatives/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">Salvar criativo</h2>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Nome interno
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Black Friday — Urgência v1"
          className={cn(
            "w-full rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]",
            "px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)]",
            "focus:outline-none focus:border-[color:var(--adflow-accent)]"
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Headline
        </label>
        <input
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Título do anúncio"
          className={cn(
            "w-full rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]",
            "px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)]",
            "focus:outline-none focus:border-[color:var(--adflow-accent)]"
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Texto do corpo do anúncio"
          rows={3}
          className={cn(
            "w-full rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]",
            "px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)]",
            "focus:outline-none focus:border-[color:var(--adflow-accent)] resize-none"
          )}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          CTA
        </label>
        <input
          value={cta}
          onChange={(e) => onCtaChange(e.target.value)}
          placeholder="Ex: Comprar agora"
          className={cn(
            "w-full rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)]",
            "px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)]",
            "focus:outline-none focus:border-[color:var(--adflow-accent)]"
          )}
        />
      </div>

      {error && (
        <p className="text-xs text-[color:var(--adflow-danger)] bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg transition-colors",
          "bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Wand2 className="w-4 h-4" />
        {saving ? "Salvando..." : "Salvar criativo"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewCreativePage() {
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");

  function handleCopySelect(v: CopyVariation) {
    setHeadline(v.headline);
    setDescription(v.description);
    setCta(v.cta);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[color:var(--adflow-fg-muted)]">
        <Link
          href="/creatives"
          className="flex items-center gap-1 hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Criativos
        </Link>
        <span>/</span>
        <span className="text-[color:var(--adflow-fg)]">Novo criativo</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--adflow-accent)]/20 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-[color:var(--adflow-accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">AI Creative Studio</h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            Gere copy para anúncios com IA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: copy generator */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5">
            <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-4">
              Gerador de Copy
            </h2>
            <CopyGenerator onSelect={handleCopySelect} />
          </div>
        </div>

        {/* Right: save panel */}
        <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-5">
          <SavePanel
            headline={headline}
            description={description}
            cta={cta}
            onHeadlineChange={setHeadline}
            onDescriptionChange={setDescription}
            onCtaChange={setCta}
          />
        </div>
      </div>
    </div>
  );
}
