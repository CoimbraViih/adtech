import { fetchAllRules } from "@/lib/automation/rules";
import { AlertRulesTable } from "@/components/automation/alert-rules-table";
import type { AlertRule } from "@/types/database";

const MOCK_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export default async function AutomationPage() {
  let rules: AlertRule[] = [];
  try {
    rules = await fetchAllRules(MOCK_WORKSPACE_ID);
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

      <AlertRulesTable initialRules={rules} workspaceId={MOCK_WORKSPACE_ID} />
    </div>
  );
}
