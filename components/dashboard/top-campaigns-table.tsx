import Link from "next/link";
import type { TopCampaign } from "@/types/dashboard";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  programmatic: "Prog.",
};

const STATUS_STYLE: Record<string, string> = {
  active: "text-[color:var(--adflow-success)] bg-[color:var(--adflow-success)]/10",
  paused: "text-[color:var(--adflow-warning)] bg-[color:var(--adflow-warning)]/10",
  draft: "text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)]/30",
  archived: "text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)]/30",
};

type Props = { campaigns: TopCampaign[] };

export function TopCampaignsTable({ campaigns }: Props) {
  return (
    <div className="rounded-lg bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--adflow-border)]">
        <h3 className="text-sm font-medium text-[color:var(--adflow-fg)]">Top campanhas por ROAS</h3>
        <Link href="/campaigns" className="text-xs text-[color:var(--adflow-accent)] hover:underline">
          Ver todas →
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--adflow-border)]">
            {["Campanha", "Plataforma", "Status", "ROAS", "Spend", "Conversões"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[color:var(--adflow-fg-muted)] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr
              key={c.id}
              className={`border-b border-[color:var(--adflow-border)] last:border-0 hover:bg-[color:var(--adflow-border)]/20 transition-colors ${i % 2 === 0 ? "" : "bg-[color:var(--adflow-base)]/40"}`}
            >
              <td className="px-4 py-2.5">
                <Link href={`/campaigns/${c.id}`} className="text-[color:var(--adflow-fg)] hover:text-[color:var(--adflow-accent)] transition-colors font-medium truncate max-w-[200px] block">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-[color:var(--adflow-fg-muted)] text-xs">{PLATFORM_LABEL[c.platform] ?? c.platform}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status] ?? ""}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-success)] font-semibold">{c.roas.toFixed(2)}x</td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-fg-muted)]">{BRL.format(c.spend)}</td>
              <td className="px-4 py-2.5 font-mono tabular-nums text-[color:var(--adflow-fg-muted)]">{NUM.format(c.conversions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
