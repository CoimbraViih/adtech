import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiagnosticCard } from "@/components/diagnostics/diagnostic-card";
import { SeveritySummary } from "@/components/diagnostics/severity-summary";
import { RunDiagnosticsButton } from "@/components/diagnostics/run-diagnostics-button";
import type { AiDiagnostic } from "@/types/database";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export default async function DiagnosticsPage() {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  const workspaceId = session.workspace.id;

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("ai_diagnostics")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const diagnostics = ((data ?? []) as AiDiagnostic[]).sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)]">
            Diagnósticos de Campanha
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            Problemas detectados automaticamente — aprove ou descarte cada recomendação.
          </p>
        </div>
        <RunDiagnosticsButton workspaceId={workspaceId} />
      </div>

      {diagnostics.length > 0 && <SeveritySummary diagnostics={diagnostics} />}

      {diagnostics.length === 0 ? (
        <div className="text-center py-20 text-[color:var(--adflow-fg-muted)] text-sm">
          Nenhum problema detectado — execute uma análise para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {diagnostics.map((d) => (
            <DiagnosticCard key={d.id} diagnostic={d} />
          ))}
        </div>
      )}
    </div>
  );
}
