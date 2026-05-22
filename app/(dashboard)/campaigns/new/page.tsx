import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[color:var(--adflow-fg-muted)]">
        <Link
          href="/campaigns"
          className="flex items-center gap-1 hover:text-[color:var(--adflow-fg)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Campanhas
        </Link>
        <span>/</span>
        <span className="text-[color:var(--adflow-fg)]">Nova campanha</span>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">Nova campanha</h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
          Configure e publique uma nova campanha em Meta, Google ou Programático.
        </p>
      </div>

      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-6">
        <CampaignForm />
      </div>
    </div>
  );
}
