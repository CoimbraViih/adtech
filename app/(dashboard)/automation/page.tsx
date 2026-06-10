import { fetchAllRules } from "@/lib/automation/rules";
import { AlertRulesTable } from "@/components/automation/alert-rules-table";
import type { AlertRule } from "@/types/database";
import { requireServerSession } from "@/lib/supabase/server";

export default async function AutomationPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  const workspaceId = session!.workspace.id;

  let rules: AlertRule[] = [];
  try {
    rules = await fetchAllRules(workspaceId);
  } catch {
    // No rules yet or DB not connected
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">
            Automação & Alertas
          </h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            Configure alertas automáticos para KPIs de campanha
          </p>
        </div>
      </div>

      <AlertRulesTable initialRules={rules} workspaceId={workspaceId} />
    </div>
  );
}
