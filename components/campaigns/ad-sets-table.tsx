import type { AdSet } from "@/types/database";
import { StatusBadge } from "./status-badge";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

type AdSetsTableProps = {
  adSets: AdSet[];
};

export function AdSetsTable({ adSets }: AdSetsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--adflow-border)]">
            <th className="text-left pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Conjunto
            </th>
            <th className="text-left pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Status
            </th>
            <th className="text-right pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Gasto
            </th>
            <th className="text-right pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Impressões
            </th>
            <th className="text-right pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Cliques
            </th>
            <th className="text-right pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Conversões
            </th>
            <th className="text-right pb-2 text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider">
              Budget/dia
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--adflow-border)]">
          {adSets.map((adSet) => (
            <tr key={adSet.id} className="hover:bg-[color:var(--adflow-border)]/20 transition-colors">
              <td className="py-3">
                <p className="font-medium text-[color:var(--adflow-fg)]">{adSet.name}</p>
                {adSet.external_id && (
                  <p className="text-xs font-mono text-[color:var(--adflow-fg-muted)] mt-0.5">
                    {adSet.external_id}
                  </p>
                )}
              </td>
              <td className="py-3">
                <StatusBadge status={adSet.status} />
              </td>
              <td className="py-3 text-right font-mono tabular-nums">
                R$ {fmt(adSet.spend, 2)}
              </td>
              <td className="py-3 text-right tabular-nums text-[color:var(--adflow-fg-muted)]">
                {fmt(adSet.impressions)}
              </td>
              <td className="py-3 text-right tabular-nums text-[color:var(--adflow-fg-muted)]">
                {fmt(adSet.clicks)}
              </td>
              <td className="py-3 text-right tabular-nums">
                {adSet.conversions > 0 ? fmt(adSet.conversions) : <span className="text-[color:var(--adflow-fg-muted)]">—</span>}
              </td>
              <td className="py-3 text-right tabular-nums text-[color:var(--adflow-fg-muted)]">
                {adSet.daily_budget !== null ? `R$ ${fmt(adSet.daily_budget, 2)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
