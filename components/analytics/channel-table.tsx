import type { ChannelAttribution } from "@/types/database";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CHANNEL_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook / Meta",
  instagram: "Instagram",
  organic: "Orgânico",
  direct: "Direto",
};

type Props = { channels: ChannelAttribution[] };

export function ChannelTable({ channels }: Props) {
  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted text-sm">
        Nenhuma conversão no período. Instale o pixel e aguarde os primeiros dados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-muted font-medium">Canal</th>
            <th className="px-4 py-3 text-right text-muted font-medium">Conversões</th>
            <th className="px-4 py-3 text-right text-muted font-medium">Receita</th>
            <th className="px-4 py-3 text-right text-muted font-medium">% Atribuição</th>
            <th className="px-4 py-3 text-left text-muted font-medium">Barra</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c, i) => (
            <tr key={c.channel} className={i % 2 === 0 ? "bg-base" : "bg-surface"}>
              <td className="px-4 py-3 text-white font-medium">
                {CHANNEL_LABELS[c.channel] ?? c.channel}
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {c.conversions.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              </td>
              <td className="px-4 py-3 text-right text-data">
                {BRL.format(c.revenue)}
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {(c.attribution_share * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-3 w-32">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(c.attribution_share * 100).toFixed(1)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
