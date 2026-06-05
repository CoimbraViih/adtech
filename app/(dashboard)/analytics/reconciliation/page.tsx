import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { getReconciliationRows } from "@/lib/analytics/cross-platform";
import type { ReconciliationRow } from "@/lib/analytics/cross-platform";

export default async function ReconciliationPage() {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const dateTo = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  let rows: ReconciliationRow[] = [];
  try {
    rows = await getReconciliationRows(session.workspace.id, dateFrom, dateTo);
  } catch {
    // graceful degradation — show empty state, never 500
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Reconciliação de Conversões
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          Conversões reportadas pelas plataformas vs capturadas pelo pixel AdFlow
          — últimos 30 dias.
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Nenhum dado disponível. Sincronize campanhas para começar a coletar
            métricas diárias.
          </p>
        </div>
      ) : (
        <div
          className="rounded-md border overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          <table className="w-full text-sm">
            <thead
              className="border-b"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <tr>
                {["Campanha", "Plataforma", "Gasto", "Conv. Plataforma", "Conv. Pixel", "Divergência"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 font-medium text-xs ${h === "Campanha" || h === "Plataforma" ? "text-left" : "text-right"}`}
                      style={{ color: "var(--color-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = row.divergencePct;
                const pctLabel =
                  pct == null ? "—" : `${(pct * 100).toFixed(0)}%`;
                const pctColor =
                  pct == null
                    ? "var(--color-muted)"
                    : pct > 0.3
                    ? "var(--color-danger)"
                    : pct > 0.1
                    ? "var(--color-warning)"
                    : "var(--color-success)";
                return (
                  <tr
                    key={i}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                      {row.campaignExternalId}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{row.platform}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.spend.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.platformConversions}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {row.pixelConversions}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-medium tabular-nums"
                      style={{ color: pctColor }}
                    >
                      {pctLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
