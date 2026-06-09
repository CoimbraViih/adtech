import { redirect } from "next/navigation";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { AudiencesListClient } from "@/components/audiences/audiences-list-client";
import { CreateAudienceButton } from "@/components/audiences/create-audience-button";
import type { Audience } from "@/types/database";

export default async function AudiencesPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("audiences")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });

  const audiences: Audience[] = data ?? [];
  const totalSize = audiences.reduce((sum, a) => sum + a.size_estimate, 0);
  const withRules = audiences.filter((a) => a.rules.length > 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Audiências</h1>
          <p className="text-sm text-muted mt-1">
            Segmentos comportamentais para campanhas programáticas
          </p>
        </div>
        <CreateAudienceButton />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Total de Audiências</p>
          <p className="text-2xl font-bold text-white mt-1">{audiences.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Tamanho Total Estimado</p>
          <p className="text-2xl font-bold text-data mt-1">
            ~{new Intl.NumberFormat("pt-BR").format(totalSize)} usuários
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Com Regras Ativas</p>
          <p className="text-2xl font-bold text-success mt-1">{withRules}</p>
        </div>
      </div>

      {/* Audiences list */}
      <AudiencesListClient audiences={audiences} />
    </div>
  );
}
