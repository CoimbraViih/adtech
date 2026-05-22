import Link from "next/link";
import { Plus, Wand2, FileText, CheckCircle2 } from "lucide-react";
import { CreativeCard } from "@/components/creatives/creative-card";
import { MOCK_CREATIVES } from "@/lib/creatives/mock-data";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns/mock-data";
import type { Creative } from "@/types/database";

function avgScore(scores: (number | null)[]) {
  const valid = scores.filter((s): s is number => s !== null);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

export default function CreativesPage() {
  const copies = MOCK_CREATIVES.filter((c) => c.type === "copy");
  const total = copies.length;
  const approved = copies.filter((c) => c.status === "approved").length;
  const avg = avgScore(copies.map((c) => c.score));
  const policyPassed = copies.filter((c) => c.policy_passed === true).length;

  const campaignMap = Object.fromEntries(MOCK_CAMPAIGNS.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            AI Creative Studio
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {approved} aprovado{approved !== 1 ? "s" : ""} de {total} copi{total !== 1 ? "es" : "a"}
          </p>
        </div>
        <Link
          href="/creatives/new"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg bg-[color:var(--adflow-accent)] text-white hover:bg-[color:var(--adflow-accent)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo copy
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Score médio"
          value={avg !== null ? `${avg.toFixed(0)}/100` : "—"}
          icon={Wand2}
        />
        <KpiCard label="Copies geradas" value={total.toLocaleString("pt-BR")} icon={FileText} />
        <KpiCard
          label="Aprovadas por política"
          value={policyPassed.toLocaleString("pt-BR")}
          icon={CheckCircle2}
        />
      </div>

      {/* Gallery */}
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
        <CreativeGallery creatives={copies} campaignMap={campaignMap} />
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

function KpiCard({ label, value, icon: Icon }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className="w-7 h-7 rounded-md bg-[color:var(--adflow-border)] flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
        </div>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-[color:var(--adflow-fg)]">{value}</p>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function CreativeGallery({
  creatives,
  campaignMap,
}: {
  creatives: Creative[];
  campaignMap: Record<string, string>;
}) {
  if (creatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Wand2 className="w-8 h-8 text-[color:var(--adflow-fg-muted)]" />
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Nenhum copy gerado ainda.{" "}
          <Link href="/creatives/new" className="text-[color:var(--adflow-accent)] hover:underline">
            Criar o primeiro
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {creatives.map((c) => (
        <CreativeCard
          key={c.id}
          creative={c}
          campaignName={c.campaign_id ? campaignMap[c.campaign_id] ?? null : null}
        />
      ))}
    </div>
  );
}
